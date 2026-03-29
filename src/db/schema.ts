import {
  boolean,
  char,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { z } from "zod";

import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";

// --- Enums ---

/** User roles. */
export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

/** Possible statuses for a signup. */
export enum SignupStatus {
  IN_QUOTA = "in-quota",
  IN_OPEN_QUOTA = "in-open",
  IN_QUEUE = "in-queue",
}

/** Possible payment statuses. */
export enum PaymentStatus {
  CREATING = "creating",
  PENDING = "pending",
  PAID = "paid",
  EXPIRED = "expired",
  CREATION_FAILED = "creation_failed",
  REFUNDED = "refunded",
}

/** Possible effective payment statuses for signups. */
export enum SignupPaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  REFUNDED = "refunded",
}

/** Possible manual (admin-managed) payment statuses for signups. */
export enum ManualPaymentStatus {
  NONE = "none",
  PAID = "paid",
  REFUNDED = "refunded",
}

/** Possible question types. */
export enum QuestionType {
  TEXT = "text",
  TEXT_AREA = "textarea",
  NUMBER = "number",
  SELECT = "select",
  CHECKBOX = "checkbox",
}

/** Payment modes for events. */
export enum PaymentMode {
  DISABLED = "disabled",
  MANUAL = "manual",
  ONLINE = "online",
}

/** Event types that can be audit logged. */
export enum AuditEvent {
  CREATE_EVENT = "event.create",
  DELETE_EVENT = "event.delete",
  PUBLISH_EVENT = "event.publish",
  UNPUBLISH_EVENT = "event.unpublish",
  EDIT_EVENT = "event.edit",
  PROMOTE_SIGNUP = "signup.queuePromote",
  CREATE_SIGNUP = "signup.create",
  DELETE_SIGNUP = "signup.delete",
  EDIT_SIGNUP = "signup.edit",
  CREATE_USER = "user.create",
  DELETE_USER = "user.delete",
  START_PAYMENT = "payment.start",
  COMPLETE_PAYMENT = "payment.complete",
  EXPIRE_PAYMENT = "payment.expire",
}

export enum ErrorCode {
  BAD_SESSION = "BadSession",
  EDIT_CONFLICT = "EditConflict",
  WOULD_MOVE_SIGNUPS_TO_QUEUE = "WouldMoveSignupsToQueue",
  SIGNUPS_CLOSED = "SignupsClosed",
  NO_SUCH_QUOTA = "NoSuchQuota",
  NO_SUCH_SIGNUP = "NoSuchSignup",
  BAD_EDIT_TOKEN = "BadEditToken",
  CANNOT_DELETE_SELF = "CannotDeleteSelf",
  INITIAL_SETUP_NEEDED = "InitialSetupNeeded",
  INITIAL_SETUP_ALREADY_DONE = "InitialSetupAlreadyDone",
  SIGNUP_VALIDATION_ERROR = "SignupValidationError",
  EVENT_VALIDATION_ERROR = "EventValidationError",
  VALIDATION_ERROR = "FST_ERR_VALIDATION",
  ONLINE_PAYMENTS_DISABLED = "OnlinePaymentsDisabled",
  SIGNUP_NOT_CONFIRMED = "SignupNotConfirmed",
  SIGNUP_IN_QUEUE = "SignupInQueue",
  SIGNUP_ALREADY_PAID = "SignupAlreadyPaid",
  PAYMENT_NOT_REQUIRED = "PaymentNotRequired",
  PAYMENT_IN_PROGRESS = "PaymentInProgress",
  PAYMENT_NOT_FOUND = "PaymentNotFound",
  PAYMENT_NOT_COMPLETE = "PaymentNotComplete",
  PAYMENT_RATE_LIMITED = "PaymentRateLimited",
}

export enum SignupFieldError {
  MISSING = "missing",
  WRONG_TYPE = "wrongType",
  TOO_LONG = "tooLong",
  INVALID_EMAIL = "invalidEmail",
  NOT_A_NUMBER = "notANumber",
  NOT_AN_OPTION = "notAnOption",
  DUPLICATE_OPTION = "duplicateOption",
}

// --- Branded ID types ---

export const eventID = z.string().min(1).max(32).brand<"EventID">();
export const signupID = z.string().min(1).max(32).brand<"SignupID">();
export const quotaID = z.string().brand<"QuotaID">();
export const questionID = z.string().brand<"QuestionID">();
export const answerID = z.number().int().brand<"AnswerID">();
export const userID = z.int().brand<"UserID">();
export const paymentID = z.number().int().brand<"PaymentID">();
export const auditLogID = z.number().int().brand<"AuditLogID">();

export type EventID = z.infer<typeof eventID>;
export type SignupID = z.infer<typeof signupID>;
export type QuotaID = z.infer<typeof quotaID>;
export type QuestionID = z.infer<typeof questionID>;
export type AnswerID = z.infer<typeof answerID>;
export type UserID = z.infer<typeof userID>;
export type PaymentID = z.infer<typeof paymentID>;
export type AuditLogID = z.infer<typeof auditLogID>;

