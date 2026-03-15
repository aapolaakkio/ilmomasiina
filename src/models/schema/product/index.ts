import { z } from "zod/v4";

/** Schema for a product line used to compute signup prices. */
export const productSchema = z.object({
  name: z.string().min(1),
  amount: z.int(),
  unitPrice: z.int(),
});

/** Schema for a product line used to compute signup prices. */
export type ProductSchema = z.infer<typeof productSchema>;
