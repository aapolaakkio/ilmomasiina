import { sql } from "drizzle-orm";

import { db } from "@/db";

// All tables in truncation order (respecting FK constraints).
const TABLES = [
  "auditlog",
  "payment",
  "answer",
  "signup",
  "question_language",
  "question",
  "quota_language",
  "quota",
  "event_language",
  "event_editor",
  "event",
  '"user"',
];

export async function resetDb() {
  if (!process.env.THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED) {
    throw new Error("Refusing to wipe database: THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED is not set");
  }
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(", ")} CASCADE`));
}
