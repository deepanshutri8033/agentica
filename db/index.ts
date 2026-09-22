import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL || "";

// Neon HTTP client runs stateless SQL queries over standard HTTPS (port 443)
// Eliminates TCP port 5432 timeouts, PgBouncer dropouts, and SSL handshake failures
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export * from "@/db/schema";