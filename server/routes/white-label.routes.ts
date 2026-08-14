import type { Express, Request, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireSuperadmin } from "../middlewares/auth.middleware";
import { resolveUserPermissions } from "../utils/role-permissions";
import { getStripe } from "../services/payment-gateway.service";
import { resolvePublicOrigin } from "../services/public-origin";

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

const partnerSettingsDefaults = {
  clientBilling: {
    paymentMode: "platform",
    paymentMethods: "",
    stripeAutomaticTax: true,
    requireVatId: false,
    stripeConsentMessage: "",
    addonCreditEnabled: true,
    defaultAddonTopupOption: "",
    pricingPageNote:
      "Thank you for choosing WABA (WhatsApp Business Cloud API). We appreciate your business, and we'll do our best to continue to give you the kind of service you deserve.\n\nNOTE: WhatsApp Credit, Bot Credit & Points are not transferable and not even refundable.",
  },
  signupTrial: {
    freeTrialDays: 14,
    freeTrialOption: "new_workspaces",
    userRegistrationEnabled: true,
    phoneRequired: true,
    emailVerificationEnabled: false,
  },
  defaults: {
    language: "English",
    flowTheme: "Default",
    timezone: "(UTC+04:00) Abu Dhabi",
    countryCode: "+971 AE",
  },
  sharedServices: {
    systemEmailProfile: "",
    s3StorageEnabled: false,
    webChatSupportEnabled: true,
    openaiEnabled: true,
    xaiEnabled: false,
    groqEnabled: false,
  },
  apiRedirects: {
    privateKey: "",
    webhookUrl: "",
    loginRedirectUrl: "",
  },
  loginPage: {
    layout: "banana",
    backgroundMain: "#ffffff",
    backgroundForm: "#ffffff",
    textMain: "#111827",
    textLight: "#64748b",
    buttonBackground: "#16821f",
    buttonText: "#ffffff",
    linkColor: "#111827",
    backgroundImage: "",
  },
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

const partnerSettingsSchema = z.object({
  clientBilling: z.object({
    paymentMode: z.enum(["own_site", "platform"]).default("platform"),
    paymentMethods: z.string().max(240).optional().nullable(),
    stripeAutomaticTax: z.boolean().default(true),
    requireVatId: z.boolean().default(false),
    stripeConsentMessage: z.string().max(1000).optional().nullable(),
    addonCreditEnabled: z.boolean().default(true),
    defaultAddonTopupOption: z.string().max(160).optional().nullable(),
    pricingPageNote: z.string().max(2000).optional().nullable(),
  }),
  signupTrial: z.object({
    freeTrialDays: z.coerce.number().int().min(0).max(365).default(14),
    freeTrialOption: z.enum(["new_workspaces", "new_clients", "none"]).default("new_workspaces"),
    userRegistrationEnabled: z.boolean().default(true),
    phoneRequired: z.boolean().default(true),
    emailVerificationEnabled: z.boolean().default(false),
  }),
  defaults: z.object({
    language: z.string().max(80).default("English"),
    flowTheme: z.string().max(80).default("Default"),
    timezone: z.string().max(120).default("(UTC+04:00) Abu Dhabi"),
    countryCode: z.string().max(40).default("+971 AE"),
  }),
  sharedServices: z.object({
    systemEmailProfile: z.string().max(200).optional().nullable(),
    s3StorageEnabled: z.boolean().default(false),
    webChatSupportEnabled: z.boolean().default(true),
    openaiEnabled: z.boolean().default(true),
    xaiEnabled: z.boolean().default(false),
    groqEnabled: z.boolean().default(false),
  }),
  apiRedirects: z.object({
    privateKey: z.string().max(500).optional().nullable(),
    webhookUrl: z.string().max(500).optional().nullable(),
    loginRedirectUrl: z.string().max(500).optional().nullable(),
  }),
  loginPage: z.object({
    layout: z.enum(["default", "apple", "banana", "cherry"]).default("banana"),
    backgroundMain: z.string().max(20).default("#ffffff"),
    backgroundForm: z.string().max(20).default("#ffffff"),
    textMain: z.string().max(20).default("#111827"),
    textLight: z.string().max(20).default("#64748b"),
    buttonBackground: z.string().max(20).default("#16821f"),
    buttonText: z.string().max(20).default("#ffffff"),
    linkColor: z.string().max(20).default("#111827"),
    backgroundImage: z.string().max(1000).optional().nullable(),
  }),
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

const planConfigSchema = z.object({
  planKey: z.string().min(1).max(80).optional(),
  planName: z.string().min(1).max(160),
  status: z.enum(["active", "archived", "inactive"]).default("active"),
  displayPrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  badge: z.string().max(80).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  hideUsageCounts: z.boolean().default(false),
  enabledFeatures: z.array(z.string()).default([]),
  disabledFeatures: z.array(z.string()).default([]),
  gatewayMetadata: z.record(z.string(), z.unknown()).default({}),
});

const addonCatalogSchema = z.object({
  addonKey: z.string().min(1).max(80),
  addonName: z.string().min(1).max(160),
  description: z.string().max(500).optional().nullable(),
  costPrice: z.coerce.number().min(0).default(0),
  points: z.coerce.number().min(0).default(0),
  label: z.string().max(240).optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  displayOrder: z.coerce.number().int().default(0),
});

const topupOptionSchema = z.object({
  displayOrder: z.coerce.number().int().default(0),
  currency: z.string().min(1).max(10).default("USD"),
  amount: z.coerce.number().min(0),
  points: z.coerce.number().min(0),
  label: z.string().min(1).max(160),
  status: z.enum(["active", "inactive"]).default("active"),
});

const topupCheckoutSchema = z.object({
  topupOptionId: z.string().min(1),
  workspaceId: z.string().optional().nullable(),
});

const topupVerifySchema = z.object({
  paymentId: z.string().min(1),
  sessionId: z.string().min(1),
});

const whatsappFeatureCatalog = [
  { key: "whatsapp_cloud", label: "WhatsApp Cloud", group: "Channel" },
  { key: "live_chat", label: "Live Chat", group: "Inbox" },
  { key: "team_inbox", label: "Team Inbox", group: "Inbox" },
  { key: "contacts", label: "Contacts", group: "CRM" },
  { key: "groups", label: "Groups", group: "CRM" },
  { key: "campaigns", label: "Campaigns", group: "Marketing" },
  { key: "templates", label: "Templates", group: "Marketing" },
  { key: "automations", label: "Automations", group: "Automation" },
  { key: "chatbot_flow", label: "Chatbot Flow", group: "Automation" },
  { key: "ai_assistant", label: "AI Assistant", group: "AI" },
  { key: "ai_calling", label: "AI Calling", group: "AI" },
  { key: "analytics", label: "Analytics", group: "Reporting" },
  { key: "message_logs", label: "Message Logs", group: "Reporting" },
  { key: "api_keys", label: "API Keys", group: "Developer" },
  { key: "webhooks", label: "Webhooks", group: "Developer" },
  { key: "google_sheets", label: "Google Sheets", group: "Integrations" },
  { key: "email_marketing", label: "Email Marketing", group: "Marketing" },
  { key: "multi_workspace", label: "Multi Workspace", group: "Workspace" },
  { key: "team_members", label: "Team Members", group: "Workspace" },
  { key: "broadcast_scheduling", label: "Broadcast Scheduling", group: "Marketing" },
  { key: "template_sync", label: "Template Sync", group: "Marketing" },
  { key: "conversation_assignment", label: "Conversation Assignment", group: "Inbox" },
  { key: "labels_tags", label: "Labels / Tags", group: "CRM" },
];

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

function currentClientId(req: Request) {
  const user = (req.user || (req as any).session?.user) as any;
  if (!user?.id || user.role === "superadmin") return null;
  return user.role === "team" && user.createdBy ? user.createdBy : user.id;
}

function scopedSuperadminId(req: Request) {
  const user = (req.user || (req as any).session?.user) as any;
  return user?.role === "superadmin" && user.createdBy ? user.id : null;
}

function appendClientScope(req: Request, clauses: string[], params: any[], alias = "u") {
  const superadminId = scopedSuperadminId(req);
  if (!superadminId) return;
  params.push(superadminId);
  clauses.push(`${alias}.created_by = $${params.length}`);
}

function appendWorkspaceScope(req: Request, clauses: string[], params: any[], alias = "c") {
  const superadminId = scopedSuperadminId(req);
  if (!superadminId) return;
  params.push(superadminId);
  clauses.push(`${workspaceOwnerExpression(alias)} IN (SELECT id FROM users WHERE role='admin' AND created_by = $${params.length})`);
}

async function canAccessClient(req: Request, clientId: string, db: { query: (text: string, params?: any[]) => Promise<any> } = pool) {
  const superadminId = scopedSuperadminId(req);
  if (!superadminId) return true;
  const result = await db.query(`SELECT id FROM users WHERE id=$1 AND role='admin' AND created_by=$2 LIMIT 1`, [clientId, superadminId]);
  return !!result.rows[0];
}

async function canAccessWorkspace(req: Request, workspaceId: string, db: { query: (text: string, params?: any[]) => Promise<any> } = pool) {
  const superadminId = scopedSuperadminId(req);
  if (!superadminId) return true;
  const result = await db.query(
    `SELECT c.id
     FROM channels c
     WHERE c.id=$1
       AND ${workspaceOwnerExpression("c")} IN (SELECT id FROM users WHERE role='admin' AND created_by=$2)
     LIMIT 1`,
    [workspaceId, superadminId]
  );
  return !!result.rows[0];
}

function requestOrigin(req: Request) {
  const host = req.get("host");
  if (!host) return null;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = forwardedProto || req.protocol || "http";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

async function applyTopupPaymentCredit(paymentId: string, db: { query: (text: string, params?: any[]) => Promise<any> }) {
  const paymentResult = await db.query(`SELECT * FROM white_label_topup_payments WHERE id=$1 FOR UPDATE`, [paymentId]);
  const payment = paymentResult.rows[0];
  if (!payment) throw new Error("Topup payment not found");

  if (payment.status === "completed" && payment.credited_at) {
    const ledger = await db.query(
      `SELECT * FROM white_label_credit_transactions WHERE reference=$1 ORDER BY created_at DESC LIMIT 1`,
      [`topup:${payment.provider}:${payment.provider_session_id}`]
    );
    return { payment, transaction: ledger.rows[0] || null, balance: await latestClientBalance(payment.client_id, db) };
  }

  const credits = Number(payment.points || 0);
  const before = await latestClientBalance(payment.client_id, db);
  const after = before + credits;
  const inserted = await db.query(
    `INSERT INTO white_label_credit_transactions (client_id, workspace_id, transaction_type, credits, balance_before, balance_after, reference, note, created_by)
     VALUES ($1,$2,'credit',$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      payment.client_id,
      payment.workspace_id || null,
      credits,
      before,
      after,
      `topup:${payment.provider}:${payment.provider_session_id}`,
      payment.label,
      payment.created_by || payment.client_id,
    ]
  );

  if (payment.workspace_id) {
    await db.query(
      `UPDATE channels SET white_label_points=COALESCE(white_label_points,0) + $1, updated_at=NOW() WHERE id=$2`,
      [credits, payment.workspace_id]
    );
  }

  const updated = await db.query(
    `UPDATE white_label_topup_payments SET status='completed', credited_at=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *`,
    [paymentId]
  );
  return { payment: updated.rows[0], transaction: inserted.rows[0], balance: after };
}

function buildWorkspaceWhere(req: Request, params: any[]) {
  const clauses = ["1=1"];
  const search = String(req.query.search || "").trim();
  const ownerId = String(req.query.ownerId || req.query.clientId || "").trim();
  const status = String(req.query.status || "").trim();
  const plan = String(req.query.plan || "").trim();

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(c.id ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone_number ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length} OR u.public_client_id::text ILIKE $${params.length})`);
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
  appendWorkspaceScope(req, clauses, params, "c");
  return clauses.join(" AND ");
}

export function registerWhiteLabelRoutes(app: Express) {
  app.get("/api/topups/options", requireAuth, async (_req, res) => {
    const result = await pool.query(`
      SELECT id, display_order, currency, amount, points, label, status
      FROM white_label_topup_options
      WHERE status='active'
      ORDER BY display_order ASC, amount ASC
    `);
    res.json({ rows: result.rows });
  });

  app.get("/api/topups/balance", requireAuth, async (req, res) => {
    const clientId = currentClientId(req);
    if (!clientId) return res.status(403).json({ error: "Credit topups are available for client accounts only" });
    const balance = await latestClientBalance(clientId);
    const ledger = await pool.query(`
      SELECT t.*, c.name AS workspace_name
      FROM white_label_credit_transactions t
      LEFT JOIN channels c ON c.id=t.workspace_id
      WHERE t.client_id=$1
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [clientId]);
    res.json({ balance, rows: ledger.rows });
  });

  app.post("/api/topups/stripe/checkout", requireAuth, async (req, res) => {
    const clientId = currentClientId(req);
    if (!clientId) return res.status(403).json({ error: "Credit topups are available for client accounts only" });
    const parsed = topupCheckoutSchema.parse(req.body);
    const optionResult = await pool.query(`SELECT * FROM white_label_topup_options WHERE id=$1 AND status='active'`, [parsed.topupOptionId]);
    const option = optionResult.rows[0];
    if (!option) return res.status(404).json({ error: "Topup option not found" });
    if (Number(option.amount || 0) <= 0 || Number(option.points || 0) <= 0) {
      return res.status(400).json({ error: "Topup option must have a positive amount and credits" });
    }

    let workspaceId = parsed.workspaceId || null;
    if (workspaceId) {
      const workspace = await pool.query(
        `SELECT c.id FROM channels c WHERE c.id=$1 AND ${workspaceOwnerExpression()}=$2 LIMIT 1`,
        [workspaceId, clientId]
      );
      if (!workspace.rows[0]) return res.status(403).json({ error: "Workspace not found for this client" });
    }

    const stripe = await getStripe();
    if (!stripe) return res.status(400).json({ error: "Stripe is not configured or active" });
    const origin = requestOrigin(req) || (await resolvePublicOrigin());
    if (!origin) return res.status(400).json({ error: "Public origin is not configured yet" });

    const payment = await pool.query(
      `INSERT INTO white_label_topup_payments (client_id, workspace_id, topup_option_id, provider, amount, currency, points, label, status, created_by)
       VALUES ($1,$2,$3,'stripe',$4,$5,$6,$7,'pending',$8) RETURNING *`,
      [clientId, workspaceId, option.id, option.amount, option.currency, option.points, option.label, (req.user as any)?.id || clientId]
    );
    const paymentRow = payment.rows[0];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: String(option.currency || "USD").toLowerCase(),
          product_data: { name: option.label },
          unit_amount: Math.round(Number(option.amount || 0) * 100),
        },
        quantity: 1,
      }],
      success_url: `${origin}/billing?topup_session_id={CHECKOUT_SESSION_ID}&topup_payment_id=${paymentRow.id}`,
      cancel_url: `${origin}/billing?topup_cancelled=1`,
      metadata: {
        purpose: "white_label_credit_topup",
        topupPaymentId: paymentRow.id,
        clientId,
        workspaceId: workspaceId || "",
      },
    });

    const updated = await pool.query(
      `UPDATE white_label_topup_payments SET provider_session_id=$2, checkout_url=$3, metadata=$4, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [paymentRow.id, session.id, session.url || null, JSON.stringify(session.metadata || {})]
    );
    res.status(201).json({ checkoutUrl: session.url, payment: updated.rows[0] });
  });

  app.post("/api/topups/stripe/verify", requireAuth, async (req, res) => {
    const clientId = currentClientId(req);
    if (!clientId) return res.status(403).json({ error: "Credit topups are available for client accounts only" });
    const parsed = topupVerifySchema.parse(req.body);
    const existing = await pool.query(
      `SELECT * FROM white_label_topup_payments WHERE id=$1 AND client_id=$2 AND provider_session_id=$3`,
      [parsed.paymentId, clientId, parsed.sessionId]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: "Topup payment not found" });

    const stripe = await getStripe();
    if (!stripe) return res.status(400).json({ error: "Stripe is not configured or active" });
    const session = await stripe.checkout.sessions.retrieve(parsed.sessionId);
    if (session.payment_status !== "paid") {
      await pool.query(`UPDATE white_label_topup_payments SET status=$2, updated_at=NOW() WHERE id=$1`, [parsed.paymentId, session.status || "pending"]);
      return res.status(400).json({ error: "Stripe payment is not paid yet" });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as any)?.id || null;
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      if (paymentIntentId) {
        await db.query(
          `UPDATE white_label_topup_payments SET provider_payment_intent_id=$2, updated_at=NOW() WHERE id=$1`,
          [parsed.paymentId, paymentIntentId]
        );
      }
      const applied = await applyTopupPaymentCredit(parsed.paymentId, db);
      await db.query("COMMIT");
      res.json({ success: true, ...applied });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  });

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

  app.get(`${BASE}/partner-settings`, ...guard, async (_req, res) => {
    const row = await ensureSettings();
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    res.json({
      ...partnerSettingsDefaults,
      ...((metadata as any).partnerSettings || {}),
    });
  });

  app.put(`${BASE}/partner-settings`, ...guard, async (req, res) => {
    const parsed = partnerSettingsSchema.parse(req.body);
    const before = await ensureSettings();
    const metadata = before.metadata && typeof before.metadata === "object" ? before.metadata : {};
    const nextMetadata = {
      ...metadata,
      partnerSettings: parsed,
    };
    const updated = await pool.query(
      `UPDATE white_label_settings SET metadata=$1, updated_by=$2, updated_at=NOW() WHERE singleton_key='default' RETURNING *`,
      [JSON.stringify(nextMetadata), actorId(req)]
    );
    await audit(req, "partner_settings.update", "white_label_settings", updated.rows[0].id, (metadata as any).partnerSettings || null, parsed);
    res.json(parsed);
  });

  app.get(`${BASE}/summary`, ...guard, async (req, res) => {
    const params: any[] = [];
    const clientWhere = ["role='admin'"];
    const workspaceWhere = ["1=1"];
    appendClientScope(req, clientWhere, params, "users");
    appendWorkspaceScope(req, workspaceWhere, params, "channels");
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE ${clientWhere.join(" AND ")})::int AS clients,
        (SELECT COUNT(*) FROM channels WHERE ${workspaceWhere.join(" AND ")})::int AS workspaces,
        (SELECT COUNT(*) FROM channels WHERE COALESCE(is_active,true)=true AND ${workspaceWhere.join(" AND ")})::int AS active_workspaces,
        (SELECT COUNT(*) FROM white_label_partners WHERE status='active')::int AS partners,
        COALESCE((SELECT SUM(CASE WHEN t.transaction_type='debit' THEN -t.credits ELSE t.credits END)
          FROM white_label_credit_transactions t
          JOIN users u ON u.id=t.client_id
          WHERE ${clientWhere.map((clause) => clause.replaceAll("users.", "u.")).join(" AND ")}
        ),0)::numeric AS credit_balance
    `, params);
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
      clauses.push(`(u.id ILIKE $${params.length} OR u.public_client_id::text ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length} OR concat_ws(' ', u.first_name, u.last_name) ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      clauses.push(`u.status = $${params.length}`);
    }
    appendClientScope(req, clauses, params, "u");
    const where = clauses.join(" AND ");
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM users u WHERE ${where}`, params);
    params.push(limit, offset);
    const data = await pool.query(`
      SELECT u.id, u.public_client_id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at, u.updated_at, u.last_login,
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
    const targetParams: any[] = [req.params.id];
    const targetClauses = [`id=$1`, `role='admin'`];
    appendClientScope(req, targetClauses, targetParams, "users");
    const target = await pool.query(`SELECT * FROM users WHERE ${targetClauses.join(" AND ")} LIMIT 1`, targetParams);
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

  app.delete(`${BASE}/clients/:id`, ...guard, async (req, res) => {
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const before = await db.query(`SELECT id, email, username, role, created_by FROM users WHERE id=$1 AND role='admin' FOR UPDATE`, [req.params.id]);
      const client = before.rows[0];
      if (!client) {
        await db.query("ROLLBACK");
        return res.status(404).json({ error: "Client not found" });
      }
      if (!(await canAccessClient(req, req.params.id, db))) {
        await db.query("ROLLBACK");
        return res.status(403).json({ error: "Access denied to this client" });
      }
      const workspaces = await db.query(`SELECT id FROM channels c WHERE ${workspaceOwnerExpression()}=$1`, [req.params.id]);
      const workspaceIds = workspaces.rows.map((row) => row.id);
      if (workspaceIds.length) {
        await db.query(`DELETE FROM white_label_workspace_addons WHERE workspace_id = ANY($1::varchar[])`, [workspaceIds]);
        await db.query(`DELETE FROM white_label_credit_transactions WHERE workspace_id = ANY($1::varchar[])`, [workspaceIds]);
        await db.query(`DELETE FROM white_label_topup_payments WHERE workspace_id = ANY($1::varchar[])`, [workspaceIds]);
        await db.query(`DELETE FROM channels WHERE id = ANY($1::varchar[])`, [workspaceIds]);
      }
      await db.query(`DELETE FROM white_label_credit_transactions WHERE client_id=$1`, [req.params.id]);
      await db.query(`DELETE FROM white_label_topup_payments WHERE client_id=$1`, [req.params.id]);
      await db.query(`UPDATE users SET created_by=NULL WHERE created_by=$1`, [req.params.id]);
      await db.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
      await db.query("COMMIT");
      await audit(req, "client.delete", "client", req.params.id, client, { deleted: true, workspaceCount: workspaceIds.length });
      res.json({ success: true, id: req.params.id, deletedWorkspaces: workspaceIds.length });
    } catch (error: any) {
      await db.query("ROLLBACK");
      res.status(409).json({ error: "Client could not be deleted because related records are protected", detail: error?.message });
    } finally {
      db.release();
    }
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

  app.get(`${BASE}/clients/export`, ...guard, async (req, res) => {
    const params: any[] = [];
    const clauses = ["u.role='admin'"];
    appendClientScope(req, clauses, params, "u");
    const result = await pool.query(`
      SELECT u.id, u.public_client_id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at, u.updated_at,
        COUNT(DISTINCT c.id)::int AS workspaces,
        COUNT(DISTINCT ct.id)::int AS bot_users,
        COUNT(DISTINCT tm.id)::int AS members
      FROM users u
      LEFT JOIN channels c ON ${workspaceOwnerExpression()} = u.id
      LEFT JOIN contacts ct ON ct.channel_id = c.id
      LEFT JOIN users tm ON tm.created_by = u.id AND tm.role <> 'admin' AND tm.role <> 'superadmin'
      WHERE ${clauses.join(" AND ")}
      GROUP BY u.id
      ORDER BY u.created_at DESC LIMIT 5000`, params);
    await sendWorkbook(res, "white-label-clients.xlsx", "Clients", [
      { header: "Client ID", key: "public_client_id", width: 12 }, { header: "Internal ID", key: "id", width: 38 }, { header: "Username", key: "username", width: 24 }, { header: "Email", key: "email", width: 32 },
      { header: "First Name", key: "first_name", width: 18 }, { header: "Last Name", key: "last_name", width: 18 }, { header: "Status", key: "status", width: 14 },
      { header: "Workspaces", key: "workspaces", width: 12 }, { header: "Bot Users", key: "bot_users", width: 12 }, { header: "Members", key: "members", width: 12 }, { header: "Created", key: "created_at", width: 24 }, { header: "Updated", key: "updated_at", width: 24 },
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
    if (!(await canAccessWorkspace(req, req.params.id))) return res.status(403).json({ error: "Access denied to this workspace" });
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
      if (!(await canAccessWorkspace(req, req.params.id, db))) {
        await db.query("ROLLBACK");
        return res.status(403).json({ error: "Access denied to this workspace" });
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

  app.delete(`${BASE}/workspaces/:id`, ...guard, async (req, res) => {
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const before = await db.query(`SELECT * FROM channels WHERE id=$1 FOR UPDATE`, [req.params.id]);
      const workspace = before.rows[0];
      if (!workspace) {
        await db.query("ROLLBACK");
        return res.status(404).json({ error: "Workspace not found" });
      }
      if (!(await canAccessWorkspace(req, req.params.id, db))) {
        await db.query("ROLLBACK");
        return res.status(403).json({ error: "Access denied to this workspace" });
      }
      await db.query(`DELETE FROM white_label_workspace_addons WHERE workspace_id=$1`, [req.params.id]);
      await db.query(`DELETE FROM white_label_credit_transactions WHERE workspace_id=$1`, [req.params.id]);
      await db.query(`DELETE FROM white_label_topup_payments WHERE workspace_id=$1`, [req.params.id]);
      await db.query(`DELETE FROM channels WHERE id=$1`, [req.params.id]);
      await db.query("COMMIT");
      await audit(req, "workspace.delete", "channel", req.params.id, workspace, { deleted: true });
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      await db.query("ROLLBACK");
      res.status(409).json({ error: "Workspace could not be deleted because related records are protected", detail: error?.message });
    } finally {
      db.release();
    }
  });

  app.get(`${BASE}/workspaces/export`, ...guard, async (req, res) => {
    const params: any[] = [];
    const clauses = ["1=1"];
    appendWorkspaceScope(req, clauses, params, "c");
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
      WHERE ${clauses.join(" AND ")}
      GROUP BY c.id, u.id
      ORDER BY c.created_at DESC LIMIT 5000`, params);
    await sendWorkbook(res, "white-label-workspaces.xlsx", "Workspaces", [
      { header: "ID", key: "id", width: 38 }, { header: "Name", key: "name", width: 28 }, { header: "Phone", key: "phone_number", width: 18 },
      { header: "Owner", key: "owner_email", width: 32 }, { header: "Active", key: "is_active", width: 10 }, { header: "Plan", key: "plan", width: 14 },
      { header: "Bot Users", key: "bot_users", width: 12 }, { header: "Members", key: "members", width: 12 }, { header: "Add-ons", key: "addon_count", width: 12 },
      { header: "Points", key: "points", width: 12 }, { header: "Auto Renew", key: "auto_renew", width: 14 }, { header: "End Date", key: "white_label_end_date", width: 24 }, { header: "Created", key: "created_at", width: 24 },
    ], result.rows);
  });

  app.get(`${BASE}/credits`, ...guard, async (req, res) => {
    const { limit, offset, page } = pageParams(req);
    const clientId = String(req.query.clientId || "").trim();
    const workspaceId = String(req.query.workspaceId || "").trim();
    const search = String(req.query.search || "").trim();
    const clauses: string[] = [];
    const params: any[] = [];
    if (clientId) {
      params.push(clientId);
      clauses.push(`t.client_id=$${params.length}`);
    }
    if (workspaceId) {
      params.push(workspaceId);
      clauses.push(`t.workspace_id=$${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(t.transaction_type ILIKE $${params.length} OR t.reference ILIKE $${params.length} OR t.note ILIKE $${params.length})`);
    }
    const superadminId = scopedSuperadminId(req);
    if (superadminId) {
      params.push(superadminId);
      clauses.push(`u.created_by=$${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(limit, offset);
    const result = await pool.query(`
      SELECT t.*, u.email AS client_email, c.name AS workspace_name
      FROM white_label_credit_transactions t
      LEFT JOIN users u ON u.id=t.client_id
      LEFT JOIN channels c ON c.id=t.workspace_id
      ${where}
      ORDER BY t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    const total = await pool.query(
      `SELECT COUNT(*)::int AS count FROM white_label_credit_transactions t LEFT JOIN users u ON u.id=t.client_id ${where}`,
      params.slice(0, -2)
    );
    res.json({ rows: result.rows, total: total.rows[0].count, page, limit });
  });

  app.post(`${BASE}/credits`, ...guard, async (req, res) => {
    const parsed = creditSchema.parse(req.body);
    if (!(await canAccessClient(req, parsed.clientId))) {
      return res.status(403).json({ error: "Access denied to this client" });
    }
    if (parsed.workspaceId && !(await canAccessWorkspace(req, parsed.workspaceId))) {
      return res.status(403).json({ error: "Access denied to this workspace" });
    }
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

  app.get(`${BASE}/billing/features`, ...guard, async (_req, res) => {
    res.json({ rows: whatsappFeatureCatalog });
  });

  app.get(`${BASE}/billing/plans`, ...guard, async (_req, res) => {
    const result = await pool.query(`
      SELECT *
      FROM white_label_plan_configs
      ORDER BY
        CASE plan_key
          WHEN 'waba_demo' THEN 1
          WHEN 'activated' THEN 2
          WHEN 'waba_business' THEN 3
          WHEN 'waba_individual' THEN 4
          ELSE 99
        END,
        created_at ASC
    `);
    res.json({ rows: result.rows });
  });

  app.post(`${BASE}/billing/plans`, ...guard, async (req, res) => {
    const parsed = planConfigSchema.parse(req.body);
    const planKey = parsed.planKey || parsed.planName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const inserted = await pool.query(
      `INSERT INTO white_label_plan_configs (plan_key, plan_name, status, display_price, cost_price, billing_cycle, badge, description, hide_usage_counts, enabled_features, disabled_features, gateway_metadata, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (plan_key) DO UPDATE SET
         plan_name=EXCLUDED.plan_name,
         status=EXCLUDED.status,
         display_price=EXCLUDED.display_price,
         cost_price=EXCLUDED.cost_price,
         billing_cycle=EXCLUDED.billing_cycle,
         badge=EXCLUDED.badge,
         description=EXCLUDED.description,
         hide_usage_counts=EXCLUDED.hide_usage_counts,
         enabled_features=EXCLUDED.enabled_features,
         disabled_features=EXCLUDED.disabled_features,
         gateway_metadata=EXCLUDED.gateway_metadata,
         updated_at=NOW()
       RETURNING *`,
      [planKey, parsed.planName, parsed.status, parsed.displayPrice, parsed.costPrice, parsed.billingCycle, parsed.badge || null, parsed.description || null, parsed.hideUsageCounts, JSON.stringify(parsed.enabledFeatures), JSON.stringify(parsed.disabledFeatures), JSON.stringify(parsed.gatewayMetadata), actorId(req)]
    );
    await audit(req, "billing.plan.upsert", "white_label_plan_config", inserted.rows[0].id, null, inserted.rows[0]);
    res.status(201).json(inserted.rows[0]);
  });

  app.patch(`${BASE}/billing/plans/:id`, ...guard, async (req, res) => {
    const parsed = planConfigSchema.partial().parse(req.body);
    const before = await pool.query(`SELECT * FROM white_label_plan_configs WHERE id=$1`, [req.params.id]);
    if (!before.rows[0]) return res.status(404).json({ error: "Plan config not found" });
    const current = before.rows[0];
    const updated = await pool.query(
      `UPDATE white_label_plan_configs SET
        plan_name=$2,
        status=$3,
        display_price=$4,
        cost_price=$5,
        billing_cycle=$6,
        badge=$7,
        description=$8,
        hide_usage_counts=$9,
        enabled_features=$10,
        disabled_features=$11,
        gateway_metadata=$12,
        updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        req.params.id,
        parsed.planName ?? current.plan_name,
        parsed.status ?? current.status,
        parsed.displayPrice ?? current.display_price,
        parsed.costPrice ?? current.cost_price,
        parsed.billingCycle ?? current.billing_cycle,
        parsed.badge ?? current.badge,
        parsed.description ?? current.description,
        parsed.hideUsageCounts ?? current.hide_usage_counts,
        JSON.stringify(parsed.enabledFeatures ?? current.enabled_features ?? []),
        JSON.stringify(parsed.disabledFeatures ?? current.disabled_features ?? []),
        JSON.stringify(parsed.gatewayMetadata ?? current.gateway_metadata ?? {}),
      ]
    );
    await audit(req, "billing.plan.update", "white_label_plan_config", req.params.id, before.rows[0], updated.rows[0]);
    res.json(updated.rows[0]);
  });

  app.get(`${BASE}/billing/addons`, ...guard, async (_req, res) => {
    const result = await pool.query(`SELECT * FROM white_label_addon_catalog ORDER BY display_order ASC, addon_name ASC`);
    res.json({ rows: result.rows });
  });

  app.post(`${BASE}/billing/addons`, ...guard, async (req, res) => {
    const parsed = addonCatalogSchema.parse(req.body);
    const inserted = await pool.query(
      `INSERT INTO white_label_addon_catalog (addon_key, addon_name, description, cost_price, points, label, status, display_order, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (addon_key) DO UPDATE SET addon_name=EXCLUDED.addon_name, description=EXCLUDED.description, cost_price=EXCLUDED.cost_price, points=EXCLUDED.points, label=EXCLUDED.label, status=EXCLUDED.status, display_order=EXCLUDED.display_order, updated_at=NOW()
       RETURNING *`,
      [parsed.addonKey, parsed.addonName, parsed.description || null, parsed.costPrice, parsed.points, parsed.label || null, parsed.status, parsed.displayOrder, actorId(req)]
    );
    await audit(req, "billing.addon.upsert", "white_label_addon_catalog", inserted.rows[0].id, null, inserted.rows[0]);
    res.status(201).json(inserted.rows[0]);
  });

  app.patch(`${BASE}/billing/addons/:id`, ...guard, async (req, res) => {
    const parsed = addonCatalogSchema.partial().parse(req.body);
    const before = await pool.query(`SELECT * FROM white_label_addon_catalog WHERE id=$1`, [req.params.id]);
    if (!before.rows[0]) return res.status(404).json({ error: "Addon not found" });
    const updated = await pool.query(
      `UPDATE white_label_addon_catalog SET addon_key=COALESCE($2,addon_key), addon_name=COALESCE($3,addon_name), description=COALESCE($4,description), cost_price=COALESCE($5,cost_price), points=COALESCE($6,points), label=COALESCE($7,label), status=COALESCE($8,status), display_order=COALESCE($9,display_order), updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id, parsed.addonKey, parsed.addonName, parsed.description, parsed.costPrice, parsed.points, parsed.label, parsed.status, parsed.displayOrder]
    );
    await audit(req, "billing.addon.update", "white_label_addon_catalog", req.params.id, before.rows[0], updated.rows[0]);
    res.json(updated.rows[0]);
  });

  app.get(`${BASE}/billing/topups`, ...guard, async (_req, res) => {
    const result = await pool.query(`SELECT * FROM white_label_topup_options ORDER BY display_order ASC, amount ASC`);
    res.json({ rows: result.rows });
  });

  app.post(`${BASE}/billing/topups`, ...guard, async (req, res) => {
    const parsed = topupOptionSchema.parse(req.body);
    const inserted = await pool.query(
      `INSERT INTO white_label_topup_options (display_order, currency, amount, points, label, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [parsed.displayOrder, parsed.currency, parsed.amount, parsed.points, parsed.label, parsed.status, actorId(req)]
    );
    await audit(req, "billing.topup.create", "white_label_topup_option", inserted.rows[0].id, null, inserted.rows[0]);
    res.status(201).json(inserted.rows[0]);
  });

  app.patch(`${BASE}/billing/topups/:id`, ...guard, async (req, res) => {
    const parsed = topupOptionSchema.partial().parse(req.body);
    const before = await pool.query(`SELECT * FROM white_label_topup_options WHERE id=$1`, [req.params.id]);
    if (!before.rows[0]) return res.status(404).json({ error: "Topup option not found" });
    const updated = await pool.query(
      `UPDATE white_label_topup_options SET display_order=COALESCE($2,display_order), currency=COALESCE($3,currency), amount=COALESCE($4,amount), points=COALESCE($5,points), label=COALESCE($6,label), status=COALESCE($7,status), updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id, parsed.displayOrder, parsed.currency, parsed.amount, parsed.points, parsed.label, parsed.status]
    );
    await audit(req, "billing.topup.update", "white_label_topup_option", req.params.id, before.rows[0], updated.rows[0]);
    res.json(updated.rows[0]);
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


