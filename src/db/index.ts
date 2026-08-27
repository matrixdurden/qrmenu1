import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

const globalForDb = globalThis as unknown as { qrmenuPool?: Pool };
export const pool = globalForDb.qrmenuPool ?? new Pool({ connectionString, max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.qrmenuPool = pool;

export const db = drizzle(pool, { schema });
