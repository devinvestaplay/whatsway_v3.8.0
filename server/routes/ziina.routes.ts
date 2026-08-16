import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth } from "../middlewares/auth.middleware";
import { activateSubscriptionFromTransaction } from "../controllers/webhooks.controller";
import {
  ZiinaProviderError,
  amountToMinorUnits,
  createPaymentIntent,
  extractZiinaSignature,
  getIntentCheckoutUrl,
  getPaymentIntent,
  getZiinaEnv,
  normalizeZiinaStatus,
  sanitizeZiinaPayload,
  verifyWebhookSignature,
} from "../services/payments/ziina.service";
import { activatePlatformPartnerPayment } from "../services/platform-partner-billing.service";

const createSchema = z.object({
  planId: z.string().min(1),
  workspaceId: z.string().optional().nullable(),
  purpose: z.enum(["subscription"]).default("subscription"),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  currency: z.enum(["AED", "USD", "INR"]).default("AED"),
});

function currentUser(req: Request) {
  return req.user || (req as any).session?.user;
}

function safeUrl(base: string, paymentId: string) {
  const url = new URL(base);
  url.searchParams.set("paymentId", paymentId);
  return url.toString();
}

function mapTransaction(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    subscriptionId: row.subscription_id,
    paymentProviderId: row.payment_provider_id,
    amount: row.amount,
    currency: row.currency,
    billingCycle: row.billing_cycle,
    providerTransactionId: row.provider_transaction_id,
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    providerSubscriptionId: row.provider_subscription_id,
    providerPaymentIntentId: row.provider_payment_intent_id,
    status: row.status,
    workspaceId: row.workspace_id,
    purpose: row.purpose,
    metadata: row.metadata,
    paidAt: row.paid_at,
  };
}

function getPlanAmount(plan: any, billingCycle: "monthly" | "annual", currency: string) {
  const multi = plan.multi_currency_prices || {};
  const upper = currency.toUpperCase();
  const amount = multi?.[upper]?.[billingCycle] ?? (billingCycle === "annual" ? plan.annual_price : plan.monthly_price);
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric < 0) throw new Error("Invalid plan price");
  return numeric;
}

async function ensureWorkspaceAccess(workspaceId: string | null | undefined, userId: string, role: string) {
  if (!workspaceId) return;
  if (role === "superadmin") return;
  const result = await pool.query(`SELECT id FROM channels WHERE id=$1 AND created_by=$2 LIMIT 1`, [workspaceId, userId]);
  if (!result.rows[0]) {
    const error: any = new Error("Workspace not found");
    error.status = 404;
    throw error;
  }
}

async function getZiinaProvider() {
  const provider = await pool.query(`SELECT * FROM payment_providers WHERE provider_key='ziina' AND is_active=true LIMIT 1`);
  return provider.rows[0] || null;
}

