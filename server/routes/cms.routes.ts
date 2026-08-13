import type { Express, Request } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireSuperadmin } from "../middlewares/auth.middleware";

const logoSchema = z.object({
  name: z.string().min(1).max(160),
  logoUrl: z.string().url().max(1000),
  placement: z.string().min(1).max(80).default("founders"),
  status: z.enum(["active", "inactive"]).default("active"),
  displayOrder: z.coerce.number().int().default(0),
});

function actorId(req: Request) {
  return req.user?.id || null;
}

export function registerCmsRoutes(app: Express) {
  app.get("/api/cms/logos", async (req, res) => {
    const placement = String(req.query.placement || "founders").trim();
    const result = await pool.query(
      `SELECT id, name, logo_url, placement, status, display_order
       FROM marketing_cms_logos
       WHERE placement=$1 AND status='active'
       ORDER BY display_order ASC, name ASC`,
      [placement]
    );
    res.json({ rows: result.rows });
  });

  app.get("/api/superadmin/cms/logos", requireAuth, requireSuperadmin, async (req, res) => {
    const placement = String(req.query.placement || "").trim();
    const params: any[] = [];
    const where: string[] = ["1=1"];
    if (placement) {
      params.push(placement);
      where.push(`placement=$${params.length}`);
    }
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
    const result = await pool.query(
      `INSERT INTO marketing_cms_logos (name, logo_url, placement, status, display_order, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [parsed.name, parsed.logoUrl, parsed.placement, parsed.status, parsed.displayOrder, actorId(req)]
    );
    res.status(201).json(result.rows[0]);
  });

  app.patch("/api/superadmin/cms/logos/:id", requireAuth, requireSuperadmin, async (req, res) => {
    const parsed = logoSchema.partial().parse(req.body);
    const current = await pool.query(`SELECT * FROM marketing_cms_logos WHERE id=$1`, [req.params.id]);
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
    const result = await pool.query(`DELETE FROM marketing_cms_logos WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Logo not found" });
    res.json({ success: true });
  });
}
