"use server";

import { revalidatePath } from "next/cache";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventCreateBody } from "@/models/schema/event";
import { createEvent } from "@/services/admin/events/createEvent";

export const createEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(eventCreateBody)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    const result = await createEvent(parsedInput, auditLogger, session.user);
    revalidatePath("/admin");
    revalidatePath("/");
    return result;
  });
