/**
 * One-shot migration from Tietokilta/ilmomasiina (Sequelize) PostgreSQL to this app's schema:
 * - Flattens `event.languages` JSON into event_language / quota_language / question_language
 * - Drops signup status/position and legacy event columns
 * - Ensures audit enum includes payment.* values
 * - Seeds drizzle.__drizzle_migrations so `pnpm db:migrate` does not re-apply baselines
 *
 * Usage: `pnpm db:migrate:tietokilta` (see docs/migration.md)
 */
import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Pool } from "pg";

const DRIZZLE_SCHEMA = "drizzle";
const DRIZZLE_TABLE = "__drizzle_migrations";

/** Matches drizzle-orm migrator.utils `formatToMillis`. */
function formatToMillis(dateStr: string): number {
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  const month = Number.parseInt(dateStr.slice(4, 6), 10) - 1;
  const day = Number.parseInt(dateStr.slice(6, 8), 10);
  const hour = Number.parseInt(dateStr.slice(8, 10), 10);
  const minute = Number.parseInt(dateStr.slice(10, 12), 10);
  const second = Number.parseInt(dateStr.slice(12, 14), 10);
  return Date.UTC(year, month, day, hour, minute, second);
}

interface LocalMigrationMeta {
  sql: string[];
  folderMillis: number;
  hash: string;
  name: string;
}

/** Same logic as `drizzle-orm/migrator.js` `readMigrationFiles`. */
function readLocalMigrationMeta(migrationsFolder: string): LocalMigrationMeta[] {
  if (fs.existsSync(path.join(migrationsFolder, "meta", "_journal.json"))) {
    throw new Error(
      'Found meta/_journal.json — use "drizzle-kit up" to convert, or remove it for folder-style migrations.',
    );
  }
  const out: LocalMigrationMeta[] = [];
  const subdirs = fs
    .readdirSync(migrationsFolder)
    .map((subdir) => ({
      migrationPath: path.join(migrationsFolder, subdir, "migration.sql"),
      name: subdir,
    }))
    .filter((it) => fs.existsSync(it.migrationPath));
  subdirs.sort((a, b) => a.name.localeCompare(b.name));
  for (const { migrationPath, name } of subdirs) {
    const query = fs.readFileSync(migrationPath, "utf-8");
    const sql = query.split("--> statement-breakpoint").map((s) => s);
    const migrationDate = name.slice(0, 14);
    const folderMillis = formatToMillis(migrationDate);
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    out.push({ sql, folderMillis, hash, name });
  }
  return out;
}

async function columnExists(pool: Pool, table: string, column: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return r.rows.length > 0;
}

async function tableExists(pool: Pool, table: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return r.rows.length > 0;
}

interface TietokiltaLanguageQuota {
  title: string;
}

interface TietokiltaLanguageQuestion {
  question: string;
  options?: string[] | null;
}

interface TietokiltaLanguageBlock {
  title: string;
  description?: string | null;
  price?: string | null;
  location?: string | null;
  webpageUrl?: string | null;
  verificationEmail?: string | null;
  quotas: TietokiltaLanguageQuota[];
  questions: TietokiltaLanguageQuestion[];
}

async function ensureLanguageTables(pool: Pool): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS "event_language" (
      "eventId" char(12) NOT NULL,
      "language" varchar(8) NOT NULL,
      "title" varchar(255) NOT NULL,
      "description" text,
      "price" varchar(255),
      "location" text,
      "webpageUrl" varchar(2048),
      "verificationEmail" text,
      CONSTRAINT "event_language_pkey" PRIMARY KEY("eventId","language")
    )`,
    `CREATE TABLE IF NOT EXISTS "quota_language" (
      "quotaId" char(12) NOT NULL,
      "language" varchar(8) NOT NULL,
      "title" varchar(255) NOT NULL,
      CONSTRAINT "quota_language_pkey" PRIMARY KEY("quotaId","language")
    )`,
    `CREATE TABLE IF NOT EXISTS "question_language" (
      "questionId" char(12) NOT NULL,
      "language" varchar(8) NOT NULL,
      "question" varchar(1024) NOT NULL,
      "options" json,
      CONSTRAINT "question_language_pkey" PRIMARY KEY("questionId","language")
    )`,
  ];
  for (const s of stmts) {
    await pool.query(s);
  }

  const fkStmts = [
    `DO $$ BEGIN
      ALTER TABLE "event_language" ADD CONSTRAINT "event_language_eventId_event_id_fkey"
        FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN
      ALTER TABLE "quota_language" ADD CONSTRAINT "quota_language_quotaId_quota_id_fkey"
        FOREIGN KEY ("quotaId") REFERENCES "quota"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN
      ALTER TABLE "question_language" ADD CONSTRAINT "question_language_questionId_question_id_fkey"
        FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  ];
  for (const s of fkStmts) {
    await pool.query(s);
  }
}

const AUDIT_PAYMENT_VALUES = ["payment.start", "payment.complete", "payment.expire"] as const;

