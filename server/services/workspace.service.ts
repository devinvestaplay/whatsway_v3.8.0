import { and, eq, or, sql } from "drizzle-orm";
import { db, pool } from "../db";
import { channels, users, type Channel, type User } from "@shared/schema";

type ClientIdentity = Pick<User, "id" | "username" | "email" | "firstName" | "lastName" | "createdBy">;

function workspaceNameForClient(client: ClientIdentity) {
  const fullName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  const fallback = client.username || client.email?.split("@")[0] || "Client";
  return `${fullName || fallback} Workspace`;
}

function workspaceOwnerCondition(clientId: string) {
  return or(
    eq(channels.whiteLabelClientId, clientId),
    and(eq(channels.createdBy, clientId), sql`${channels.whiteLabelClientId} IS NULL`)
  );
}

export async function getClientById(clientId: string) {
  const [client] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, clientId), eq(users.role, "admin")))
    .limit(1);
  return client || null;
}

export async function getWorkspaceOwnerId(workspaceId: string) {
  const { rows } = await pool.query(
    `SELECT COALESCE(white_label_client_id, NULLIF(created_by,'')) AS owner_id FROM channels WHERE id=$1 LIMIT 1`,
    [workspaceId]
  );
  return rows[0]?.owner_id || null;
}

export async function ensureDefaultWorkspaceForClient(client: ClientIdentity) {
  const existing = await db
    .select({ id: channels.id })
    .from(channels)
    .where(workspaceOwnerCondition(client.id))
    .limit(1);

  if (existing[0]) return null;

  const [workspace] = await db
    .insert(channels)
    .values({
      name: workspaceNameForClient(client),
      phoneNumberId: `workspace-${client.id}`,
      accessToken: "",
      phoneNumber: null,
      whatsappBusinessAccountId: null,
      appId: null,
      isActive: true,
      healthStatus: "unknown",
      healthDetails: { workspaceOnly: true },
      connectionMethod: "workspace",
      createdBy: client.id,
      whiteLabelClientId: client.id,
      whiteLabelWorkspaceType: "free",
      whiteLabelPoints: "0",
      whiteLabelAutoRenew: false,
    })
    .returning();

  return workspace;
}

export async function createWorkspaceForClient(params: {
  clientId: string;
  name: string;
  createdBy: string | null;
  workspaceType?: string;
  notes?: string | null;
  setActive?: boolean;
}) {
  const client = await getClientById(params.clientId);
  if (!client) {
    const error: any = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }

  if (client.createdBy) {
    const limit = await pool.query(
      `SELECT workspace_limit FROM platform_superadmin_controls WHERE superadmin_id=$1 AND workspace_limit IS NOT NULL`,
      [client.createdBy]
    );
    const workspaceLimit = limit.rows[0]?.workspace_limit;
    if (workspaceLimit !== undefined && workspaceLimit !== null) {
      const current = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM channels c
         JOIN users owner ON owner.id = COALESCE(c.white_label_client_id, c.created_by)
         WHERE owner.role='admin' AND owner.created_by=$1`,
        [client.createdBy]
      );
      if (Number(current.rows[0]?.count || 0) >= Number(workspaceLimit)) {
        const error: any = new Error("Partner workspace limit reached. Contact the platform admin to increase the limit.");
        error.statusCode = 403;
        throw error;
      }
    }
  }

  if (params.setActive !== false) {
    await db
      .update(channels)
      .set({ isActive: false, updatedAt: new Date() })
      .where(workspaceOwnerCondition(params.clientId));
  }

  const [workspace] = await db
    .insert(channels)
    .values({
      name: params.name.trim(),
      phoneNumberId: `workspace-${params.clientId}-${Date.now()}`,
      accessToken: "",
      phoneNumber: null,
      whatsappBusinessAccountId: null,
      appId: null,
      isActive: params.setActive !== false,
      healthStatus: "unknown",
      healthDetails: { workspaceOnly: true },
      connectionMethod: "workspace",
      createdBy: params.clientId,
      whiteLabelClientId: params.clientId,
      whiteLabelWorkspaceType: params.workspaceType || "free",
      whiteLabelPoints: "0",
      whiteLabelAutoRenew: false,
      whiteLabelNotes: params.notes || null,
    })
    .returning();

  return workspace;
}

export function isWorkspaceShell(channel: Channel | undefined | null) {
  return !channel?.accessToken || channel.connectionMethod === "workspace";
}