// --- Shared Zod schemas ---

export const editToken = z.string();

/** Product line used to compute signup prices. */
export const productSchema = z.object({
  name: z.string().min(1),
  amount: z.int(),
  unitPrice: z.int(),
});

export type ProductSchema = z.infer<typeof productSchema>;

// --- Database Enums (names match Sequelize-generated enum type names) ---

export const userRoleEnum = pgEnum("enum_user_role", [UserRole.ADMIN, UserRole.USER]);

export const paymentModeEnum = pgEnum("enum_event_payments", [
  PaymentMode.DISABLED,
  PaymentMode.MANUAL,
  PaymentMode.ONLINE,
]);

export const manualPaymentStatusEnum = pgEnum("enum_signup_manualPaymentStatus", [
  ManualPaymentStatus.NONE,
  ManualPaymentStatus.PAID,
  ManualPaymentStatus.REFUNDED,
]);

export const questionTypeEnum = pgEnum("enum_question_type", [
  QuestionType.TEXT,
  QuestionType.TEXT_AREA,
  QuestionType.NUMBER,
  QuestionType.SELECT,
  QuestionType.CHECKBOX,
]);

export const paymentStatusEnum = pgEnum("enum_payment_status", [
  PaymentStatus.CREATING,
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.EXPIRED,
  PaymentStatus.CREATION_FAILED,
  PaymentStatus.REFUNDED,
]);

export const auditEventEnum = pgEnum("enum_audit_event", [
  AuditEvent.CREATE_EVENT,
  AuditEvent.DELETE_EVENT,
  AuditEvent.PUBLISH_EVENT,
  AuditEvent.UNPUBLISH_EVENT,
  AuditEvent.EDIT_EVENT,
  AuditEvent.PROMOTE_SIGNUP,
  AuditEvent.CREATE_SIGNUP,
  AuditEvent.DELETE_SIGNUP,
  AuditEvent.EDIT_SIGNUP,
  AuditEvent.CREATE_USER,
  AuditEvent.DELETE_USER,
  AuditEvent.START_PAYMENT,
  AuditEvent.COMPLETE_PAYMENT,
  AuditEvent.EXPIRE_PAYMENT,
]);
// --- Tables ---

export const events = pgTable("event", {
  id: char("id", { length: RANDOM_ID_LENGTH })
    .$defaultFn(() => generateRandomId())
    .$type<EventID>()
    .primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull().default(""),
  description: text("description"),
  price: varchar("price", { length: 255 }),
  location: text("location"),
  webpageUrl: varchar("webpageUrl", { length: 2048 }),
  verificationEmail: text("verificationEmail"),
  date: timestamp("date", { withTimezone: true }),
  endDate: timestamp("endDate", { withTimezone: true }),
  registrationStartDate: timestamp("registrationStartDate", {
    withTimezone: true,
  }),
  registrationEndDate: timestamp("registrationEndDate", { withTimezone: true }),
  openQuotaSize: integer("openQuotaSize").notNull().default(0),
  category: varchar("category", { length: 255 }).notNull().default(""),
  draft: boolean("draft").notNull().default(true),
  listed: boolean("listed").notNull().default(true),
  signupsPublic: boolean("signupsPublic").notNull().default(false),
  nameQuestion: boolean("nameQuestion").notNull().default(true),
  emailQuestion: boolean("emailQuestion").notNull().default(true),
  payments: paymentModeEnum("payments").notNull().default(PaymentMode.DISABLED),
  defaultLanguage: varchar("defaultLanguage", { length: 8 }).notNull(),

  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deletedAt", { withTimezone: true }),
});

export const eventLanguages = pgTable(
  "event_language",
  {
    eventId: char("eventId", { length: RANDOM_ID_LENGTH })
      .$type<EventID>()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 8 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    price: varchar("price", { length: 255 }),
    location: text("location"),
    webpageUrl: varchar("webpageUrl", { length: 2048 }),
    verificationEmail: text("verificationEmail"),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.language] })],
);

export const quotas = pgTable(
  "quota",
  {
    id: char("id", { length: RANDOM_ID_LENGTH })
      .$defaultFn(() => generateRandomId())
      .$type<QuotaID>()
      .primaryKey(),
    eventId: char("eventId", { length: RANDOM_ID_LENGTH })
      .$type<EventID>()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull().default(""),
    order: integer("order").notNull(),
    size: integer("size"),
    price: integer("price").notNull(),

    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deletedAt", { withTimezone: true }),
  },
  (t) => [index("idx_quota_eventId").on(t.eventId)],
);

