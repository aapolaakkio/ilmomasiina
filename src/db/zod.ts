import { createSchemaFactory } from "drizzle-orm/zod";
import { z } from "zod";

import {
  auditEventEnum,
  auditlogs,
  editToken,
  ErrorCode,
  type EventID,
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

export type EventSlug = z.infer<typeof eventSlug>;

/** Primary event title and other required short labels (e.g. quota titles in forms). */
export const eventPrimaryTitle = z.string().min(1).max(255);

/** Question wording as stored on events (editor + create/update API). */
export const questionBodyText = z.string().min(1).max(1024);

/** Input for debounced slug availability checks in the editor. */
export const slugAvailabilityInput = z.object({
  slug: eventSlug,
});

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
  .extend({ question: questionBodyText });

/** Schema for a question. */
export const question = questionCreate.extend({
  id: questionID,
});

export type Question = z.infer<typeof question>;

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
    title: eventPrimaryTitle,
    size: z.int().min(1).nullable(),
  });

/** Schema for a quota. */
export const quota = quotaCreate.extend({
  id: quotaID,
});

export type Quota = z.infer<typeof quota>;

/** Schema for updating a quota. */
export const quotaUpdate = quotaCreate.extend({
  id: quotaID.optional(),
});

/** Quota row in the event editor form (client validation). */
export const editorQuotaRowSchema = z.object({
  title: eventPrimaryTitle,
  size: z.int().min(1).nullable(),
});

/** Question row in the event editor form (client validation). */
export const editorQuestionRowSchema = z.object({
  question: questionBodyText,
});

// --- Signup Schemas ---

/** Single-field signup answers (text, number as string, select). */
export const signupAnswerTextMax = z.string().max(255);

/** Checkbox / multi-select answers. */
export const signupAnswerChoiceList = z.array(z.string().max(255)).max(64);

const signupAnswerValue = z.union([signupAnswerTextMax, signupAnswerChoiceList]);

/** Required given / family name on the public signup form (matches server). */
export const signupPersonNameRequired = z.string().min(1).max(255);

/** Email field on the signup edit form before server validation. */
export const signupFormEmail = z.email().max(255);

/** Answer to a single signup question. */
export const signupAnswer = z.object({
  questionId: questionID,
  answer: signupAnswerValue,
});

const publicEditableSignupAttributes = z.object({
  firstName: signupAnswerTextMax.nullable(),
  lastName: signupAnswerTextMax.nullable(),
  namePublic: z.boolean(),
  answers: z.array(signupAnswer),
});

