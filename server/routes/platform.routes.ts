import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import dns from "dns/promises";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "../db";
import { requireAuth, requirePlatformAdmin } from "../middlewares/auth.middleware";
import { users, whiteLabelDomains } from "@shared/schema";
import {
  ZiinaProviderError,
  amountToMinorUnits,
  createPaymentIntent,
  getIntentCheckoutUrl,
  getPaymentIntent,
  getZiinaEnv,
  normalizeZiinaStatus,
  sanitizeZiinaPayload,
} from "../services/payments/ziina.service";
import {
  activatePlatformPartnerPayment,
  addPartnerCreditTransaction,
  dateOrNull,
  getPartnerCreditBalance,
  processPlatformPartnerDunning,
  processPlatformPartnerRenewals,
  syncPartnerControls,
} from "../services/platform-partner-billing.service";

const createSuperadminSchema = z.object({
  username: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(200),
  email: z.string().email().max(255),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional(),
});

const domainSchema = z.object({
  domain: z.string().trim().min(3).max(255),
  notes: z.string().trim().max(1000).optional(),
});

const updateSuperadminSchema = z.object({
  username: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().max(100).optional().nullable(),
});

const passwordSchema = z.object({
  password: z.string().min(8).max(200),
});

const controlsSchema = z.object({
  planName: z.string().trim().min(1).max(160).optional(),
  clientLimit: z.coerce.number().int().min(0).nullable().optional(),
  workspaceLimit: z.coerce.number().int().min(0).nullable().optional(),
  creditBalance: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

const partnerPlanSchema = z.object({
  planKey: z.string().trim().min(2).max(80).optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  monthlyPrice: z.coerce.number().min(0).default(0),
  yearlyPrice: z.coerce.number().min(0).default(0),
  currency: z.string().trim().min(1).max(12).default("USD"),
  clientLimit: z.coerce.number().int().min(0).nullable().optional(),
  workspaceLimit: z.coerce.number().int().min(0).nullable().optional(),
  domainLimit: z.coerce.number().int().min(0).nullable().optional(),
  includedCredits: z.coerce.number().min(0).default(0),
  trialDays: z.coerce.number().int().min(0).default(0),
  features: z.array(z.string()).default([]),
  displayOrder: z.coerce.number().int().default(0),
});

const partnerSubscriptionSchema = z.object({
  planId: z.string().trim().min(1),
  status: z.enum(["active", "trialing", "past_due", "cancelled", "expired"]).default("active"),
  billingCycle: z.enum(["monthly", "yearly", "manual"]).default("monthly"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  autoRenew: z.coerce.boolean().default(false),
  clientLimit: z.coerce.number().int().min(0).nullable().optional(),
  workspaceLimit: z.coerce.number().int().min(0).nullable().optional(),
  domainLimit: z.coerce.number().int().min(0).nullable().optional(),
  includedCredits: z.coerce.number().min(0).optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().trim().min(1).max(12).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  grantIncludedCredits: z.coerce.boolean().default(false),
});

const partnerCreditSchema = z.object({
  transactionType: z.enum(["credit", "debit", "adjustment"]),
  credits: z.coerce.number().positive(),
  reference: z.string().trim().max(160).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

const partnerZiinaCheckoutSchema = z.object({
  planId: z.string().trim().min(1),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  currency: z.enum(["AED", "USD", "INR"]).default("AED"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  autoRenew: z.coerce.boolean().default(false),
  clientLimit: z.coerce.number().int().min(0).nullable().optional(),
  workspaceLimit: z.coerce.number().int().min(0).nullable().optional(),
  domainLimit: z.coerce.number().int().min(0).nullable().optional(),
  includedCredits: z.coerce.number().min(0).optional(),
  grantIncludedCredits: z.coerce.boolean().default(true),
  notes: z.string().trim().max(1000).nullable().optional(),
});

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

async function audit(req: Request, actionType: string, targetType: string, targetId?: string, values?: Record<string, unknown>) {
  await db.execute(sql`
    INSERT INTO white_label_audit_logs
      (actor_id, action_type, target_type, target_id, updated_values, ip_address, user_agent)
    VALUES
      (${req.user?.id || null}, ${actionType}, ${targetType}, ${targetId || null}, ${values ? JSON.stringify(values) : null}::jsonb, ${req.ip}, ${req.get("user-agent") || null})
  `);
}

function sessionUserFromRow(row: any, impersonatedBy?: string) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    permissions: Array.isArray(row.permissions) ? row.permissions : ["*"],
    avatar: row.avatar,
    createdBy: row.created_by || "",
    impersonatedBy,
  };
}

function planKeyFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `plan_${Date.now()}`;
}

async function getActiveZiinaProvider() {
  const provider = await pool.query(`SELECT * FROM payment_providers WHERE provider_key='ziina' AND is_active=true LIMIT 1`);
  return provider.rows[0] || null;
}

function ziinaResultUrl(base: string, paymentId: string) {
  const url = new URL(base);
  url.searchParams.set("paymentId", paymentId);
  return url.toString();
}

export function registerPlatformRoutes(app: Express) {
  app.get("/api/platform/superadmins", requireAuth, requirePlatformAdmin, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          u.id,
          u.username,
          u.email,
          u.first_name AS "firstName",
          u.last_name AS "lastName",
          u.status,
          u.created_at AS "createdAt",
          u.updated_at AS "updatedAt",
          pp.name AS "planName",
          pps.status AS "subscriptionStatus",
          pps.end_date AS "subscriptionEndDate",
          pps.client_limit AS "clientLimit",
          pps.workspace_limit AS "workspaceLimit",
          pps.domain_limit AS "domainLimit",
          COALESCE((
            SELECT balance_after
            FROM platform_partner_credit_transactions pct
            WHERE pct.superadmin_id = u.id
            ORDER BY pct.created_at DESC, pct.id DESC
            LIMIT 1
          ), COALESCE(psc.credit_balance, 0))::numeric AS "creditBalance",
          (
            SELECT COUNT(*)::int
            FROM users client
            WHERE client.role = 'admin'
              AND client.created_by = u.id
          ) AS clients,
          (
            SELECT COUNT(DISTINCT ch.id)::int
            FROM channels ch
            WHERE ch.created_by IN (
              SELECT client.id FROM users client
              WHERE client.role = 'admin' AND client.created_by = u.id
            )
            OR ch.white_label_client_id IN (
              SELECT client.id FROM users client
              WHERE client.role = 'admin' AND client.created_by = u.id
            )
          ) AS workspaces,
          (
            SELECT COUNT(*)::int
            FROM white_label_domains d
            WHERE d.superadmin_id = u.id
          ) AS domains
        FROM users u
        LEFT JOIN platform_partner_subscriptions pps
          ON pps.superadmin_id = u.id
          AND pps.status IN ('active','trialing','past_due')
        LEFT JOIN platform_partner_plans pp ON pp.id = pps.plan_id
        LEFT JOIN platform_superadmin_controls psc ON psc.superadmin_id = u.id
        WHERE u.role = 'superadmin'
          AND u.status <> 'deleted'
        ORDER BY u.created_at DESC NULLS LAST, u.email ASC
      `);

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error("[platform] list superadmins failed:", error);
      res.status(500).json({ success: false, message: "Failed to load superadmins" });
    }
  });

  app.post("/api/platform/superadmins", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = createSuperadminSchema.parse(req.body);
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`${users.email} = ${parsed.email} OR ${users.username} = ${parsed.username}`)
        .limit(1);

      if (existing) {
        return res.status(409).json({ success: false, message: "Email or username already exists." });
      }

      const [created] = await db
        .insert(users)
        .values({
          username: parsed.username,
          password: await bcrypt.hash(parsed.password, 10),
          email: parsed.email,
          firstName: parsed.firstName,
          lastName: parsed.lastName || null,
          role: "superadmin",
          status: "active",
          permissions: ["*"],
          isEmailVerified: true,
          createdBy: req.user?.id || null,
        })
        .returning();

      await audit(req, "create_superadmin", "user", created.id, { email: created.email });
      const { password: _password, ...safeUser } = created;
      res.status(201).json({ success: true, data: safeUser });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid request" });
      }
      console.error("[platform] create superadmin failed:", error);
      res.status(500).json({ success: false, message: "Failed to create superadmin" });
    }
  });

  app.get("/api/platform/plans", requireAuth, requirePlatformAdmin, async (_req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT id, plan_key AS "planKey", name, description, status,
              monthly_price AS "monthlyPrice", yearly_price AS "yearlyPrice", currency,
              client_limit AS "clientLimit", workspace_limit AS "workspaceLimit", domain_limit AS "domainLimit",
              included_credits AS "includedCredits", trial_days AS "trialDays", features,
              display_order AS "displayOrder", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM platform_partner_plans
       ORDER BY display_order ASC, monthly_price ASC, name ASC`
    );
    res.json({ success: true, data: rows });
  });

  app.post("/api/platform/plans", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = partnerPlanSchema.parse(req.body);
      const planKey = parsed.planKey || planKeyFromName(parsed.name);
      const { rows } = await pool.query(
        `INSERT INTO platform_partner_plans
          (plan_key, name, description, status, monthly_price, yearly_price, currency, client_limit, workspace_limit,
           domain_limit, included_credits, trial_days, features, display_order, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (plan_key) DO UPDATE SET
           name=EXCLUDED.name,
           description=EXCLUDED.description,
           status=EXCLUDED.status,
           monthly_price=EXCLUDED.monthly_price,
           yearly_price=EXCLUDED.yearly_price,
           currency=EXCLUDED.currency,
           client_limit=EXCLUDED.client_limit,
           workspace_limit=EXCLUDED.workspace_limit,
           domain_limit=EXCLUDED.domain_limit,
           included_credits=EXCLUDED.included_credits,
           trial_days=EXCLUDED.trial_days,
           features=EXCLUDED.features,
           display_order=EXCLUDED.display_order,
           updated_at=NOW()
         RETURNING id, plan_key AS "planKey", name, description, status, monthly_price AS "monthlyPrice",
           yearly_price AS "yearlyPrice", currency, client_limit AS "clientLimit", workspace_limit AS "workspaceLimit",
           domain_limit AS "domainLimit", included_credits AS "includedCredits", trial_days AS "trialDays",
           features, display_order AS "displayOrder"`,
        [
          planKey,
          parsed.name,
          parsed.description || null,
          parsed.status,
          parsed.monthlyPrice,
          parsed.yearlyPrice,
          parsed.currency,
          parsed.clientLimit ?? null,
          parsed.workspaceLimit ?? null,
          parsed.domainLimit ?? null,
          parsed.includedCredits,
          parsed.trialDays,
          JSON.stringify(parsed.features || []),
          parsed.displayOrder,
          req.user?.id || null,
        ]
      );
      await audit(req, "platform.plan.upsert", "platform_partner_plan", rows[0].id, rows[0]);
      res.json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid plan" });
      }
      res.status(500).json({ success: false, message: "Failed to save platform plan" });
    }
  });

  app.patch("/api/platform/superadmins/:id/status", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const status = z.enum(["active", "inactive"]).parse(req.body?.status);
      const [updated] = await db
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(users.id, req.params.id), eq(users.role, "superadmin")))
        .returning({ id: users.id, status: users.status });

      if (!updated) return res.status(404).json({ success: false, message: "Superadmin not found" });
      await audit(req, "update_superadmin_status", "user", updated.id, { status });
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid status update" });
    }
  });

  app.patch("/api/platform/superadmins/:id", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = updateSuperadminSchema.parse(req.body);
      if (!Object.keys(parsed).length) {
        return res.status(400).json({ success: false, message: "No profile changes provided" });
      }

      const before = await pool.query(
        `SELECT id, username, email, first_name, last_name, status FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted'`,
        [req.params.id]
      );
      if (!before.rows[0]) return res.status(404).json({ success: false, message: "Superadmin not found" });

      const duplicate = await pool.query(
        `SELECT id FROM users WHERE id <> $1 AND ($2::text IS NOT NULL AND email=$2 OR $3::text IS NOT NULL AND username=$3) LIMIT 1`,
        [req.params.id, parsed.email || null, parsed.username || null]
      );
      if (duplicate.rows[0]) return res.status(409).json({ success: false, message: "Email or username already exists." });

      const updated = await pool.query(
        `UPDATE users
         SET username=COALESCE($2, username),
             email=COALESCE($3, email),
             first_name=COALESCE($4, first_name),
             last_name=$5,
             updated_at=NOW()
         WHERE id=$1 AND role='superadmin' AND status <> 'deleted'
         RETURNING id, username, email, first_name AS "firstName", last_name AS "lastName", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          req.params.id,
          parsed.username || null,
          parsed.email || null,
          parsed.firstName || null,
          parsed.lastName === undefined ? before.rows[0].last_name : parsed.lastName,
        ]
      );

      await audit(req, "update_superadmin_profile", "user", req.params.id, parsed);
      res.json({ success: true, data: updated.rows[0] });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid profile update" });
      }
      console.error("[platform] update superadmin failed:", error);
      res.status(500).json({ success: false, message: "Failed to update superadmin" });
    }
  });

  app.patch("/api/platform/superadmins/:id/password", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = passwordSchema.parse(req.body);
      const updated = await pool.query(
        `UPDATE users SET password=$2, updated_at=NOW() WHERE id=$1 AND role='superadmin' AND status <> 'deleted' RETURNING id, email`,
        [req.params.id, await bcrypt.hash(parsed.password, 10)]
      );
      if (!updated.rows[0]) return res.status(404).json({ success: false, message: "Superadmin not found" });
      await audit(req, "reset_superadmin_password", "user", req.params.id, { email: updated.rows[0].email });
      res.json({ success: true });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid password" });
      }
      res.status(500).json({ success: false, message: "Failed to reset password" });
    }
  });

  app.delete("/api/platform/superadmins/:id", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query(
        `SELECT id, username, email, first_name, last_name, status FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted' FOR UPDATE`,
        [req.params.id]
      );
      const superadmin = before.rows[0];
      if (!superadmin) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Superadmin not found" });
      }

      await client.query(
        `UPDATE white_label_domains SET status='inactive', ssl_status='pending', updated_at=NOW() WHERE superadmin_id=$1`,
        [req.params.id]
      );
      await client.query(
        `UPDATE users
         SET status='deleted',
             email=$2,
             username=$3,
             updated_at=NOW()
         WHERE id=$1`,
        [
          req.params.id,
          `deleted+${req.params.id}+${superadmin.email}`,
          `deleted_${req.params.id.slice(0, 8)}_${superadmin.username}`,
        ]
      );
      await client.query("COMMIT");
      await audit(req, "delete_superadmin", "user", req.params.id, { email: superadmin.email, safeDelete: true });
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("[platform] delete superadmin failed:", error);
      res.status(500).json({ success: false, message: "Failed to delete superadmin safely" });
    } finally {
      client.release();
    }
  });

  app.post("/api/platform/superadmins/:id/impersonate", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const session = (req as any).session;
    const current = session?.user;
    if (!current || current.role !== "platform_admin") return res.status(403).json({ success: false, message: "Platform admin required" });

    const target = await pool.query(
      `SELECT * FROM users WHERE id=$1 AND role='superadmin' AND status='active' LIMIT 1`,
      [req.params.id]
    );
    const superadmin = target.rows[0];
    if (!superadmin) return res.status(404).json({ success: false, message: "Active superadmin not found" });

    session.originalPlatformAdmin = session.originalPlatformAdmin || current;
    session.impersonation = {
      active: true,
      platformAdminId: current.id,
      superadminId: superadmin.id,
      startedAt: new Date().toISOString(),
    };
    session.user = sessionUserFromRow(superadmin, current.id);
    await audit(req, "impersonation.start", "superadmin", superadmin.id, { platformAdmin: current.id });
    session.save((err: Error | null) => {
      if (err) return res.status(500).json({ success: false, message: "Unable to start impersonation" });
      res.json({ success: true, redirectTo: "/dashboard", user: session.user });
    });
  });

  app.get("/api/platform/superadmins/:id/details", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const owner = await pool.query(
      `SELECT id, username, email, first_name AS "firstName", last_name AS "lastName", status, created_at AS "createdAt"
       FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted'`,
      [req.params.id]
    );
    if (!owner.rows[0]) return res.status(404).json({ success: false, message: "Superadmin not found" });

    const clients = await pool.query(
      `SELECT u.id, u.public_client_id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at,
        COUNT(DISTINCT c.id)::int AS workspaces,
        COALESCE(MAX(t.balance_after),0)::numeric AS credit_balance
       FROM users u
       LEFT JOIN channels c ON c.created_by = u.id OR c.white_label_client_id = u.id
       LEFT JOIN white_label_credit_transactions t ON t.client_id = u.id
       WHERE u.role='admin' AND u.created_by=$1
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [req.params.id]
    );

    const workspaces = await pool.query(
      `SELECT c.id, c.name,
              CASE WHEN COALESCE(c.is_active, false) THEN 'active' ELSE 'inactive' END AS status,
              c.is_active, c.created_at, c.white_label_points, c.white_label_workspace_type,
              owner.id AS owner_id, owner.email AS owner_email, owner.username AS owner_username
       FROM channels c
       LEFT JOIN users owner ON owner.id = COALESCE(c.white_label_client_id, c.created_by)
       WHERE owner.role='admin' AND owner.created_by=$1
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );

    const subscriptionsResult = await pool.query(
      `SELECT s.id, s.status, s.billing_cycle, s.start_date, s.end_date, s.auto_renew, p.name AS plan_name, u.email AS client_email
       FROM subscriptions s
       JOIN users u ON u.id=s.user_id
       LEFT JOIN plans p ON p.id=s.plan_id
       WHERE u.role='admin' AND u.created_by=$1
       ORDER BY s.created_at DESC
       LIMIT 25`,
      [req.params.id]
    );

    const controls = await pool.query(
      `SELECT id, superadmin_id AS "superadminId", plan_name AS "planName", client_limit AS "clientLimit",
              workspace_limit AS "workspaceLimit", credit_balance AS "creditBalance", notes,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM platform_superadmin_controls
       WHERE superadmin_id=$1`,
      [req.params.id]
    );
    res.json({
      success: true,
      data: {
        superadmin: owner.rows[0],
        controls: controls.rows[0] || null,
        clients: clients.rows,
        workspaces: workspaces.rows,
        subscriptions: subscriptionsResult.rows,
      },
    });
  });

  app.get("/api/platform/superadmins/:id/billing", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const owner = await pool.query(
      `SELECT id, username, email, first_name AS "firstName", last_name AS "lastName", status
       FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted'`,
      [req.params.id]
    );
    if (!owner.rows[0]) return res.status(404).json({ success: false, message: "Superadmin not found" });

    const plans = await pool.query(
      `SELECT id, plan_key AS "planKey", name, description, status, monthly_price AS "monthlyPrice",
              yearly_price AS "yearlyPrice", currency, client_limit AS "clientLimit",
              workspace_limit AS "workspaceLimit", domain_limit AS "domainLimit",
              included_credits AS "includedCredits", trial_days AS "trialDays", features,
              display_order AS "displayOrder"
       FROM platform_partner_plans
       ORDER BY display_order ASC, monthly_price ASC`
    );

    const subscription = await pool.query(
      `SELECT s.id, s.superadmin_id AS "superadminId", s.plan_id AS "planId", s.status,
              s.billing_cycle AS "billingCycle", s.start_date AS "startDate", s.end_date AS "endDate",
              s.auto_renew AS "autoRenew", s.client_limit AS "clientLimit", s.workspace_limit AS "workspaceLimit",
              s.domain_limit AS "domainLimit", s.included_credits AS "includedCredits", s.price, s.currency,
              s.notes, s.created_at AS "createdAt", s.updated_at AS "updatedAt",
              p.name AS "planName"
       FROM platform_partner_subscriptions s
       LEFT JOIN platform_partner_plans p ON p.id=s.plan_id
       WHERE s.superadmin_id=$1
       ORDER BY
         CASE WHEN s.status IN ('active','trialing','past_due') THEN 0 ELSE 1 END,
         s.created_at DESC
       LIMIT 1`,
      [req.params.id]
    );

    const ledger = await pool.query(
      `SELECT id, superadmin_id AS "superadminId", subscription_id AS "subscriptionId",
              transaction_type AS "transactionType", credits, balance_before AS "balanceBefore",
              balance_after AS "balanceAfter", reference, note, created_at AS "createdAt"
       FROM platform_partner_credit_transactions
       WHERE superadmin_id=$1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [req.params.id]
    );

    const usage = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM users u WHERE u.role='admin' AND u.created_by=$1 AND COALESCE(u.status,'') <> 'deleted') AS clients,
        (SELECT COUNT(DISTINCT c.id)::int
         FROM channels c
         JOIN users owner ON owner.id = COALESCE(c.white_label_client_id, c.created_by)
         WHERE owner.role='admin' AND owner.created_by=$1) AS workspaces,
        (SELECT COUNT(*)::int FROM white_label_domains d WHERE d.superadmin_id=$1) AS domains`,
      [req.params.id]
    );

    const payments = await pool.query(
      `SELECT id, provider, provider_payment_intent_id AS "providerPaymentIntentId", amount, currency,
              billing_cycle AS "billingCycle", status, checkout_url AS "checkoutUrl", embedded_url AS "embeddedUrl",
              paid_at AS "paidAt", created_at AS "createdAt", updated_at AS "updatedAt",
              failure_code AS "failureCode", failure_message AS "failureMessage"
       FROM platform_partner_payments
       WHERE superadmin_id=$1
       ORDER BY created_at DESC
       LIMIT 25`,
      [req.params.id]
    );

    const invoices = await pool.query(
      `SELECT id, invoice_number AS "invoiceNumber", subscription_id AS "subscriptionId",
              payment_id AS "paymentId", status, amount, currency, billing_cycle AS "billingCycle",
              period_start AS "periodStart", period_end AS "periodEnd", due_at AS "dueAt",
              paid_at AS "paidAt", failure_message AS "failureMessage", hosted_url AS "hostedUrl",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM platform_partner_invoices
       WHERE superadmin_id=$1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    const dunningEvents = await pool.query(
      `SELECT id, subscription_id AS "subscriptionId", invoice_id AS "invoiceId",
              event_type AS "eventType", status, message, next_retry_at AS "nextRetryAt",
              metadata, created_at AS "createdAt"
       FROM platform_partner_dunning_events
       WHERE superadmin_id=$1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        superadmin: owner.rows[0],
        plans: plans.rows,
        subscription: subscription.rows[0] || null,
        ledger: ledger.rows,
        payments: payments.rows,
        invoices: invoices.rows,
        dunningEvents: dunningEvents.rows,
        balance: await getPartnerCreditBalance(req.params.id),
        usage: usage.rows[0] || { clients: 0, workspaces: 0, domains: 0 },
      },
    });
  });

  app.post("/api/platform/billing/run-renewals", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const renewals = await processPlatformPartnerRenewals({ baseUrl });
      const dunning = await processPlatformPartnerDunning({ baseUrl });
      await audit(req, "platform.billing.run_renewals", "platform_partner_billing", undefined, { renewals, dunning });
      res.json({ success: true, data: { renewals, dunning } });
    } catch (error: any) {
      console.error("[platform] renewal runner failed:", error);
      res.status(500).json({ success: false, message: "Failed to run partner billing renewals" });
    }
  });

  app.get("/api/platform/invoices/:invoiceId/html", requireAuth, async (req: Request, res: Response) => {
    const invoiceResult = await pool.query(
      `SELECT i.*, u.email, u.first_name, u.last_name, u.username, p.name AS plan_name
       FROM platform_partner_invoices i
       JOIN users u ON u.id=i.superadmin_id
       LEFT JOIN platform_partner_subscriptions s ON s.id=i.subscription_id
       LEFT JOIN platform_partner_plans p ON p.id=s.plan_id
       WHERE i.id=$1`,
      [req.params.invoiceId]
    );
    const invoice = invoiceResult.rows[0];
    if (!invoice) return res.status(404).send("Invoice not found");

    const currentUser = req.user as any;
    const canView = currentUser?.role === "platform_admin" || currentUser?.id === invoice.superadmin_id;
    if (!canView) return res.status(403).send("Forbidden");

    const name = [invoice.first_name, invoice.last_name].filter(Boolean).join(" ") || invoice.username || invoice.email;
    const money = `${invoice.currency} ${Number(invoice.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${invoice.invoice_number}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; background: #f8fafc; }
      main { max-width: 760px; margin: 32px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 32px; }
      h1 { margin: 0; font-size: 32px; }
      .muted { color: #64748b; }
      .row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 14px 0; gap: 24px; }
      .total { font-size: 24px; font-weight: 800; }
      .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #dcfce7; color: #166534; font-weight: 700; }
      @media print { body { background: #fff; } main { border: 0; margin: 0; max-width: none; } }
    </style>
  </head>
  <body>
    <main>
      <div class="row">
        <div>
          <h1>Invoice</h1>
          <p class="muted">${invoice.invoice_number}</p>
        </div>
        <div><span class="pill">${invoice.status}</span></div>
      </div>
      <div class="row"><strong>Partner</strong><span>${name}<br /><span class="muted">${invoice.email}</span></span></div>
      <div class="row"><strong>Plan</strong><span>${invoice.plan_name || "Partner subscription"}</span></div>
      <div class="row"><strong>Billing cycle</strong><span>${invoice.billing_cycle}</span></div>
      <div class="row"><strong>Period</strong><span>${invoice.period_start ? new Date(invoice.period_start).toLocaleDateString() : "-"} - ${invoice.period_end ? new Date(invoice.period_end).toLocaleDateString() : "-"}</span></div>
      <div class="row"><strong>Due</strong><span>${invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : "-"}</span></div>
      <div class="row total"><strong>Total</strong><span>${money}</span></div>
      ${invoice.failure_message ? `<p style="color:#b91c1c">${invoice.failure_message}</p>` : ""}
    </main>
  </body>
</html>`);
  });

  app.patch("/api/platform/superadmins/:id/subscription", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const parsed = partnerSubscriptionSchema.parse(req.body);
      await client.query("BEGIN");

      const owner = await client.query(`SELECT id FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted' FOR UPDATE`, [req.params.id]);
      if (!owner.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Superadmin not found" });
      }

      const planResult = await client.query(`SELECT * FROM platform_partner_plans WHERE id=$1`, [parsed.planId]);
      const plan = planResult.rows[0];
      if (!plan) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Platform plan not found" });
      }

      await client.query(
        `UPDATE platform_partner_subscriptions
         SET status='cancelled', updated_at=NOW()
         WHERE superadmin_id=$1 AND status IN ('active','trialing','past_due')`,
        [req.params.id]
      );

      const billingCycle = parsed.billingCycle;
      const price = parsed.price ?? (billingCycle === "yearly" ? Number(plan.yearly_price || 0) : Number(plan.monthly_price || 0));
      const clientLimit = parsed.clientLimit ?? plan.client_limit ?? null;
      const workspaceLimit = parsed.workspaceLimit ?? plan.workspace_limit ?? null;
      const domainLimit = parsed.domainLimit ?? plan.domain_limit ?? null;
      const includedCredits = parsed.includedCredits ?? Number(plan.included_credits || 0);
      const currency = parsed.currency || plan.currency || "USD";

      const inserted = await client.query(
        `INSERT INTO platform_partner_subscriptions
           (superadmin_id, plan_id, status, billing_cycle, start_date, end_date, auto_renew, client_limit,
            workspace_limit, domain_limit, included_credits, price, currency, notes, created_by)
         VALUES ($1,$2,$3,$4,COALESCE($5,NOW()),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id, superadmin_id AS "superadminId", plan_id AS "planId", status,
           billing_cycle AS "billingCycle", start_date AS "startDate", end_date AS "endDate",
           auto_renew AS "autoRenew", client_limit AS "clientLimit", workspace_limit AS "workspaceLimit",
           domain_limit AS "domainLimit", included_credits AS "includedCredits", price, currency, notes`,
        [
          req.params.id,
          parsed.planId,
          parsed.status,
          billingCycle,
          dateOrNull(parsed.startDate),
          dateOrNull(parsed.endDate),
          parsed.autoRenew,
          clientLimit,
          workspaceLimit,
          domainLimit,
          includedCredits,
          price,
          currency,
          parsed.notes || null,
          req.user?.id || null,
        ]
      );

      const subscription = inserted.rows[0];
      if (parsed.grantIncludedCredits && includedCredits > 0) {
        await addPartnerCreditTransaction({
          superadminId: req.params.id,
          subscriptionId: subscription.id,
          transactionType: "plan_grant",
          credits: includedCredits,
          reference: `plan:${plan.plan_key}`,
          note: `Included credits for ${plan.name}`,
          createdBy: req.user?.id || null,
        }, client);
      }

      const balance = await getPartnerCreditBalance(req.params.id, client);
      await syncPartnerControls(req.params.id, {
        planName: plan.name,
        clientLimit,
        workspaceLimit,
        creditBalance: balance,
        notes: parsed.notes || null,
        createdBy: req.user?.id || null,
      }, client);

      await client.query("COMMIT");
      await audit(req, "platform.subscription.assign", "platform_partner_subscription", subscription.id, { superadminId: req.params.id, plan: plan.name, status: parsed.status });
      res.json({ success: true, data: subscription });
    } catch (error: any) {
      await client.query("ROLLBACK");
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid subscription" });
      }
      console.error("[platform] subscription update failed:", error);
      res.status(500).json({ success: false, message: "Failed to update partner subscription" });
    } finally {
      client.release();
    }
  });

  app.post("/api/platform/superadmins/:id/ziina-checkout", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const env = getZiinaEnv();
      if (!env.enabled) return res.status(503).json({ success: false, message: "Ziina payments are disabled" });

      const provider = await getActiveZiinaProvider();
      if (!provider) return res.status(400).json({ success: false, message: "Ziina payment provider is not active" });

      const parsed = partnerZiinaCheckoutSchema.parse(req.body);
      const owner = await pool.query(
        `SELECT id, email, first_name AS "firstName", last_name AS "lastName", status
         FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted'`,
        [req.params.id]
      );
      if (!owner.rows[0]) return res.status(404).json({ success: false, message: "Superadmin not found" });
      if (owner.rows[0].status !== "active") return res.status(409).json({ success: false, message: "Activate this superadmin before creating a checkout" });

      const planResult = await pool.query(`SELECT * FROM platform_partner_plans WHERE id=$1 AND status='active'`, [parsed.planId]);
      const plan = planResult.rows[0];
      if (!plan) return res.status(404).json({ success: false, message: "Active platform plan not found" });

      const price = parsed.billingCycle === "yearly" ? Number(plan.yearly_price || 0) : Number(plan.monthly_price || 0);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ success: false, message: "Selected plan has no payable Ziina price for this cycle" });
      }

      const currency = parsed.currency || plan.currency || "AED";
      const metadata = {
        billingCycle: parsed.billingCycle,
        startDate: parsed.startDate || null,
        endDate: parsed.endDate || null,
        autoRenew: parsed.autoRenew,
        clientLimit: parsed.clientLimit ?? plan.client_limit ?? null,
        workspaceLimit: parsed.workspaceLimit ?? plan.workspace_limit ?? null,
        domainLimit: parsed.domainLimit ?? plan.domain_limit ?? null,
        includedCredits: parsed.includedCredits ?? Number(plan.included_credits || 0),
        grantIncludedCredits: parsed.grantIncludedCredits,
        notes: parsed.notes || null,
        createdBy: req.user?.id || null,
      };

      const inserted = await pool.query(
        `INSERT INTO platform_partner_payments
           (superadmin_id, plan_id, provider, amount, currency, billing_cycle, status, metadata, created_by)
         VALUES ($1,$2,'ziina',$3,$4,$5,'pending',$6,$7)
         RETURNING *`,
        [req.params.id, plan.id, price.toFixed(2), currency, parsed.billingCycle, JSON.stringify(metadata), req.user?.id || null]
      );
      const payment = inserted.rows[0];

      const amountMinor = amountToMinorUnits(price, currency);
      const successUrl = ziinaResultUrl(env.successUrl, payment.id);
      const cancelUrl = ziinaResultUrl(env.cancelUrl, payment.id);
      const intent = await createPaymentIntent({
        amount: amountMinor,
        currencyCode: currency,
        message: `${plan.name} partner ${parsed.billingCycle} subscription`,
        successUrl,
        cancelUrl,
        metadata: {
          paymentId: payment.id,
          superadminId: req.params.id,
          planId: plan.id,
          purpose: "platform_partner_subscription",
        },
      });
      const checkoutUrl = getIntentCheckoutUrl(intent);

      const updated = await pool.query(
        `UPDATE platform_partner_payments
         SET provider_payment_intent_id=$2, provider_payment_id=$2, checkout_url=$3, embedded_url=$4,
             provider_payload=$5, updated_at=NOW()
         WHERE id=$1
         RETURNING id, provider_payment_intent_id AS "paymentIntentId", checkout_url AS "checkoutUrl",
           embedded_url AS "embeddedUrl", status`,
        [payment.id, intent.id, checkoutUrl, checkoutUrl, JSON.stringify(sanitizeZiinaPayload(intent))]
      );

      await audit(req, "platform.payment.ziina.create", "platform_partner_payment", payment.id, {
        superadminId: req.params.id,
        plan: plan.name,
        amount: price,
        currency,
        billingCycle: parsed.billingCycle,
      });

      res.json({
        success: true,
        data: {
          paymentId: updated.rows[0].id,
          paymentIntentId: updated.rows[0].paymentIntentId,
          embeddedUrl: updated.rows[0].embeddedUrl,
          redirectUrl: updated.rows[0].checkoutUrl,
          status: updated.rows[0].status,
        },
      });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid Ziina checkout request" });
      }
      const status = error instanceof ZiinaProviderError ? error.status || 502 : error.status || 500;
      console.error("[platform] Ziina checkout failed:", error);
      res.status(status).json({ success: false, message: status >= 500 ? "Unable to create Ziina checkout" : error.message });
    }
  });

  app.get("/api/platform/ziina/:paymentId/status", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT * FROM platform_partner_payments WHERE id=$1 AND provider='ziina' LIMIT 1`,
        [req.params.paymentId]
      );
      let payment = result.rows[0];
      if (!payment) return res.status(404).json({ success: false, message: "Platform payment not found" });

      if (payment.provider_payment_intent_id && !["completed", "failed", "cancelled", "refunded"].includes(payment.status)) {
        try {
          const intent = await getPaymentIntent(payment.provider_payment_intent_id);
          const status = normalizeZiinaStatus(intent.status);
          const updated = await pool.query(
            `UPDATE platform_partner_payments
             SET status=$2, provider_payload=$3, failure_code=$4, failure_message=$5,
                 paid_at=CASE WHEN $2='completed' THEN COALESCE(paid_at,NOW()) ELSE paid_at END,
                 updated_at=NOW()
             WHERE id=$1
             RETURNING *`,
            [
              payment.id,
              status,
              JSON.stringify(sanitizeZiinaPayload(intent)),
              (intent as any).failure_code || (intent as any).error_code || null,
              (intent as any).failure_message || (intent as any).error_message || null,
            ]
          );
          payment = updated.rows[0] || payment;
        } catch {
          // Keep the local status if Ziina reconciliation is temporarily unavailable.
        }
      }

      let activation = null;
      if (payment.status === "completed" && !payment.subscription_id) {
        activation = await activatePlatformPartnerPayment(payment.id, "status_poll");
        const refreshed = await pool.query(`SELECT * FROM platform_partner_payments WHERE id=$1`, [payment.id]);
        payment = refreshed.rows[0] || payment;
      }

      res.json({
        success: true,
        paymentId: payment.id,
        status: payment.status,
        paidAt: payment.paid_at,
        subscriptionActivated: Boolean(payment.subscription_id || activation?.activated),
        subscriptionId: payment.subscription_id || activation?.subscriptionId || null,
      });
    } catch (error: any) {
      console.error("[platform] Ziina status failed:", error);
      res.status(500).json({ success: false, message: "Unable to fetch platform Ziina status" });
    }
  });

  app.post("/api/platform/superadmins/:id/credits", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = partnerCreditSchema.parse(req.body);
      const owner = await pool.query(`SELECT id FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted'`, [req.params.id]);
      if (!owner.rows[0]) return res.status(404).json({ success: false, message: "Superadmin not found" });

      const currentSubscription = await pool.query(
        `SELECT id FROM platform_partner_subscriptions WHERE superadmin_id=$1 AND status IN ('active','trialing','past_due') LIMIT 1`,
        [req.params.id]
      );
      const transaction = await addPartnerCreditTransaction({
        superadminId: req.params.id,
        subscriptionId: currentSubscription.rows[0]?.id || null,
        transactionType: parsed.transactionType === "adjustment" ? "manual_adjustment" : parsed.transactionType,
        credits: parsed.credits,
        reference: parsed.reference || "manual",
        note: parsed.note || null,
        createdBy: req.user?.id || null,
      });
      await audit(req, "platform.credits.adjust", "platform_partner_credit_transaction", transaction.id, transaction);
      res.json({ success: true, data: transaction });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid credit transaction" });
      }
      console.error("[platform] credit adjustment failed:", error);
      res.status(500).json({ success: false, message: "Failed to adjust partner credits" });
    }
  });

  app.get("/api/platform/superadmins/:id/controls", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const result = await pool.query(
      `INSERT INTO platform_superadmin_controls (superadmin_id, created_by)
       SELECT $1, $2
       WHERE EXISTS (SELECT 1 FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted')
       ON CONFLICT (superadmin_id) DO UPDATE SET updated_at=platform_superadmin_controls.updated_at
       RETURNING id, superadmin_id AS "superadminId", plan_name AS "planName", client_limit AS "clientLimit",
         workspace_limit AS "workspaceLimit", credit_balance AS "creditBalance", notes, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [req.params.id, req.user?.id || null]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Superadmin not found" });
    res.json({ success: true, data: result.rows[0] });
  });

  app.patch("/api/platform/superadmins/:id/controls", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = controlsSchema.parse(req.body);
      const result = await pool.query(
        `INSERT INTO platform_superadmin_controls
           (superadmin_id, plan_name, client_limit, workspace_limit, credit_balance, notes, created_by)
         SELECT $1, COALESCE($2, 'Starter Partner'), $3, $4, COALESCE($5, 0), $6, $7
         WHERE EXISTS (SELECT 1 FROM users WHERE id=$1 AND role='superadmin' AND status <> 'deleted')
         ON CONFLICT (superadmin_id) DO UPDATE
         SET plan_name=COALESCE($2, platform_superadmin_controls.plan_name),
             client_limit=$3,
             workspace_limit=$4,
             credit_balance=COALESCE($5, platform_superadmin_controls.credit_balance),
             notes=$6,
             updated_at=NOW()
         RETURNING id, superadmin_id AS "superadminId", plan_name AS "planName", client_limit AS "clientLimit",
           workspace_limit AS "workspaceLimit", credit_balance AS "creditBalance", notes, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          req.params.id,
          parsed.planName || null,
          parsed.clientLimit ?? null,
          parsed.workspaceLimit ?? null,
          parsed.creditBalance ?? null,
          parsed.notes ?? null,
          req.user?.id || null,
        ]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, message: "Superadmin not found" });
      await audit(req, "update_superadmin_controls", "platform_superadmin_controls", req.params.id, parsed);
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid controls" });
      }
      res.status(500).json({ success: false, message: "Failed to update controls" });
    }
  });

  app.get("/api/platform/superadmins/:id/domains", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT d.id, d.superadmin_id AS "superadminId", d.domain, d.status,
              d.verification_token AS "verificationToken", d.ssl_status AS "sslStatus",
              d.notes, d.verified_at AS "verifiedAt", d.created_at AS "createdAt", d.updated_at AS "updatedAt",
              u.status AS "superadminStatus",
              sub.status AS "subscriptionStatus",
              sub.end_date AS "subscriptionEndDate",
              CASE
                WHEN u.status <> 'active' THEN 'Superadmin inactive'
                WHEN d.status <> 'active' THEN 'Domain inactive'
                WHEN sub.status IS NOT NULL AND sub.status NOT IN ('active', 'trialing') THEN 'Partner subscription inactive'
                WHEN sub.end_date IS NOT NULL AND sub.end_date <= NOW() THEN 'Partner subscription expired'
                ELSE NULL
              END AS "blockedReason"
       FROM white_label_domains d
       JOIN users u ON u.id=d.superadmin_id
       LEFT JOIN LATERAL (
         SELECT status, end_date
         FROM platform_partner_subscriptions s
         WHERE s.superadmin_id=d.superadmin_id
         ORDER BY CASE WHEN s.status IN ('active', 'trialing', 'past_due') THEN 0 ELSE 1 END, s.created_at DESC
         LIMIT 1
       ) sub ON true
       WHERE d.superadmin_id=$1
       ORDER BY d.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  });

  app.post("/api/platform/superadmins/:id/domains", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = domainSchema.parse(req.body);
      const domain = normalizeDomain(parsed.domain);
      const [owner] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, req.params.id), eq(users.role, "superadmin")))
        .limit(1);

      if (!owner) return res.status(404).json({ success: false, message: "Superadmin not found" });

      const limitResult = await pool.query(
        `SELECT domain_limit
         FROM platform_partner_subscriptions
         WHERE superadmin_id=$1 AND status IN ('active', 'trialing', 'past_due')
         ORDER BY created_at DESC
         LIMIT 1`,
        [owner.id]
      );
      const domainLimit = limitResult.rows[0]?.domain_limit;
      if (domainLimit !== null && domainLimit !== undefined) {
        const countResult = await pool.query(
          `SELECT COUNT(*)::int AS count FROM white_label_domains WHERE superadmin_id=$1`,
          [owner.id]
        );
        if (Number(countResult.rows[0]?.count || 0) >= Number(domainLimit)) {
          return res.status(403).json({
            success: false,
            message: "Partner domain limit reached. Increase this superadmin subscription limit before adding another domain.",
          });
        }
      }

      const [created] = await db
        .insert(whiteLabelDomains)
        .values({
          superadminId: owner.id,
          domain,
          status: "pending",
          verificationToken: `whatsway-${randomBytes(16).toString("hex")}`,
          sslStatus: "pending",
          notes: parsed.notes || null,
          createdBy: req.user?.id || null,
        })
        .returning();

      await audit(req, "create_partner_domain", "white_label_domain", created.id, { domain, superadminId: owner.id });
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ success: false, message: "Domain already exists." });
      }
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: error.errors?.[0]?.message || "Invalid domain" });
      }
      console.error("[platform] create domain failed:", error);
      res.status(500).json({ success: false, message: "Failed to add domain" });
    }
  });

  app.patch("/api/platform/domains/:id/status", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const status = z.enum(["pending", "active", "inactive"]).parse(req.body?.status);
      const [updated] = await db
        .update(whiteLabelDomains)
        .set({
          status,
          sslStatus: status === "active" ? "active" : "pending",
          verifiedAt: status === "active" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(whiteLabelDomains.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ success: false, message: "Domain not found" });
      await audit(req, "update_partner_domain_status", "white_label_domain", updated.id, { status });
      res.json({ success: true, data: updated });
    } catch {
      res.status(400).json({ success: false, message: "Invalid domain status" });
    }
  });

  app.get("/api/platform/domains/:id/check", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT d.id, d.domain, d.status, d.ssl_status, u.status AS superadmin_status,
              sub.status AS subscription_status, sub.end_date AS subscription_end_date
       FROM white_label_domains d
       JOIN users u ON u.id=d.superadmin_id
       LEFT JOIN LATERAL (
         SELECT status, end_date
         FROM platform_partner_subscriptions s
         WHERE s.superadmin_id=d.superadmin_id
         ORDER BY CASE WHEN s.status IN ('active', 'trialing', 'past_due') THEN 0 ELSE 1 END, s.created_at DESC
         LIMIT 1
       ) sub ON true
       WHERE d.id=$1`,
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ success: false, message: "Domain not found" });
    const subscriptionExpired = Boolean(row.subscription_end_date && new Date(row.subscription_end_date).getTime() <= Date.now());
    const subscriptionBlocked = Boolean(
      row.subscription_status &&
      (!["active", "trialing"].includes(row.subscription_status) || subscriptionExpired)
    );

    const checks: Record<string, unknown> = {
      domain: row.domain,
      domainStatus: row.status,
      superadminStatus: row.superadmin_status,
      subscriptionStatus: row.subscription_status || "not assigned",
      subscriptionEndDate: row.subscription_end_date || null,
      allowed: row.status === "active" && row.superadmin_status === "active" && !subscriptionBlocked,
    };

    try {
      const records = await dns.lookup(row.domain, { all: true });
      checks.dns = records.map((record) => record.address);
      checks.dnsOk = records.length > 0;
    } catch (error: any) {
      checks.dnsOk = false;
      checks.dnsError = error?.code || error?.message || "DNS lookup failed";
    }

    if (row.superadmin_status !== "active") {
      checks.blockedReason = "Superadmin inactive";
    } else if (row.status !== "active") {
      checks.blockedReason = "Domain inactive";
    } else if (row.subscription_status && !["active", "trialing"].includes(row.subscription_status)) {
      checks.blockedReason = "Partner subscription inactive";
    } else if (subscriptionExpired) {
      checks.blockedReason = "Partner subscription expired";
    }

    await audit(req, "check_partner_domain", "white_label_domain", row.id, checks);
    res.json({ success: true, data: checks });
  });

  app.get("/api/platform/audit-logs", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);
    const { rows } = await pool.query(
      `SELECT a.id, a.action_type, a.target_type, a.target_id, a.previous_values, a.updated_values,
              a.ip_address, a.user_agent, a.created_at,
              actor.email AS actor_email, actor.role AS actor_role
       FROM white_label_audit_logs a
       LEFT JOIN users actor ON actor.id=a.actor_id
       WHERE a.action_type LIKE 'create_superadmin%'
          OR a.action_type LIKE 'update_superadmin%'
          OR a.action_type LIKE 'delete_superadmin%'
          OR a.action_type LIKE 'reset_superadmin%'
          OR a.action_type LIKE 'create_partner_domain%'
          OR a.action_type LIKE 'update_partner_domain%'
          OR a.action_type LIKE 'check_partner_domain%'
          OR a.action_type LIKE 'impersonation.%'
          OR a.action_type LIKE 'platform.plan.%'
          OR a.action_type LIKE 'platform.subscription.%'
          OR a.action_type LIKE 'platform.credits.%'
          OR a.action_type LIKE 'platform.payment.%'
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, data: rows });
  });

  app.get("/api/tenant/current", async (req: Request, res: Response) => {
    const { resolveTenantFromRequest, requestHost } = await import("../services/tenant-domain.service");
    const tenant = await resolveTenantFromRequest(req);
    res.json({ host: requestHost(req), tenant });
  });

  app.get("/api/tenant/allow-domain", async (req: Request, res: Response) => {
    const { normalizeHost, requestHost, resolveTenantByHost } = await import("../services/tenant-domain.service");
    const domain = normalizeHost(String(req.query.domain || req.query.host || requestHost(req)));
    const tenant = await resolveTenantByHost(domain);

    if (!tenant) {
      return res.status(403).json({ allowed: false, domain });
    }

    res.json({
      allowed: true,
      domain,
      tenant: {
        domainId: tenant.domainId,
        superadminId: tenant.superadminId,
      },
    });
  });
}