export const quotaLanguages = pgTable(
  "quota_language",
  {
    quotaId: char("quotaId", { length: RANDOM_ID_LENGTH })
      .$type<QuotaID>()
      .notNull()
      .references(() => quotas.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 8 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.quotaId, t.language] })],
);

export const signups = pgTable(
  "signup",
  {
    id: char("id", { length: RANDOM_ID_LENGTH })
      .$defaultFn(() => generateRandomId())
      .$type<SignupID>()
      .primaryKey(),
    quotaId: char("quotaId", { length: RANDOM_ID_LENGTH })
      .$type<QuotaID>()
      .notNull()
      .references(() => quotas.id, { onDelete: "cascade" }),
    firstName: varchar("firstName", { length: 255 }),
    lastName: varchar("lastName", { length: 255 }),
    namePublic: boolean("namePublic").notNull().default(false),
    email: varchar("email", { length: 255 }),
    language: varchar("language", { length: 8 }),
    confirmedAt: timestamp("confirmedAt", { precision: 3, withTimezone: true }),
    price: integer("price"),
    currency: varchar("currency", { length: 8 }),
    products: json("products").$type<ProductSchema[] | null>(),
    manualPaymentStatus: manualPaymentStatusEnum("manualPaymentStatus"),

    // createdAt with millisecond precision, matching Sequelize's DATE(3)
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deletedAt", { withTimezone: true }),
  },
  (t) => [index("idx_signup_quotaId").on(t.quotaId)],
);

export const questions = pgTable(
  "question",
  {
    id: char("id", { length: RANDOM_ID_LENGTH })
      .$defaultFn(() => generateRandomId())
      .$type<QuestionID>()
      .primaryKey(),
    eventId: char("eventId", { length: RANDOM_ID_LENGTH })
      .$type<EventID>()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    question: varchar("question", { length: 1024 }).notNull().default(""),
    options: json("options").$type<string[] | null>(),
    order: integer("order").notNull(),
    type: questionTypeEnum("type").notNull(),
    prices: json("prices").$type<number[] | null>(),
    required: boolean("required").notNull().default(true),
    public: boolean("public").notNull().default(false),

    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deletedAt", { withTimezone: true }),
  },
  (t) => [index("idx_question_eventId").on(t.eventId)],
);

export const questionLanguages = pgTable(
  "question_language",
  {
    questionId: char("questionId", { length: RANDOM_ID_LENGTH })
      .$type<QuestionID>()
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 8 }).notNull(),
    question: varchar("question", { length: 1024 }).notNull(),
    options: json("options").$type<string[] | null>(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.language] })],
);

export const answers = pgTable(
  "answer",
  {
    id: serial("id").$type<AnswerID>().primaryKey(),
    questionId: char("questionId", { length: RANDOM_ID_LENGTH })
      .$type<QuestionID>()
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    signupId: char("signupId", { length: RANDOM_ID_LENGTH })
      .$type<SignupID>()
      .notNull()
      .references(() => signups.id, { onDelete: "cascade" }),
    answer: json("answer").notNull().$type<string | string[]>(),

    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deletedAt", { withTimezone: true }),
  },
  (t) => [index("idx_answer_signupId").on(t.signupId), index("idx_answer_questionId").on(t.questionId)],
);

export const payments = pgTable(
  "payment",
  {
    id: serial("id").$type<PaymentID>().primaryKey(),
    signupId: varchar("signupId", { length: 255 })
      .$type<SignupID>()
      .notNull()
      .references(() => signups.id, { onDelete: "cascade" }),
    stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", {
      length: 255,
    }).unique(),
    status: paymentStatusEnum("status").notNull().default(PaymentStatus.CREATING),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    products: json("products").notNull().$type<ProductSchema[]>(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    completedAt: timestamp("completedAt", { withTimezone: true }),

    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_payment_signupId").on(t.signupId)],
);

export const users = pgTable(
  "user",
  {
    id: serial("id").$type<UserID>().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    role: userRoleEnum("role").notNull().default(UserRole.USER),

    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_user_email").on(t.email)],
);

export const eventEditors = pgTable(
  "event_editor",
  {
    eventId: char("eventId", { length: RANDOM_ID_LENGTH })
      .$type<EventID>()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .$type<UserID>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index("idx_event_editor_userId").on(t.userId)],
);

export const auditlogs = pgTable("auditlog", {
  id: serial("id").$type<AuditLogID>().primaryKey(),
  user: varchar("user", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  action: auditEventEnum("action").notNull(),
  eventId: char("eventId", { length: RANDOM_ID_LENGTH })
    .$type<EventID>()
    .references(() => events.id, { onDelete: "set null" }),
  eventName: varchar("eventName", { length: 255 }),
  signupId: char("signupId", { length: RANDOM_ID_LENGTH })
    .$type<SignupID>()
    .references(() => signups.id, { onDelete: "set null" }),
  signupName: varchar("signupName", { length: 255 }),
  extra: text("extra"),

  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});
