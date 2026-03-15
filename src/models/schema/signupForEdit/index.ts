import { z } from "zod/v4";

import { ManualPaymentStatus, SignupPaymentStatus, SignupStatus } from "../../enum";
import { userEventForSignup } from "../event";
import { productSchema } from "../product";
import { quota } from "../quota";
import { signupAnswer, signupID } from "../signup";

/** Schema for fetching a signup for editing. */
export const signupForEdit = z.object({
  id: signupID,
  // owner-editable attributes
  firstName: z.nullable(z.string().max(255)),
  lastName: z.nullable(z.string().max(255)),
  namePublic: z.boolean(),
  answers: z.array(signupAnswer),
  email: z.nullable(z.string().max(255)),
  // owner-dynamic attributes (extends admin-dynamic which extends public-dynamic)
  status: z.nullable(z.enum(SignupStatus)),
  position: z.nullable(z.int()),
  createdAt: z.string(),
  confirmed: z.boolean(),
  price: z.nullable(z.int().min(0)),
  currency: z.nullable(z.string().max(8)),
  paymentStatus: z.nullable(z.enum(SignupPaymentStatus)),
  deletedAt: z.nullable(z.string()),
  products: z.nullable(z.array(productSchema)),
  manualPaymentStatus: z.nullable(z.enum(ManualPaymentStatus)),
  // signupForEdit-specific
  quota,
  confirmableForMillis: z.int(),
  editableForMillis: z.int(),
});

/** Response schema for fetching a signup for editing. */
export const signupForEditResponse = z.object({
  signup: signupForEdit,
  event: userEventForSignup,
});

/** Schema for fetching a signup for editing. */
export type SignupForEdit = z.infer<typeof signupForEdit>;

/** Response schema for fetching a signup for editing. */
export type SignupForEditResponse = z.infer<typeof signupForEditResponse>;
