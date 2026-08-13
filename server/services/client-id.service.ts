import { pool } from "../db";

const CLIENT_ID_START = 4298;

export async function allocatePublicClientId(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(4298)");

    const { rows } = await client.query<{ next_id: number }>(
      `
        SELECT GREATEST($1::int - 1, COALESCE(MAX(public_client_id), $1::int - 1)) + 1 AS next_id
        FROM users
        WHERE public_client_id IS NOT NULL
      `,
      [CLIENT_ID_START]
    );

    await client.query("COMMIT");
    return Number(rows[0]?.next_id || CLIENT_ID_START);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function shouldAssignPublicClientId(role?: string | null): boolean {
  return (role || "admin") === "admin";
}
