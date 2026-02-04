/**
 * Flow 1: User Registration
 *
 * Tests the complete user registration flow:
 * 1. Create Circle wallet with RefID (Telegram ID)
 * 2. Store user in database
 * 3. Verify wallet address is deterministic
 */

import { getOrCreateWallet, getWalletByRefId } from '../services/circle/wallet.js';
import { createUser, getUserByTelegramId } from '../services/db/queries.js';
import { truncateAddress } from '../utils/format.js';

export interface RegistrationResult {
  success: boolean;
  userId?: number;
  walletAddress?: string;
  walletId?: string;
  error?: string;
}

/**
 * Register a new user with a Telegram ID
 */
export async function registerUser(telegramId: string): Promise<RegistrationResult> {
  console.log(`\n=== Flow 1: User Registration ===`);
  console.log(`Telegram ID: ${telegramId}`);

  try {
    // Step 1: Check if user already exists
    console.log(`\n[Step 1] Checking for existing user...`);
    const existingUser = await getUserByTelegramId(telegramId);

    if (existingUser) {
      console.log(`User already exists with wallet: ${truncateAddress(existingUser.walletAddress)}`);
      return {
        success: true,
        userId: existingUser.id,
        walletAddress: existingUser.walletAddress,
        walletId: existingUser.walletId,
      };
    }

    // Step 2: Create Circle wallet with RefID
    console.log(`\n[Step 2] Creating Circle wallet...`);
    const refId = `telegram:${telegramId}`;
    const wallet = await getOrCreateWallet(refId);

    console.log(`Wallet created:`);
    console.log(`  - Wallet ID: ${wallet.walletId}`);
    console.log(`  - Address: ${wallet.address}`);
    console.log(`  - Blockchain: ${wallet.blockchain}`);
    console.log(`  - RefID: ${wallet.refId}`);

    // Step 3: Store user in database
    console.log(`\n[Step 3] Storing user in database...`);
    const user = await createUser({
      telegramId,
      walletId: wallet.walletId,
      walletAddress: wallet.address,
      refId: wallet.refId,
    });

    console.log(`User created with ID: ${user.id}`);

    // Step 4: Verify wallet is deterministic (same RefID = same wallet)
    console.log(`\n[Step 4] Verifying wallet determinism...`);
    const verifyWallet = await getWalletByRefId(refId);

    if (verifyWallet?.address !== wallet.address) {
      throw new Error('Wallet address mismatch - RefID should be deterministic');
    }
    console.log(`✓ Wallet address is deterministic`);

    console.log(`\n=== Registration Complete ===`);
    console.log(`User ID: ${user.id}`);
    console.log(`Wallet: ${wallet.address}`);

    return {
      success: true,
      userId: user.id,
      walletAddress: wallet.address,
      walletId: wallet.walletId,
    };
  } catch (error) {
    console.error(`\n❌ Registration failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the registration flow
 */
export async function testRegistrationFlow(): Promise<void> {
  // Generate a test Telegram ID
  const testTelegramId = `test_${Date.now()}`;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing User Registration Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await registerUser(testTelegramId);

  if (result.success) {
    console.log(`\n✅ Flow 1 PASSED`);
  } else {
    console.log(`\n❌ Flow 1 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRegistrationFlow().catch(console.error);
}
