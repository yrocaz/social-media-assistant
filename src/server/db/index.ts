import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "./schema";

// ============================================================================
// Database Client
// ============================================================================

export const db = drizzle(env.prod_momwise_smm_db, { schema });

/**
 * Creates a Drizzle database client from a D1Database instance.
 * Use this when you need to pass a different D1 binding.
 */
export function createDb(d1: D1Database): DrizzleD1Database<typeof schema> {
  return drizzle(d1, { schema });
}

// Re-export schema and types for convenience
export * from "./schema";
export type { DrizzleD1Database };
