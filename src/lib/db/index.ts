import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Get connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Create postgres client
// Using connection pooling via Supabase's pgbouncer
const client = postgres(connectionString, {
  prepare: false, // Required for pgbouncer/transaction mode
  max: 1, // Limit connections in serverless
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in queries
export { schema };

// Export types
export type Database = typeof db;
