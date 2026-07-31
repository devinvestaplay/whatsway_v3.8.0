import type { Express, Request, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireSuperadmin } from "../middlewares/auth.middleware";
import { resolveUserPermissions } from "../utils/role-permissions";

const BASE = "/api/superadmin/white-label";
const guard = [requireAuth, requireSuperadmin] as const;

const settingsDefaults = {
  platform_name: "Whatsway",
  brand_tagline: "Build AI Agents on WhatsApp that qualify and convert 24/7",
  support_email: "support@whatsway.com",
  support_phone: "",
  primary_color: "#16a34a",
  secondary_color: "#111827",
  accent_color: "#22c55e",
  email_from_name: "Whatsway",
};

const settingsSchema = z.object({
  platformName: z.string().min(1).max(120),
  brandTagline: z.string().max(240).optional().nullable(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().max(40).optional().nullable(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  mainLogo: z.string().max(1000).optional().nullable(),
  darkModeLogo: z.string().max(1000).optional().nullable(),
  favicon: z.string().max(1000).optional().nullable(),
  loginBanner: z.string().max(1000).optional().nullable(),
  footerText: z.string().max(500).optional().nullable(),
  customDomain: z.string().max(255).optional().nullable(),
  emailFromName: z.string().max(120).optional().nullable(),
  emailFromAddress: z.string().email().optional().or(z.literal("")),
  hidePoweredBy: z.boolean().optional(),
  allowPartnerSignup: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
});

const partnerSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  companyName: z.string().max(160).optional().nullable(),
  status: z.enum(["active", "inactive", "paused"]).default("active"),
  commissionRate: z.coerce.number().min(0).max(100).default(0),
  revenueShareRate: z.coerce.number().min(0).max(100).default(0),
  payoutMethod: z.string().max(40).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const creditSchema = z.object({
  clientId: z.string().min(1),
  workspaceId: z.string().optional().nullable(),
  transactionType: z.enum(["credit", "debit", "adjustment"]),
  credits: z.coerce.number().positive(),
  reference: z.string().max(160).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

function actorId(req: Request) {
  return req.user?.id ?? null;
}

function pageParams(req: Request) {
  const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || "25"), 10) || 25, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

function workspaceOwnerExpression(alias = "c") {
  return `COALESCE(${alias}.white_label_client_id, NULLIF(${alias}.created_by,''))`;
}

async function audit(req: Request, actionType: string, targetType: string, targetId: string | null, previousValues: unknown, updatedValues: unknown, actorOverride?: string | null) {
  await pool.query(
    `INSERT INTO white_label_audit_logs (actor_id, action_type, target_type, target_id, previous_values, updated_values, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [actorOverride ?? actorId(req), actionType, targetType, targetId, previousValues ? JSON.stringify(previousValues) : null, updatedValues ? JSON.stringify(updatedValues) : null, req.ip, req.get("user-agent") || null]
  );
}

function toSettings(row: any) {
  return {
    id: row.id,
    platformName: row.platform_name,
    brandTagline: row.brand_tagline,
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    mainLogo: row.main_logo,
    darkModeLogo: row.dark_mode_logo,
    favicon: row.favicon,
    loginBanner: row.login_banner,
    footerText: row.footer_text,
    customDomain: row.custom_domain,
    emailFromName: row.email_from_name,
    emailFromAddress: row.email_from_address,
    hidePoweredBy: row.hide_powered_by,
    allowPartnerSignup: row.allow_partner_signup,
    maintenanceMode: row.maintenance_mode,
    updatedAt: row.updated_at,
  };
}

async function ensureSettings() {
  const existing = await pool.query(`SELECT * FROM white_label_settings WHERE singleton_key = 'default' LIMIT 1`);
  if (existing.rows[0]) return existing.rows[0];
  const inserted = await pool.query(
    `INSERT INTO white_label_settings (singleton_key, platform_name, brand_tagline, support_email, primary_color, secondary_color, accent_color, email_from_name)
     VALUES ('default',$1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [settingsDefaults.platform_name, settingsDefaults.brand_tagline, settingsDefaults.support_email, settingsDefaults.primary_color, settingsDefaults.secondary_color, settingsDefaults.accent_color, settingsDefaults.email_from_name]
  );
  return inserted.rows[0];
}

async function sendWorkbook(res: Response, fileName: string, sheetName: string, columns: Partial<ExcelJS.Column>[], rows: any[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
}

async function latestClientBalance(clientId: string, db: { query: (text: string, params?: any[]) => Promise<any> } = pool) {
  const last = await db.query(`SELECT balance_after FROM white_label_credit_transactions WHERE client_id=$1 ORDER BY created_at DESC, id DESC LIMIT 1`, [clientId]);
  return Number(last.rows[0]?.balance_after || 0);
}

function buildWorkspaceWhere(req: Request, params: any[]) {
  const clauses = ["1=1"];
  const search = String(req.query.search || "").trim();
  const ownerId = String(req.query.ownerId || req.query.clientId || "").trim();
  const status = String(req.query.status || "").trim();
  const plan = String(req.query.plan || "").trim();

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(c.id ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone_number ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
  }
  if (ownerId) {
    params.push(ownerId);
    clauses.push(`${workspaceOwnerExpression()} = $${params.length}`);
  }
  if (status === "active") clauses.push(`COALESCE(c.is_active,true)=true`);
  if (status === "inactive") clauses.push(`COALESCE(c.is_active,true)=false`);
  if (plan) {
    params.push(plan);
    clauses.push(`COALESCE(c.white_label_workspace_type,'free') = $${params.length}`);
  }
  return clauses.join(" AND ");
}

export function registerWhiteLabelRoutes(app: Express) {
  app.get(`${BASE}/settings`, ...guard, async (_req, res) => {
    const row = await ensureSettings();
    res.json(toSettings(row));
  });

  app.put(`${BASE}/settings`, ...guard, async (req, res) => {
    const parsed = settingsSchema.parse(req.body);
    const before = await ensureSettings();
    const values = {
      platform_name: parsed.platformName,
      brand_tagline: parsed.brandTagline || "",
      support_email: parsed.supportEmail || "",
      support_phone: parsed.supportPhone || "",
      primary_color: parsed.primaryColor || settingsDefaults.primary_color,
      secondary_color: parsed.secondaryColor || settingsDefaults.secondary_color,
      accent_color: parsed.accentColor || settingsDefaults.accent_color,
      main_logo: parsed.mainLogo || "",
      dark_mode_logo: parsed.darkModeLogo || "",
      favicon: parsed.favicon || "",
      login_banner: parsed.loginBanner || "",
      footer_text: parsed.footerText || "",
      custom_domain: parsed.customDomain || "",
      email_from_name: parsed.emailFromName || "",
      email_from_address: parsed.emailFromAddress || "",
      hide_powered_by: parsed.hidePoweredBy ?? false,
      allow_partner_signup: parsed.allowPartnerSignup ?? false,
      maintenance_mode: parsed.maintenanceMode ?? false,
    };
    const updated = await pool.query(
      `UPDATE white_label_settings SET platform_name=$1, brand_tagline=$2, support_email=$3, support_phone=$4, primary_color=$5,
       secondary_color=$6, accent_color=$7, main_logo=$8, dark_mode_logo=$9, favicon=$10, login_banner=$11, footer_text=$12,
       custom_domain=$13, email_from_name=$14, email_from_address=$15, hide_powered_by=$16, allow_partner_signup=$17,
       maintenance_mode=$18, updated_by=$19, updated_at=NOW() WHERE singleton_key='default' RETURNING *`,
      [...Object.values(values), actorId(req)]
    );
    await audit(req, "settings.update", "white_label_settings", updated.rows[0].id, before, updated.rows[0]);
    res.json(toSettings(updated.rows[0]));
  });

  app.post(`${BASE}/settings/reset`, ...guard, async (req, res) => {
    const before = await ensureSettings();
    const updated = await pool.query(
      `UPDATE white_label_settings SET platform_name=$1, brand_tagline=$2, support_email=$3, support_phone=$4,
       primary_color=$5, secondary_color=$6, accent_color=$7, main_logo='', dark_mode_logo='', favicon='', login_banner='', footer_text='',
       custom_domain='', email_from_name=$8, email_from_address='', hide_powered_by=false, allow_partner_signup=false, maintenance_mode=false,
       updated_by=$9, updated_at=NOW() WHERE singleton_key='default' RETURNING *`,
      [settingsDefaults.platform_name, settingsDefaults.brand_tagline, settingsDefaults.support_email, settingsDefaults.support_phone, settingsDefaults.primary_color, settingsDefaults.secondary_color, settingsDefaults.accent_color, settingsDefaults.email_from_name, actorId(req)]
    );
    await audit(req, "settings.reset", "white_label_settings", updated.rows[0].id, before, updated.rows[0]);
    res.json(toSettings(updated.rows[0]));
  });

  app.get(`${BASE}/summary`, ...guard, async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='admin')::int AS clients,
        (SELECT COUNT(*) FROM channels)::int AS workspaces,
        (SELECT COUNT(*) FROM channels WHERE COALESCE(is_active,true)=true)::int AS active_workspaces,
        (SELECT COUNT(*) FROM white_label_partners WHERE status='active')::int AS partners,
        COALESCE((SELECT SUM(CASE WHEN transaction_type='debit' THEN -credits ELSE credits END) FROM white_label_credit_transactions),0)::numeric AS credit_balance
    `);
    res.json(rows[0]);
  });

  app.get(`${BASE}/clients`, ...guard, async (req, res) => {
    const { limit, offset, page } = pageParams(req);
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const clauses = ["u.role = 'admin'"];
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(u.id ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length} OR concat_ws(' ', u.first_name, u.last_name) ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      clauses.push(`u.status = $${params.length}`);
    }
    const where = clauses.join(" AND ");
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM users u WHERE ${where}`, params);
    params.push(limit, offset);
    const data = await pool.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at, u.last_login,
        COUNT(DISTINCT c.id)::int AS workspaces,
        COUNT(DISTINCT c.id)::int AS bots,
        COUNT(DISTINCT ct.id)::int AS bot_users,
        COUNT(DISTINCT tm.id)::int AS members,
        COUNT(DISTINCT wa.id)::int AS addon_count,
        COALESCE(MAX(wlt.balance_after),0)::numeric AS credit_balance,
        MAX(s.end_date) AS end_date,
        MAX(s.status) AS subscription_status
      FROM users u
      LEFT JOIN channels c ON ${workspaceOwnerExpression()} = u.id
      LEFT JOIN contacts ct ON ct.channel_id = c.id
      LEFT JOIN users tm ON tm.created_by = u.id AND tm.role <> 'admin' AND tm.role <> 'superadmin'
      LEFT JOIN white_label_workspace_addons wa ON wa.workspace_id = c.id AND wa.status='active'
      LEFT JOIN subscriptions s ON s.user_id = u.id
      LEFT JOIN white_label_credit_transactions wlt ON wlt.client_id = u.id
      WHERE ${where}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    res.json({ rows: data.rows, total: total.rows[0].count, page, limit });
  });


  app.post(`${BASE}/clients/:id/impersonate`, ...guard, async (req, res) => {
    const session = (req as any).session;
    const current = session?.user;
    if (!current || current.role !== "superadmin") return res.status(403).json({ error: "Superadmin required" });
    const target = await pool.query(`SELECT * FROM users WHERE id=$1 AND role='admin' LIMIT 1`, [req.params.id]);
    const client = target.rows[0];
    if (!client) return res.status(404).json({ error: "Client not found" });
    if ((client.status || "").toLowerCase() !== "active") return res.status(403).json({ error: "Client account is not active" });

    session.originalSuperadmin = session.originalSuperadmin || current;
    session.impersonation = {
      active: true,
      superadminId: current.id,
      clientId: client.id,
      startedAt: new Date().toISOString(),
    };
    session.user = {
      id: client.id,
      username: client.username,
      email: client.email,
      firstName: client.first_name,
      lastName: client.last_name,
      role: client.role,
      permissions: resolveUserPermissions(client.role, client.permissions || []),
      avatar: client.avatar,
      createdBy: client.created_by || "",
      impersonatedBy: current.id,
    };
    await audit(req, "impersonation.start", "client", client.id, { superadmin: current.id }, { client: client.id });
    session.save((err: Error | null) => {
      if (err) return res.status(500).json({ error: "Unable to start impersonation" });
      res.json({ success: true, redirectTo: "/dashboard", user: session.user });
    });
  });

  app.post(`${BASE}/impersonation/stop`, requireAuth, async (req, res) => {
    const session = (req as any).session;
    const original = session?.originalSuperadmin;
    if (!original) return res.status(400).json({ error: "No impersonation session" });
    const targetId = session.impersonation?.clientId || session.user?.id || null;
    session.user = original;
    session.originalSuperadmin = undefined;
    session.impersonation = undefined;
    await audit(req, "impersonation.stop", "client", targetId, null, { superadmin: original.id }, original.id);
    session.save((err: Error | null) => {
      if (err) return res.status(500).json({ error: "Unable to stop impersonation" });
      res.json({ success: true, redirectTo: "/white-label" });
    });
  });

  app.get(`${BASE}/clients/export`, ...guard, async (_req, res) => {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at,
        COUNT(DISTINCT c.id)::int AS workspaces,
        COUNT(DISTINCT ct.id)::int AS bot_users,
        COUNT(DISTINCT tm.id)::int AS members
      FROM users u
      LEFT JOIN channels c ON ${workspaceOwnerExpression()} = u.id
      LEFT JOIN contacts ct ON ct.channel_id = c.id
      LEFT JOIN users tm ON tm.created_by = u.id AND tm.role <> 'admin' AND tm.role <> 'superadmin'
      WHERE u.role='admin'
      GROUP BY u.id
      ORDER BY u.created_at DESC LIMIT 5000`);
    await sendWorkbook(res, "white-label-clients.xlsx", "Clients", [
      { header: "ID", key: "id", width: 38 }, { header: "Username", key: "username", width: 24 }, { header: "Email", key: "email", width: 32 },
      { header: "First Name", key: "first_name", width: 18 }, { header: "Last Name", key: "last_name", width: 18 }, { header: "Status", key: "status", width: 14 },
      { header: "Workspaces", key: "workspaces", width: 12 }, { header: "Bot Users", key: "bot_users", width: 12 }, { header: "Members", key: "members", width: 12 }, { header: "Created", key: "created_at", width: 24 },
    ], result.rows);
  });

  app.get(`${BASE}/workspaces`, ...guard, async (req, res) => {
    const { limit, offset, page } = pageParams(req);
    const params: any[] = [];
    const where = buildWorkspaceWhere(req, params);
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM channels c LEFT JOIN users u ON u.id = ${workspaceOwnerExpression()} WHERE ${where}`, params);
    params.push(limit, offset);
    const data = await pool.query(`
      SELECT c.id, c.name, c.phone_number, c.is_active, c.created_at, c.updated_at,
        COALESCE(c.white_label_workspace_type,'free') AS workspace_type,
        COALESCE(c.white_label_points,0)::numeric AS points,
        COALESCE(c.white_label_auto_renew,false) AS auto_renew,
        c.white_label_end_date AS end_date,
        c.white_label_notes AS notes,
        u.id AS owner_id,
        u.username AS owner_username,
        u.email AS owner_email,
        concat_ws(' ', u.first_name, u.last_name) AS owner_name,
        COUNT(DISTINCT ct.id)::int AS bot_users,
        COUNT(DISTINCT c.id)::int AS bots,
        COUNT(DISTINCT tm.id)::int AS members,
        COUNT(DISTINCT wa.id)::int AS addon_count,
        MAX(s.status) AS subscription_status,
        MAX(s.end_date) AS subscription_end_date
      FROM channels c
      LEFT JOIN users u ON u.id = ${workspaceOwnerExpression()}
      LEFT JOIN contacts ct ON ct.channel_id = c.id
      LEFT JOIN users tm ON tm.created_by = u.id AND tm.role <> 'admin' AND tm.role <> 'superadmin'
      LEFT JOIN white_label_workspace_addons wa ON wa.workspace_id = c.id AND wa.status='active'
      LEFT JOIN subscriptions s ON s.user_id = u.id
      WHERE ${where}
      GROUP BY c.id, u.id
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    res.json({ rows: data.rows, total: total.rows[0].count, page, limit });
  });

  app.patch(`${BASE}/workspaces/:id`, ...guard, async (req, res) => {
    const schema = z.object({ isActive: z.boolean().optional(), autoRenew: z.boolean().optional(), workspaceType: z.string().optional(), endDate: z.string().optional().nullable(), notes: z.string().optional().nullable() });
    const parsed = schema.parse(req.body);
    const before = await pool.query(`SELECT * FROM channels WHERE id=$1`, [req.params.id]);
    if (!before.rows[0]) return res.status(404).json({ error: "Workspace not found" });
    const updated = await pool.query(
      `UPDATE channels SET is_active=COALESCE($2,is_active), white_label_auto_renew=COALESCE($3,white_label_auto_renew),
       white_label_workspace_type=COALESCE($4,white_label_workspace_type), white_label_end_date=$5,
       white_label_notes=COALESCE($6,white_label_notes), updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id, parsed.isActive, parsed.autoRenew, parsed.workspaceType, parsed.endDate ? new Date(parsed.endDate) : before.rows[0].white_label_end_date, parsed.notes]
    );
    await audit(req, "workspace.update", "channel", req.params.id, before.rows[0], updated.rows[0]);
    res.json(updated.rows[0]);
  });

  app.patch(`${BASE}/workspaces/:id/points`, ...guard, async (req, res) => {
    const parsed = z.object({ transactionType: z.enum(["credit", "debit", "adjustment"]), credits: z.coerce.number().positive(), note: z.string().optional().nullable() }).parse(req.body);
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const workspace = await db.query(`SELECT c.*, ${workspaceOwnerExpression()} AS owner_id FROM channels c WHERE c.id=$1 FOR UPDATE`, [req.params.id]);
      const row = workspace.rows[0];
      if (!row) {
        await db.query("ROLLBACK");
        return res.status(404).json({ error: "Workspace not found" });
      }
      if (!row.owner_id) {
        await db.query("ROLLBACK");
        return res.status(400).json({ error: "Workspace has no client owner" });
      }
      const before = Number(row.white_label_points || 0);
      const signed = parsed.transactionType === "debit" ? -parsed.credits : parsed.credits;
      const after = parsed.transactionType === "adjustment" ? parsed.credits : Math.max(0, before + signed);
      await db.query(`UPDATE channels SET white_label_points=$1, updated_at=NOW() WHERE id=$2`, [after, req.params.id]);
      const clientBefore = await latestClientBalance(row.owner_id, db);
      const clientSigned = parsed.transactionType === "debit" ? -parsed.credits : parsed.credits;
      const clientAfter = parsed.transactionType === "adjustment" ? clientBefore + (after - before) : clientBefore + clientSigned;
      const inserted = await db.query(
        `INSERT INTO white_label_credit_transactions (client_id, workspace_id, transaction_type, credits, balance_before, balance_after, reference, note, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [row.owner_id, req.params.id, parsed.transactionType, parsed.credits, clientBefore, Math.max(0, clientAfter), "workspace-points", parsed.note || null, actorId(req)]
      );
      await db.query("COMMIT");
      await audit(req, "workspace.points", "channel", req.params.id, { points: before }, { points: after, transaction: inserted.rows[0].id });
      res.json({ workspaceId: req.params.id, points: after, transaction: inserted.rows[0] });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  });

  app.get(`${BASE}/workspaces/export`, ...guard, async (_req, res) => {
    const result = await pool.query(`
      SELECT c.id, c.name, c.phone_number, c.is_active, COALESCE(c.white_label_workspace_type,'free') AS plan,
        COALESCE(c.white_label_points,0)::numeric AS points, COALESCE(c.white_label_auto_renew,false) AS auto_renew,
        c.white_label_end_date, c.created_at, u.email AS owner_email,
        COUNT(DISTINCT ct.id)::int AS bot_users, COUNT(DISTINCT tm.id)::int AS members, COUNT(DISTINCT wa.id)::int AS addon_count
      FROM channels c
      LEFT JOIN users u ON u.id = ${workspaceOwnerExpression()}
      LEFT JOIN contacts ct ON ct.channel_id = c.id
      LEFT JOIN users tm ON tm.created_by = u.id AND tm.role <> 'admin' AND tm.role <> 'superadmin'
      LEFT JOIN white_label_workspace_addons wa ON wa.workspace_id = c.id AND wa.status='active'
      GROUP BY c.id, u.id
      ORDER BY c.created_at DESC LIMIT 5000`);
    await sendWorkbook(res, "white-label-workspaces.xlsx", "Workspaces", [
      { header: "ID", key: "id", width: 38 }, { header: "Name", key: "name", width: 28 }, { header: "Phone", key: "phone_number", width: 18 },
      { header: "Owner", key: "owner_email", width: 32 }, { header: "Active", key: "is_active", width: 10 }, { header: "Plan", key: "plan", width: 14 },
      { header: "Bot Users", key: "bot_users", width: 12 }, { header: "Members", key: "members", width: 12 }, { header: "Add-ons", key: "addon_count", width: 12 },
      { header: "Points", key: "points", width: 12 }, { header: "Auto Renew", key: "auto_renew", width: 14 }, { header: "End Date", key: "white_label_end_date", width: 24 }, { header: "Created", key: "created_at", width: 24 },
    ], result.rows);
  });

  app.get(`${BASE}/credits`, ...guard, async (req, res) => {
    const { limit, offset, page } = pageParams(req);
    const result = await pool.query(`
      SELECT t.*, u.email AS client_email, c.name AS workspace_name
      FROM white_label_credit_transactions t
      LEFT JOIN users u ON u.id=t.client_id
      LEFT JOIN channels c ON c.id=t.workspace_id
      ORDER BY t.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM white_label_credit_transactions`);
    res.json({ rows: result.rows, total: total.rows[0].count, page, limit });
  });

  app.post(`${BASE}/credits`, ...guard, async (req, res) => {
    const parsed = creditSchema.parse(req.body);
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const before = await latestClientBalance(parsed.clientId, db);
      const signed = parsed.transactionType === "debit" ? -parsed.credits : parsed.credits;
      const after = parsed.transactionType === "adjustment" ? parsed.credits : Math.max(0, before + signed);
      const inserted = await db.query(
        `INSERT INTO white_label_credit_transactions (client_id, workspace_id, transaction_type, credits, balance_before, balance_after, reference, note, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [parsed.clientId, parsed.workspaceId || null, parsed.transactionType, parsed.credits, before, after, parsed.reference || null, parsed.note || null, actorId(req)]
      );
      if (parsed.workspaceId) await db.query(`UPDATE channels SET white_label_points=$1, updated_at=NOW() WHERE id=$2`, [after, parsed.workspaceId]);
      await db.query("COMMIT");
      await audit(req, "credits.create", "credit_transaction", inserted.rows[0].id, { balanceBefore: before }, inserted.rows[0]);
      res.status(201).json(inserted.rows[0]);
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  });

  app.get(`${BASE}/partners`, ...guard, async (_req, res) => {
    const result = await pool.query(`
      SELECT p.*, COUNT(pc.client_id)::int AS clients_count
      FROM white_label_partners p
      LEFT JOIN white_label_partner_clients pc ON pc.partner_id=p.id
      GROUP BY p.id ORDER BY p.created_at DESC`);
    res.json({ rows: result.rows });
  });

  app.post(`${BASE}/partners`, ...guard, async (req, res) => {
    const parsed = partnerSchema.parse(req.body);
    const inserted = await pool.query(
      `INSERT INTO white_label_partners (name,email,phone,company_name,status,commission_rate,revenue_share_rate,payout_method,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [parsed.name, parsed.email, parsed.phone || null, parsed.companyName || null, parsed.status, parsed.commissionRate, parsed.revenueShareRate, parsed.payoutMethod || null, parsed.notes || null, actorId(req)]
    );
    await audit(req, "partner.create", "white_label_partner", inserted.rows[0].id, null, inserted.rows[0]);
    res.status(201).json(inserted.rows[0]);
  });

  app.patch(`${BASE}/partners/:id`, ...guard, async (req, res) => {
    const parsed = partnerSchema.partial().parse(req.body);
    const before = await pool.query(`SELECT * FROM white_label_partners WHERE id=$1`, [req.params.id]);
    if (!before.rows[0]) return res.status(404).json({ error: "Partner not found" });
    const updated = await pool.query(
      `UPDATE white_label_partners SET name=COALESCE($2,name), email=COALESCE($3,email), phone=COALESCE($4,phone), company_name=COALESCE($5,company_name),
       status=COALESCE($6,status), commission_rate=COALESCE($7,commission_rate), revenue_share_rate=COALESCE($8,revenue_share_rate), payout_method=COALESCE($9,payout_method), notes=COALESCE($10,notes), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, parsed.name, parsed.email, parsed.phone, parsed.companyName, parsed.status, parsed.commissionRate, parsed.revenueShareRate, parsed.payoutMethod, parsed.notes]
    );
    await audit(req, "partner.update", "white_label_partner", req.params.id, before.rows[0], updated.rows[0]);
    res.json(updated.rows[0]);
  });

  app.post(`${BASE}/partners/:id/clients`, ...guard, async (req, res) => {
    const parsed = z.object({ clientId: z.string().min(1) }).parse(req.body);
    const inserted = await pool.query(
      `INSERT INTO white_label_partner_clients (partner_id, client_id, assigned_by) VALUES ($1,$2,$3)
       ON CONFLICT (partner_id, client_id) DO NOTHING RETURNING *`,
      [req.params.id, parsed.clientId, actorId(req)]
    );
    await audit(req, "partner.assign_client", "white_label_partner", req.params.id, null, parsed);
    res.status(201).json(inserted.rows[0] || { partnerId: req.params.id, clientId: parsed.clientId });
  });

  app.get(`${BASE}/audit-logs`, ...guard, async (req, res) => {
    const { limit, offset, page } = pageParams(req);
    const result = await pool.query(`
      SELECT l.*, u.email AS actor_email, u.username AS actor_username
      FROM white_label_audit_logs l LEFT JOIN users u ON u.id=l.actor_id
      ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM white_label_audit_logs`);
    res.json({ rows: result.rows, total: total.rows[0].count, page, limit });
  });
}


