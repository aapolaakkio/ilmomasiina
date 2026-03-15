import type { UserListResponse } from "@/models";

import { db } from "../../../db";

/** List all admin users (without password hashes). */
// eslint-disable-next-line import/prefer-default-export
export async function listUsers(): Promise<UserListResponse> {
  return db.query.users.findMany({
    columns: { id: true, email: true },
  }) as unknown as Promise<UserListResponse>;
}
