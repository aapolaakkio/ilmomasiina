import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

// eslint-disable-next-line import/prefer-default-export
export const relations = defineRelations(schema, (r) => ({
  events: {
    quotas: r.many.quotas(),
    questions: r.many.questions(),
    languages: r.many.eventLanguages(),
  },
  eventLanguages: {
    event: r.one.events({
      from: r.eventLanguages.eventId,
      to: r.events.id,
    }),
  },
  quotas: {
    event: r.one.events({
      from: r.quotas.eventId,
      to: r.events.id,
    }),
    signups: r.many.signups(),
    languages: r.many.quotaLanguages(),
  },
  quotaLanguages: {
    quota: r.one.quotas({
      from: r.quotaLanguages.quotaId,
      to: r.quotas.id,
    }),
  },
  signups: {
    quota: r.one.quotas({
      from: r.signups.quotaId,
      to: r.quotas.id,
    }),
    answers: r.many.answers(),
    payments: r.many.payments(),
  },
  questions: {
    event: r.one.events({
      from: r.questions.eventId,
      to: r.events.id,
    }),
    answers: r.many.answers(),
    languages: r.many.questionLanguages(),
  },
  questionLanguages: {
    questionRef: r.one.questions({
      from: r.questionLanguages.questionId,
      to: r.questions.id,
    }),
  },
  answers: {
    question: r.one.questions({
      from: r.answers.questionId,
      to: r.questions.id,
    }),
    signup: r.one.signups({
      from: r.answers.signupId,
      to: r.signups.id,
    }),
  },
  payments: {
    signup: r.one.signups({
      from: r.payments.signupId,
      to: r.signups.id,
    }),
  },
}));
