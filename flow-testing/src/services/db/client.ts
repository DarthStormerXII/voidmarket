/**
 * PostgreSQL Database Client
 *
 * Drizzle ORM client configuration for VoidMarket
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import 'dotenv/config';

// Database connection string
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DATABASE_USER || 'postgres'}:${process.env.DATABASE_PASSWORD || 'password'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || '5432'}/${process.env.DATABASE_NAME || 'voidmarket'}`;

// Create postgres client
const client = postgres(connectionString, {
  max: 10, // Max connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in queries
export { schema };

// Export types
export type Database = typeof db;

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeConnection(): Promise<void> {
  await client.end();
}
