import nextEnv from "@next/env";
import { defineConfig } from "drizzle-kit";

nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
