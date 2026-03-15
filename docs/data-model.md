# Data model

Ilmomasiina uses Drizzle ORM to store data in PostgreSQL. The schema is defined in `src/db/schema.ts`.

## Models

```
 ╷───────┐1     *┌───────┐1     *┌────────┐1     *┌─────────┐
 │ Event ├───────┤ Quota ├───────┤ Signup ├───────┤ Payment │
 └───┬───┘       └───────┘       └────┬───┘       └─────────┘
     │1                               │1
     │                                │
     │*                               │*
┌────┴─────┐1                   *┌────┴───┐
│ Question ├─────────────────────┤ Answer │
└──────────┘                     └────────┘


                 ┌──────┐        ┌──────────┐
                 │ User │        │ AuditLog │
                 └──────┘        └──────────┘
```

Multi-language content is stored in separate language rows:

```
Event ──1:*── EventLanguage
Quota ──1:*── QuotaLanguage
Question ──1:*── QuestionLanguage
```

The default language content lives on the main table row. Non-default language content is stored in the
corresponding language table (e.g. `EventLanguage`). The `reconstructEventLanguages` helper merges these.

### Event

**Event** instances hold most of the information of an event, including description information, registration
settings and status flags.

Events can be enumerated, viewed, modified and deleted by admins, and in a limited fashion by users.

Each Event has one or more **Quotas** and zero or more **Questions**.

### Quota

**Quota** instances are assigned to an **Event**. Quotas mostly hold their name and size.

Quotas are created, updated and deleted automatically when updating their Events.
Quotas cannot be reassigned to a different Event.

Each Quota has one **Event** and zero or more **Signups**.

### Question

**Question** instances are assigned to an **Event**. Questions hold their question, answer type, required flag and
potentially answer options.

Like Quotas, Questions are created, updated and deleted automatically when updating their Events, and cannot be
reassigned to a different Event.

Each Question has one **Event** and zero or more **Answers**.

### Signup

**Signup** instances are assigned to a **Quota**. Signup instances hold their basic fields (name/email).

Signups can be enumerated and deleted per-event by admins, and in a limited fashion by users.
They can also be viewed, modified and deleted using their edit token, which is computed statelessly.

Each Signup has one **Quota**, zero or more **Answers**, and zero or more **Payments**.

### Answer

**Answer** instances are assigned to a **Signup** and **Question**.

Answers are included when fetching Signups. They are recreated on each update to the Signup and are completely
transparent to the API.

Each Answer has one **Signup** and one **Question**.

### Payment

**Payment** instances track Stripe Checkout Session payments for a **Signup**.

See [payments.md](payments.md) for the full payment state machine.

### User

**User** instances hold an email address and hashed password.

Users are not related to any other models. This model is only used for local admin login, and can be enumerated,
created and deleted by admins.

## Soft deletion

Tables other than **User** use soft deletion (a `deletedAt` timestamp). The `removeDeletedData.ts` cron job
periodically hard-deletes soft-deleted data after a configurable grace period (`DELETION_GRACE_PERIOD_DAYS`),
to allow restoration of accidentally deleted data.

## Shared query helpers

- `activeSignupCutoff()` in `src/db/filters.ts` — returns the cutoff date for unconfirmed signup expiry,
  centralizing the `SIGNUP_CONFIRM_MINS` calculation used across the codebase.
