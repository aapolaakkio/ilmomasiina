"use server";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { slugAvailabilityInput } from "@/db/zod";
import { checkSlugAvailability } from "@/services/admin/slugs/checkSlugAvailability";

export const checkSlugAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(slugAvailabilityInput)
  .action(async ({ parsedInput }) => {
    return checkSlugAvailability(parsedInput.slug);
  });
