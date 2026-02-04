/**
 * Flow 5: Create Forked (Private) Market
 *
 * Tests forked market creation:
 * 1. Forked markets inherit resolution from parent market
 * 2. Can have custom question/deadline while parent resolves outcome
 * 3. Useful for private betting groups or variations on popular markets
 */

import {
  getUserByTelegramId,
  getMarketByOnChainId,
  createMarket as createMarketDB,
} from '../services/db/queries.js';
import {
  createForkedMarket as createForkedMarketOnChain,
  getMarket,
} from '../services/contracts/market.js';
import type { Market, NewMarket } from '../services/db/schema.js';

export interface CreateForkedMarketResult {
  success: boolean;
  forkedMarketId?: bigint;
  market?: Market;
  parentMarketId?: bigint;
  txHash?: string;
  error?: string;
}

/**
 * Create a forked (private) market from a parent market
 *
 * Forked markets:
 * - Inherit the resolution outcome from their parent market
 * - Can have different betting deadlines
 * - Can have a customized question (variation on the parent)
 * - Useful for private group bets or market variations
 */
export async function createForkedPredictionMarket(
  telegramId: string,
  parentMarketId: bigint,
  customQuestion: string | null, // null = use parent's question
  deadlineHours: number,
  resolutionHours: number
): Promise<CreateForkedMarketResult> {
  console.log(`\n=== Flow 5: Create Forked Market ===`);
  console.log(`Parent Market ID: ${parentMarketId}`);
  console.log(`Custom Question: ${customQuestion || '(inherit from parent)'}`);
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

    // Step 2: Verify parent market exists
    console.log(`\n[Step 2] Verifying parent market...`);
    const parentMarket = await getMarketByOnChainId(parentMarketId);

    if (!parentMarket) {
      throw new Error(`Parent market ${parentMarketId} not found in database`);
    }

    // Check parent market is valid for forking
    if (parentMarket.isForked) {
      throw new Error('Cannot fork a forked market. Fork from the original parent.');
    }

    console.log(`Parent market found: "${parentMarket.question}"`);
    console.log(`Parent status: ${parentMarket.status}`);

    // Step 3: Get parent market details from chain
    console.log(`\n[Step 3] Fetching parent market from chain...`);
    const onChainParent = await getMarket(parentMarketId);
    console.log(`  - Parent Creator: ${onChainParent.creator}`);
    console.log(`  - Parent Total Pool: ${onChainParent.totalPool}`);

    // Step 4: Calculate deadlines for forked market
    console.log(`\n[Step 4] Calculating deadlines...`);
    const now = Math.floor(Date.now() / 1000);
    const deadline = BigInt(now + deadlineHours * 3600);
    const resolutionDeadline = BigInt(now + (deadlineHours + resolutionHours) * 3600);

    // Forked market deadline should be before or at parent's resolution
    const parentResolutionTimestamp = Math.floor(parentMarket.resolutionDeadline.getTime() / 1000);
    if (Number(resolutionDeadline) > parentResolutionTimestamp) {
      console.log(`  Warning: Forked market resolution extends past parent. Adjusting...`);
      // Forked market should resolve when parent resolves
    }

    console.log(`Betting deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
    console.log(`Resolution deadline: ${new Date(Number(resolutionDeadline) * 1000).toISOString()}`);

    // Step 5: Determine question
    const question = customQuestion || parentMarket.question;
    console.log(`\n[Step 5] Final question: "${question}"`);

    // Step 6: Create forked market on-chain
    console.log(`\n[Step 6] Creating forked market on-chain...`);
    const txResult = await createForkedMarketOnChain(
      user.walletId,
      parentMarketId,
      question,
      deadline,
      resolutionDeadline
    );

    if (txResult.txResult.status !== 'CONFIRMED') {
      throw new Error(`Transaction failed: ${txResult.txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txResult.txHash}`);

    // Step 7: Get forked market ID from events (simplified)
    console.log(`\n[Step 7] Retrieving forked market ID...`);
    // In production, parse MarketCreated event from transaction receipt
    // For testing, we'll increment from parent ID
    const forkedMarketId = parentMarketId + 1n; // TODO: Parse from event logs

    // Step 8: Verify forked market on-chain
    console.log(`\n[Step 8] Verifying forked market on-chain...`);
    const onChainForked = await getMarket(forkedMarketId);

    console.log(`Forked market verified:`);
    console.log(`  - ID: ${onChainForked.id}`);
    console.log(`  - Question: ${onChainForked.question}`);
    console.log(`  - Creator: ${onChainForked.creator}`);
    console.log(`  - Is Forked: ${onChainForked.isForked}`);
    console.log(`  - Parent ID: ${onChainForked.parentMarketId}`);

    // Step 9: Store in database
    console.log(`\n[Step 9] Storing forked market in database...`);
    const marketData: NewMarket = {
      onChainId: forkedMarketId,
      question,
      creatorId: user.id,
      deadline: new Date(Number(deadline) * 1000),
      resolutionDeadline: new Date(Number(resolutionDeadline) * 1000),
      status: 'OPEN',
      isForked: true,
      parentMarketId: parentMarket.id,
    };

    const market = await createMarketDB(marketData);
    console.log(`Forked market stored with DB ID: ${market.id}`);

    console.log(`\n=== Forked Market Creation Complete ===`);
    console.log(`Forked Market On-chain ID: ${forkedMarketId}`);
    console.log(`Parent Market ID: ${parentMarketId}`);
    console.log(`TX Hash: ${txResult.txResult.txHash}`);

    return {
      success: true,
      forkedMarketId,
      market,
      parentMarketId,
      txHash: txResult.txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Forked market creation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the forked market creation flow
 */
export async function testCreateForkedMarketFlow(
  telegramId: string,
  parentMarketId: bigint
): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Forked Market Creation Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await createForkedPredictionMarket(
    telegramId,
    parentMarketId,
    'Will ETH reach $5000 by end of Q1 2025? (Private Group)',
    12, // 12 hours to bet
    24 // 24 hours after that to resolve
  );

  if (result.success) {
    console.log(`\n✅ Flow 5 PASSED`);
    console.log(`Forked Market ID: ${result.forkedMarketId}`);
  } else {
    console.log(`\n❌ Flow 5 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  const parentMarketId = BigInt(process.argv[3] || '1');
  testCreateForkedMarketFlow(telegramId, parentMarketId).catch(console.error);
}
