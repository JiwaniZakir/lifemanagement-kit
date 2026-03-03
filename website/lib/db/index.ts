import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import type { VercelPgDatabase } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema';

type DB = VercelPgDatabase<typeof schema>;

// Lazy-initialize so the app doesn't crash at import time without POSTGRES_URL
let _db: DB | null = null;

export function getDb(): DB {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured. Database features are unavailable.');
  }
  if (!_db) {
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Backward-compatible export — throws at query time if no POSTGRES_URL
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
