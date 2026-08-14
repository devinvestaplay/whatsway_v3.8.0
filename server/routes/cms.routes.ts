import type { Express, Request } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireSuperadmin } from "../middlewares/auth.middleware";
import { resolveTenantFromRequest } from "../services/tenant-domain.service";

const logoSchema = z.object({
  name: z.string().min(1).max(160),
  logoUrl: z.string().url().max(1000),
  placement: z.string().min(1).max(80).default("founders"),
  status: z.enum(["active", "inactive"]).default("active"),
  displayOrder: z.coerce.number().int().default(0),
});

const settingSchema = z.object({
  value: z.record(z.any()),
});

const entrySchema = z.object({
  type: z.enum(["case_study", "review_feedback"]),
  title: z.string().min(1).max(220),
  subtitle: z.string().max(220).optional().nullable(),
  body: z.string().optional().nullable(),
  imageUrl: z.string().max(1000).optional().nullable(),
  linkUrl: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.any()).default({}),
  status: z.enum(["active", "inactive"]).default("active"),
  displayOrder: z.coerce.number().int().default(0),
});

function actorId(req: Request) {
  return req.user?.id || null;
}

async function cmsScope(req: Request) {
  const tenant = await resolveTenantFromRequest(req);
  if (tenant) {
    return {
      tenantDomainId: tenant.domainId,
      ownerSuperadminId: tenant.superadminId,
    };
  }

  if (req.user?.role === "superadmin" && req.user?.createdBy) {
    const result = await pool.query(
      `SELECT id FROM white_label_domains
       WHERE superadmin_id=$1 AND status='active'
       ORDER BY created_at ASC
       LIMIT 1`,
      [req.user.id]
    );
    if (result.rows[0]) {
      return {
        tenantDomainId: result.rows[0].id,
        ownerSuperadminId: req.user.id,
      };
    }
  }

  return { tenantDomainId: null, ownerSuperadminId: null };
}

function addTenantFilter(
  where: string[],
  params: any[],
  scope: { tenantDomainId: string | null },
  tableAlias = ""
) {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  if (scope.tenantDomainId) {
    params.push(scope.tenantDomainId);
    where.push(`${prefix}tenant_domain_id=$${params.length}`);
  } else {
    where.push(`${prefix}tenant_domain_id IS NULL`);
  }
}

