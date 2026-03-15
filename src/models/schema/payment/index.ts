import { z } from "zod/v4";

/** Response schema for starting a payment. */
export const startPaymentResponse = z.object({
  paymentUrl: z.url(),
});

/** Response schema for starting a payment. */
export type StartPaymentResponse = z.infer<typeof startPaymentResponse>;
