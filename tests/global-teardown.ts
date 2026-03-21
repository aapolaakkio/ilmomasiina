import { closePool } from "./helpers/db";

export default async function globalTeardown() {
  await closePool();
}
