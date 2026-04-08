# Migration

This file documents:

- The migration from MySQL/MariaDB to PostgreSQL for Ilmomasiina v3+
- The migration from Athene's Ilmomasiina to Ilmomasiina v2+
- The migration from [Tietokilta/ilmomasiina](https://github.com/Tietokilta/ilmomasiina) (PostgreSQL, Sequelize) to this app (v3+)

## Migration from MySQL/MariaDB to PostgreSQL

TODO. A tool of some kind will be provided.

## Migration from Athene's Ilmomasiina

If you're still using Athene's Ilmomasiina version, you'll need to run some manual migrations steps before
Ilmomasiina's built-in migrations can take over.

The below SQL script is written for MySQL/MariaDB. If you use PostgreSQL, ask your favorite AI to convert it over.

After running the script, start the latest version of Ilmomasiina v2.x to run the built-in migrations.

**Please make full backups of your data before proceeding with this migration.**

```sql
-- add slug support

ALTER TABLE `event`
ADD `slug` VARCHAR(255) NOT NULL AFTER `title`;
UPDATE `event`
SET `slug` = CONVERT(`id`, CHAR);
ALTER TABLE `event`
ADD CONSTRAINT UNIQUE (`slug`);

-- change ids to randomized strings

ALTER TABLE `question`
DROP CONSTRAINT `question_ibfk_1`;
ALTER TABLE `quota`
DROP CONSTRAINT `quota_ibfk_1`;
ALTER TABLE `signup`
DROP CONSTRAINT `signup_ibfk_1`;
ALTER TABLE `answer`
DROP CONSTRAINT `answer_ibfk_1`,
DROP CONSTRAINT `answer_ibfk_2`;

ALTER TABLE `event`
MODIFY `id` CHAR(12) NOT NULL;
ALTER TABLE `question`
MODIFY `id` CHAR(12) NOT NULL,
MODIFY `eventId` CHAR(12) NOT NULL;
ALTER TABLE `quota`
MODIFY `id` CHAR(12) NOT NULL,
MODIFY `eventId` CHAR(12) NOT NULL;
ALTER TABLE `signup`
MODIFY `id` CHAR(12) NOT NULL,
MODIFY `quotaId` CHAR(12) NOT NULL;
ALTER TABLE `answer`
MODIFY `signupId` CHAR(12) NOT NULL,
MODIFY `questionId` CHAR(12) NOT NULL;

ALTER TABLE `question`
ADD FOREIGN KEY `question_ibfk_1` (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `quota`
ADD FOREIGN KEY `quota_ibfk_1` (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `signup`
ADD FOREIGN KEY `signup_ibfk_1` (`quotaId`) REFERENCES `quota` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `answer`
ADD FOREIGN KEY `answer_ibfk_1` (`signupId`) REFERENCES `signup` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD FOREIGN KEY `answer_ibfk_2` (`questionId`) REFERENCES `question` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- add reordering support to questions and quotas

ALTER TABLE `question`
ADD `order` INTEGER NOT NULL AFTER `eventId`;
ALTER TABLE `quota`
ADD `order` INTEGER NOT NULL AFTER `eventId`;

-- add listed attribute

ALTER TABLE `event`
ADD `listed` BOOLEAN NOT NULL DEFAULT 1 AFTER `draft`;

-- store status and position in signups

ALTER TABLE `signup`
ADD `status` ENUM('in-quota', 'in-open', 'in-queue') DEFAULT NULL AFTER `confirmedAt`,
ADD `position` INTEGER DEFAULT NULL AFTER `status`;

-- allow events without signup and vice versa

ALTER TABLE `event`
MODIFY `date` DATETIME DEFAULT NULL,
MODIFY `registrationStartDate` DATETIME DEFAULT NULL,
MODIFY `registrationEndDate` DATETIME DEFAULT NULL;

-- add event categories

ALTER TABLE `event`
ADD `category` VARCHAR(255) NOT NULL DEFAULT '' AFTER `webpageUrl`;

-- make names optional in signups

ALTER TABLE `event`
ADD `nameQuestion` BOOLEAN NOT NULL DEFAULT 1 AFTER `signupsPublic`,
ADD `emailQuestion` BOOLEAN NOT NULL DEFAULT 1 AFTER `signupsPublic`;

-- allow hiding names in signups

ALTER TABLE `signup`
ADD `namePublic` BOOLEAN NOT NULL DEFAULT 0 AFTER `lastName`;
-- keep names public in previously existing signups
UPDATE `signup`
SET `namePublic` = 1;

-- ensure unlimited quotas are stored as size=NULL instead of size=0

UPDATE `quota`
SET `size` = NULL WHERE `size` = 0;

```

## PostgreSQL: Tietokilta Ilmomasiina → Ilmomasiina v3 (this repo)

Use this when you have an existing **PostgreSQL** database from the Tietokilta stack (`packages/ilmomasiina-backend`, Sequelize). Upgrade that deployment to the **latest** [Tietokilta/ilmomasiina](https://github.com/Tietokilta/ilmomasiina) release and run its migrations **before** importing data here.

**Back up the database** (full dump) before running anything.

### What the script does

The script [`src/db/migrateFromTietokilta.ts`](../src/db/migrateFromTietokilta.ts) (run via `pnpm db:migrate:tietokilta`):

1. Copies non-default locale data from the legacy `event.languages` JSON column into `event_language`, `quota_language`, and `question_language` (quotas and questions are matched by `order`, same as the old editor).
2. Drops `signup.status` and `signup.position` (queue state is computed at runtime in v3).
3. Drops `event.languages` and, if present, `event.facebookUrl` and `event.preferredFrontend`.
4. Adds missing `enum_audit_event` values used for payment audit logs (`payment.start`, `payment.complete`, `payment.expire`) if they are not already present.
5. Drops the Sequelize `SequelizeMeta` table when found.
6. Inserts rows into `drizzle.__drizzle_migrations` for each folder under `src/drizzle/` so `pnpm db:migrate` does not try to recreate tables that already exist.

### Usage

```bash
# Required: DATABASE_URL pointing at the database to convert (use a copy, not production, until verified)
pnpm db:migrate:tietokilta
```

Options and environment variables:

- `--journal-only` — only sync the Drizzle migrations journal (useful if the rest was applied manually).
- `--force` — with the version check below, allow continuing when the declared version is older than GitHub’s latest tag.
- `TIETOKILTA_VERIFY_LATEST=1` — fetch the latest GitHub release tag and compare with `TIETOKILTA_VERSION` (e.g. `2.1.0-beta.3`). The script exits with an error if the declared version sorts **below** the latest tag, unless `--force` is set. This does not validate the schema; it is an operational safeguard only.

After a successful run, start the app (or run `pnpm db:migrate`); migrations should be a no-op if the journal was seeded correctly.
