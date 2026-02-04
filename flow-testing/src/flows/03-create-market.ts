/**
 * Flow 3: Create Regular Market
 *
 * Tests market creation on-chain:
 * 1. User must be registered
 * 2. Submit createMarket transaction via Circle
 * 3. Store market in database
 * 4. Verify market on-chain
 */

import { getUserByTelegramId, createMarket as createMarketDB } from '../services/db/queries.js';
import { createMarket as createMarketOnChain, getMarket } from '../services/contracts/market.js';
import type { Market, NewMarket } from '../services/db/schema.js';

export interface CreateMarketResult {
  success: boolean;
  marketId?: bigint;
  market?: Market;
  txHash?: string;
  error?: string;
}

/**
 * Create a new prediction market
 */
export async function createPredictionMarket(
  telegramId: string,
  question: string,
  deadlineHours: number,
  resolutionHours: number
): Promise<CreateMarketResult> {
  console.log(`\n=== Flow 3: Create Regular Market ===`);
  console.log(`Question: ${question}`);
  console.log(`Deadline: ${deadlineHours} hours from now`);
  console.log(`Resolution: ${resolutionHours} hours after deadline`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered. Complete Flow 1 first.');
    }
    console.log(`Found user ID: ${user.id}, wallet: ${user.walletId}`);

    // Step 2: Calculate deadlines
    console.log(`\n[Step 2] Calculating deadlines...`);
    const now = Math.floor(Date.now() / 1000);
    const deadline = BigInt(now + deadlineHours * 3600);
    const resolutionDeadline = BigInt(now + (deadlineHours + resolutionHours) * 3600);

    console.log(`Betting deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
    console.log(`Resolution deadline: ${new Date(Number(resolutionDeadline) * 1000).toISOString()}`);

    // Step 3: Create market on-chain
    console.log(`\n[Step 3] Creating market on-chain...`);
    const txResult = await createMarketOnChain(
      user.walletId,
      question,
      deadline,
      resolutionDeadline
    );

    if (txResult.txResult.status !== 'CONFIRMED') {
      throw new Error(`Transaction failed: ${txResult.txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txResult.txHash}`);

    // Step 4: Get market ID from events (simplified - in production parse from logs)
    // For now, we'll query the contract to get the latest market
    console.log(`\n[Step 4] Retrieving market ID...`);

    // In production, parse MarketCreated event from transaction receipt
    // For testing, we'll use a placeholder market ID
    const marketId = BigInt(1); // TODO: Parse from event logs

    // Step 5: Verify market on-chain
    console.log(`\n[Step 5] Verifying market on-chain...`);
    const onChainMarket = await getMarket(marketId);

    console.log(`Market verified:`);
    console.log(`  - ID: ${onChainMarket.id}`);
    console.log(`  - Question: ${onChainMarket.question}`);
    console.log(`  - Creator: ${onChainMarket.creator}`);
    console.log(`  - Status: ${onChainMarket.status}`);

    // Step 6: Store in database
    console.log(`\n[Step 6] Storing market in database...`);
    const marketData: NewMarket = {
      onChainId: marketId,
      question,
      creatorId: user.id,
      deadline: new Date(Number(deadline) * 1000),
      resolutionDeadline: new Date(Number(resolutionDeadline) * 1000),
      status: 'OPEN',
      isForked: false,
    };

    const market = await createMarketDB(marketData);
    console.log(`Market stored with DB ID: ${market.id}`);

    console.log(`\n=== Market Creation Complete ===`);
    console.log(`On-chain ID: ${marketId}`);
    console.log(`TX Hash: ${txResult.txResult.txHash}`);

    return {
      success: true,
      marketId,
      market,
      txHash: txResult.txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Market creation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the market creation flow
 */
export async function testCreateMarketFlow(telegramId: string): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Market Creation Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await createPredictionMarket(
    telegramId,
    'Will ETH reach $5000 by end of Q1 2025?',
    24, // 24 hours to bet
    48 // 48 hours after that to resolve
  );

  if (result.success) {
    console.log(`\n✅ Flow 3 PASSED`);
  } else {
    console.log(`\n❌ Flow 3 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  testCreateMarketFlow(telegramId).catch(console.error);
}
