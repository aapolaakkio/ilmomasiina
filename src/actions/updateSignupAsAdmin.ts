"use server";

import { revalidateTag, updateTag } from "next/cache";

import { requireEventAccessBySignup } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { adminSignupUpdateBody, signupIdInput } from "@/db/zod";
import { updateSignupAsAdmin } from "@/services/signups/updateSignup";

const schema = signupIdInput.extend({
  body: adminSignupUpdateBody,
});

export const updateSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccessBySignup(session, parsedInput.signupId);
    const result = await updateSignupAsAdmin(
      parsedInput.signupId,
      parsedInput.body,
      auditLogger,
      parsedInput.body.sendEmail ?? true,
    );
    updateTag(`admin-event:${result.eventId}`);
    revalidateTag(`event-signups:${result.eventId}`, "max");
    revalidateTag(`signup:${parsedInput.signupId}`, "max");
    revalidateTag("admin-audit-log", "max");
    return result;
  });
