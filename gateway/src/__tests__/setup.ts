/**
 * Test setup for ENS Gateway tests
 * Sets environment variables before any module imports
 */

// Hardhat account #0 — deterministic test signer
process.env.ENS_GATEWAY_SIGNER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
process.env.DATABASE_URL = "postgresql://localhost:5432/voidmarket_test";
process.env.PORT = "3099";
