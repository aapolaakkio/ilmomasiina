import { db } from "@/db";
import {
  users,
  events,
  questions,
  quotas,
  signups,
  answers,
  eventEditors,
  payments,
  questionLanguages,
  quotaLanguages,
  auditlogs,
  eventLanguages,
} from "@/db/schema";

export const resetDb = async () => {
  await db.transaction(async (transaction) => {
    await transaction.delete(users);
    await transaction.delete(events);
    await transaction.delete(questions);
    await transaction.delete(quotas);
    await transaction.delete(signups);
    await transaction.delete(answers);
    await transaction.delete(eventEditors);
    await transaction.delete(payments);
    await transaction.delete(eventLanguages);
    await transaction.delete(questionLanguages);
    await transaction.delete(quotaLanguages);
    await transaction.delete(auditlogs);
  });

  return { message: "Database reset successfully" };
};
