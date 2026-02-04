/**
 * Test Setup
 *
 * Global setup for all tests
 */

import 'dotenv/config';
import { afterAll } from 'vitest';

// Note: Vitest timeout is configured in vitest.config.ts

// Mock environment variables if not set
if (!process.env.VOIDMARKET_ENS_DOMAIN) {
  process.env.VOIDMARKET_ENS_DOMAIN = 'voidmarket.eth';
}

if (!process.env.ENS_GATEWAY_PORT) {
  process.env.ENS_GATEWAY_PORT = '3001';
}

// Suppress console.log in tests unless DEBUG is set
if (!process.env.DEBUG) {
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    if (process.env.DEBUG) {
      originalLog(...args);
    }
  };
}

// Global cleanup
afterAll(async () => {
  // Allow any pending operations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
});