async function updateTransactionFromIntent(transactionId: string, intent: any, completedAt?: Date) {
  const status = normalizeZiinaStatus(intent.status);
  const payload = sanitizeZiinaPayload(intent);
  const updated = await pool.query(
    `UPDATE transactions SET status=$2, provider_payment_id=COALESCE($3, provider_payment_id), provider_payload=$4,
      failure_code=$5, failure_message=$6, paid_at=CASE WHEN $2='completed' THEN COALESCE(paid_at,$7) ELSE paid_at END, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [transactionId, status, intent.id || null, JSON.stringify(payload), intent.failure_code || intent.error_code || null, intent.failure_message || intent.error_message || null, completedAt || new Date()]
  );
  return updated.rows[0];
}

async function maybeActivate(transaction: any, providerStatus?: string) {
  const mapped = mapTransaction(transaction);
  if (!mapped || mapped.status !== "completed" || mapped.subscriptionId) return false;
  await activateSubscriptionFromTransaction(mapped, mapped.providerPaymentIntentId || mapped.providerPaymentId, "ziina", { gatewayStatus: providerStatus || "completed" });
  return true;
}

async function reconcilePlatformPartnerPayment(payment: any) {
  if (payment.provider_payment_intent_id && !["completed", "failed", "cancelled", "refunded"].includes(payment.status)) {
    try {
      const intent = await getPaymentIntent(payment.provider_payment_intent_id);
      const updated = await pool.query(
        `UPDATE platform_partner_payments
         SET status=$2, provider_payload=$3, failure_code=$4, failure_message=$5,
             paid_at=CASE WHEN $2='completed' THEN COALESCE(paid_at,NOW()) ELSE paid_at END,
             updated_at=NOW()
         WHERE id=$1
         RETURNING *`,
        [
          payment.id,
          normalizeZiinaStatus(intent.status),
          JSON.stringify(sanitizeZiinaPayload(intent)),
          (intent as any).failure_code || (intent as any).error_code || null,
          (intent as any).failure_message || (intent as any).error_message || null,
        ]
      );
      payment = updated.rows[0] || payment;
    } catch {
      // Leave local status untouched if Ziina reconciliation is unavailable.
    }
  }

  let activation = null;
  if (payment.status === "completed" && !payment.subscription_id) {
    activation = await activatePlatformPartnerPayment(payment.id, "status_poll");
    const refreshed = await pool.query(`SELECT * FROM platform_partner_payments WHERE id=$1`, [payment.id]);
    payment = refreshed.rows[0] || payment;
  }
  return { payment, activation };
}

export function registerZiinaRoutes(app: Express) {
  app.post("/api/payments/ziina/create", requireAuth, async (req, res) => {
    try {
      const env = getZiinaEnv();
      if (!env.enabled) return res.status(503).json({ error: "Ziina payments are disabled" });
      const user = currentUser(req);
      if (!user?.id) return res.status(401).json({ error: "Not authenticated" });

      const body = createSchema.parse(req.body);
      await ensureWorkspaceAccess(body.workspaceId, user.id, user.role);

      const provider = await getZiinaProvider();
      if (!provider) return res.status(400).json({ error: "Ziina payment provider is not active" });

      const planResult = await pool.query(`SELECT * FROM plans WHERE id=$1 LIMIT 1`, [body.planId]);
      const plan = planResult.rows[0];
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const amount = getPlanAmount(plan, body.billingCycle, body.currency);
      const amountMinor = amountToMinorUnits(amount, body.currency);
      const baseKey = `ziina:${user.id}:${body.workspaceId || "account"}:${body.planId}:${body.billingCycle}:${body.currency}`;
      const existing = await pool.query(
        `SELECT * FROM transactions WHERE idempotency_key=$1 AND status IN ('pending','processing') ORDER BY created_at DESC LIMIT 1`,
        [baseKey]
      );
      if (existing.rows[0]) {
        const tx = existing.rows[0];
        return res.json({
          paymentId: tx.id,
          paymentIntentId: tx.provider_payment_intent_id,
          embeddedUrl: tx.embedded_url,
          redirectUrl: tx.checkout_url,
          status: tx.status,
        });
      }

      const inserted = await pool.query(
        `INSERT INTO transactions (user_id, plan_id, payment_provider_id, amount, currency, billing_cycle, status, payment_method, workspace_id, purpose, idempotency_key, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,'pending','ziina',$7,$8,$9,$10) RETURNING *`,
        [user.id, body.planId, provider.id, amount.toFixed(2), body.currency, body.billingCycle, body.workspaceId || null, body.purpose, baseKey, JSON.stringify({ amountMinor })]
      );
      const transaction = inserted.rows[0];

      const successUrl = safeUrl(env.successUrl, transaction.id);
      const cancelUrl = safeUrl(env.cancelUrl, transaction.id);
      const intent = await createPaymentIntent({
        amount: amountMinor,
        currencyCode: body.currency,
        message: `${plan.name} ${body.billingCycle} subscription`,
        successUrl,
        cancelUrl,
        metadata: { paymentId: transaction.id, userId: user.id, planId: body.planId, purpose: body.purpose },
      });
      const checkoutUrl = getIntentCheckoutUrl(intent);

      const updated = await pool.query(
        `UPDATE transactions SET provider_payment_intent_id=$2, provider_payment_id=$2, checkout_url=$3, embedded_url=$4, provider_payload=$5, updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [transaction.id, intent.id, checkoutUrl, checkoutUrl, JSON.stringify(sanitizeZiinaPayload(intent))]
      );
      const tx = updated.rows[0];

      return res.json({
        paymentId: tx.id,
        paymentIntentId: intent.id,
        embeddedUrl: tx.embedded_url,
        redirectUrl: tx.checkout_url,
        status: tx.status,
      });
    } catch (error: any) {
      const status = error instanceof ZiinaProviderError ? error.status || 502 : error.status || 500;
      return res.status(status).json({ error: status >= 500 ? "Unable to create Ziina payment" : error.message });
    }
  });

  app.get("/api/payments/ziina/:paymentId/status", requireAuth, async (req, res) => {
    try {
      const user = currentUser(req);
      if (!user?.id) return res.status(401).json({ error: "Not authenticated" });
      const result = await pool.query(
        `SELECT t.* FROM transactions t JOIN payment_providers p ON p.id=t.payment_provider_id WHERE t.id=$1 AND p.provider_key='ziina' LIMIT 1`,
        [req.params.paymentId]
      );
      let tx = result.rows[0];
      if (!tx) {
        const platformResult = await pool.query(
          `SELECT * FROM platform_partner_payments WHERE id=$1 AND provider='ziina' LIMIT 1`,
          [req.params.paymentId]
        );
        const platformPayment = platformResult.rows[0];
        if (!platformPayment) return res.status(404).json({ error: "Payment not found" });
        if (user.role !== "platform_admin" && user.id !== platformPayment.superadmin_id) {
          return res.status(403).json({ error: "Forbidden" });
        }
        const { payment, activation } = await reconcilePlatformPartnerPayment(platformPayment);
        return res.json({
          paymentId: payment.id,
          status: payment.status,
          paidAt: payment.paid_at,
          subscriptionActivated: Boolean(payment.subscription_id || activation?.activated),
          platformPartner: true,
        });
      }
      if (user.role !== "superadmin" && tx.user_id !== user.id) return res.status(403).json({ error: "Forbidden" });
      await ensureWorkspaceAccess(tx.workspace_id, user.id, user.role);

      let subscriptionActivated = false;
      if (tx.provider_payment_intent_id && !["completed", "failed", "cancelled", "refunded"].includes(tx.status)) {
        try {
          const intent = await getPaymentIntent(tx.provider_payment_intent_id);
          tx = await updateTransactionFromIntent(tx.id, intent);
        } catch (error) {
          // Local status remains authoritative if provider reconciliation is unavailable.
        }
      }

      if (tx.status === "completed") {
        subscriptionActivated = await maybeActivate(tx, tx.gateway_status || "completed");
        const refreshed = await pool.query(`SELECT * FROM transactions WHERE id=$1`, [tx.id]);
        tx = refreshed.rows[0] || tx;
      }

      return res.json({ paymentId: tx.id, status: tx.status, paidAt: tx.paid_at, subscriptionActivated: subscriptionActivated || !!tx.subscription_id });
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to fetch Ziina payment status" });
    }
  });

  app.post("/api/webhooks/ziina", async (req: Request, res: Response) => {
    const env = getZiinaEnv();
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const signature = extractZiinaSignature(req.headers as Record<string, unknown>);
    if (!env.webhookSignatureBypass && !verifyWebhookSignature(rawBody, signature, env.webhookSecret)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const payload = JSON.parse(rawBody.toString("utf8") || "{}");
    const sanitized = sanitizeZiinaPayload(payload);
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    const eventId = payload.id || payload.event_id || payload.data?.id || null;
    const intent = payload.payment_intent || payload.data?.payment_intent || payload.data || payload;
    const providerPaymentId = intent?.id || payload.payment_intent_id || payload.data?.payment_intent_id;

    if (!providerPaymentId) return res.status(202).json({ received: true, ignored: true });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dedup = await client.query(
        `INSERT INTO payment_webhook_events (provider, provider_event_id, provider_payment_id, payload_hash, sanitized_payload, processing_status)
         VALUES ('ziina',$1,$2,$3,$4,'processing') ON CONFLICT (provider, payload_hash) DO NOTHING RETURNING id`,
        [eventId, providerPaymentId, payloadHash, JSON.stringify(sanitized)]
      );
      if (!dedup.rows[0]) {
        await client.query("ROLLBACK");
        return res.json({ received: true, duplicate: true });
      }

      const found = await client.query(
        `SELECT t.* FROM transactions t JOIN payment_providers p ON p.id=t.payment_provider_id WHERE p.provider_key='ziina' AND (t.provider_payment_intent_id=$1 OR t.provider_payment_id=$1) FOR UPDATE`,
        [providerPaymentId]
      );
      const tx = found.rows[0];
      if (!tx) {
        const platformFound = await client.query(
          `SELECT * FROM platform_partner_payments
           WHERE provider='ziina' AND (provider_payment_intent_id=$1 OR provider_payment_id=$1)
           FOR UPDATE`,
          [providerPaymentId]
        );
        const platformPayment = platformFound.rows[0];
        if (!platformPayment) {
          await client.query(`UPDATE payment_webhook_events SET processing_status='ignored', processed_at=NOW(), error_message='Unknown payment intent' WHERE id=$1`, [dedup.rows[0].id]);
          await client.query("COMMIT");
          return res.status(202).json({ received: true, ignored: true });
        }

        const normalized = normalizeZiinaStatus(intent?.status || payload.status || payload.event_type);
        const updatedPlatform = await client.query(
          `UPDATE platform_partner_payments
           SET status=$2, provider_payload=$3,
               paid_at=CASE WHEN $2='completed' THEN COALESCE(paid_at,NOW()) ELSE paid_at END,
               failure_code=$4, failure_message=$5, updated_at=NOW()
           WHERE id=$1
           RETURNING *`,
          [
            platformPayment.id,
            normalized,
            JSON.stringify(sanitized),
            intent?.failure_code || null,
            intent?.failure_message || null,
          ]
        );
        await client.query(`UPDATE payment_webhook_events SET processing_status='processed', processed_at=NOW() WHERE id=$1`, [dedup.rows[0].id]);
        await client.query("COMMIT");
        if (updatedPlatform.rows[0]?.status === "completed") {
          await activatePlatformPartnerPayment(updatedPlatform.rows[0].id, intent?.status || "completed");
        }
        return res.json({ received: true, platformPartner: true });
      }

      const normalized = normalizeZiinaStatus(intent?.status || payload.status || payload.event_type);
      const updated = await client.query(
        `UPDATE transactions SET status=$2, provider_payload=$3, paid_at=CASE WHEN $2='completed' THEN COALESCE(paid_at,NOW()) ELSE paid_at END,
          failure_code=$4, failure_message=$5, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [tx.id, normalized, JSON.stringify(sanitized), intent?.failure_code || null, intent?.failure_message || null]
      );
      await client.query(`UPDATE payment_webhook_events SET processing_status='processed', processed_at=NOW() WHERE id=$1`, [dedup.rows[0].id]);
      await client.query("COMMIT");

      if (updated.rows[0]?.status === "completed") await maybeActivate(updated.rows[0], intent?.status || "completed");
      return res.json({ received: true });
    } catch (error: any) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: "Webhook processing failed" });
    } finally {
      client.release();
    }
  });
}
