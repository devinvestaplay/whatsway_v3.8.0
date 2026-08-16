import type { Request } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { users, whiteLabelDomains } from "@shared/schema";

export function normalizeHost(host?: string | null): string {
  return (host || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function requestHost(req: Request): string {
  const forwardedHost = req.get("x-forwarded-host");
  return normalizeHost(forwardedHost || req.get("host"));
}

export async function lookupTenantByHost(host: string) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || normalizedHost === "localhost" || normalizedHost === "127.0.0.1") {
    return null;
  }

  const [tenant] = await db
    .select({
      domainId: whiteLabelDomains.id,
      domain: whiteLabelDomains.domain,
      status: whiteLabelDomains.status,
      superadminId: whiteLabelDomains.superadminId,
      superadminEmail: users.email,
      superadminName: sql<string>`concat_ws(' ', ${users.firstName}, ${users.lastName})`,
      superadminStatus: users.status,
      subscriptionStatus: sql<string | null>`(
        SELECT s.status
        FROM platform_partner_subscriptions s
        WHERE s.superadmin_id = ${users.id}
        ORDER BY CASE WHEN s.status IN ('active','trialing','past_due') THEN 0 ELSE 1 END, s.created_at DESC
        LIMIT 1
      )`,
      subscriptionEndDate: sql<Date | null>`(
        SELECT s.end_date
        FROM platform_partner_subscriptions s
        WHERE s.superadmin_id = ${users.id}
        ORDER BY CASE WHEN s.status IN ('active','trialing','past_due') THEN 0 ELSE 1 END, s.created_at DESC
        LIMIT 1
      )`,
    })
    .from(whiteLabelDomains)
    .innerJoin(users, eq(users.id, whiteLabelDomains.superadminId))
    .where(sql`lower(regexp_replace(${whiteLabelDomains.domain}, '^www\\.', '')) = ${normalizedHost}`)
    .limit(1);

  return tenant || null;
}

export async function resolveTenantByHost(host: string) {
  const tenant = await lookupTenantByHost(host);
  if (!tenant || tenant.status !== "active" || tenant.superadminStatus !== "active") return null;
  if (tenant.subscriptionStatus) {
    const allowedStatus = tenant.subscriptionStatus === "active" || tenant.subscriptionStatus === "trialing";
    const notExpired = !tenant.subscriptionEndDate || new Date(tenant.subscriptionEndDate).getTime() > Date.now();
    if (!allowedStatus || !notExpired) return null;
  }
  return tenant;
}

export async function resolveTenantFromRequest(req: Request) {
  return resolveTenantByHost(requestHost(req));
}

export async function shouldBlockInactiveTenantHost(req: Request) {
  const tenant = await lookupTenantByHost(requestHost(req));
  if (!tenant) return false;
  if (tenant.status !== "active" || tenant.superadminStatus !== "active") return true;
  if (tenant.subscriptionStatus) {
    const allowedStatus = tenant.subscriptionStatus === "active" || tenant.subscriptionStatus === "trialing";
    const notExpired = !tenant.subscriptionEndDate || new Date(tenant.subscriptionEndDate).getTime() > Date.now();
    return !allowedStatus || !notExpired;
  }
  return false;
}
