import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/env";

import { relations } from "./relations";
import * as schema from "./schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({
  client: pool,
  schema,
  relations,
  logger: env.DEBUG_DB_LOGGING,
});

/** DB or transaction type — use this for function parameters that accept either. */
export type DrizzleDb = NodePgDatabase<typeof schema, typeof relations>;
