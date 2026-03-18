import type { UserListResponse } from "@/db/zod";

import { db } from "../../../db";

/** List all admin users (without password hashes). */
export async function listUsers(): Promise<UserListResponse> {
  const rows = await db.query.users.findMany({
    columns: { id: true, email: true, role: true },
  });
  return rows.map((r) => ({ id: r.id, email: r.email, role: r.role }));
}
