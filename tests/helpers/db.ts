import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "../../src/db/relations";
import * as schema from "../../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle({ client: pool, schema, relations });

export async function closePool() {
  await pool.end();
}
