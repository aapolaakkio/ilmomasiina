"use server";

import { revalidateTag, updateTag } from "next/cache";

import { actionClient, verifyEditToken } from "@/auth/safe-action";
import { signupWithToken } from "@/db/zod";
import { internalAuditLogger } from "@/auditlog";
import { deleteSignup } from "@/services/signups/deleteSignup";

export const deleteSignupAction = actionClient.inputSchema(signupWithToken).action(async ({ parsedInput }) => {
  verifyEditToken(parsedInput.signupId, parsedInput.editToken);
  const { eventId } = await deleteSignup(parsedInput.signupId, internalAuditLogger);
  updateTag(`event-signups:${eventId}`);
  updateTag(`signup:${parsedInput.signupId}`);
  revalidateTag(`admin-event:${eventId}`, "max");
  revalidateTag("admin-audit-log", "max");
});
