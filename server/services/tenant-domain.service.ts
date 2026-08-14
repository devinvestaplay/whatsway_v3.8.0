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
  return tenant;
}

export async function resolveTenantFromRequest(req: Request) {
  return resolveTenantByHost(requestHost(req));
}

export async function shouldBlockInactiveTenantHost(req: Request) {
  const tenant = await lookupTenantByHost(requestHost(req));
  if (!tenant) return false;
  return tenant.status !== "active" || tenant.superadminStatus !== "active";
}
