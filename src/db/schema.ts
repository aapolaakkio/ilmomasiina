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

import { ManualPaymentStatus, PaymentMode, PaymentStatus, QuestionType } from "../models";

import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";

// --- Enums (names match Sequelize-generated enum type names) ---

export const userRoleEnum = pgEnum("enum_user_role", ["admin", "user"]);

export const paymentModeEnum = pgEnum("enum_event_payments", [
  PaymentMode.DISABLED,
  PaymentMode.MANUAL,
  PaymentMode.ONLINE,
]);

export const manualPaymentStatusEnum = pgEnum("enum_signup_manualPaymentStatus", [
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

// --- Tables ---

export const events = pgTable("event", {
  id: char("id", { length: RANDOM_ID_LENGTH }).$defaultFn(generateRandomId).primaryKey(),
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
    eventId: char("eventId", { length: RANDOM_ID_LENGTH }).notNull(),
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
    id: char("id", { length: RANDOM_ID_LENGTH }).$defaultFn(generateRandomId).primaryKey(),
    eventId: char("eventId", { length: RANDOM_ID_LENGTH }).notNull(),
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
    quotaId: char("quotaId", { length: RANDOM_ID_LENGTH }).notNull(),
    language: varchar("language", { length: 8 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.quotaId, t.language] })],
);

export const signups = pgTable(
  "signup",
  {
    id: char("id", { length: RANDOM_ID_LENGTH }).$defaultFn(generateRandomId).primaryKey(),
    quotaId: char("quotaId", { length: RANDOM_ID_LENGTH }).notNull(),
    firstName: varchar("firstName", { length: 255 }),
    lastName: varchar("lastName", { length: 255 }),
    namePublic: boolean("namePublic").notNull().default(false),
    email: varchar("email", { length: 255 }),
    language: varchar("language", { length: 8 }),
    confirmedAt: timestamp("confirmedAt", { precision: 3, withTimezone: true }),
    price: integer("price"),
    currency: varchar("currency", { length: 8 }),
    products: json("products").$type<unknown[] | null>(),
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
    id: char("id", { length: RANDOM_ID_LENGTH }).$defaultFn(generateRandomId).primaryKey(),
    eventId: char("eventId", { length: RANDOM_ID_LENGTH }).notNull(),
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
    questionId: char("questionId", { length: RANDOM_ID_LENGTH }).notNull(),
    language: varchar("language", { length: 8 }).notNull(),
    question: varchar("question", { length: 1024 }).notNull(),
    options: json("options").$type<string[] | null>(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.language] })],
);

export const answers = pgTable(
  "answer",
  {
    id: serial("id").primaryKey(),
    questionId: char("questionId", { length: RANDOM_ID_LENGTH }).notNull(),
    signupId: char("signupId", { length: RANDOM_ID_LENGTH }).notNull(),
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
    id: serial("id").primaryKey(),
    signupId: varchar("signupId", { length: 255 }).notNull(),
    stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", {
      length: 255,
    }).unique(),
    status: paymentStatusEnum("status").notNull().default(PaymentStatus.CREATING),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    products: json("products").notNull().$type<unknown[]>(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    completedAt: timestamp("completedAt", { withTimezone: true }),

    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_payment_signupId").on(t.signupId)],
);

export const users = pgTable("user", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: userRoleEnum("role").notNull().default("user"),

  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const eventEditors = pgTable(
  "event_editor",
  {
    eventId: char("eventId", { length: RANDOM_ID_LENGTH }).notNull(),
    userId: integer("userId").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index("idx_event_editor_userId").on(t.userId)],
);

export const auditlogs = pgTable("auditlog", {
  id: serial("id").primaryKey(),
  user: varchar("user", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  eventId: char("eventId", { length: RANDOM_ID_LENGTH }),
  eventName: varchar("eventName", { length: 255 }),
  signupId: char("signupId", { length: RANDOM_ID_LENGTH }),
  signupName: varchar("signupName", { length: 255 }),
  extra: text("extra"),

  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});
