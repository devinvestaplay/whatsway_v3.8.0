import { pool } from "../db";
import { sendSystemEmail } from "./email.service";
import {
  amountToMinorUnits,
  createPaymentIntent,
  getIntentCheckoutUrl,
  getZiinaEnv,
  sanitizeZiinaPayload,
} from "./payments/ziina.service";

type PgQueryable = {
  query: (text: string, params?: unknown[]) => Promise<any>;
};

type CreditTransactionInput = {
  superadminId: string;
  subscriptionId?: string | null;
  transactionType: "credit" | "debit" | "adjustment" | "plan_grant" | "renewal_grant" | "manual_adjustment";
  credits: number;
  reference?: string | null;
  note?: string | null;
  createdBy?: string | null;
};

type InvoiceInput = {
  superadminId: string;
  subscriptionId?: string | null;
  paymentId?: string | null;
  status: "draft" | "open" | "paid" | "failed" | "void";
  amount: number;
  currency: string;
  billingCycle: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  dueAt?: Date | null;
  paidAt?: Date | null;
  failureMessage?: string | null;
  hostedUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function invoiceNumber() {
  const date = new Date();
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  return `P-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function ziinaResultUrl(template: string | undefined, paymentId: string) {
  if (!template) return undefined;
  return template.includes("{paymentId}")
    ? template.replaceAll("{paymentId}", paymentId)
    : `${template}${template.includes("?") ? "&" : "?"}paymentId=${paymentId}`;
}

function plusDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function createDunningEvent(params: {
  superadminId: string;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  eventType: string;
  status?: string;
  message?: string | null;
  nextRetryAt?: Date | null;
  metadata?: Record<string, unknown>;
}, client: PgQueryable = pool) {
  const result = await client.query(
    `INSERT INTO platform_partner_dunning_events
       (superadmin_id, subscription_id, invoice_id, event_type, status, message, next_retry_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      params.superadminId,
      params.subscriptionId || null,
      params.invoiceId || null,
      params.eventType,
      params.status || "sent",
      params.message || null,
      params.nextRetryAt || null,
      JSON.stringify(params.metadata || {}),
    ]
  );
  return result.rows[0];
}

async function sendPartnerBillingNotice(params: {
  email: string;
  name?: string | null;
  subject: string;
  title: string;
  message: string;
  checkoutUrl?: string | null;
  invoiceUrl?: string | null;
}) {
  const cta = params.checkoutUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(params.checkoutUrl)}" style="display:inline-block;background:#167d25;color:#fff;text-decoration:none;border-radius:8px;padding:13px 20px;font-weight:700">Pay invoice</a></p>`
    : "";
  const invoice = params.invoiceUrl
    ? `<p style="margin:8px 0;color:#475569">Invoice: <a href="${escapeHtml(params.invoiceUrl)}">${escapeHtml(params.invoiceUrl)}</a></p>`
    : "";
  await sendSystemEmail({
    to: params.email,
    subject: params.subject,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:28px">
        <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px">
          <h2 style="margin:0 0 12px;color:#0f172a">${escapeHtml(params.title)}</h2>
          <p style="color:#334155;line-height:1.7">Hello ${escapeHtml(params.name || "Partner")},</p>
          <p style="color:#334155;line-height:1.7">${escapeHtml(params.message)}</p>
          ${cta}
          ${invoice}
          <p style="margin-top:28px;color:#94a3b8;font-size:12px">This is an automated platform billing message.</p>
        </div>
      </div>
    `,
    text: `${params.title}\n\n${params.message}\n\n${params.checkoutUrl || params.invoiceUrl || ""}`.trim(),
  });
}

export function dateOrNull(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function defaultPartnerSubscriptionEndDate(startDate: Date, billingCycle: string) {
  const end = new Date(startDate);
  if (billingCycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export async function getPartnerCreditBalance(superadminId: string, client: PgQueryable = pool) {
  const result = await client.query(
    `SELECT balance_after FROM platform_partner_credit_transactions
     WHERE superadmin_id=$1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [superadminId]
  );
  return Number(result.rows[0]?.balance_after || 0);
}

