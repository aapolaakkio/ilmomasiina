import { createSchemaFactory } from "drizzle-orm/zod";
import { z } from "zod/v4";

import {
  answers,
  auditlogs,
  eventLanguages,
  events,
  payments,
  questionLanguages,
  questions,
  quotaLanguages,
  quotas,
  signups,
  users,
} from "@/db/schema";

const { createSelectSchema, createInsertSchema } = createSchemaFactory({
  zodInstance: z,
});

// Event
export const eventSelect = createSelectSchema(events);
export const eventInsert = createInsertSchema(events);

// Event language
export const eventLanguageSelect = createSelectSchema(eventLanguages);
export const eventLanguageInsert = createInsertSchema(eventLanguages);

// Question — override prices JSON
export const questionSelect = createSelectSchema(questions, {
  prices: z.nullable(z.array(z.number())),
});

// Question language — override options JSON
export const questionLanguageSelect = createSelectSchema(questionLanguages, {
  options: z.nullable(z.array(z.string())),
});
export const questionLanguageInsert = createInsertSchema(questionLanguages, {
  options: z.nullable(z.array(z.string())).optional(),
});

// Signup — override products JSON
export const signupSelect = createSelectSchema(signups, {
  products: z.nullable(z.array(z.unknown())),
});

// Answer — override answer JSON
export const answerSelect = createSelectSchema(answers, {
  answer: z.union([z.string(), z.array(z.string())]),
});

// Quota — no JSON overrides needed
export const quotaSelect = createSelectSchema(quotas);

// Quota language
export const quotaLanguageSelect = createSelectSchema(quotaLanguages);
export const quotaLanguageInsert = createInsertSchema(quotaLanguages);

// User — no JSON overrides needed
export const userSelect = createSelectSchema(users);
export const userInsert = createInsertSchema(users);

// Payment — override products JSON
export const paymentSelect = createSelectSchema(payments, {
  products: z.array(z.unknown()),
});

// Auditlog — no JSON overrides needed
export const auditlogSelect = createSelectSchema(auditlogs);
