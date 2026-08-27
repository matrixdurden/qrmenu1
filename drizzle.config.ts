import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

function readLocalEnv() {
  const text = readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

const env = { ...readLocalEnv(), ...process.env };

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
