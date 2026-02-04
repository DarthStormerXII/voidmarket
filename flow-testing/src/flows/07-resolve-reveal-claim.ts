/**
 * Flow 7: Resolve Market + Reveal Bets + Claim Winnings
 *
 * Tests the complete market lifecycle after betting closes:
 * 1. Admin resolves market with outcome (YES or NO)
 * 2. Users reveal their bets (must provide direction + salt)
 * 3. Winners claim their share of the losing pool
 *
 * This flow demonstrates the full commit-reveal scheme in action:
 * - Commitment hash ensures bets are hidden during betting period
 * - Reveal proves the original bet without manipulation
 * - Winnings are calculated proportionally from the losing pool
 */

import {
  getUserByTelegramId,
  getMarketByOnChainId,
  getBetByOnChainId,
  getUserBetsForMarket,
  updateMarketStatus,
  updateBetRevealed,
  updateBetClaimed,
} from '../services/db/queries.js';
import {
  resolveMarket as resolveMarketOnChain,
  revealBet as revealBetOnChain,
  claimWinnings as claimWinningsOnChain,
  getMarket,
  getBet,
} from '../services/contracts/market.js';
import { verifyCommitment } from '../utils/commitment.js';
import { formatUSDC } from '../utils/format.js';
import type { Hex } from 'viem';
import type { Bet, Market } from '../services/db/schema.js';

// ============================================================================
// Result Types
// ============================================================================

export interface ResolveMarketResult {
  success: boolean;
  marketId?: bigint;
  outcome?: boolean;
  txHash?: string;
  error?: string;
}

export interface RevealBetResult {
  success: boolean;
  betId?: bigint;
  direction?: boolean;
  isWinner?: boolean;
  txHash?: string;
  error?: string;
}

export interface ClaimWinningsResult {
  success: boolean;
  betId?: bigint;
  winnings?: bigint;
  txHash?: string;
  error?: string;
}

export interface FullLifecycleResult {
  success: boolean;
  marketId?: bigint;
  outcome?: boolean;
  betsRevealed?: number;
  totalClaimed?: bigint;
  results?: {
    resolve?: ResolveMarketResult;
    reveals?: RevealBetResult[];
    claims?: ClaimWinningsResult[];
  };
  error?: string;
}

// ============================================================================
// Resolve Market (Admin Only)
// ============================================================================

/**
 * Resolve a market with the final outcome
 *
 * Only admin/oracle can call this function.
 * For forked markets, resolution is inherited from parent.
 */
