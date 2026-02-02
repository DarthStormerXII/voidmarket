/**
 * Drizzle Kit Configuration
 *
 * Used for database migrations and schema management
 */

import type { Config } from 'drizzle-kit';
import 'dotenv/config';

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DATABASE_USER || 'postgres'}:${process.env.DATABASE_PASSWORD || 'password'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || '5432'}/${process.env.DATABASE_NAME || 'voidmarket'}`;

export default {
  schema: './src/services/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
} satisfies Config;
