import { randomBytes } from "crypto";

import {
  events,
  eventEditors,
  PaymentMode,
  questions,
  QuestionType,
  quotas,
  signups,
  UserRole,
  users,
} from "../../src/db/schema";
import { db } from "@/db";

import type { EventID, QuestionID, QuotaID, SignupID, UserID } from "../../src/db/schema";

// Matches the app's ID generation (base32 lowercase, 12 chars).
const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function generateId(): string {
  const bytes = randomBytes(12);
  return Array.from(bytes)
    .map((b: number) => ALPHABET[b & 31])
    .join("");
}

// --- Users ---

export async function seedAdminUser(email = "admin@test.com") {
  const [user] = await db
    .insert(users)
    .values({ email, role: UserRole.ADMIN })
    .returning({ id: users.id, email: users.email });
  return user;
}

export async function seedEditorUser(email = "editor@test.com") {
  const [user] = await db
    .insert(users)
    .values({ email, role: UserRole.USER })
    .returning({ id: users.id, email: users.email });
  return user;
}

// --- Events ---

type EventOverrides = Partial<typeof events.$inferInsert>;

export async function seedEvent(overrides: EventOverrides = {}) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const id = (overrides.id ?? generateId()) as EventID;
  const slug = overrides.slug ?? `test-event-${id}`;

  const [event] = await db
    .insert(events)
    .values({
      id,
      slug,
      title: "Test Event",
      description: "A test event for E2E testing.",
      date: futureDate,
      registrationStartDate: pastDate,
      registrationEndDate: futureDate,
      draft: false,
      listed: true,
      signupsPublic: true,
      nameQuestion: true,
      emailQuestion: true,
      payments: PaymentMode.DISABLED,
      defaultLanguage: "fi",
      ...overrides,
    })
    .returning();
  return event;
}

// --- Quotas ---

type QuotaOverrides = Partial<Omit<typeof quotas.$inferInsert, "eventId">>;

export async function seedQuota(eventId: EventID, overrides: QuotaOverrides = {}) {
  const [quota] = await db
    .insert(quotas)
    .values({
      id: (overrides.id ?? generateId()) as QuotaID,
      eventId,
      title: overrides.title ?? "Default Quota",
      order: overrides.order ?? 0,
      size: overrides.size ?? 20,
      price: overrides.price ?? 0,
      ...overrides,
    })
    .returning();
  return quota;
}

// --- Questions ---

type QuestionOverrides = Partial<Omit<typeof questions.$inferInsert, "eventId">>;

export async function seedQuestion(eventId: EventID, overrides: QuestionOverrides = {}) {
  const [question] = await db
    .insert(questions)
    .values({
      id: (overrides.id ?? generateId()) as QuestionID,
      eventId,
      question: overrides.question ?? "What is your dietary preference?",
      type: overrides.type ?? QuestionType.TEXT,
      order: overrides.order ?? 0,
      required: overrides.required ?? true,
      public: overrides.public ?? false,
      ...overrides,
    })
    .returning();
  return question;
}

// --- Signups ---

type SignupOverrides = Partial<Omit<typeof signups.$inferInsert, "quotaId">>;

export async function seedSignup(quotaId: QuotaID, overrides: SignupOverrides = {}) {
  const [signup] = await db
    .insert(signups)
    .values({
      id: (overrides.id ?? generateId()) as SignupID,
      quotaId,
      firstName: overrides.firstName ?? "Test",
      lastName: overrides.lastName ?? "User",
      email: overrides.email ?? "testuser@example.com",
      namePublic: overrides.namePublic ?? true,
      confirmedAt: overrides.confirmedAt ?? new Date(),
      ...overrides,
    })
    .returning();
  return signup;
}

// --- Event Editors ---

export async function seedEventEditor(eventId: EventID, userId: UserID) {
  await db.insert(eventEditors).values({ eventId, userId });
}

// --- Convenience ---

export async function seedFullEvent(
  eventOverrides: EventOverrides = {},
  quotaOverrides: QuotaOverrides = {},
  questionOverrides: QuestionOverrides = {},
) {
  const event = await seedEvent(eventOverrides);
  const quota = await seedQuota(event.id, quotaOverrides);
  const question = await seedQuestion(event.id, questionOverrides);
  return { event, quota, question };
}