export function registerCmsRoutes(app: Express) {
  app.get("/api/cms/settings/:key", async (req, res) => {
    const scope = await cmsScope(req);
    let result;
    if (scope.tenantDomainId) {
      result = await pool.query(
        `SELECT key, value FROM marketing_cms_settings
         WHERE key=$1 AND tenant_domain_id=$2
         LIMIT 1`,
        [req.params.key, scope.tenantDomainId]
      );
      return res.json(result.rows[0] || { key: req.params.key, value: {} });
    }
    result = await pool.query(
      `SELECT key, value FROM marketing_cms_settings
       WHERE key=$1 AND tenant_domain_id IS NULL
       LIMIT 1`,
      [req.params.key]
    );
    res.json(result.rows[0] || { key: req.params.key, value: {} });
  });

  app.get("/api/cms/entries", async (req, res) => {
    const type = String(req.query.type || "").trim();
    const params: any[] = [];
    const where = ["status='active'"];
    if (type) {
      params.push(type);
      where.push(`type=$${params.length}`);
    }
    const scope = await cmsScope(req);
    if (scope.tenantDomainId) {
      const tenantWhere = [...where];
      const tenantParams = [...params];
      addTenantFilter(tenantWhere, tenantParams, scope);
      const tenantResult = await pool.query(
        `SELECT id, type, title, subtitle, body, image_url, link_url, metadata, status, display_order
         FROM marketing_cms_entries
         WHERE ${tenantWhere.join(" AND ")}
         ORDER BY display_order ASC, title ASC`,
        tenantParams
      );
      return res.json({ rows: tenantResult.rows });
    }
    where.push("tenant_domain_id IS NULL");
    const result = await pool.query(
      `SELECT id, type, title, subtitle, body, image_url, link_url, metadata, status, display_order
       FROM marketing_cms_entries
       WHERE ${where.join(" AND ")}
       ORDER BY display_order ASC, title ASC`,
      params
    );
    res.json({ rows: result.rows });
  });

  app.get("/api/cms/logos", async (req, res) => {
    const placement = String(req.query.placement || "founders").trim();
    const scope = await cmsScope(req);
    if (scope.tenantDomainId) {
      const tenantResult = await pool.query(
        `SELECT id, name, logo_url, placement, status, display_order
         FROM marketing_cms_logos
         WHERE placement=$1 AND status='active' AND tenant_domain_id=$2
         ORDER BY display_order ASC, name ASC`,
        [placement, scope.tenantDomainId]
      );
      return res.json({ rows: tenantResult.rows });
    }
    const result = await pool.query(
      `SELECT id, name, logo_url, placement, status, display_order
       FROM marketing_cms_logos
       WHERE placement=$1 AND status='active' AND tenant_domain_id IS NULL
       ORDER BY display_order ASC, name ASC`,
      [placement]
    );
    res.json({ rows: result.rows });
  });

  app.get("/api/superadmin/cms/logos", requireAuth, requireSuperadmin, async (req, res) => {
    const scope = await cmsScope(req);
    const placement = String(req.query.placement || "").trim();
    const params: any[] = [];
    const where: string[] = ["1=1"];
    if (placement) {
      params.push(placement);
      where.push(`placement=$${params.length}`);
    }
    addTenantFilter(where, params, scope);
    const result = await pool.query(
      `SELECT *
       FROM marketing_cms_logos
       WHERE ${where.join(" AND ")}
       ORDER BY placement ASC, display_order ASC, name ASC`,
      params
    );
    res.json({ rows: result.rows });
  });

  app.post("/api/superadmin/cms/logos", requireAuth, requireSuperadmin, async (req, res) => {
    const parsed = logoSchema.parse(req.body);
    const scope = await cmsScope(req);
    const result = await pool.query(
      `INSERT INTO marketing_cms_logos
       (name, logo_url, placement, status, display_order, created_by, tenant_domain_id, owner_superadmin_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        parsed.name,
        parsed.logoUrl,
        parsed.placement,
        parsed.status,
        parsed.displayOrder,
        actorId(req),
        scope.tenantDomainId,
        scope.ownerSuperadminId,
      ]
    );
    res.status(201).json(result.rows[0]);
  });

  app.patch("/api/superadmin/cms/logos/:id", requireAuth, requireSuperadmin, async (req, res) => {
    const parsed = logoSchema.partial().parse(req.body);
    const scope = await cmsScope(req);
    const currentParams: any[] = [req.params.id];
    const currentWhere = ["id=$1"];
    addTenantFilter(currentWhere, currentParams, scope);
    const current = await pool.query(`SELECT * FROM marketing_cms_logos WHERE ${currentWhere.join(" AND ")}`, currentParams);
    if (!current.rows[0]) return res.status(404).json({ error: "Logo not found" });
    const row = current.rows[0];
    const result = await pool.query(
      `UPDATE marketing_cms_logos
       SET name=$2, logo_url=$3, placement=$4, status=$5, display_order=$6, updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [
        req.params.id,
        parsed.name ?? row.name,
        parsed.logoUrl ?? row.logo_url,
        parsed.placement ?? row.placement,
        parsed.status ?? row.status,
        parsed.displayOrder ?? row.display_order,
      ]
    );
    res.json(result.rows[0]);
  });

  app.delete("/api/superadmin/cms/logos/:id", requireAuth, requireSuperadmin, async (req, res) => {
    const scope = await cmsScope(req);
    const params: any[] = [req.params.id];
    const where = ["id=$1"];
    addTenantFilter(where, params, scope);
    const result = await pool.query(`DELETE FROM marketing_cms_logos WHERE ${where.join(" AND ")} RETURNING id`, params);
    if (!result.rows[0]) return res.status(404).json({ error: "Logo not found" });
    res.json({ success: true });
  });

  app.get("/api/superadmin/cms/settings", requireAuth, requireSuperadmin, async (req, res) => {
    const scope = await cmsScope(req);
    const params: any[] = [];
    const where: string[] = [];
    addTenantFilter(where, params, scope);
    const result = await pool.query(
      `SELECT key, value, updated_at FROM marketing_cms_settings
       WHERE ${where.join(" AND ")}
       ORDER BY key ASC`,
      params
    );
    res.json({ rows: result.rows });
  });

  app.put("/api/superadmin/cms/settings/:key", requireAuth, requireSuperadmin, async (req, res) => {
    const parsed = settingSchema.parse(req.body);
    const scope = await cmsScope(req);
    const existing = scope.tenantDomainId
      ? await pool.query(
          `SELECT id FROM marketing_cms_settings WHERE key=$1 AND tenant_domain_id=$2 LIMIT 1`,
          [req.params.key, scope.tenantDomainId]
        )
      : await pool.query(
          `SELECT id FROM marketing_cms_settings WHERE key=$1 AND tenant_domain_id IS NULL LIMIT 1`,
          [req.params.key]
        );
    const result = existing.rows[0]
      ? await pool.query(
          `UPDATE marketing_cms_settings
           SET value=$2::jsonb, updated_by=$3, updated_at=NOW()
           WHERE id=$1
           RETURNING key, value, updated_at`,
          [existing.rows[0].id, JSON.stringify(parsed.value), actorId(req)]
        )
      : await pool.query(
          `INSERT INTO marketing_cms_settings
           (key, value, updated_by, tenant_domain_id, owner_superadmin_id)
           VALUES ($1, $2::jsonb, $3, $4, $5)
           RETURNING key, value, updated_at`,
          [req.params.key, JSON.stringify(parsed.value), actorId(req), scope.tenantDomainId, scope.ownerSuperadminId]
        );
    res.json(result.rows[0]);
  });

  app.get("/api/superadmin/cms/entries", requireAuth, requireSuperadmin, async (req, res) => {
    const scope = await cmsScope(req);
    const type = String(req.query.type || "").trim();
    const params: any[] = [];
    const where: string[] = ["1=1"];
    if (type) {
      params.push(type);
      where.push(`type=$${params.length}`);
    }
    addTenantFilter(where, params, scope);
    const result = await pool.query(
      `SELECT *
       FROM marketing_cms_entries
       WHERE ${where.join(" AND ")}
       ORDER BY type ASC, display_order ASC, title ASC`,
      params
    );
    res.json({ rows: result.rows });
  });

  app.post("/api/superadmin/cms/entries", requireAuth, requireSuperadmin, async (req, res) => {
    const parsed = entrySchema.parse(req.body);
    const scope = await cmsScope(req);
    const result = await pool.query(
      `INSERT INTO marketing_cms_entries
       (type, title, subtitle, body, image_url, link_url, metadata, status, display_order, created_by, tenant_domain_id, owner_superadmin_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        parsed.type,
        parsed.title,
        parsed.subtitle || "",
        parsed.body || "",
        parsed.imageUrl || "",
        parsed.linkUrl || "",
        JSON.stringify(parsed.metadata || {}),
        parsed.status,
        parsed.displayOrder,
        actorId(req),
        scope.tenantDomainId,
        scope.ownerSuperadminId,
      ]
    );
    res.status(201).json(result.rows[0]);
  });

  app.patch("/api/superadmin/cms/entries/:id", requireAuth, requireSuperadmin, async (req, res) => {
    const parsed = entrySchema.partial().parse(req.body);
    const scope = await cmsScope(req);
    const currentParams: any[] = [req.params.id];
    const currentWhere = ["id=$1"];
    addTenantFilter(currentWhere, currentParams, scope);
    const current = await pool.query(`SELECT * FROM marketing_cms_entries WHERE ${currentWhere.join(" AND ")}`, currentParams);
    if (!current.rows[0]) return res.status(404).json({ error: "CMS entry not found" });
    const row = current.rows[0];
    const result = await pool.query(
      `UPDATE marketing_cms_entries
       SET type=$2, title=$3, subtitle=$4, body=$5, image_url=$6, link_url=$7, metadata=$8::jsonb, status=$9, display_order=$10, updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [
        req.params.id,
        parsed.type ?? row.type,
        parsed.title ?? row.title,
        parsed.subtitle ?? row.subtitle,
        parsed.body ?? row.body,
        parsed.imageUrl ?? row.image_url,
        parsed.linkUrl ?? row.link_url,
        JSON.stringify(parsed.metadata ?? row.metadata ?? {}),
        parsed.status ?? row.status,
        parsed.displayOrder ?? row.display_order,
      ]
    );
    res.json(result.rows[0]);
  });

  app.delete("/api/superadmin/cms/entries/:id", requireAuth, requireSuperadmin, async (req, res) => {
    const scope = await cmsScope(req);
    const params: any[] = [req.params.id];
    const where = ["id=$1"];
    addTenantFilter(where, params, scope);
    const result = await pool.query(`DELETE FROM marketing_cms_entries WHERE ${where.join(" AND ")} RETURNING id`, params);
    if (!result.rows[0]) return res.status(404).json({ error: "CMS entry not found" });
    res.json({ success: true });
  });
}
