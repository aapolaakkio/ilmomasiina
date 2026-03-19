import { and, eq, inArray } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";

import {
  type ProductSchema,
  type QuestionID,
  type QuotaID,
  QuestionType,
  SignupFieldError,
  type SignupID,
} from "@/db/schema";
import type { AdminSignupUpdateBody, SignupUpdateBody, SignupValidationErrors } from "@/db/zod";

import { env } from "@/env";
import { sumBy } from "@/util/sumBy";
import type { DrizzleDb } from "../../db";
import { paymentsEnabled } from "../../db/computed";
import { answers, signups } from "../../db/schema";
import { checkForConflictingPaymentsForSignupUpdate } from "../payment/stripe";
import { SignupValidationError } from "./errors";

const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;

function isEmail(value: string): boolean {
  return z.email().safeParse(value).success;
}

interface SignupData {
  id: SignupID;
  confirmedAt: Date | null;
  price: number | null;
  currency: string | null;
  products: unknown[] | null;
  quotaId: QuotaID;
}

interface EventData {
  nameQuestion: boolean;
  emailQuestion: boolean;
  payments: string;
  questions: Array<{
    id: QuestionID;
    type: string;
    options: string[] | null;
    prices: number[] | null;
    required: boolean;
  }>;
}

interface QuotaData {
  title: string;
  price: number;
}

/** Question language row with question text and options for option validation. */
interface QuestionLangRow {
  questionId: string;
  language: string;
  question: string;
  options: string[] | null;
}

/** Validates and gathers basic fields. */
function validateBasicFields(signup: SignupData, event: EventData, body: SignupUpdateBody, admin: boolean) {
  const fields: Record<string, unknown> = {};
  const errors: SignupValidationErrors = {};

  if (admin) {
    if (body.firstName != null) fields.firstName = body.firstName;
    if (body.lastName != null) fields.lastName = body.lastName;
    if (body.namePublic != null) fields.namePublic = body.namePublic;
    if (body.email != null) fields.email = body.email;
    if (body.language != null) fields.language = body.language;
    return { fields, errors };
  }

  if (!signup.confirmedAt && event.nameQuestion) {
    const { firstName, lastName } = body;
    if (!firstName) {
      errors.firstName = SignupFieldError.MISSING;
    } else if (firstName.length > MAX_NAME_LENGTH) {
      errors.firstName = SignupFieldError.TOO_LONG;
    }
    if (!lastName) {
      errors.lastName = SignupFieldError.MISSING;
    } else if (lastName.length > MAX_NAME_LENGTH) {
      errors.lastName = SignupFieldError.TOO_LONG;
    }
    fields.firstName = firstName;
    fields.lastName = lastName;
  }

  if (!signup.confirmedAt && event.emailQuestion) {
    const { email } = body;
    if (!email) {
      errors.email = SignupFieldError.MISSING;
    } else if (email.length > MAX_EMAIL_LENGTH) {
      errors.email = SignupFieldError.TOO_LONG;
    } else if (!isEmail(email)) {
      errors.email = SignupFieldError.INVALID_EMAIL;
    }
    fields.email = email;
  }

  if (body.namePublic != null) fields.namePublic = body.namePublic;
  if (body.language) fields.language = body.language;

  return { fields, errors };
}

/** Computes product lines for a given quota. */
function getQuotaProducts(quota: QuotaData, event: { payments: string }): ProductSchema[] {
  if (paymentsEnabled(event) && quota.price) {
    return [{ name: quota.title, amount: 1, unitPrice: quota.price }];
  }
  return [];
}

