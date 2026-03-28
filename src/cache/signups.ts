import { cacheLife, cacheTag } from "next/cache";

import type { SignupID } from "@/db/schema";
import { getSignupForEdit } from "@/services/signups/getSignupForEdit";

export async function getCachedSignupForEdit(signupId: SignupID) {
  "use cache";
  cacheLife("max");
  cacheTag(`signup:${signupId}`);
  return getSignupForEdit(signupId);
}
