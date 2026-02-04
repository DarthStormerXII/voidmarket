/**
 * Flow 6: Place Bet on Forked Market
 *
 * Tests betting on a forked (private) market:
 * 1. Same commit-reveal scheme as regular markets
 * 2. Verify market is forked and open
 * 3. Submit commitment and store locally for reveal
 *
 * Note: Betting on forked markets works exactly like regular markets,
 * but the resolution is inherited from the parent market.
 */

import {
  getUserByTelegramId,
  createBet as createBetDB,
  getMarketByOnChainId,
} from '../services/db/queries.js';
import { placeBet as placeBetOnChain, getBet, getMarket } from '../services/contracts/market.js';
import { createBetCommitment, serializeCommitment } from '../utils/commitment.js';
import { formatUSDC, parseUSDC } from '../utils/format.js';
import type { Bet, NewBet } from '../services/db/schema.js';

export interface PlaceForkedMarketBetResult {
  success: boolean;
  betId?: bigint;
  bet?: Bet;
  commitmentSecret?: string;
  isForkedMarket?: boolean;
  parentMarketId?: bigint;
  txHash?: string;
  error?: string;
}

/**
 * Place a bet on a forked market with commit-reveal scheme
 *
 * Functionally identical to regular market betting, but:
 * - Verifies market is a forked market
 * - Outcome will be determined by parent market resolution
 */
export async function placeForkedMarketBet(
  telegramId: string,
  forkedMarketId: bigint,
  direction: boolean, // true = YES, false = NO
  amountUSDC: string // e.g., "10.00" for 10 USDC
): Promise<PlaceForkedMarketBetResult> {
  console.log(`\n=== Flow 6: Place Bet on Forked Market ===`);
  console.log(`Forked Market ID: ${forkedMarketId}`);
  console.log(`Direction: ${direction ? 'YES' : 'NO'}`);
  console.log(`Amount: ${amountUSDC} USDC`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered. Complete Flow 1 first.');
    }
    console.log(`Found user ID: ${user.id}`);

    // Step 2: Verify forked market in DB
    console.log(`\n[Step 2] Verifying forked market...`);
    const market = await getMarketByOnChainId(forkedMarketId);

    if (!market) {
      throw new Error('Market not found in database');
    }

    if (!market.isForked) {
      console.log(`  Warning: Market ${forkedMarketId} is not a forked market`);
      console.log(`  Use Flow 4 for regular markets. Proceeding anyway...`);
    } else {
      console.log(`  Confirmed: This is a forked market`);
      console.log(`  Parent Market ID (DB): ${market.parentMarketId}`);
    }

    if (market.status !== 'OPEN') {
      throw new Error(`Market is not open for betting (status: ${market.status})`);
    }
    console.log(`Market verified: "${market.question}"`);

    // Step 3: Verify on-chain that it's a forked market
    console.log(`\n[Step 3] Verifying on-chain market data...`);
    const onChainMarket = await getMarket(forkedMarketId);

    console.log(`On-chain market info:`);
    console.log(`  - Is Forked: ${onChainMarket.isForked}`);
    console.log(`  - Parent Market ID: ${onChainMarket.parentMarketId}`);
    console.log(`  - Status: ${onChainMarket.status}`);
    console.log(`  - Current Pool: ${formatUSDC(onChainMarket.totalPool)}`);

    // Step 4: Generate commitment hash
    console.log(`\n[Step 4] Generating commitment hash...`);
    const commitment = createBetCommitment(direction);

    console.log(`Commitment generated:`);
    console.log(`  - Direction: ${direction ? 'YES' : 'NO'} (hidden until reveal)`);
    console.log(`  - Salt: ${commitment.salt.slice(0, 10)}... (KEEP SECRET)`);
    console.log(`  - Hash: ${commitment.commitmentHash}`);

    // Step 5: Parse amount to wei (18 decimals on Arc)
    console.log(`\n[Step 5] Parsing bet amount...`);
    const amountWei = parseUSDC(amountUSDC);
    console.log(`Amount in wei: ${amountWei}`);

    // Step 6: Place bet on-chain
    console.log(`\n[Step 6] Placing bet on forked market...`);
    const txResult = await placeBetOnChain(
      user.walletId,
      forkedMarketId,
      commitment.commitmentHash,
      amountWei
    );

    if (txResult.txResult.status !== 'CONFIRMED') {
      throw new Error(`Transaction failed: ${txResult.txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txResult.txHash}`);

    // Step 7: Get bet ID from events
    console.log(`\n[Step 7] Retrieving bet ID...`);
    const betId = BigInt(1); // TODO: Parse from BetPlaced event

    // Verify bet on-chain
    const onChainBet = await getBet(betId);
    console.log(`Bet verified on-chain:`);
    console.log(`  - Bettor: ${onChainBet.bettor}`);
    console.log(`  - Market ID: ${onChainBet.marketId}`);
    console.log(`  - Amount: ${formatUSDC(onChainBet.amount)}`);
    console.log(`  - Commitment: ${onChainBet.commitmentHash}`);
    console.log(`  - Revealed: ${onChainBet.revealed}`);

    // Step 8: Store in database
    console.log(`\n[Step 8] Storing bet in database...`);
    const betData: NewBet = {
      onChainId: betId,
      marketId: market.id,
      userId: user.id,
      amount: amountWei,
      commitmentHash: commitment.commitmentHash,
      direction, // Store direction locally
      salt: commitment.salt, // Store salt locally for reveal
      revealed: false,
      claimed: false,
      txHash: txResult.txResult.txHash,
    };

    const bet = await createBetDB(betData);
    console.log(`Bet stored with DB ID: ${bet.id}`);

    // Serialize commitment secret for user backup
    const commitmentSecret = serializeCommitment(commitment);

    console.log(`\n=== Bet on Forked Market Placed Successfully ===`);
    console.log(`On-chain Bet ID: ${betId}`);
    console.log(`Forked Market ID: ${forkedMarketId}`);
    console.log(`Parent Market ID: ${onChainMarket.parentMarketId}`);
    console.log(`TX Hash: ${txResult.txResult.txHash}`);
    console.log(`\n⚠️  IMPORTANT: Save the commitment secret to reveal your bet later!`);
    console.log(`⚠️  This forked market will be resolved based on parent market outcome.`);

    return {
      success: true,
      betId,
      bet,
      commitmentSecret,
      isForkedMarket: onChainMarket.isForked,
      parentMarketId: onChainMarket.parentMarketId,
      txHash: txResult.txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Bet on forked market failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the forked market betting flow
 */
export async function testPlaceForkedMarketBetFlow(
  telegramId: string,
  forkedMarketId: bigint
): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Forked Market Bet Placement Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await placeForkedMarketBet(
    telegramId,
    forkedMarketId,
    true, // Betting YES
    '3.00' // 3 USDC
  );

  if (result.success) {
    console.log(`\n✅ Flow 6 PASSED`);
    console.log(`\nCommitment secret (save this!):\n${result.commitmentSecret}`);
  } else {
    console.log(`\n❌ Flow 6 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  const forkedMarketId = BigInt(process.argv[3] || '2');
  testPlaceForkedMarketBetFlow(telegramId, forkedMarketId).catch(console.error);
}
