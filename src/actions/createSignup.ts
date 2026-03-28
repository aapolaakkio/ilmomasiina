"use server";

import { revalidateTag, updateTag } from "next/cache";

import { actionClient } from "@/auth/safe-action";
import { signupCreateBody } from "@/db/zod";
import { internalAuditLogger } from "@/auditlog";
import { createSignup } from "@/services/signups/createSignup";

export const createSignupAction = actionClient.inputSchema(signupCreateBody).action(async ({ parsedInput }) => {
  const result = await createSignup(parsedInput, internalAuditLogger);
  updateTag(`event-signups:${result.eventId}`);
  revalidateTag(`admin-event:${result.eventId}`, "max");
  revalidateTag("admin-audit-log", "max");
  return result;
});
