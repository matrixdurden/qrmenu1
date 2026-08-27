import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

function readLocalEnv() {
  if (!existsSync(".env.local")) return {} as Record<string, string>;
  const text = readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const localEnv = readLocalEnv();
const databaseUrl = process.env.DATABASE_URL ?? localEnv.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
