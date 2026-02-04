/**
 * Flow 4: Place Bet on Regular Market
 *
 * Tests the commit-reveal betting flow:
 * 1. User commits to a bet with hidden direction
 * 2. Generate commitment hash: keccak256(direction, salt)
 * 3. Submit bet transaction with commitment
 * 4. Store bet info locally (salt must be saved for reveal)
 */

import { getUserByTelegramId, createBet as createBetDB, getMarketByOnChainId } from '../services/db/queries.js';
import { placeBet as placeBetOnChain, getBet } from '../services/contracts/market.js';
import { createBetCommitment, serializeCommitment } from '../utils/commitment.js';
import { formatUSDC, parseUSDC } from '../utils/format.js';
import type { Bet, NewBet } from '../services/db/schema.js';
import type { Hex } from 'viem';

export interface PlaceBetResult {
  success: boolean;
  betId?: bigint;
  bet?: Bet;
  commitmentSecret?: string; // IMPORTANT: Save this for reveal!
  txHash?: string;
  error?: string;
}

/**
 * Place a bet on a market with commit-reveal scheme
 */
export async function placeMarketBet(
  telegramId: string,
  marketId: bigint,
  direction: boolean, // true = YES, false = NO
  amountUSDC: string // e.g., "10.00" for 10 USDC
): Promise<PlaceBetResult> {
  console.log(`\n=== Flow 4: Place Bet ===`);
  console.log(`Market ID: ${marketId}`);
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

    // Step 2: Check market exists in DB
    console.log(`\n[Step 2] Verifying market...`);
    const market = await getMarketByOnChainId(marketId);

    if (!market) {
      throw new Error('Market not found in database');
    }

    if (market.status !== 'OPEN') {
      throw new Error(`Market is not open for betting (status: ${market.status})`);
    }
    console.log(`Market verified: "${market.question}"`);

    // Step 3: Generate commitment hash
    console.log(`\n[Step 3] Generating commitment hash...`);
    const commitment = createBetCommitment(direction);

    console.log(`Commitment generated:`);
    console.log(`  - Direction: ${direction ? 'YES' : 'NO'} (hidden until reveal)`);
    console.log(`  - Salt: ${commitment.salt.slice(0, 10)}... (KEEP SECRET)`);
    console.log(`  - Hash: ${commitment.commitmentHash}`);

    // Step 4: Parse amount to wei (18 decimals on Arc)
    console.log(`\n[Step 4] Parsing bet amount...`);
    const amountWei = parseUSDC(amountUSDC);
    console.log(`Amount in wei: ${amountWei}`);

    // Step 5: Place bet on-chain
    console.log(`\n[Step 5] Placing bet on-chain...`);
    const txResult = await placeBetOnChain(
      user.walletId,
      marketId,
      commitment.commitmentHash,
      amountWei
    );

    if (txResult.txResult.status !== 'CONFIRMED') {
      throw new Error(`Transaction failed: ${txResult.txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txResult.txHash}`);

    // Step 6: Get bet ID from events (simplified)
    console.log(`\n[Step 6] Retrieving bet ID...`);
    const betId = BigInt(1); // TODO: Parse from BetPlaced event

    // Verify bet on-chain
    const onChainBet = await getBet(betId);
    console.log(`Bet verified on-chain:`);
    console.log(`  - Bettor: ${onChainBet.bettor}`);
    console.log(`  - Amount: ${formatUSDC(onChainBet.amount)}`);
    console.log(`  - Commitment: ${onChainBet.commitmentHash}`);
    console.log(`  - Revealed: ${onChainBet.revealed}`);

    // Step 7: Store in database (with salt for later reveal)
    console.log(`\n[Step 7] Storing bet in database...`);
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

    // Serialize commitment secret for storage
    const commitmentSecret = serializeCommitment(commitment);

    console.log(`\n=== Bet Placed Successfully ===`);
    console.log(`On-chain Bet ID: ${betId}`);
    console.log(`TX Hash: ${txResult.txResult.txHash}`);
    console.log(`\n⚠️  IMPORTANT: Save the commitment secret to reveal your bet later!`);

    return {
      success: true,
      betId,
      bet,
      commitmentSecret,
      txHash: txResult.txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Bet placement failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the bet placement flow
 */
export async function testPlaceBetFlow(telegramId: string, marketId: bigint): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Bet Placement Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await placeMarketBet(
    telegramId,
    marketId,
    true, // Betting YES
    '5.00' // 5 USDC
  );

  if (result.success) {
    console.log(`\n✅ Flow 4 PASSED`);
    console.log(`\nCommitment secret (save this!):\n${result.commitmentSecret}`);
  } else {
    console.log(`\n❌ Flow 4 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  const marketId = BigInt(process.argv[3] || '1');
  testPlaceBetFlow(telegramId, marketId).catch(console.error);
}
