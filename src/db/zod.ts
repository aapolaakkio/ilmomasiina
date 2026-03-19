import { createSchemaFactory } from "drizzle-orm/zod";
import { z } from "zod";

import {
  auditEventEnum,
  auditlogs,
  editToken,
  ErrorCode,
  eventID,
  events,
  ManualPaymentStatus,
  PaymentMode,
  productSchema,
  questionID,
  questionLanguages,
  questions,
  QuestionType,
  quotaID,
  quotaLanguages,
  quotas,
  SignupFieldError,
  signupID,
  SignupPaymentStatus,
  SignupStatus,
  userID,
  UserRole,
  users,
} from "./schema";

// --- Schema Factory ---

const { createSelectSchema } = createSchemaFactory();

// --- Shared Validation Schemas ---

export const eventSlug = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9_-]+$/);

const questionOptions = z.array(z.string().max(255)).max(64).nullable();
const questionPrices = z.array(z.int().min(0)).max(64).nullable();

// --- Base Select Schemas ---

const eventSelect = createSelectSchema(events, {
  id: eventID,
  payments: z.enum(PaymentMode),
});

const questionSelect = createSelectSchema(questions, {
  id: questionID,
  eventId: eventID,
  type: z.enum(QuestionType),
  options: questionOptions,
  prices: questionPrices,
});

const quotaSelect = createSelectSchema(quotas);

const questionLangSelect = createSelectSchema(questionLanguages, {
  options: questionOptions,
});

const quotaLangSelect = createSelectSchema(quotaLanguages);

const auditLogSelect = createSelectSchema(auditlogs);

const userSelect = createSelectSchema(users, {
  id: userID,
});

// --- Question Schemas ---

/** Schema for a question language version. */
export const questionLanguage = questionLangSelect.pick({
  question: true,
  options: true,
});

/** Schema for creating a question. */
export const questionCreate = questionSelect
  .pick({
    question: true,
    type: true,
    options: true,
    prices: true,
    required: true,
    public: true,
  })
  .extend({ question: z.string().min(1).max(1024) });

/** Schema for a question. */
export const question = questionCreate.extend({
  id: questionID,
});

/** Schema for updating a question. */
export const questionUpdate = questionCreate.extend({
  id: questionID.optional(),
});

// --- Quota Schemas ---

/** Schema for a quota language version. */
export const quotaLanguage = quotaLangSelect.pick({
  title: true,
});

/** Schema for creating a quota. */
export const quotaCreate = quotaSelect
  .pick({
    title: true,
    size: true,
    price: true,
  })
  .extend({
    title: z.string().min(1).max(255),
    size: z.int().min(1).nullable(),
  });

/** Schema for a quota. */
export const quota = quotaCreate.extend({
  id: quotaID,
});

/** Schema for updating a quota. */
export const quotaUpdate = quotaCreate.extend({
  id: quotaID.optional(),
});

// --- Signup Schemas ---

/** Answer to a single signup question. */
export const signupAnswer = z.object({
  questionId: questionID,
  answer: z.union([z.string().max(255), z.array(z.string().max(255)).max(64)]),
});

const publicEditableSignupAttributes = z.object({
  firstName: z.string().max(255).nullable(),
  lastName: z.string().max(255).nullable(),
  namePublic: z.boolean(),
  answers: z.array(signupAnswer),
});

const ownerEditableSignupAttributes = publicEditableSignupAttributes.extend({
  email: z.string().max(255).nullable(),
});

const adminEditableSignupAttributes = ownerEditableSignupAttributes.extend({
  manualPaymentStatus: z.enum(ManualPaymentStatus).nullable(),
});

const publicDynamicSignupAttributes = z.object({
  status: z.enum(SignupStatus).nullable(),
  position: z.int().nullable(),
  createdAt: z.date(),
  confirmed: z.boolean(),
});