async function ensureAuditPaymentEnumValues(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ enumlabel: string }>(
    `SELECT e.enumlabel AS enumlabel
     FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     WHERE t.typname = 'enum_audit_event'`,
  );
  const have = new Set(rows.map((r) => r.enumlabel));
  for (const v of AUDIT_PAYMENT_VALUES) {
    if (!have.has(v)) {
      await pool.query(`ALTER TYPE "enum_audit_event" ADD VALUE '${v.replace(/'/g, "''")}'`);
    }
  }
}

async function seedDrizzleMigrationsJournal(pool: Pool, migrationsFolder: string): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${DRIZZLE_SCHEMA}`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${DRIZZLE_SCHEMA}.${DRIZZLE_TABLE} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint,
      name text,
      applied_at timestamp with time zone DEFAULT now()
    )
  `);

  const local = readLocalMigrationMeta(migrationsFolder);
  const { rows: existing } = await pool.query<{ hash: string }>(`SELECT hash FROM ${DRIZZLE_SCHEMA}.${DRIZZLE_TABLE}`);
  const existingHashes = new Set(existing.map((r) => r.hash));

  for (const m of local) {
    if (existingHashes.has(m.hash)) continue;
    await pool.query(
      `INSERT INTO ${DRIZZLE_SCHEMA}.${DRIZZLE_TABLE} ("hash", "created_at", "name")
       VALUES ($1, $2, $3)`,
      [m.hash, m.folderMillis, m.name],
    );
    console.log(`Recorded Drizzle migration: ${m.name}`);
  }
}

function parseArgs(argv: string[]) {
  let journalOnly = false;
  let force = false;
  for (const a of argv) {
    if (a === "--journal-only") journalOnly = true;
    if (a === "--force") force = true;
  }
  return { journalOnly, force };
}

/** Loose semver: supports optional prerelease after `-`. Returns negative if a < b. */
function compareSemver(a: string, b: string): number {
  const norm = (s: string) => s.replace(/^v/i, "").trim();
  const parse = (s: string) => {
    const m = norm(s).match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!m) return null;
    return {
      major: Number(m[1]),
      minor: Number(m[2]),
      patch: Number(m[3]),
      pre: m[4] ?? null,
    };
  };
  const A = parse(a);
  const B = parse(b);
  if (!A || !B) return 0;
  for (const k of ["major", "minor", "patch"] as const) {
    if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  }
  if (A.pre === null && B.pre === null) return 0;
  if (A.pre === null) return 1;
  if (B.pre === null) return -1;
  return A.pre.localeCompare(B.pre);
}

async function maybeVerifyTietokiltaLatest(force: boolean): Promise<void> {
  if (process.env.TIETOKILTA_VERIFY_LATEST !== "1") return;
  const declared = process.env.TIETOKILTA_VERSION?.trim();
  if (!declared) {
    console.warn("TIETOKILTA_VERIFY_LATEST=1 but TIETOKILTA_VERSION is unset; skipping version check.");
    return;
  }
  const res = await fetch("https://api.github.com/repos/Tietokilta/ilmomasiina/releases/latest");
  if (!res.ok) {
    console.warn(`Could not fetch latest Tietokilta release (${res.status}); skipping version check.`);
    return;
  }
  const data = (await res.json()) as { tag_name?: string };
  const latest = data.tag_name?.replace(/^v/, "") ?? "";
  if (!latest) return;
  const cmp = compareSemver(declared, latest);
  if (cmp < 0 && !force) {
    throw new Error(
      `TIETOKILTA_VERSION=${declared} is below latest GitHub release ${latest}. ` +
        `Upgrade Tietokilta and run its migrations first, or pass --force to continue anyway.`,
    );
  }
  console.log(`Tietokilta version check: declared ${declared}, latest ${latest} — ok.`);
}

