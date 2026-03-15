# Commands

- `pnpm dev`: Run the Next.js app in development mode.
- `pnpm format`: Format all files using Oxfmt.
- `pnpm lint`: Lint all files using Oxlint.
- `pnpm typecheck`: Run TypeScript type checking.
- `pnpm test`: Run tests using Vitest.

# Code style

- Use strict TypeScript typing wherever possible.
  - Avoid using `any` whenever possible, unless the value is not really used and writing out the type is complex.
  - Use casting via `unknown` when necessary for trivial changes such as incompatible event targets.
- Always use Oxfmt to format code. Run `pnpm format` before committing changes.
- Use comments to explain complex logic. Stay concise.
- Always import via either relative paths or the `@/` alias. Paths starting with `src` fail after compilation.
- Always use `env` from `@/env` instead of `process.env` for environment variables.
- Do not add unnecessary eslint-disable comments. The project uses Oxlint which reads them.

# Project structure

- The project is an event signup system with payment support.
- This is a single Next.js 16 project (not a monorepo).
- `src/app/` — Next.js App Router pages and layouts.
  - `src/app/[locale]/(public)/` — Public-facing pages (event list, event details, signup, payment).
  - `src/app/[locale]/(admin)/` — Admin pages (event editor, user management, audit log).
  - `src/app/api/` — API routes (cron, payment webhook, iCal feed).
  - `src/app/global-not-found.tsx` — Global 404 redirect (Next.js 16 experimental).
- `src/actions/` — Server actions using next-safe-action, one action per file.
- `src/components/` — React components (both server and client).
  - `src/components/ui/` — Reusable UI primitives (Field, Alert, Button, Card, Tabs, Badge, FieldError, Sortable).
  - `src/components/admin/editor/` — Event editor tab components with drag-and-drop.
- `src/lib/` — Shared/client utilities (signup utils, form validation hook).
- `src/models/` — Shared TypeScript types and Zod schemas (zod/v4).
- `src/i18n/` — Internationalization (next-intl) with Finnish and English translations.
- `src/env.ts` — Validated environment variables via @t3-oss/env-nextjs.
- `src/db/` — Drizzle schema, relations, connection, and query helpers.
- `src/services/` — All business logic (used by server actions).
- `src/auth/` — Authentication (JWT, admin sessions, password auth, safe-action client).
- `src/cron/` — Scheduled maintenance tasks.
- `src/mail/` — Email sending logic and React Email templates.
- `src/auditlog/` — Audit logging.
- `src/util/` — Shared server utilities (cache, errors, debug).
- `src/proxy.ts` — Admin auth middleware (JWT cookie verification).
- `test/` — Backend test suite (Vitest).

# Server actions (next-safe-action)

- Each server action is in its own file under `src/actions/`.
- Action client and middleware are defined in `src/auth/safe-action.ts`.
- `actionClient` — base client with `defaultValidationErrorsShape: "flattened"`.
- `isAuthorizedMiddleware` — verifies admin session, injects `session` and `auditLogger` into context.
- `ActionError` — throw for user-facing error messages.
- Actions use Zod schemas from `src/models/schema/` for input validation.
- Client components consume actions via `useAction` from `next-safe-action/hooks` or direct calls.
- `updateEventAction` returns structured data for edit conflicts and move-to-queue warnings instead of throwing.

# Form validation

- Zod schemas in `src/models/schema/` define all validation rules.
- `useFormValidation` hook (`src/lib/useFormValidation.ts`) manages per-field error state, supports nested paths like `quotas[0].title`.
- `FieldError` component (`src/components/ui/FieldError.tsx`) displays inline errors.
- Client-side validation runs before calling server actions; server actions also validate via next-safe-action's `inputSchema`.
- Editor tabs show red dot indicators when they contain fields with validation errors.

# Event editor

- `src/components/admin/EventEditor.tsx` — Main editor with tabs (basic, quotas, questions, emails, preview, signups).
- `src/components/admin/editor/types.ts` — Editor form state types with `EditorQuota`, `EditorQuestion`, `EditorFormState`.
- Quotas and questions use `key` field for stable drag-and-drop identifiers (`@dnd-kit`).
- `generateKey()` creates unique keys for new items.
- Edit conflict and move-to-queue warnings are shown as inline alerts with action buttons.
- Slug availability is checked with debounced server calls in `BasicDetailsTab`.
- Preview tab renders a live preview of the event using the `Markdown` component.

# Styling

- Tailwind CSS v4 with `@tailwindcss/typography` plugin for markdown prose styling.
- Open Sans font loaded via `next/font/google`.
- Brand colors configurable via `--color-brand-*` CSS variables.
- Global heading styles: h1 uppercase bold (800), h2 uppercase semibold (600) gray.
