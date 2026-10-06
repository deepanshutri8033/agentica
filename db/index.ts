import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_URL must be set to connect to the Neon database.");
}

let databaseUrl: URL;
try {
  databaseUrl = new URL(connectionString);
} catch {
  throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
}

if (
  !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
  !databaseUrl.hostname ||
  !databaseUrl.username ||
  !databaseUrl.password
) {
  throw new Error("DATABASE_URL must include valid PostgreSQL connection details.");
}

// Neon HTTP uses fetch over HTTPS. Disable framework fetch caching for every SQL request.
const sql = neon(connectionString, {
  fetchOptions: { cache: "no-store" },
});

export const db = drizzle(sql, { schema });
export * from "@/db/schema";