async function migrateLanguagesFromJson(pool: Pool): Promise<void> {
  const hasLanguagesCol = await columnExists(pool, "event", "languages");
  if (!hasLanguagesCol) {
    console.log("Column event.languages not found — skipping JSON flatten step.");
    return;
  }

  await ensureLanguageTables(pool);

  const events = await pool.query<{
    id: string;
    defaultLanguage: string;
    languages: unknown;
  }>(
    `SELECT id, "defaultLanguage", languages FROM event
     WHERE languages IS NOT NULL
       AND languages::jsonb IS DISTINCT FROM '{}'::jsonb`,
  );

  for (const row of events.rows) {
    let parsed: Record<string, TietokiltaLanguageBlock>;
    try {
      parsed =
        typeof row.languages === "string"
          ? JSON.parse(row.languages)
          : (row.languages as Record<string, TietokiltaLanguageBlock>);
    } catch {
      console.warn(`Skipping event ${row.id}: invalid languages JSON`);
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;

    const quotas = await pool.query<{ id: string }>(
      `SELECT id FROM quota WHERE "eventId" = $1 AND "deletedAt" IS NULL ORDER BY "order" ASC`,
      [row.id],
    );
    const questions = await pool.query<{ id: string }>(
      `SELECT id FROM question WHERE "eventId" = $1 AND "deletedAt" IS NULL ORDER BY "order" ASC`,
      [row.id],
    );

    for (const [lang, block] of Object.entries(parsed)) {
      if (lang === row.defaultLanguage) continue;
      if (!block || typeof block !== "object") continue;

      await pool.query(
        `INSERT INTO event_language ("eventId", "language", "title", "description", "price", "location", "webpageUrl", "verificationEmail")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("eventId", "language") DO UPDATE SET
           "title" = EXCLUDED."title",
           "description" = EXCLUDED."description",
           "price" = EXCLUDED."price",
           "location" = EXCLUDED."location",
           "webpageUrl" = EXCLUDED."webpageUrl",
           "verificationEmail" = EXCLUDED."verificationEmail"`,
        [
          row.id,
          lang,
          block.title ?? "",
          block.description ?? null,
          block.price ?? null,
          block.location ?? null,
          block.webpageUrl ?? null,
          block.verificationEmail ?? null,
        ],
      );

      const qTitles = Array.isArray(block.quotas) ? block.quotas : [];
      for (let i = 0; i < quotas.rows.length; i++) {
        const quotaId = quotas.rows[i]?.id;
        const lt = qTitles[i]?.title;
        if (!quotaId || lt === undefined) continue;
        await pool.query(
          `INSERT INTO quota_language ("quotaId", "language", "title")
           VALUES ($1, $2, $3)
           ON CONFLICT ("quotaId", "language") DO UPDATE SET "title" = EXCLUDED."title"`,
          [quotaId, lang, lt],
        );
      }

      const qQuestions = Array.isArray(block.questions) ? block.questions : [];
      for (let i = 0; i < questions.rows.length; i++) {
        const qid = questions.rows[i]?.id;
        const lq = qQuestions[i];
        if (!qid || !lq) continue;
        await pool.query(
          `INSERT INTO question_language ("questionId", "language", "question", "options")
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ("questionId", "language") DO UPDATE SET
             "question" = EXCLUDED."question",
             "options" = EXCLUDED."options"`,
          [qid, lang, lq.question ?? "", lq.options ?? null],
        );
      }
    }
  }

  console.log(`Processed ${events.rows.length} event(s) with non-empty languages JSON.`);
}

async function dropLegacyColumns(pool: Pool): Promise<void> {
  if (await columnExists(pool, "event", "languages")) {
    await pool.query(`ALTER TABLE "event" DROP COLUMN "languages"`);
    console.log("Dropped column event.languages");
  }
  if (await columnExists(pool, "event", "facebookUrl")) {
    await pool.query(`ALTER TABLE "event" DROP COLUMN "facebookUrl"`);
    console.log("Dropped column event.facebookUrl");
  }
  if (await columnExists(pool, "event", "preferredFrontend")) {
    await pool.query(`ALTER TABLE "event" DROP COLUMN "preferredFrontend"`);
    console.log("Dropped column event.preferredFrontend");
  }
  if (await columnExists(pool, "signup", "status")) {
    await pool.query(`ALTER TABLE "signup" DROP COLUMN "status"`);
    console.log("Dropped column signup.status");
  }
  if (await columnExists(pool, "signup", "position")) {
    await pool.query(`ALTER TABLE "signup" DROP COLUMN "position"`);
    console.log("Dropped column signup.position");
  }
}

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

async function dropSequelizeMeta(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND lower(tablename) = 'sequelizemeta'`,
  );
  for (const { tablename } of rows) {
    await pool.query(`DROP TABLE ${quoteIdent("public")}.${quoteIdent(tablename)}`);
    console.log(`Dropped table ${quoteIdent(tablename)}`);
  }
}

async function main(): Promise<void> {
  const { journalOnly, force } = parseArgs(process.argv.slice(2));
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  await maybeVerifyTietokiltaLatest(force);

  const migrationsFolder = path.join(process.cwd(), "src", "drizzle");
  if (!fs.existsSync(migrationsFolder)) {
    throw new Error(`Migrations folder not found: ${migrationsFolder}`);
  }

  const pool = new Pool({ connectionString: url, max: 2 });

  try {
    if (journalOnly) {
      await seedDrizzleMigrationsJournal(pool, migrationsFolder);
      console.log("Journal sync complete.");
      return;
    }

    if (!(await tableExists(pool, "event"))) {
      throw new Error('Table "event" not found — is this a Tietokilta Ilmomasiina database?');
    }

    await migrateLanguagesFromJson(pool);
    await ensureAuditPaymentEnumValues(pool);
    await dropLegacyColumns(pool);
    await dropSequelizeMeta(pool);
    await seedDrizzleMigrationsJournal(pool, migrationsFolder);

    console.log("Tietokilta → ilmomasiina-next migration finished.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
