"use server";

import { z } from "zod/v4";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { checkSlugAvailability } from "@/services/admin/slugs/checkSlugAvailability";

const schema = z.object({
  slug: z.string(),
});

export const checkSlugAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    return checkSlugAvailability(parsedInput.slug);
  });
