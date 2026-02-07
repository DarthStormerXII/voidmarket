/**
 * Test setup for ENS Gateway tests
 * Sets environment variables before any module imports
 */

// Deployer key — matches contracts/.env deployer (0x32FE11d9900D63350016374BE98ff37c3Af75847)
process.env.ENS_GATEWAY_SIGNER_KEY =
  "0x1db85f1330137a46544eed6a034b623d75f0f5f2e238f2708ad243de22bee3d1";
process.env.DATABASE_URL = "postgresql://localhost:5432/voidmarket_test";
process.env.PORT = "3099";
