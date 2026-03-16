import type { UserID, UserListResponse } from "@/models";

import { db } from "../../../db";

/** List all admin users (without password hashes). */
// eslint-disable-next-line import/prefer-default-export
export async function listUsers(): Promise<UserListResponse> {
  const rows = await db.query.users.findMany({
    columns: { id: true, email: true, role: true },
  });
  return rows.map((r) => ({ id: r.id as UserID, email: r.email, role: r.role }));
}
