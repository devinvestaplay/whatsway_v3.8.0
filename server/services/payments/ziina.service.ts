import crypto from "crypto";
import { z } from "zod";

const DEFAULT_BASE_URL = "https://api-v2.ziina.com/api";
const DEFAULT_TIMEOUT_MS = 15000;

const ziinaEnvSchema = z.object({
  enabled: z.boolean(),
  apiToken: z.string().optional(),
  apiBaseUrl: z.string().url(),
  webhookSecret: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  embeddedVersion: z.string().default("v1"),
  webhookSignatureBypass: z.boolean().default(false),
});

export type ZiinaEnv = z.infer<typeof ziinaEnvSchema>;

export class ZiinaProviderError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "ZiinaProviderError";
    this.status = options.status;
    this.code = options.code;
  }
}

const ziinaPaymentIntentSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  currency_code: z.string().optional(),
  redirect_url: z.string().url().optional().nullable(),
  checkout_url: z.string().url().optional().nullable(),
  embedded_url: z.string().url().optional().nullable(),
  payment_url: z.string().url().optional().nullable(),
  url: z.string().url().optional().nullable(),
  message: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
}).passthrough();

export type ZiinaPaymentIntent = z.infer<typeof ziinaPaymentIntentSchema>;

export type CreateZiinaPaymentIntentInput = {
  amount: number;
  currencyCode: string;
  message: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export function getZiinaEnv(): ZiinaEnv {
  const enabled = String(process.env.ZIINA_ENABLED || "false").toLowerCase() === "true";
  const parsed = ziinaEnvSchema.parse({
    enabled,
    apiToken: process.env.ZIINA_API_TOKEN || undefined,
    apiBaseUrl: process.env.ZIINA_API_BASE_URL || DEFAULT_BASE_URL,
    webhookSecret: process.env.ZIINA_WEBHOOK_SECRET || undefined,
    successUrl: process.env.ZIINA_SUCCESS_URL || "http://localhost:5000/payment/ziina/success",
    cancelUrl: process.env.ZIINA_CANCEL_URL || "http://localhost:5000/payment/ziina/cancel",
    embeddedVersion: process.env.ZIINA_EMBEDDED_VERSION || "v1",
    webhookSignatureBypass: process.env.ZIINA_WEBHOOK_SIGNATURE_BYPASS === "true",
  });

  if (parsed.enabled && !parsed.apiToken) {
    throw new ZiinaProviderError("Ziina is enabled but the API token is not configured", { code: "ZIINA_CONFIG" });
  }

  return parsed;
}

function requireZiinaEnabled() {
  const env = getZiinaEnv();
  if (!env.enabled) {
    throw new ZiinaProviderError("Ziina payments are disabled", { status: 503, code: "ZIINA_DISABLED" });
  }
  if (!env.apiToken) {
    throw new ZiinaProviderError("Ziina credentials are not configured", { status: 503, code: "ZIINA_CONFIG" });
  }
  return env as ZiinaEnv & { apiToken: string };
}

async function ziinaRequest<T>(path: string, options: RequestInit & { parse: (value: unknown) => T; retry?: boolean }): Promise<T> {
  const env = requireZiinaEnabled();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const url = `${env.apiBaseUrl.replace(/\/$/, "")}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.apiToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const retryable = response.status >= 500 || response.status === 429;
      if (retryable && options.retry) {
        return ziinaRequest(path, { ...options, retry: false });
      }
      throw new ZiinaProviderError("Ziina request failed", { status: response.status, code: String((body as any)?.code || "ZIINA_API_ERROR") });
    }

    return options.parse(body);
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new ZiinaProviderError("Ziina request timed out", { status: 504, code: "ZIINA_TIMEOUT" });
    }
    if (error instanceof ZiinaProviderError) throw error;
    throw new ZiinaProviderError("Ziina request failed", { status: 502, code: "ZIINA_NETWORK" });
  } finally {
    clearTimeout(timeout);
  }
}

export async function createPaymentIntent(input: CreateZiinaPaymentIntentInput): Promise<ZiinaPaymentIntent> {
  return ziinaRequest("/payment_intent", {
    method: "POST",
    retry: false,
    body: JSON.stringify({
      amount: input.amount,
      currency_code: input.currencyCode,
      message: input.message,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    }),
    parse: (value) => ziinaPaymentIntentSchema.parse(value),
  });
}

export async function getPaymentIntent(id: string): Promise<ZiinaPaymentIntent> {
  return ziinaRequest(`/payment_intent/${encodeURIComponent(id)}`, {
    method: "GET",
    retry: true,
    parse: (value) => ziinaPaymentIntentSchema.parse(value),
  });
}

export async function registerWebhook(url: string, secret: string): Promise<unknown> {
  return ziinaRequest("/webhook", {
    method: "POST",
    retry: false,
    body: JSON.stringify({ url, secret }),
    parse: (value) => z.unknown().parse(value),
  });
}

export function normalizeZiinaStatus(status?: string | null): "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded" {
  const normalized = String(status || "pending").toLowerCase();
  if (["completed", "complete", "paid", "succeeded", "success", "captured"].includes(normalized)) return "completed";
  if (["failed", "declined", "expired"].includes(normalized)) return "failed";
  if (["cancelled", "canceled", "cancel"].includes(normalized)) return "cancelled";
  if (["refunded", "refund"].includes(normalized)) return "refunded";
  if (["processing", "requires_action", "authorized"].includes(normalized)) return "processing";
  return "pending";
}

export function sanitizeZiinaPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeZiinaPayload);
  if (!value || typeof value !== "object") return value;
  const blocked = new Set(["authorization", "token", "secret", "api_key", "apiKey", "card", "cvv", "number"]);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      blocked.has(key) ? "[redacted]" : sanitizeZiinaPayload(entry),
    ])
  );
}

export function extractZiinaSignature(headers: Record<string, unknown>): string | null {
  const value = headers["x-hmac-signature"] || headers["X-Hmac-Signature"];
  return Array.isArray(value) ? String(value[0] || "") : value ? String(value) : null;
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string | null, secret = getZiinaEnv().webhookSecret): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function getIntentCheckoutUrl(intent: ZiinaPaymentIntent): string | null {
  return intent.embedded_url || intent.checkout_url || intent.payment_url || intent.redirect_url || intent.url || null;
}

export function amountToMinorUnits(amount: number, currencyCode: string): number {
  const code = currencyCode.toUpperCase();
  const decimals = new Set(["AED", "USD", "INR"]).has(code) ? 2 : 2;
  return Math.round(amount * Math.pow(10, decimals));
}
