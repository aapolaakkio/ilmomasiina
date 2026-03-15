# Project structure

## Overview

Ilmomasiina is a single [Next.js 16](https://nextjs.org/) application (not a monorepo). It uses
[pnpm](https://pnpm.io/) for package management.

To prepare for development, install pnpm and run `pnpm install`.

## Source layout

Source folders are listed roughly in order of importance.

- `src/app/` — Next.js App Router pages and layouts.
  - `src/app/[locale]/(public)/` — Public-facing pages (event list, event details, signup, payment).
  - `src/app/[locale]/(admin)/` — Admin pages (event editor, user management, audit log).
  - `src/app/api/` — API routes (cron, payment webhook, iCal feed).
- `src/actions/` — Server actions using [next-safe-action](https://next-safe-action.dev/), one per file.
- `src/components/` — React components (both server and client).
  - `src/components/ui/` — Reusable UI primitives (Field, Alert, Button, Card, Tabs, Badge, etc.).
  - `src/components/admin/editor/` — Event editor tab components with drag-and-drop.
- `src/services/` — All business logic (used by server actions).
  - `src/services/admin/events/normalizeQuestionOptions.ts` — Shared question option normalization.
- `src/db/` — [Drizzle ORM](https://orm.drizzle.team/) schema, relations, connection, and query helpers.
  - `src/db/filters.ts` — Shared query filters (e.g. `activeSignupCutoff()`).
  - `src/db/computed.ts` — Derived values from database rows.
- `src/models/` — Shared TypeScript types and [Zod](https://zod.dev/) schemas (v4).
- `src/auth/` — Authentication (JWT, admin sessions, password auth, safe-action client).
  - `src/auth/constants.ts` — Shared auth constants (e.g. `SESSION_TTL`).
- `src/i18n/` — Internationalization ([next-intl](https://next-intl.dev/)) with Finnish and English.
- `src/env.ts` — Validated environment variables via [@t3-oss/env-nextjs](https://env.t3.gg/).
- `src/lib/` — Shared/client utilities (signup utils, form validation hook).
- `src/cron/` — Scheduled maintenance tasks.
- `src/mail/` — Email sending logic and [React Email](https://react.email/) templates.
  - `src/mail/formatDate.ts` — Timezone-aware date formatting via `Intl.DateTimeFormat`.
- `src/auditlog/` — Audit logging.
- `src/util/` — Shared server utilities (cache, errors, debug).
- `src/proxy.ts` — Admin auth middleware (JWT cookie verification, i18n routing).
- `test/` — Backend test suite ([Vitest](https://vitest.dev/)).

### Source of truth for models

The source of truth for **database models** is in `src/db/schema.ts`, defined as Drizzle ORM table
definitions with typed columns and relations.

The source of truth for **API models** is in `src/models/schema/`, which contains Zod schemas that
define request/response shapes. These are used both for server-side validation (via next-safe-action)
and for client-side type inference.

## Technologies

- [TypeScript](https://www.typescriptlang.org/) everywhere
- [Next.js 16](https://nextjs.org/) (App Router, Server Actions, React Server Components)
- [React 19](https://react.dev/) with functional components
- [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL
- [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/typography`
- [Base UI](https://base-ui.com/) (`@base-ui/react`) for headless UI components
- [@dnd-kit](https://dndkit.com/) for drag-and-drop
- [Zod v4](https://zod.dev/) for validation
- [next-intl](https://next-intl.dev/) for internationalization
- [next-safe-action](https://next-safe-action.dev/) for type-safe server actions
- [Stripe](https://stripe.com/) for payments
- [Nodemailer](https://nodemailer.com/) for sending emails
- [React Email](https://react.email/) for email templates
- [Vitest](https://vitest.dev/) for testing
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) for linting
- [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) for formatting
