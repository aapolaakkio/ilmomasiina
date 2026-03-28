"use server";

import { revalidateTag, updateTag } from "next/cache";

import { actionClient, verifyEditToken } from "@/auth/safe-action";
import { signupUpdateBody, signupWithToken } from "@/db/zod";
import { internalAuditLogger } from "@/auditlog";
import { updateSignupAsUser } from "@/services/signups/updateSignup";

const schema = signupWithToken.extend({
  body: signupUpdateBody,
});

export const updateSignupAction = actionClient.inputSchema(schema).action(async ({ parsedInput }) => {
  verifyEditToken(parsedInput.signupId, parsedInput.editToken);
  const result = await updateSignupAsUser(parsedInput.signupId, parsedInput.body, internalAuditLogger);
  updateTag(`event-signups:${result.eventId}`);
  updateTag(`signup:${parsedInput.signupId}`);
  revalidateTag(`admin-event:${result.eventId}`, "max");
  revalidateTag("admin-audit-log", "max");
  return result;
});
