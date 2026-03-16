import { z } from "zod/v4";

import { QuestionType } from "../../enum";

export const questionID = z.string().brand<"QuestionID">();

/** Maximum number of options per question. */
// This was a practical limit before an explicit limitation was added, so seems reasonable to set it here.
export const MAX_OPTIONS_PER_QUESTION = 64;

const questionOptions = z.nullable(z.array(z.string().max(255)).max(MAX_OPTIONS_PER_QUESTION));

/** Schema for a question language version. */
export const questionLanguage = z.object({
  // No minLength to allow for fallback.
  question: z.string().max(1024),
  options: questionOptions,
});

/** Schema for creating a question. */
export const questionCreate = z.object({
  question: z.string().min(1).max(1024),
  type: z.enum(QuestionType),
  options: questionOptions,
  prices: z.nullable(z.array(z.int().min(0)).max(64)),
  required: z.boolean(),
  public: z.boolean(),
});

/** Schema for a question. */
export const question = questionCreate.extend({
  id: questionID,
});

/** Schema for updating a question. */
export const questionUpdate = questionCreate.extend({
  id: questionID.optional(),
});

/** Question ID type. Randomly generated alphanumeric string. */
export type QuestionID = z.infer<typeof questionID>;

/** Schema for a question. */
export type Question = z.infer<typeof question>;

/** Schema for a question language version. */
export type QuestionLanguage = z.infer<typeof questionLanguage>;

/** Schema for creating a question. */
export type QuestionCreate = z.infer<typeof questionCreate>;

/** Schema for updating a question. */
export type QuestionUpdate = z.infer<typeof questionUpdate>;
