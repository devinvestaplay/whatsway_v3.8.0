import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  amountToMinorUnits,
  normalizeZiinaStatus,
  sanitizeZiinaPayload,
  verifyWebhookSignature,
} from "../services/payments/ziina.service";

describe("ziina payment helpers", () => {
  it("converts supported currencies to minor units", () => {
    expect(amountToMinorUnits(10.5, "AED")).toBe(1050);
    expect(amountToMinorUnits(10.5, "USD")).toBe(1050);
    expect(amountToMinorUnits(10.5, "INR")).toBe(1050);
  });

  it("normalizes provider statuses", () => {
    expect(normalizeZiinaStatus("succeeded")).toBe("completed");
    expect(normalizeZiinaStatus("declined")).toBe("failed");
    expect(normalizeZiinaStatus("canceled")).toBe("cancelled");
    expect(normalizeZiinaStatus("authorized")).toBe("processing");
  });

  it("redacts sensitive provider payload fields", () => {
    const sanitized = sanitizeZiinaPayload({ id: "pi_1", token: "secret", nested: { card: { number: "4242" } } }) as any;
    expect(sanitized.id).toBe("pi_1");
    expect(sanitized.token).toBe("[redacted]");
    expect(sanitized.nested.card).toBe("[redacted]");
  });

  it("verifies HMAC signatures with constant-time comparison", () => {
    const body = Buffer.from(JSON.stringify({ id: "evt_1" }));
    const secret = "test-secret";
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(body, "00", secret)).toBe(false);
  });
});