/** Validates answers and computes product lines. */
function validateAnswersAndGetProducts(
  event: Pick<EventData, "payments" | "questions">,
  questionLangRows: QuestionLangRow[],
  rawAnswers: SignupUpdateBody["answers"] | undefined,
  admin: boolean,
) {
  let answerErrors: Record<string, SignupFieldError> | undefined;
  const answerProducts: ProductSchema[] = [];
  const isPaymentsEnabled = paymentsEnabled(event);

  const newAnswers = event.questions.map((question) => {
    let answer = rawAnswers?.find((a) => a.questionId === question.id)?.answer;
    let error: SignupFieldError | undefined;
    const validOptions = new Map<string, number>();

    // Default language options come from the question's main table columns
    const defaultOptions = question.options;

    if ((question.type === QuestionType.CHECKBOX || question.type === QuestionType.SELECT) && defaultOptions) {
      defaultOptions.forEach((opt, i) => {
        if (validOptions.has(opt)) {
          // eslint-disable-next-line no-console
          console.warn(`Duplicate option "${opt}" detected in question ${question.id}`);
          error = SignupFieldError.DUPLICATE_OPTION;
          return;
        }
        validOptions.set(opt, i);
      });
      // Also add options from non-default language rows
      for (const langRow of questionLangRows) {
        if (langRow.questionId !== question.id) continue;
        if (langRow.options) {
          for (let i = 0; i < langRow.options.length; i++) {
            const opt = langRow.options[i];
            if (opt) {
              if (validOptions.has(opt) && validOptions.get(opt) !== i) {
                // eslint-disable-next-line no-console
                console.warn(`Duplicate option "${opt}" detected in question ${question.id}`);
                error = SignupFieldError.DUPLICATE_OPTION;
              } else {
                validOptions.set(opt, i);
              }
            }
          }
        }
      }
    }

    if (error) {
      answer = "";
    } else if (!answer || !answer.length) {
      if (question.required) error = SignupFieldError.MISSING;
      answer = question.type === QuestionType.CHECKBOX ? [] : "";
    } else if (question.type === QuestionType.CHECKBOX) {
      if (admin) answer = !Array.isArray(answer) ? [answer] : answer;
      if (!Array.isArray(answer)) {
        error = SignupFieldError.WRONG_TYPE;
      } else {
        const usedOptions = new Set<number>();
        for (const option of answer) {
          const optIndex = validOptions.get(option);
          if (optIndex === undefined) {
            error = SignupFieldError.NOT_AN_OPTION;
          } else if (usedOptions.has(optIndex)) {
            error = SignupFieldError.DUPLICATE_OPTION;
          } else {
            usedOptions.add(optIndex);
            if (isPaymentsEnabled && question.prices) {
              answerProducts.push({
                name: option,
                amount: 1,
                unitPrice: question.prices[optIndex] ?? 0,
              });
            }
          }
        }
      }
    } else {
      if (admin) answer = Array.isArray(answer) ? answer.join(", ") : String(answer);
      if (typeof answer !== "string") {
        error = SignupFieldError.WRONG_TYPE;
      } else {
        switch (question.type) {
          case QuestionType.TEXT:
          case QuestionType.TEXT_AREA:
            break;
          case QuestionType.NUMBER:
            if (!Number.isFinite(parseFloat(answer))) error = SignupFieldError.NOT_A_NUMBER;
            break;
          case QuestionType.SELECT: {
            const optIndex = validOptions.get(answer);
            if (optIndex === undefined) {
              error = SignupFieldError.NOT_AN_OPTION;
            } else if (isPaymentsEnabled && question.prices) {
              answerProducts.push({
                name: answer,
                amount: 1,
                unitPrice: question.prices[optIndex] ?? 0,
              });
            }
            break;
          }
          default:
            throw new Error("Invalid question type");
        }
      }
    }

    if (error) {
      answerErrors ??= {};
      answerErrors[question.id] = error;
    }

    return { questionId: question.id, answer };
  });

  return { newAnswers, answerProducts, answerErrors };
}

/** Computes the final price. */
function computePrice(products: ProductSchema[]) {
  return {
    products,
    price: sumBy(products, (prod) => prod.unitPrice * prod.amount),
    currency: env.CURRENCY,
  };
}

/** Validates fields and answers, then updates the signup in-place. */
export async function updateExistingSignup(
  signup: SignupData,
  event: EventData,
  quota: QuotaData,
  questionLangRows: QuestionLangRow[],
  body: AdminSignupUpdateBody | SignupUpdateBody,
  tx: DrizzleDb,
  admin: boolean,
) {
  const { fields, errors } = validateBasicFields(signup, event, body, admin);
  const { newAnswers, answerProducts, answerErrors } = validateAnswersAndGetProducts(
    event,
    questionLangRows,
    body.answers,
    admin,
  );
  if (answerErrors) errors.answers = answerErrors;

  if (!admin && Object.keys(errors).length > 0) {
    throw new SignupValidationError("Errors validating signup", errors);
  }

  const quotaProducts = getQuotaProducts(quota, event);
  const products = [...quotaProducts, ...answerProducts];
  const paymentFields = computePrice(products);

  const paymentsChanged =
    paymentFields.price !== signup.price ||
    paymentFields.currency !== signup.currency ||
    !isDeepStrictEqual(paymentFields.products, signup.products);

  await checkForConflictingPaymentsForSignupUpdate(signup.id, tx, admin || !paymentsChanged);

  await tx
    .update(signups)
    .set({
      ...fields,
      ...paymentFields,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(signups.id, signup.id));

  // Delete old answers and create new ones
  await tx.delete(answers).where(
    and(
      eq(answers.signupId, signup.id),
      inArray(
        answers.questionId,
        newAnswers.map((a) => a.questionId),
      ),
    ),
  );

  if (newAnswers.length > 0) {
    await tx.insert(answers).values(newAnswers.map((a) => ({ ...a, signupId: signup.id })));
  }

  return { newAnswers, paymentFields };
}