export async function syncPartnerControls(superadminId: string, values: {
  planName?: string | null;
  clientLimit?: number | null;
  workspaceLimit?: number | null;
  creditBalance?: number | null;
  notes?: string | null;
  createdBy?: string | null;
}, client: PgQueryable = pool) {
  await client.query(
    `INSERT INTO platform_superadmin_controls
       (superadmin_id, plan_name, client_limit, workspace_limit, credit_balance, notes, created_by)
     VALUES ($1, COALESCE($2, 'Starter Partner'), $3, $4, COALESCE($5, 0), $6, $7)
     ON CONFLICT (superadmin_id) DO UPDATE SET
       plan_name=COALESCE($2, platform_superadmin_controls.plan_name),
       client_limit=$3,
       workspace_limit=$4,
       credit_balance=COALESCE($5, platform_superadmin_controls.credit_balance),
       notes=COALESCE($6, platform_superadmin_controls.notes),
       updated_at=NOW()`,
    [
      superadminId,
      values.planName ?? null,
      values.clientLimit ?? null,
      values.workspaceLimit ?? null,
      values.creditBalance ?? null,
      values.notes ?? null,
      values.createdBy ?? null,
    ]
  );
}

export async function addPartnerCreditTransaction(params: CreditTransactionInput, client: PgQueryable = pool) {
  const before = await getPartnerCreditBalance(params.superadminId, client);
  const signed = params.transactionType === "debit" ? -params.credits : params.credits;
  const after = params.transactionType === "adjustment" || params.transactionType === "manual_adjustment"
    ? params.credits
    : Math.max(0, before + signed);

  const inserted = await client.query(
    `INSERT INTO platform_partner_credit_transactions
       (superadmin_id, subscription_id, transaction_type, credits, balance_before, balance_after, reference, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, superadmin_id AS "superadminId", subscription_id AS "subscriptionId", transaction_type AS "transactionType",
       credits, balance_before AS "balanceBefore", balance_after AS "balanceAfter", reference, note, created_at AS "createdAt"`,
    [
      params.superadminId,
      params.subscriptionId || null,
      params.transactionType,
      params.credits,
      before,
      after,
      params.reference || null,
      params.note || null,
      params.createdBy || null,
    ]
  );

  await syncPartnerControls(params.superadminId, { creditBalance: after, createdBy: params.createdBy || null }, client);
  return inserted.rows[0];
}

export async function createPlatformPartnerInvoice(params: InvoiceInput, client: PgQueryable = pool) {
  const result = await client.query(
    `INSERT INTO platform_partner_invoices
       (superadmin_id, subscription_id, payment_id, invoice_number, status, amount, currency,
        billing_cycle, period_start, period_end, due_at, paid_at, failure_message, hosted_url, metadata, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id, invoice_number AS "invoiceNumber"`,
    [
      params.superadminId,
      params.subscriptionId || null,
      params.paymentId || null,
      invoiceNumber(),
      params.status,
      params.amount.toFixed(2),
      params.currency,
      params.billingCycle,
      params.periodStart || null,
      params.periodEnd || null,
      params.dueAt || null,
      params.paidAt || null,
      params.failureMessage || null,
      params.hostedUrl || null,
      JSON.stringify(params.metadata || {}),
      params.createdBy || null,
    ]
  );
  return result.rows[0];
}

async function markInvoicePaidForPayment(payment: any, subscriptionId: string, client: PgQueryable) {
  const invoiceId = payment.metadata?.invoiceId;
  if (invoiceId) {
    await client.query(
      `UPDATE platform_partner_invoices
       SET status='paid', payment_id=$2, subscription_id=COALESCE(subscription_id,$3),
           paid_at=COALESCE(paid_at,NOW()), updated_at=NOW()
       WHERE id=$1`,
      [invoiceId, payment.id, subscriptionId]
    );
    return;
  }

  await createPlatformPartnerInvoice({
    superadminId: payment.superadmin_id,
    subscriptionId,
    paymentId: payment.id,
    status: "paid",
    amount: Number(payment.amount || 0),
    currency: payment.currency || "AED",
    billingCycle: payment.billing_cycle || "monthly",
    periodStart: dateOrNull(payment.metadata?.startDate) || new Date(),
    periodEnd: dateOrNull(payment.metadata?.endDate) || null,
    dueAt: new Date(),
    paidAt: new Date(),
    metadata: { source: "ziina_payment_activation" },
    createdBy: payment.created_by || null,
  }, client);
}