const adminDynamicSignupAttributes = publicDynamicSignupAttributes.extend({
  price: z.int().min(0).nullable(),
  currency: z.string().max(8).nullable(),
  paymentStatus: z.enum(SignupPaymentStatus).nullable(),
  deletedAt: z.date().nullable(),
});

const ownerDynamicSignupAttributes = adminDynamicSignupAttributes.extend({
  products: z.array(productSchema).nullable(),
});

const signupLanguage = z.object({
  language: z.string().max(8).nullable(),
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
export const adminSignupSchema = adminEditableSignupAttributes
  .extend(adminDynamicSignupAttributes.shape)
  .extend({ id: signupID });

// --- Quota With Signups Schemas ---

/** Schema for a quota with a count of its signups. */
export const quotaWithSignupCount = quota.extend({
  signupCount: z.int(),
});

/** Schema for a quota with public information of its signups. */
const userQuotaWithSignups = quotaWithSignupCount.extend({
  signups: z.array(publicSignupSchema),
});

/** Schema for a quota with full information of its signups. */
const adminQuotaWithSignups = quotaWithSignupCount.extend({
  signups: z.array(adminSignupSchema),
});

// --- Event Schemas ---

/** Event attributes that are not localizable and are public. */
const publicEventAttributes = eventSelect.pick({
  slug: true,
  date: true,
  endDate: true,
  registrationStartDate: true,
  registrationEndDate: true,
  openQuotaSize: true,
  category: true,
  signupsPublic: true,
  nameQuestion: true,
  emailQuestion: true,
  payments: true,
  defaultLanguage: true,
});

const adminOnlyEventAttributes = eventSelect.pick({
  draft: true,
  listed: true,
});

const publicCommonAttributes = eventSelect.pick({
  description: true,
  price: true,
  location: true,
  webpageUrl: true,
});

const adminDetailsOnlyCommonAttributes = eventSelect.pick({
  verificationEmail: true,
});

const publicLanguageAttributes = z.object({
  title: z.string().max(255),
  quotas: z.array(quotaLanguage),
  questions: z.array(questionLanguage),
});

/** Schema for an event language version. */
export const userEventLanguage = publicCommonAttributes.extend(publicLanguageAttributes.shape);

/** Schema for an event language version for admins. */
export const adminEventLanguage = publicCommonAttributes
  .extend(publicLanguageAttributes.shape)
  .extend(adminDetailsOnlyCommonAttributes.shape);

const userEventLanguages = z.object({
  languages: z.record(z.string().max(8), userEventLanguage),
});

const adminEventLanguages = z.object({
  languages: z.record(z.string().max(8), adminEventLanguage),
});

const publicAttributes = publicEventAttributes
  .extend(publicCommonAttributes.shape)
  .extend(userEventLanguages.shape)
  .extend({ title: z.string().min(1).max(255) });

const adminAttributes = publicEventAttributes
  .extend(publicCommonAttributes.shape)
  .extend(adminOnlyEventAttributes.shape)
  .extend(adminDetailsOnlyCommonAttributes.shape)
  .extend(adminEventLanguages.shape)
  .extend({ title: z.string().min(1).max(255) });

/** Response schema for fetching an event from the public API. */
export const userEventResponse = publicAttributes.extend({
  id: eventID,
  questions: z.array(question),
  quotas: z.array(userQuotaWithSignups),
  millisTillOpening: z.int().nullable(),
  registrationClosed: z.boolean(),
});

/** Response schema when an event is fetched as part of an editable signup. */
export const userEventForSignup = publicAttributes.extend({
  id: eventID,
  questions: z.array(question),
  quotas: z.array(quota),
});

/** Response schema for fetching or modifying an event in the admin API. */
export const adminEventResponse = adminAttributes.extend({
  id: eventID,
  questions: z.array(question),
  quotas: z.array(adminQuotaWithSignups),
  updatedAt: z.date(),
});

/** Request body for creating an event. */
export const eventCreateBody = adminAttributes.extend({
  quotas: z.array(quotaCreate),
  questions: z.array(questionCreate),
});

/** Request body for editing an existing event. */
export const eventUpdateBody = adminAttributes
  .extend({
    quotas: z.array(quotaUpdate),
    questions: z.array(questionUpdate),
    moveSignupsToQueue: z.boolean(),
    updatedAt: z.date(),
  })
  .partial();

// --- Event List Schemas ---

const userEventListItem = z
  .object({ id: eventID })
  .extend(publicEventAttributes.shape)
  .extend(publicCommonAttributes.shape)
  .extend({ title: z.string().min(1).max(255) })
  .extend(userEventLanguages.shape)
  .extend({ quotas: z.array(quotaWithSignupCount) });

/** Response schema for fetching a list of events from the public API. */
export const userEventListResponse = z.array(userEventListItem);

const adminEventListItem = z
  .object({ id: eventID })
  .extend(publicEventAttributes.shape)
  .extend(publicCommonAttributes.shape)
  .extend({ title: z.string().min(1).max(255) })
  .extend(adminOnlyEventAttributes.shape)
  .extend({ editors: z.array(z.object({ userId: userID })) })
  .extend({ quotas: z.array(quotaWithSignupCount) });

/** Response schema for fetching a list of events from the admin API. */
export const adminEventListResponse = z.array(adminEventListItem);

/** Query parameters applicable to the public event list API. */
export const eventListQuery = z.object({
  category: z.string().optional(),
  maxAge: z.int().optional(),
});

// --- Signup For Edit Schemas ---

/** Schema for fetching a signup for editing. */
export const signupForEdit = adminEditableSignupAttributes.extend(ownerDynamicSignupAttributes.shape).extend({
  id: signupID,
  quota,
  confirmableForMillis: z.int(),
  editableForMillis: z.int(),
});

/** Response schema for fetching a signup for editing. */
export const signupForEditResponse = z.object({
  signup: signupForEdit,
  event: userEventForSignup,
});

// --- User Schemas ---

/** Schema for a user. */
export const userSchema = userSelect.pick({
  id: true,
  email: true,
  role: true,
});

/** Request body for inviting an admin user. */
export const userInviteSchema = z.object({
  email: z.email().min(1).max(255),
  role: z.enum(UserRole).default(UserRole.USER),
});

/** Response schema for fetching a list of users. */
export const userListResponse = z.array(userSchema);

// --- Audit Log Schemas ---

/** Default limit for audit log queries. */
export const AUDIT_LOG_DEFAULT_LIMIT = 100;

const auditLogItemSchema = auditLogSelect.pick({
  id: true,
  user: true,
  ipAddress: true,
  action: true,
  eventId: true,
  eventName: true,
  signupId: true,
  signupName: true,
  extra: true,
  createdAt: true,
});

/** Query parameters applicable to the audit log API. */
export const auditLoqQuery = z.object({
  user: z.string().optional(),
  ip: z.string().optional(),
  action: z.array(z.enum(auditEventEnum.enumValues)).optional(),
  event: z.string().optional(),
  signup: z.string().optional(),
  limit: z.int().min(0).optional(),
  offset: z.int().min(0).optional(),
});

/** Response schema for fetching audit logs. */
export const auditLogResponse = z.object({
  rows: z.array(auditLogItemSchema),
  count: z.int(),
});

// --- Payment Response Schemas ---

/** Response schema for starting a payment. */
export const startPaymentResponse = z.object({
  paymentUrl: z.url(),
});

// --- Error Schemas ---

/** Response schema for a generic error. */
const errorResponse = z.object({
  statusCode: z.number(),
  code: z.enum(ErrorCode).optional(),
  message: z.string(),
});

/** Response schema for an edit conflicting with another edit on the server. */
export const editConflictError = errorResponse.extend({
  updatedAt: z.date(),
  deletedQuotas: z.array(z.string()),
  deletedQuestions: z.array(z.string()),
});

/** Response schema for an edit that would move some signups back to the queue. */
export const wouldMoveSignupsToQueueError = errorResponse.extend({
  count: z.int(),
});

const signupValidationErrors = z.object({
  firstName: z.enum(SignupFieldError).optional(),
  lastName: z.enum(SignupFieldError).optional(),
  email: z.enum(SignupFieldError).optional(),
  answers: z.record(z.string(), z.enum(SignupFieldError)).optional(),
});

// --- Event Editor Schemas ---

/** Schema for adding an editor to an event. */
export const addEventEditorSchema = z.object({
  eventId: eventID,
  email: z.email().min(1).max(255),
});

/** Schema for removing an editor from an event. */
export const removeEventEditorSchema = z.object({
  eventId: eventID,
  userId: userID,
});

// --- Shared Action Input Schemas ---

/** Input schema for actions that identify a signup by ID and edit token. */
export const signupWithToken = z.object({
  signupId: signupID,
  editToken,
});

/** Input schema for actions that identify a signup by ID. */
export const signupIdInput = z.object({
  signupId: signupID,
});

/** Input schema for actions that identify an event by ID. */
export const eventIdInput = z.object({
  eventId: eventID,
});

// --- Type Exports ---

export type EventSlug = z.infer<typeof eventSlug>;
export type AdminEventResponse = z.infer<typeof adminEventResponse>;
export type UserEventResponse = z.infer<typeof userEventResponse>;
export type AdminEventLanguage = z.infer<typeof adminEventLanguage>;
export type UserEventLanguage = z.infer<typeof userEventLanguage>;
export type EventCreateBody = z.infer<typeof eventCreateBody>;
export type EventUpdateBody = z.infer<typeof eventUpdateBody>;

export type UserEventListResponse = z.infer<typeof userEventListResponse>;
export type UserEventListItem = z.infer<typeof userEventListItem>;
export type AdminEventListResponse = z.infer<typeof adminEventListResponse>;
export type EventListQuery = z.infer<typeof eventListQuery>;

export type SignupCreateBody = z.infer<typeof signupCreateBody>;
export type SignupCreateResponse = z.infer<typeof signupCreateResponse>;
export type SignupUpdateBody = z.infer<typeof signupUpdateBody>;
export type SignupUpdateResponse = z.infer<typeof signupUpdateResponse>;
export type AdminSignupUpdateBody = z.infer<typeof adminSignupUpdateBody>;
export type AdminSignupCreateBody = z.infer<typeof adminSignupCreateBody>;
export type AdminSignupSchema = z.infer<typeof adminSignupSchema>;

export type SignupForEdit = z.infer<typeof signupForEdit>;
export type SignupForEditResponse = z.infer<typeof signupForEditResponse>;

export type QuotaWithSignupCount = z.infer<typeof quotaWithSignupCount>;
export type Quota = z.infer<typeof quota>;
export type Question = z.infer<typeof question>;

export type UserSchema = z.infer<typeof userSchema>;
export type UserListResponse = z.infer<typeof userListResponse>;

export type AuditLoqQuery = z.infer<typeof auditLoqQuery>;
export type AuditLogResponse = z.infer<typeof auditLogResponse>;

export type SignupValidationErrors = z.infer<typeof signupValidationErrors>;

export type StartPaymentResponse = z.infer<typeof startPaymentResponse>;
export type EditConflictError = z.infer<typeof editConflictError>;
export type WouldMoveSignupsToQueueError = z.infer<typeof wouldMoveSignupsToQueueError>;

export type SignupWithToken = z.infer<typeof signupWithToken>;
export type SignupIdInput = z.infer<typeof signupIdInput>;
export type EventIdInput = z.infer<typeof eventIdInput>;

export type CheckSlugResponse = {
  id: z.infer<typeof eventID> | null;
  title: string | null;
};

export type CategoriesResponse = string[];
