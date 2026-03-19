"use server";

import { z } from "zod";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventSlug } from "@/db/zod";
import { checkSlugAvailability } from "@/services/admin/slugs/checkSlugAvailability";

const schema = z.object({
  slug: eventSlug,
});

export const checkSlugAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    return checkSlugAvailability(parsedInput.slug);
  });
