"use server";

import { z } from "zod/v4";

import { ActionError, actionClient } from "@/auth/safe-action";
import { signupID, editToken } from "@/db/schema";
import { internalAuditLogger } from "@/auditlog";
import { deleteSignup } from "@/services/signups/deleteSignup";

const schema = z.object({
  signupId: signupID,
  editToken,
});

export const deleteSignupAction = actionClient.inputSchema(schema).action(async ({ parsedInput }) => {
  const { verifyToken } = await import("@/services/signups/editTokens");
  if (!verifyToken(parsedInput.signupId, parsedInput.editToken)) {
    throw new ActionError("Invalid edit token");
  }
  await deleteSignup(parsedInput.signupId, internalAuditLogger);
});