const ownerEditableSignupAttributes = publicEditableSignupAttributes.extend({
  email: signupAnswerTextMax.nullable(),
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

/** BCP 47-style language tag keys on `languages` maps and signup locale field. */
const localeTag = z.string().max(8);

const signupLanguage = z.object({
  language: localeTag.nullable(),
});

const adminSignupUpdateOptions = z.object({
  sendEmail: z.boolean(),
});

/** Request body for creating a signup. */
export const signupCreateBody = z.object({
  quotaId: quotaID,
});

export type SignupCreateBody = z.infer<typeof signupCreateBody>;

/** Response schema for successfully creating a signup. */
export const signupCreateResponse = z.object({
  id: signupID,
  editToken,
});

export type SignupCreateResponse = z.infer<typeof signupCreateResponse>;

const ownerSignupLocale = ownerEditableSignupAttributes.extend(signupLanguage.shape);
const adminSignupLocale = adminEditableSignupAttributes.extend(signupLanguage.shape);

/** Request body for editing an existing signup. */
export const signupUpdateBody = ownerSignupLocale.partial();

export type SignupUpdateBody = z.infer<typeof signupUpdateBody>;

/** Request body for editing an existing signup as an admin. */
export const adminSignupUpdateBody = adminSignupLocale.extend(adminSignupUpdateOptions.shape).partial();

export type AdminSignupUpdateBody = z.infer<typeof adminSignupUpdateBody>;

/** Request body for creating a signup as an admin. */
export const adminSignupCreateBody = signupCreateBody.extend(adminSignupUpdateBody.shape);

export type AdminSignupCreateBody = z.infer<typeof adminSignupCreateBody>;

/** Response schema for successfully editing a signup. */
export const signupUpdateResponse = ownerEditableSignupAttributes.extend(ownerDynamicSignupAttributes.shape).extend({
  id: signupID,
});

export type SignupUpdateResponse = z.infer<typeof signupUpdateResponse>;

/** Schema for signups in event details from the public API. */
const publicSignupSchema = publicEditableSignupAttributes.extend(publicDynamicSignupAttributes.shape).extend({
  id: signupID,
});

/** Schema for signups in event details from the admin API. */
export const adminSignupSchema = adminEditableSignupAttributes
  .extend(adminDynamicSignupAttributes.shape)
  .extend({ id: signupID });

export type AdminSignupSchema = z.infer<typeof adminSignupSchema>;

// --- Quota With Signups Schemas ---

/** Schema for a quota with a count of its signups. */
export const quotaWithSignupCount = quota.extend({
  signupCount: z.int(),
});

export type QuotaWithSignupCount = z.infer<typeof quotaWithSignupCount>;

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

/** Event columns shared by public and admin payloads (excluding per-locale data). */
const eventSharedFields = publicEventAttributes.extend(publicCommonAttributes.shape);

/** Display title for the primary locale (bundled with `languages` on events and list rows). */
const localizedEventTitle = z.object({
  title: eventPrimaryTitle,
});

const publicLanguageAttributes = z.object({
  title: z.string().max(255),
  quotas: z.array(quotaLanguage),
  questions: z.array(questionLanguage),
});

/** Shared fields for one event locale (public user view). */
const eventLanguageBase = publicCommonAttributes.extend(publicLanguageAttributes.shape);

/** Schema for an event language version for admins. */
export const adminEventLanguage = eventLanguageBase.extend(adminDetailsOnlyCommonAttributes.shape);

export type AdminEventLanguage = z.infer<typeof adminEventLanguage>;

/** Quota row in the event editor (DnD `key`, optional `id`; empty title allowed until save). */
export const editorQuotaFormRowSchema = z.object({
  key: z.string(),
  id: quotaID.optional(),
  title: z.string(),
  size: z.int().min(1).nullable(),
  price: z.int(),
});

/** Question row in the event editor (DnD `key`, optional `id`). */
export const editorQuestionFormRowSchema = z.object({
  key: z.string(),
  id: questionID.optional(),
  question: z.string(),
  type: z.enum(QuestionType),
  options: questionOptions,
  prices: questionPrices,
  required: z.boolean(),
  public: z.boolean(),
});

export type EditorQuota = z.infer<typeof editorQuotaFormRowSchema>;
export type EditorQuestion = z.infer<typeof editorQuestionFormRowSchema>;

/**
 * Full event editor form (ISO date strings at top level; validated for submit via `editorSchema` in the editor).
 */
export const editorFormStateSchema = z.object({
  title: z.string(),
  slug: z.string(),
  draft: z.boolean(),
  listed: z.boolean(),
  category: z.string(),
  date: z.string(),
  endDate: z.string(),
  registrationStartDate: z.string(),
  registrationEndDate: z.string(),
  openQuotaSize: z.int(),
  description: z.string(),
  price: z.string(),
  location: z.string(),
  webpageUrl: z.string(),
  signupsPublic: z.boolean(),
  nameQuestion: z.boolean(),
  emailQuestion: z.boolean(),
  payments: z.enum(PaymentMode),
  defaultLanguage: z.string(),
  languages: z.record(localeTag, adminEventLanguage),
  verificationEmail: z.string(),
  quotas: z.array(editorQuotaFormRowSchema),
  questions: z.array(editorQuestionFormRowSchema),
});

export type EditorFormState = z.infer<typeof editorFormStateSchema>;

const userEventLanguages = z.object({
  languages: z.record(localeTag, eventLanguageBase),
});

const adminEventLanguages = z.object({
  languages: z.record(localeTag, adminEventLanguage),
});

const publicAttributes = eventSharedFields.extend(userEventLanguages.shape).extend(localizedEventTitle.shape);

const adminAttributes = eventSharedFields
  .extend(adminOnlyEventAttributes.shape)
  .extend(adminDetailsOnlyCommonAttributes.shape)
  .extend(adminEventLanguages.shape)
  .extend(localizedEventTitle.shape);

/** Response schema for fetching an event from the public API. */
export const userEventResponse = publicAttributes.extend({
  id: eventID,
  questions: z.array(question),
  quotas: z.array(userQuotaWithSignups),
  millisTillOpening: z.int().nullable(),
  registrationClosed: z.boolean(),
});

export type UserEventResponse = z.infer<typeof userEventResponse>;

/** Response schema when an event is fetched as part of an editable signup. */
const userEventForSignup = publicAttributes.extend({
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

export type AdminEventResponse = z.infer<typeof adminEventResponse>;

/** Request body for creating an event. */
export const eventCreateBody = adminAttributes.extend({
  quotas: z.array(quotaCreate),
  questions: z.array(questionCreate),
});

export type EventCreateBody = z.infer<typeof eventCreateBody>;

/** Request body for editing an existing event. */
export const eventUpdateBody = adminAttributes
  .extend({
    quotas: z.array(quotaUpdate),
    questions: z.array(questionUpdate),
    moveSignupsToQueue: z.boolean(),
    updatedAt: z.date(),
  })
  .partial();

export type EventUpdateBody = z.infer<typeof eventUpdateBody>;

// --- Event List Schemas ---

const eventListItemBase = z.object({ id: eventID }).extend(eventSharedFields.shape).extend(localizedEventTitle.shape);

const userEventListItem = eventListItemBase
  .extend(userEventLanguages.shape)
  .extend({ quotas: z.array(quotaWithSignupCount) });

export type UserEventListItem = z.infer<typeof userEventListItem>;

/** Response schema for fetching a list of events from the public API. */
export const userEventListResponse = z.array(userEventListItem);

export type UserEventListResponse = z.infer<typeof userEventListResponse>;

const adminEventEditorRef = z.object({ userId: userID });

const adminEventListItem = eventListItemBase
  .extend(adminOnlyEventAttributes.shape)
  .extend({ editors: z.array(adminEventEditorRef) })
  .extend({ quotas: z.array(quotaWithSignupCount) });

/** Response schema for fetching a list of events from the admin API. */
export const adminEventListResponse = z.array(adminEventListItem);

export type AdminEventListResponse = z.infer<typeof adminEventListResponse>;

/** Query parameters applicable to the public event list API. */
export const eventListQuery = z.object({
  category: z.string().optional(),
  maxAge: z.int().optional(),
});

export type EventListQuery = z.infer<typeof eventListQuery>;

// --- Signup For Edit Schemas ---

/** Schema for fetching a signup for editing. */
export const signupForEdit = adminEditableSignupAttributes.extend(ownerDynamicSignupAttributes.shape).extend({
  id: signupID,
  quota,
  confirmableForMillis: z.int(),
  editableForMillis: z.int(),
});

export type SignupForEdit = z.infer<typeof signupForEdit>;

/** Response schema for fetching a signup for editing. */
export const signupForEditResponse = z.object({
  signup: signupForEdit,
  event: userEventForSignup,
});

export type SignupForEditResponse = z.infer<typeof signupForEditResponse>;

// --- User Schemas ---

/** Email string for user invites and event editor additions (matches server actions). */
export const adminInviteEmail = z.email().min(1).max(255);

/** Client-side shape for validating the invite email field only. */
export const inviteEmailOnlySchema = z.object({ email: adminInviteEmail });

/** Schema for a user. */
export const userSchema = userSelect.pick({
  id: true,
  email: true,
  role: true,
});

export type UserSchema = z.infer<typeof userSchema>;

/** Request body for inviting an admin user. */
export const userInviteSchema = inviteEmailOnlySchema.extend({
  role: z.enum(UserRole).default(UserRole.USER),
});

/** Response schema for fetching a list of users. */
export const userListResponse = z.array(userSchema);

export type UserListResponse = z.infer<typeof userListResponse>;

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
export const auditLogQuery = z.object({
  user: z.string().optional(),
  ip: z.string().optional(),
  action: z.array(z.enum(auditEventEnum.enumValues)).optional(),
  event: z.string().optional(),
  signup: z.string().optional(),
  limit: z.int().min(0).optional(),
  offset: z.int().min(0).optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuery>;

/** Response schema for fetching audit logs. */
export const auditLogResponse = z.object({
  rows: z.array(auditLogItemSchema),
  count: z.int(),
});

export type AuditLogResponse = z.infer<typeof auditLogResponse>;

// --- Payment Response Schemas ---

/** Response schema for starting a payment. */
export const startPaymentResponse = z.object({
  paymentUrl: z.url(),
});

export type StartPaymentResponse = z.infer<typeof startPaymentResponse>;

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

export type EditConflictError = z.infer<typeof editConflictError>;

/** Response schema for an edit that would move some signups back to the queue. */
export const wouldMoveSignupsToQueueError = errorResponse.extend({
  count: z.int(),
});

export type WouldMoveSignupsToQueueError = z.infer<typeof wouldMoveSignupsToQueueError>;

const signupFieldIssue = z.enum(SignupFieldError);

const signupValidationErrors = z.object({
  firstName: signupFieldIssue.optional(),
  lastName: signupFieldIssue.optional(),
  email: signupFieldIssue.optional(),
  answers: z.record(z.string(), signupFieldIssue).optional(),
});

export type SignupValidationErrors = z.infer<typeof signupValidationErrors>;

// --- Shared Action Input Schemas ---

/** Input schema for actions that identify a signup by ID. */
export const signupIdInput = z.object({
  signupId: signupID,
});

export type SignupIdInput = z.infer<typeof signupIdInput>;

/** Input schema for actions that identify an event by ID. */
export const eventIdInput = z.object({
  eventId: eventID,
});

export type EventIdInput = z.infer<typeof eventIdInput>;

/** Input schema for actions that identify a user by ID. */
export const userIdInput = z.object({
  userId: userID,
});

export type UserIdInput = z.infer<typeof userIdInput>;

/** Input schema for actions that identify a signup by ID and edit token. */
export const signupWithToken = signupIdInput.extend({
  editToken,
});

export type SignupWithToken = z.infer<typeof signupWithToken>;

// --- Event Editor Schemas ---

/** Schema for adding an editor to an event. */
export const addEventEditorSchema = eventIdInput.extend({
  email: adminInviteEmail,
});

/** Schema for removing an editor from an event. */
export const removeEventEditorSchema = eventIdInput.extend({
  userId: userID,
});

// --- Mail Data Schemas ---

/** Event fields needed for all email types (localization, date, basic info). */
const mailEventBase = eventSelect
  .pick({ deletedAt: true, title: true, date: true, location: true, verificationEmail: true, payments: true })
  .extend({
    languages: z.array(
      adminEventLanguage.pick({ title: true, location: true, verificationEmail: true }).extend({
        language: z.string(),
      }),
    ),
  });

/** Pre-fetched data for "promoted from queue" emails. */
export const promotedMailData = z.object({
  event: mailEventBase,
});

export type PromotedMailData = z.infer<typeof promotedMailData>;

/** Pre-fetched data for payment confirmation emails. */
export const paymentMailData = z.object({
  event: mailEventBase,
});

export type PaymentMailData = z.infer<typeof paymentMailData>;

/** Pre-fetched data for signup confirmation emails (quota with languages, event with languages/questions). */
export const confirmationMailData = z.object({
  quota: quotaSelect.pick({ title: true }).extend({
    languages: z.array(quotaLanguage.extend({ language: z.string() })),
  }),
  event: mailEventBase.extend({
    questions: z.array(
      questionSelect.pick({ id: true, question: true, options: true }).extend({
        languages: z.array(questionLanguage.extend({ language: z.string() })),
      }),
    ),
  }),
});

export type ConfirmationMailData = z.infer<typeof confirmationMailData>;

/** Service return types not tied to a single Zod object. */
export type CheckSlugResponse = {
  id: EventID | null;
  title: string | null;
};

export type CategoriesResponse = string[];
