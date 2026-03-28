import { cacheLife, cacheTag } from "next/cache";

import { listUsers } from "@/services/admin/users/listUsers";

export async function getCachedAdminUsers() {
  "use cache";
  cacheLife("max");
  cacheTag("admin-users");
  return listUsers();
}
