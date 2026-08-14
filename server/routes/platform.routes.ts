import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
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

  app.get("/api/platform/superadmins/:id/domains", requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(whiteLabelDomains)
      .where(eq(whiteLabelDomains.superadminId, req.params.id))
      .orderBy(desc(whiteLabelDomains.createdAt));
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