export async function activatePlatformPartnerPayment(paymentId: string, providerStatus = "completed") {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const paymentResult = await client.query(
      `SELECT * FROM platform_partner_payments WHERE id=$1 FOR UPDATE`,
      [paymentId]
    );
    const payment = paymentResult.rows[0];
    if (!payment) {
      await client.query("ROLLBACK");
      return { activated: false, reason: "payment_not_found" };
    }
    if (payment.subscription_id) {
      await client.query("COMMIT");
      return { activated: true, subscriptionId: payment.subscription_id, reason: "already_activated" };
    }

    const planResult = await client.query(
      `SELECT * FROM platform_partner_plans WHERE id=$1 AND status='active'`,
      [payment.plan_id]
    );
    const plan = planResult.rows[0];
    if (!plan) {
      await client.query(
        `UPDATE platform_partner_payments
         SET status='failed', failure_code='PLAN_NOT_FOUND', failure_message='Platform partner plan is not active', updated_at=NOW()
         WHERE id=$1`,
        [payment.id]
      );
      await client.query("COMMIT");
      return { activated: false, reason: "plan_not_found" };
    }

    const metadata = payment.metadata || {};
    const startDate = dateOrNull(metadata.startDate) || new Date();
    const billingCycle = payment.billing_cycle || metadata.billingCycle || "monthly";
    const endDate = dateOrNull(metadata.endDate) || (billingCycle === "manual" ? null : defaultPartnerSubscriptionEndDate(startDate, billingCycle));
    const clientLimit = metadata.clientLimit ?? plan.client_limit ?? null;
    const workspaceLimit = metadata.workspaceLimit ?? plan.workspace_limit ?? null;
    const domainLimit = metadata.domainLimit ?? plan.domain_limit ?? null;
    const includedCredits = Number(metadata.includedCredits ?? plan.included_credits ?? 0);
    const notes = metadata.notes || `Ziina payment ${payment.provider_payment_intent_id || payment.id}`;

    await client.query(
      `UPDATE platform_partner_subscriptions
       SET status='cancelled', updated_at=NOW()
       WHERE superadmin_id=$1 AND status IN ('active','trialing','past_due')`,
      [payment.superadmin_id]
    );

    const subscription = await client.query(
      `INSERT INTO platform_partner_subscriptions
         (superadmin_id, plan_id, status, billing_cycle, start_date, end_date, auto_renew, client_limit,
          workspace_limit, domain_limit, included_credits, price, currency, notes, created_by)
       VALUES ($1,$2,'active',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        payment.superadmin_id,
        payment.plan_id,
        billingCycle,
        startDate,
        endDate,
        Boolean(metadata.autoRenew),
        clientLimit,
        workspaceLimit,
        domainLimit,
        includedCredits,
        payment.amount,
        payment.currency || plan.currency || "USD",
        notes,
        payment.created_by || null,
      ]
    );

    const subscriptionId = subscription.rows[0].id;
    const shouldGrantCredits = metadata.grantIncludedCredits !== false;
    if (shouldGrantCredits && includedCredits > 0) {
      await addPartnerCreditTransaction({
        superadminId: payment.superadmin_id,
        subscriptionId,
        transactionType: "plan_grant",
        credits: includedCredits,
        reference: `ziina:${payment.provider_payment_intent_id || payment.id}`,
        note: `Included credits for ${plan.name}`,
        createdBy: payment.created_by || null,
      }, client);
    }

    const balance = await getPartnerCreditBalance(payment.superadmin_id, client);
    await syncPartnerControls(payment.superadmin_id, {
      planName: plan.name,
      clientLimit,
      workspaceLimit,
      creditBalance: balance,
      notes,
      createdBy: payment.created_by || null,
    }, client);

    await client.query(
      `UPDATE platform_partner_payments
       SET status='completed', subscription_id=$2, paid_at=COALESCE(paid_at,NOW()), credited_at=NOW(),
           metadata=COALESCE(metadata, '{}'::jsonb) || $3::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [payment.id, subscriptionId, JSON.stringify({ providerStatus })]
    );

    await markInvoicePaidForPayment(payment, subscriptionId, client);

    await client.query("COMMIT");
    return { activated: true, subscriptionId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function processPlatformPartnerRenewals(options: { limit?: number; baseUrl?: string } = {}) {
  const env = getZiinaEnv();
  const limit = options.limit || 50;
  const due = await pool.query(
    `SELECT s.*, p.name AS plan_name, p.plan_key, u.email, u.first_name, u.last_name
     FROM platform_partner_subscriptions s
     JOIN users u ON u.id=s.superadmin_id
     LEFT JOIN platform_partner_plans p ON p.id=s.plan_id
     WHERE s.status IN ('active','trialing')
       AND s.auto_renew IS TRUE
       AND s.end_date IS NOT NULL
       AND s.end_date <= NOW()
       AND u.role='superadmin'
       AND u.status='active'
     ORDER BY s.end_date ASC
     LIMIT $1`,
    [limit]
  );

  const summary = { checked: due.rows.length, created: 0, emailed: 0, failed: 0 };
  for (const row of due.rows) {
    const now = new Date();
    const nextEnd = defaultPartnerSubscriptionEndDate(now, row.billing_cycle || "monthly");
    const invoice = await createPlatformPartnerInvoice({
      superadminId: row.superadmin_id,
      subscriptionId: row.id,
      status: "open",
      amount: Number(row.price || 0),
      currency: row.currency || "AED",
      billingCycle: row.billing_cycle || "monthly",
      periodStart: now,
      periodEnd: nextEnd,
      dueAt: now,
      metadata: { renewalForSubscriptionId: row.id, planName: row.plan_name || null },
      createdBy: row.created_by || null,
    });

    const payment = await pool.query(
      `INSERT INTO platform_partner_payments
         (superadmin_id, plan_id, provider, amount, currency, billing_cycle, status, metadata, created_by)
       VALUES ($1,$2,'ziina',$3,$4,$5,'pending',$6,$7)
       RETURNING *`,
      [
        row.superadmin_id,
        row.plan_id,
        Number(row.price || 0).toFixed(2),
        row.currency || "AED",
        row.billing_cycle || "monthly",
        JSON.stringify({
          invoiceId: invoice.id,
          renewal: true,
          existingSubscriptionId: row.id,
          startDate: now.toISOString(),
          endDate: nextEnd.toISOString(),
          billingCycle: row.billing_cycle || "monthly",
          autoRenew: true,
          clientLimit: row.client_limit,
          workspaceLimit: row.workspace_limit,
          domainLimit: row.domain_limit,
          includedCredits: Number(row.included_credits || 0),
          grantIncludedCredits: true,
          notes: `Renewal invoice ${invoice.invoiceNumber}`,
        }),
        row.created_by || null,
      ]
    );

    let checkoutUrl: string | null = null;
    try {
      if (!env.enabled) throw new Error("Ziina payments are disabled");
      const intent = await createPaymentIntent({
        amount: amountToMinorUnits(Number(row.price || 0), row.currency || "AED"),
        currencyCode: row.currency || "AED",
        message: `${row.plan_name || "Partner"} renewal invoice ${invoice.invoiceNumber}`,
        successUrl: ziinaResultUrl(env.successUrl, payment.rows[0].id) || env.successUrl,
        cancelUrl: ziinaResultUrl(env.cancelUrl, payment.rows[0].id) || env.cancelUrl,
        metadata: {
          paymentId: payment.rows[0].id,
          superadminId: row.superadmin_id,
          planId: row.plan_id,
          invoiceId: invoice.id,
          purpose: "platform_partner_subscription_renewal",
        },
      });
      checkoutUrl = getIntentCheckoutUrl(intent) || null;
      await pool.query(
        `UPDATE platform_partner_payments
         SET provider_payment_intent_id=$2, provider_payment_id=$2, checkout_url=$3, embedded_url=$3,
             provider_payload=$4, updated_at=NOW()
         WHERE id=$1`,
        [payment.rows[0].id, intent.id, checkoutUrl, JSON.stringify(sanitizeZiinaPayload(intent))]
      );
      await pool.query(`UPDATE platform_partner_invoices SET payment_id=$2, hosted_url=$3, updated_at=NOW() WHERE id=$1`, [invoice.id, payment.rows[0].id, checkoutUrl]);
      summary.created += 1;
    } catch (error: any) {
      summary.failed += 1;
      await pool.query(
        `UPDATE platform_partner_payments SET status='failed', failure_code='RENEWAL_CHECKOUT_FAILED',
             failure_message=$2, updated_at=NOW() WHERE id=$1`,
        [payment.rows[0].id, error?.message || "Unable to create renewal checkout"]
      );
      await pool.query(
        `UPDATE platform_partner_invoices SET status='failed', payment_id=$2, failure_message=$3, updated_at=NOW() WHERE id=$1`,
        [invoice.id, payment.rows[0].id, error?.message || "Unable to create renewal checkout"]
      );
    }

    await pool.query(
      `UPDATE platform_partner_subscriptions
       SET status='past_due', renewal_attempts=COALESCE(renewal_attempts,0)+1,
           last_renewal_attempt_at=NOW(), next_renewal_attempt_at=$2, updated_at=NOW()
       WHERE id=$1`,
      [row.id, plusDays(now, 3)]
    );

    try {
      await sendPartnerBillingNotice({
        email: row.email,
        name: [row.first_name, row.last_name].filter(Boolean).join(" "),
        subject: `Renewal invoice ${invoice.invoiceNumber}`,
        title: "Your partner subscription renewal is due",
        message: `Your ${row.plan_name || "partner"} subscription renewal is ready. Please complete payment to keep your partner account active.`,
        checkoutUrl,
        invoiceUrl: options.baseUrl ? `${options.baseUrl}/api/platform/invoices/${invoice.id}/html` : null,
      });
      summary.emailed += 1;
      await createDunningEvent({
        superadminId: row.superadmin_id,
        subscriptionId: row.id,
        invoiceId: invoice.id,
        eventType: "renewal_notice_sent",
        status: "sent",
        nextRetryAt: plusDays(now, 3),
        metadata: { checkoutUrl },
      });
    } catch (error: any) {
      await createDunningEvent({
        superadminId: row.superadmin_id,
        subscriptionId: row.id,
        invoiceId: invoice.id,
        eventType: "renewal_notice_failed",
        status: "failed",
        message: error?.message || "Email failed",
        nextRetryAt: plusDays(now, 3),
        metadata: { checkoutUrl },
      });
    }
  }

  return summary;
}

export async function processPlatformPartnerDunning(options: { limit?: number; maxAttempts?: number; baseUrl?: string } = {}) {
  const limit = options.limit || 50;
  const maxAttempts = options.maxAttempts || 3;
  const due = await pool.query(
    `SELECT s.*, p.name AS plan_name, u.email, u.first_name, u.last_name,
            i.id AS invoice_id, i.invoice_number, i.hosted_url, i.status AS invoice_status
     FROM platform_partner_subscriptions s
     JOIN users u ON u.id=s.superadmin_id
     LEFT JOIN platform_partner_plans p ON p.id=s.plan_id
     LEFT JOIN LATERAL (
       SELECT * FROM platform_partner_invoices i
       WHERE i.subscription_id=s.id AND i.status IN ('open','failed')
       ORDER BY i.created_at DESC LIMIT 1
     ) i ON TRUE
     WHERE s.status='past_due'
       AND s.auto_renew IS TRUE
       AND COALESCE(s.next_renewal_attempt_at, NOW()) <= NOW()
       AND u.role='superadmin'
       AND u.status='active'
     ORDER BY s.next_renewal_attempt_at ASC NULLS FIRST
     LIMIT $1`,
    [limit]
  );

  const summary = { checked: due.rows.length, emailed: 0, expired: 0, failed: 0 };
  for (const row of due.rows) {
    const attempts = Number(row.renewal_attempts || 0);
    if (attempts >= maxAttempts) {
      await pool.query(
        `UPDATE platform_partner_subscriptions
         SET status='expired', cancellation_reason='Renewal payment was not completed after dunning retries',
             updated_at=NOW()
         WHERE id=$1`,
        [row.id]
      );
      await createDunningEvent({
        superadminId: row.superadmin_id,
        subscriptionId: row.id,
        invoiceId: row.invoice_id || null,
        eventType: "subscription_expired",
        status: "expired",
        message: "Renewal payment was not completed after dunning retries",
      });
      summary.expired += 1;
      continue;
    }

    try {
      await sendPartnerBillingNotice({
        email: row.email,
        name: [row.first_name, row.last_name].filter(Boolean).join(" "),
        subject: `Payment reminder ${row.invoice_number || ""}`.trim(),
        title: "Partner subscription payment reminder",
        message: `Your ${row.plan_name || "partner"} subscription is past due. Complete payment to restore full access.`,
        checkoutUrl: row.hosted_url || null,
        invoiceUrl: options.baseUrl && row.invoice_id ? `${options.baseUrl}/api/platform/invoices/${row.invoice_id}/html` : null,
      });
      await pool.query(
        `UPDATE platform_partner_subscriptions
         SET renewal_attempts=COALESCE(renewal_attempts,0)+1,
             last_renewal_attempt_at=NOW(), next_renewal_attempt_at=$2, updated_at=NOW()
         WHERE id=$1`,
        [row.id, plusDays(new Date(), 3)]
      );
      await createDunningEvent({
        superadminId: row.superadmin_id,
        subscriptionId: row.id,
        invoiceId: row.invoice_id || null,
        eventType: "dunning_reminder_sent",
        status: "sent",
        nextRetryAt: plusDays(new Date(), 3),
        metadata: { attempt: attempts + 1 },
      });
      summary.emailed += 1;
    } catch (error: any) {
      await createDunningEvent({
        superadminId: row.superadmin_id,
        subscriptionId: row.id,
        invoiceId: row.invoice_id || null,
        eventType: "dunning_reminder_failed",
        status: "failed",
        message: error?.message || "Email failed",
        metadata: { attempt: attempts + 1 },
      });
      summary.failed += 1;
    }
  }
  return summary;
}
