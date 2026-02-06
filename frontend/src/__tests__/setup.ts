/**
 * Vitest setup file
 * Sets up environment variables for test runs
 */

process.env.CIRCLE_API_KEY = "TEST_API_KEY";
process.env.CIRCLE_ENTITY_SECRET = "test_entity_secret_hex_64chars_padded_0000000000000000000000";
process.env.ARC_RPC_URL = "https://rpc-testnet.arc.circle.com";
process.env.VOIDMARKET_CORE_ADDRESS = "0xe05dc9467de459adfc5c31ce4746579d29b65ba2";
process.env.CLUSTER_MANAGER_ADDRESS = "0x9dfbfba639a5fd11cf9bc58169157c450ce99661";
process.env.NOVA_MANAGER_ADDRESS = "0xcef696b36e24945f45166548b1632c7585e3f0db";
process.env.DATABASE_URL = "postgresql://localhost:5432/voidmarket_test";
