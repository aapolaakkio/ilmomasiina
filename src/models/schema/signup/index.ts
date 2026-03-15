import { z } from "zod/v4";

import { ManualPaymentStatus, SignupPaymentStatus, SignupStatus } from "../../enum";
import { productSchema } from "../product";
import { questionID } from "../question";
import { quotaID } from "../quota";

export const signupID = z.string().min(1).max(32).brand<"SignupID">();

export const editToken = z.string();

/** Answer to a single signup question */
export const signupAnswer = z.object({
  questionId: questionID,
  answer: z.union([z.string().max(255), z.array(z.string().max(255)).max(64)]),
});

/** Editable attributes of a signup with non-public information removed. */
const publicEditableSignupAttributes = z.object({
  firstName: z.nullable(z.string().max(255)),
  lastName: z.nullable(z.string().max(255)),
  namePublic: z.boolean(),
  answers: z.array(signupAnswer),
});

/** Editable attributes of a signup. */
const ownerEditableSignupAttributes = publicEditableSignupAttributes.extend({
  email: z.nullable(z.string().max(255)),
});

/** Editable attributes of a signup for admins. */
const adminEditableSignupAttributes = ownerEditableSignupAttributes.extend({
  manualPaymentStatus: z.nullable(z.enum(ManualPaymentStatus)),
});

/** Non-editable, automatically updated signup attributes with non-public information removed. */
const publicDynamicSignupAttributes = z.object({
  status: z.nullable(z.enum(SignupStatus)),
  position: z.nullable(z.int()),
  createdAt: z.string(),
  confirmed: z.boolean(),
});

/** Non-editable, automatically updated signup attributes only returned for admins and the signup owner. */
const adminDynamicSignupAttributes = publicDynamicSignupAttributes.extend({
  price: z.nullable(z.int().min(0)),
  currency: z.nullable(z.string().max(8)),
  paymentStatus: z.nullable(z.enum(SignupPaymentStatus)),
  deletedAt: z.nullable(z.string()),
});

/** Non-editable, automatically updated signup attributes only returned for the signup owner. */
const ownerDynamicSignupAttributes = adminDynamicSignupAttributes.extend({
  // products is excluded for admins, because the JSON size would blow up unnecessarily.
  products: z.nullable(z.array(productSchema)),
});

const signupLanguage = z.object({
  language: z.nullable(z.string().max(8)),
});

const adminSignupUpdateOptions = z.object({
  sendEmail: z.boolean(),
});

/** Request body for creating a signup. */
export const signupCreateBody = z.object({
  quotaId: quotaID,
});

/** Response schema for successfully creating a signup. */
export const signupCreateResponse = z.object({
  id: signupID,
  editToken,
});

/** Request body for editing an existing signup. */
export const signupUpdateBody = ownerEditableSignupAttributes.extend(signupLanguage.shape).partial();

/** Request body for editing an existing signup as an admin. */
export const adminSignupUpdateBody = adminEditableSignupAttributes
  .extend(signupLanguage.shape)
  .extend(adminSignupUpdateOptions.shape)
  .partial();

/** Request body for creating a signup as an admin. */
export const adminSignupCreateBody = signupCreateBody.extend(adminSignupUpdateBody.shape);

/** Response schema for successfully editing a signup. */
export const signupUpdateResponse = ownerEditableSignupAttributes.extend(ownerDynamicSignupAttributes.shape).extend({
  id: signupID,
});

/** Schema for signups in event details from the public API. */
export const publicSignupSchema = publicEditableSignupAttributes.extend(publicDynamicSignupAttributes.shape);

/** Schema for signups in event details from the admin API. */
export const adminSignupSchema = adminEditableSignupAttributes.extend(adminDynamicSignupAttributes.shape).extend({
  id: signupID,
});

/** Path parameters necessary to fetch and manipulate signups. */
export const signupPathParams = z.object({
  id: signupID,
});

/** Signup ID type. Randomly generated alphanumeric string. */
export type SignupID = z.infer<typeof signupID>;
/** Signup edit token type. */
export type SignupEditToken = z.infer<typeof editToken>;

/** Path parameters necessary to fetch and manipulate signups. */
export type SignupPathParams = z.infer<typeof signupPathParams>;

/** Request body for creating a signup as a regular user. */
export type SignupCreateBody = z.infer<typeof signupCreateBody>;
/** Response schema for successfully creating a signup. */
export type SignupCreateResponse = z.infer<typeof signupCreateResponse>;

/** Request body for editing an existing signup as a regular user. */
export type SignupUpdateBody = z.infer<typeof signupUpdateBody>;
/** Request body for editing an existing signup as an admin. */
export type AdminSignupUpdateBody = z.infer<typeof adminSignupUpdateBody>;
/** Request body for creating a signup as an admin. */
export type AdminSignupCreateBody = z.infer<typeof adminSignupCreateBody>;
/** Response schema for successfully editing a signup. */
export type SignupUpdateResponse = z.infer<typeof signupUpdateResponse>;

/** Schema for signups in event details from the public API. */
export type PublicSignupSchema = z.infer<typeof publicSignupSchema>;
/** Schema for signups in event details from the admin API. */
export type AdminSignupSchema = z.infer<typeof adminSignupSchema>;