export async function resolveMarket(
  adminTelegramId: string,
  marketId: bigint,
  outcome: boolean // true = YES wins, false = NO wins
): Promise<ResolveMarketResult> {
  console.log(`\n=== Resolving Market ===`);
  console.log(`Market ID: ${marketId}`);
  console.log(`Outcome: ${outcome ? 'YES' : 'NO'}`);

  try {
    // Step 1: Get admin user
    console.log(`\n[Step 1] Looking up admin user...`);
    const admin = await getUserByTelegramId(adminTelegramId);

    if (!admin) {
      throw new Error('Admin user not registered');
    }
    console.log(`Admin ID: ${admin.id}`);

    // Step 2: Verify market exists and can be resolved
    console.log(`\n[Step 2] Verifying market state...`);
    const market = await getMarketByOnChainId(marketId);

    if (!market) {
      throw new Error('Market not found');
    }

    // Check market can be resolved
    const onChainMarket = await getMarket(marketId);
    console.log(`Current on-chain status: ${onChainMarket.status}`);
    console.log(`Total Pool: ${formatUSDC(onChainMarket.totalPool)}`);
    console.log(`YES Pool: ${formatUSDC(onChainMarket.totalYesAmount)}`);
    console.log(`NO Pool: ${formatUSDC(onChainMarket.totalNoAmount)}`);

    // Status 0 = Open, 1 = BettingClosed, 2 = Resolved
    if (onChainMarket.status === 2) {
      throw new Error('Market already resolved');
    }

    // Step 3: Resolve market on-chain
    console.log(`\n[Step 3] Resolving market on-chain...`);
    const txResult = await resolveMarketOnChain(admin.walletId, marketId, outcome);

    if (txResult.status !== 'CONFIRMED') {
      throw new Error(`Resolution failed: ${txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txHash}`);

    // Step 4: Verify resolution on-chain
    console.log(`\n[Step 4] Verifying resolution...`);
    const resolvedMarket = await getMarket(marketId);
    console.log(`New status: ${resolvedMarket.status}`);
    console.log(`Recorded outcome: ${resolvedMarket.outcome ? 'YES' : 'NO'}`);

    // Step 5: Update database
    console.log(`\n[Step 5] Updating database...`);
    await updateMarketStatus(marketId, 'RESOLVED', outcome);
    console.log(`Database updated`);

    console.log(`\n=== Market Resolution Complete ===`);
    return {
      success: true,
      marketId,
      outcome,
      txHash: txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Market resolution failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Reveal Bet
// ============================================================================

/**
 * Reveal a bet after market is resolved
 *
 * User must provide the original direction and salt that
 * generates the commitment hash they submitted during betting.
 */
export async function revealBet(
  telegramId: string,
  betId: bigint,
  direction: boolean,
  salt: Hex
): Promise<RevealBetResult> {
  console.log(`\n=== Revealing Bet ===`);
  console.log(`Bet ID: ${betId}`);
  console.log(`Direction: ${direction ? 'YES' : 'NO'}`);
  console.log(`Salt: ${salt.slice(0, 10)}...`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered');
    }
    console.log(`User ID: ${user.id}`);

    // Step 2: Get bet data from DB
    console.log(`\n[Step 2] Fetching bet data...`);
    const bet = await getBetByOnChainId(betId);

    if (!bet) {
      throw new Error('Bet not found in database');
    }

    if (bet.userId !== user.id) {
      throw new Error('This bet does not belong to you');
    }

    if (bet.revealed) {
      throw new Error('Bet already revealed');
    }

    // Step 3: Verify commitment locally before submitting
    console.log(`\n[Step 3] Verifying commitment hash locally...`);
    const isValid = verifyCommitment(bet.commitmentHash as Hex, direction, salt);

    if (!isValid) {
      throw new Error('Invalid reveal: commitment hash does not match direction + salt');
    }
    console.log(`Commitment verified locally ✓`);

    // Step 4: Get on-chain bet data
    console.log(`\n[Step 4] Fetching on-chain bet data...`);
    const onChainBet = await getBet(betId);
    console.log(`On-chain commitment: ${onChainBet.commitmentHash}`);
    console.log(`Amount: ${formatUSDC(onChainBet.amount)}`);

    // Step 5: Get market outcome to check if winner
    const market = await getMarketByOnChainId(onChainBet.marketId);
    if (!market) {
      throw new Error('Associated market not found');
    }

    const onChainMarket = await getMarket(onChainBet.marketId);
    if (onChainMarket.status !== 2) {
      throw new Error('Market not yet resolved. Wait for resolution before revealing.');
    }

    const isWinner = direction === onChainMarket.outcome;
    console.log(`Market outcome: ${onChainMarket.outcome ? 'YES' : 'NO'}`);
    console.log(`Your bet: ${direction ? 'YES' : 'NO'}`);
    console.log(`Result: ${isWinner ? 'WINNER! 🎉' : 'Lost 😢'}`);

    // Step 6: Reveal on-chain
    console.log(`\n[Step 6] Revealing bet on-chain...`);
    const txResult = await revealBetOnChain(user.walletId, betId, direction, salt);

    if (txResult.status !== 'CONFIRMED') {
      throw new Error(`Reveal failed: ${txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txHash}`);

    // Step 7: Update database
    console.log(`\n[Step 7] Updating database...`);
    await updateBetRevealed(betId, direction, salt);
    console.log(`Database updated`);

    console.log(`\n=== Bet Reveal Complete ===`);
    return {
      success: true,
      betId,
      direction,
      isWinner,
      txHash: txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Bet reveal failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Claim Winnings
// ============================================================================

/**
 * Claim winnings after revealing a winning bet
 *
 * Winnings are calculated as:
 * winnings = (betAmount / totalWinningPool) * totalLosingPool
 */
export async function claimWinnings(
  telegramId: string,
  betId: bigint
): Promise<ClaimWinningsResult> {
  console.log(`\n=== Claiming Winnings ===`);
  console.log(`Bet ID: ${betId}`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered');
    }
    console.log(`User ID: ${user.id}`);

    // Step 2: Get bet data
    console.log(`\n[Step 2] Fetching bet data...`);
    const bet = await getBetByOnChainId(betId);

    if (!bet) {
      throw new Error('Bet not found');
    }

    if (bet.userId !== user.id) {
      throw new Error('This bet does not belong to you');
    }

    if (!bet.revealed) {
      throw new Error('Must reveal bet before claiming. Call revealBet first.');
    }

    if (bet.claimed) {
      throw new Error('Winnings already claimed');
    }

    // Step 3: Verify on-chain state
    console.log(`\n[Step 3] Verifying on-chain state...`);
    const onChainBet = await getBet(betId);

    if (!onChainBet.revealed) {
      throw new Error('On-chain bet not revealed');
    }

    if (onChainBet.claimed) {
      throw new Error('On-chain already claimed');
    }

    // Check if winner
    const market = await getMarketByOnChainId(onChainBet.marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    const onChainMarket = await getMarket(onChainBet.marketId);
    const isWinner = bet.direction === onChainMarket.outcome;

    if (!isWinner) {
      throw new Error('Cannot claim: your bet did not win');
    }

    // Calculate expected winnings
    const betAmount = onChainBet.amount;
    const winningPool = onChainMarket.outcome
      ? onChainMarket.totalYesAmount
      : onChainMarket.totalNoAmount;
    const losingPool = onChainMarket.outcome
      ? onChainMarket.totalNoAmount
      : onChainMarket.totalYesAmount;

    // winnings = original bet + (betAmount / winningPool) * losingPool
    const proportionalWinnings = losingPool > 0n && winningPool > 0n
      ? (betAmount * losingPool) / winningPool
      : 0n;
    const totalWinnings = betAmount + proportionalWinnings;

    console.log(`Bet amount: ${formatUSDC(betAmount)}`);
    console.log(`Winning pool total: ${formatUSDC(winningPool)}`);
    console.log(`Losing pool total: ${formatUSDC(losingPool)}`);
    console.log(`Expected winnings: ${formatUSDC(totalWinnings)}`);

    // Step 4: Claim on-chain
    console.log(`\n[Step 4] Claiming winnings on-chain...`);
    const txResult = await claimWinningsOnChain(user.walletId, betId);

    if (txResult.status !== 'CONFIRMED') {
      throw new Error(`Claim failed: ${txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txHash}`);

    // Step 5: Update database
    console.log(`\n[Step 5] Updating database...`);
    await updateBetClaimed(betId, totalWinnings);
    console.log(`Database updated`);

    console.log(`\n=== Winnings Claimed Successfully ===`);
    console.log(`Bet ID: ${betId}`);
    console.log(`Winnings: ${formatUSDC(totalWinnings)}`);

    return {
      success: true,
      betId,
      winnings: totalWinnings,
      txHash: txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Claim failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Full Lifecycle Flow
// ============================================================================

/**
 * Execute the full market lifecycle: Resolve → Reveal → Claim
 *
 * This demonstrates the complete flow from betting close to payout.
 */
export async function executeFullLifecycle(
  adminTelegramId: string,
  userTelegramId: string,
  marketId: bigint,
  outcome: boolean,
  betIds: bigint[] // Bets to reveal and claim
): Promise<FullLifecycleResult> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`=== Full Market Lifecycle: Resolve → Reveal → Claim ===`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`Market ID: ${marketId}`);
  console.log(`Outcome: ${outcome ? 'YES' : 'NO'}`);
  console.log(`Bets to process: ${betIds.length}`);

  const results: FullLifecycleResult['results'] = {
    reveals: [],
    claims: [],
  };

  try {
    // Phase 1: Resolve Market
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`PHASE 1: RESOLVE MARKET`);
    console.log(`${'─'.repeat(40)}`);

    const resolveResult = await resolveMarket(adminTelegramId, marketId, outcome);
    results.resolve = resolveResult;

    if (!resolveResult.success) {
      throw new Error(`Resolution failed: ${resolveResult.error}`);
    }
    console.log(`✓ Market resolved with outcome: ${outcome ? 'YES' : 'NO'}`);

    // Phase 2: Reveal Bets
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`PHASE 2: REVEAL BETS`);
    console.log(`${'─'.repeat(40)}`);

    const user = await getUserByTelegramId(userTelegramId);
    if (!user) {
      throw new Error('User not found');
    }

    for (const betId of betIds) {
      console.log(`\nProcessing bet ${betId}...`);

      // Get stored bet data with direction and salt
      const bet = await getBetByOnChainId(betId);
      if (!bet) {
        console.log(`  Skipped: Bet not found`);
        results.reveals!.push({
          success: false,
          betId,
          error: 'Bet not found',
        });
        continue;
      }

      if (!bet.direction || !bet.salt) {
        console.log(`  Skipped: Missing direction or salt`);
        results.reveals!.push({
          success: false,
          betId,
          error: 'Missing direction or salt in database',
        });
        continue;
      }

      const revealResult = await revealBet(
        userTelegramId,
        betId,
        bet.direction,
        bet.salt as Hex
      );
      results.reveals!.push(revealResult);

      if (revealResult.success) {
        console.log(`  ✓ Bet revealed - ${revealResult.isWinner ? 'WINNER' : 'LOST'}`);
      } else {
        console.log(`  ✗ Reveal failed: ${revealResult.error}`);
      }
    }

    // Phase 3: Claim Winnings
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`PHASE 3: CLAIM WINNINGS`);
    console.log(`${'─'.repeat(40)}`);

    let totalClaimed = 0n;
    const winningReveals = results.reveals!.filter((r) => r.success && r.isWinner);

    if (winningReveals.length === 0) {
      console.log(`No winning bets to claim`);
    } else {
      for (const reveal of winningReveals) {
        console.log(`\nClaiming bet ${reveal.betId}...`);

        const claimResult = await claimWinnings(userTelegramId, reveal.betId!);
        results.claims!.push(claimResult);

        if (claimResult.success) {
          console.log(`  ✓ Claimed ${formatUSDC(claimResult.winnings!)}`);
          totalClaimed += claimResult.winnings!;
        } else {
          console.log(`  ✗ Claim failed: ${claimResult.error}`);
        }
      }
    }

    // Summary
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`=== LIFECYCLE COMPLETE ===`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`Market: ${marketId} → ${outcome ? 'YES' : 'NO'}`);
    console.log(`Bets revealed: ${results.reveals!.filter((r) => r.success).length}/${betIds.length}`);
    console.log(`Winning bets: ${winningReveals.length}`);
    console.log(`Total claimed: ${formatUSDC(totalClaimed)}`);

    return {
      success: true,
      marketId,
      outcome,
      betsRevealed: results.reveals!.filter((r) => r.success).length,
      totalClaimed,
      results,
    };
  } catch (error) {
    console.error(`\n❌ Lifecycle failed:`, error);
    return {
      success: false,
      results,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the full lifecycle flow
 */
export async function testFullLifecycleFlow(
  adminTelegramId: string,
  userTelegramId: string,
  marketId: bigint
): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Full Market Lifecycle Flow`);
  console.log(`${'='.repeat(50)}`);

  // Get all user bets for this market
  const user = await getUserByTelegramId(userTelegramId);
  if (!user) {
    console.log(`❌ User not found`);
    process.exit(1);
  }

  const market = await getMarketByOnChainId(marketId);
  if (!market) {
    console.log(`❌ Market not found`);
    process.exit(1);
  }

  const bets = await getUserBetsForMarket(user.id, market.id);
  const betIds = bets.map((b) => b.onChainId);

  console.log(`Found ${betIds.length} bets to process`);

  const result = await executeFullLifecycle(
    adminTelegramId,
    userTelegramId,
    marketId,
    true, // Resolve as YES
    betIds
  );

  if (result.success) {
    console.log(`\n✅ Flow 7 PASSED`);
    console.log(`Total claimed: ${formatUSDC(result.totalClaimed || 0n)}`);
  } else {
    console.log(`\n❌ Flow 7 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const adminTelegramId = process.argv[2] || `admin_${Date.now()}`;
  const userTelegramId = process.argv[3] || `test_${Date.now()}`;
  const marketId = BigInt(process.argv[4] || '1');
  testFullLifecycleFlow(adminTelegramId, userTelegramId, marketId).catch(console.error);
}
