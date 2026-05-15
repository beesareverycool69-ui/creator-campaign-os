import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getDatabaseUrl } from "@/lib/env";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: DrizzleDb | null = null;

function createDb() {
  const client = postgres(getDatabaseUrl(), {
    prepare: false, // Required for pgbouncer/transaction mode
    max: 1, // Limit connections in serverless
  });

  return drizzle(client, { schema });
}

function getDb() {
  if (!dbInstance) {
    dbInstance = createDb();
  }

  return dbInstance;
}

// Keep the existing `db.select(...)` call sites, but avoid opening/validating the
// database connection just because a route module was imported during build.
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

// Export schema for use in queries
export { schema };

// Export types
export type Database = DrizzleDb;
