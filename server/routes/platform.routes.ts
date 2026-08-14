import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import dns from "dns/promises";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "../db";
import { requireAuth, requirePlatformAdmin } from "../middlewares/auth.middleware";
import { users, whiteLabelDomains } from "@shared/schema";

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
      `SELECT c.id, c.name, c.status, c.is_active, c.created_at, c.white_label_points, c.white_label_workspace_type,
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
              CASE
                WHEN u.status <> 'active' THEN 'Superadmin inactive'
                WHEN d.status <> 'active' THEN 'Domain inactive'
                ELSE NULL
              END AS "blockedReason"
       FROM white_label_domains d
       JOIN users u ON u.id=d.superadmin_id
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
      `SELECT d.id, d.domain, d.status, d.ssl_status, u.status AS superadmin_status
       FROM white_label_domains d
       JOIN users u ON u.id=d.superadmin_id
       WHERE d.id=$1`,
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ success: false, message: "Domain not found" });

    const checks: Record<string, unknown> = {
      domain: row.domain,
      domainStatus: row.status,
      superadminStatus: row.superadmin_status,
      allowed: row.status === "active" && row.superadmin_status === "active",
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
