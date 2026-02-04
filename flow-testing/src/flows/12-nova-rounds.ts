/**
 * Flow 12: Nova Rounds
 *
 * Tests the Nova round lifecycle:
 * 1. Create matches for current round (1v1 star battles)
 * 2. Each match creates a prediction market for betting
 * 3. Wait for betting period
 * 4. Resolve matches and update photons
 * 5. Advance to next round
 * 6. Repeat until all rounds complete
 */

import {
  getUserByTelegramId,
  getUserById,
  getNovaByOnChainId,
  getClusterMembers as getClusterMembersDB,
  createNovaMatch,
  getNovaMatches as getNovaMatchesDB,
  getMatchByOnChainId,
} from '../services/db/queries.js';
import {
  getNova,
  getMatch,
  createMatch,
  resolveMatch,
  advanceRound,
  getNovaMatches as getNovaMatchesOnChain,
} from '../services/contracts/nova.js';
import { getClusterMembers } from '../services/contracts/cluster.js';
import { truncateAddress } from '../utils/format.js';
import type { NovaMatch, NewNovaMatch, Nova } from '../services/db/schema.js';

export interface NovaRoundsResult {
  success: boolean;
  roundNumber?: number;
  matches?: NovaMatch[];
  roundCompleted?: boolean;
  novaCompleted?: boolean;
  error?: string;
}

export interface CreateMatchResult {
  success: boolean;
  matchId?: bigint;
  match?: NovaMatch;
  txHash?: string;
  error?: string;
}

export interface ResolveMatchResult {
  success: boolean;
  winnerId?: number;
  star1Photons?: number;
  star2Photons?: number;
  txHash?: string;
  error?: string;
}

/**
 * Create matches for the current Nova round
 */
export async function createRoundMatches(
  telegramId: string,
  novaOnChainId: bigint
): Promise<NovaRoundsResult> {
  console.log(`\n=== Flow 12: Create Nova Round Matches ===`);
  console.log(`Nova ID: ${novaOnChainId}`);

  try {
    // Step 1: Get user (admin/initiator)
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered. Complete Flow 1 first.');
    }
    console.log(`Found user ID: ${user.id}`);

    // Step 2: Get Nova data
    console.log(`\n[Step 2] Fetching Nova data...`);
    const novaDB = await getNovaByOnChainId(novaOnChainId);
    if (!novaDB) {
      throw new Error(`Nova not found in database`);
    }

    const novaOnChain = await getNova(novaOnChainId);
    const currentRound = Number(novaOnChain.currentRound);
    const totalRounds = Number(novaOnChain.totalRounds);

    console.log(`Nova status: ${getNovaStatusLabel(novaOnChain.status)}`);
    console.log(`Current round: ${currentRound + 1} of ${totalRounds}`);
    console.log(`Matches per round: ${novaDB.matchesPerRound}`);

    if (novaOnChain.status === 2) {
      throw new Error('Nova is already completed');
    }
    if (novaOnChain.status === 3) {
      throw new Error('Nova was cancelled');
    }

    // Step 3: Get cluster members for pairing
    console.log(`\n[Step 3] Fetching cluster members...`);
    const cluster1Members = await getClusterMembers(novaOnChain.cluster1Id);
    const cluster2Members = await getClusterMembers(novaOnChain.cluster2Id);

    console.log(`Cluster 1 members: ${cluster1Members.length}`);
    console.log(`Cluster 2 members: ${cluster2Members.length}`);

    // Get DB cluster members for user IDs
    const cluster1MembersDB = await getClusterMembersDB(novaDB.cluster1Id);
    const cluster2MembersDB = await getClusterMembersDB(novaDB.cluster2Id);

    // Step 4: Create matches for this round
    console.log(`\n[Step 4] Creating ${novaDB.matchesPerRound} matches...`);
    const matches: NovaMatch[] = [];
    const matchesPerRound = novaDB.matchesPerRound;

    for (let i = 0; i < matchesPerRound; i++) {
      // Select stars for this match (rotating through members)
      const star1Index = (currentRound * matchesPerRound + i) % cluster1Members.length;
      const star2Index = (currentRound * matchesPerRound + i) % cluster2Members.length;

      const star1Address = cluster1Members[star1Index];
      const star2Address = cluster2Members[star2Index];

      console.log(`\nMatch ${i + 1}:`);
      console.log(`  Star 1: ${truncateAddress(star1Address)}`);
      console.log(`  Star 2: ${truncateAddress(star2Address)}`);

      // Create match on-chain
      const txResult = await createMatch(
        user.walletId,
        novaOnChainId,
        star1Address,
        star2Address
      );

      if (txResult.txResult.status !== 'CONFIRMED') {
        throw new Error(`Match creation failed: ${txResult.txResult.errorReason || 'Unknown error'}`);
      }

      console.log(`  TX: ${txResult.txResult.txHash}`);

      // Get match ID (TODO: parse from events)
      const matchId = BigInt(currentRound * matchesPerRound + i + 1);

      // Find user IDs for stars
      const star1Member = cluster1MembersDB.find(
        (m) => m.userId === findUserIdByAddress(cluster1MembersDB, star1Address)
      );
      const star2Member = cluster2MembersDB.find(
        (m) => m.userId === findUserIdByAddress(cluster2MembersDB, star2Address)
      );

      // Store match in database
      const matchData: NewNovaMatch = {
        onChainId: matchId,
        novaId: novaDB.id,
        round: currentRound + 1,
        star1Id: star1Member?.userId || 1, // Default fallback
        star2Id: star2Member?.userId || 2, // Default fallback
        status: 'BETTING',
        bettingDeadline: new Date(Date.now() + novaDB.bettingDuration * 1000),
      };

      const match = await createNovaMatch(matchData);
      matches.push(match);
      console.log(`  Match stored with DB ID: ${match.id}`);
    }

    console.log(`\n=== Round ${currentRound + 1} Matches Created ===`);
    console.log(`Created ${matches.length} matches`);
    console.log(`Betting deadline: ${matches[0]?.bettingDeadline?.toISOString()}`);

    return {
      success: true,
      roundNumber: currentRound + 1,
      matches,
      roundCompleted: false,
      novaCompleted: false,
    };
  } catch (error) {
    console.error(`\n❌ Create round matches failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Resolve a single match
 */
export async function resolveNovaMatch(
  telegramId: string,
  matchOnChainId: bigint,
  star1Wins: boolean // true = star1 wins, false = star2 wins
): Promise<ResolveMatchResult> {
  console.log(`\n=== Resolving Match ${matchOnChainId} ===`);

  try {
    // Step 1: Get admin user
    console.log(`\n[Step 1] Looking up admin user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered');
    }

    // Step 2: Get match data
    console.log(`\n[Step 2] Fetching match data...`);
    const matchOnChain = await getMatch(matchOnChainId);
    const matchDB = await getMatchByOnChainId(matchOnChainId);

    if (!matchDB) {
      throw new Error('Match not found in database');
    }

    console.log(`Match: Star1 vs Star2`);
    console.log(`  Star 1: ${truncateAddress(matchOnChain.star1)}`);
    console.log(`  Star 2: ${truncateAddress(matchOnChain.star2)}`);
    console.log(`  Winner: ${star1Wins ? 'Star 1' : 'Star 2'}`);

    // Step 3: Resolve match on-chain
    console.log(`\n[Step 3] Resolving match on-chain...`);
    const txResult = await resolveMatch(user.walletId, matchOnChainId, star1Wins);

    if (txResult.status !== 'CONFIRMED') {
      throw new Error(`Match resolution failed: ${txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txHash}`);

    // Step 4: Verify resolution on-chain
    console.log(`\n[Step 4] Verifying resolution...`);
    const resolvedMatch = await getMatch(matchOnChainId);
    console.log(`Match resolved:`);
    console.log(`  - Status: ${getMatchStatusLabel(resolvedMatch.status)}`);
    console.log(`  - Winner: ${truncateAddress(resolvedMatch.winner)}`);
    console.log(`  - Star 1 Photons: ${resolvedMatch.star1Photons}`);
    console.log(`  - Star 2 Photons: ${resolvedMatch.star2Photons}`);

    const winnerId = star1Wins ? matchDB.star1Id : matchDB.star2Id;

    console.log(`\n=== Match Resolved ===`);

    return {
      success: true,
      winnerId,
      star1Photons: Number(resolvedMatch.star1Photons),
      star2Photons: Number(resolvedMatch.star2Photons),
      txHash: txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Match resolution failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Resolve all matches in current round and advance to next
 */
export async function completeRoundAndAdvance(
  telegramId: string,
  novaOnChainId: bigint,
  matchOutcomes: boolean[] // Array of outcomes (true = star1 wins for each match)
): Promise<NovaRoundsResult> {
  console.log(`\n=== Completing Nova Round ===`);
  console.log(`Nova ID: ${novaOnChainId}`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered');
    }

    // Step 2: Get Nova data
    console.log(`\n[Step 2] Fetching Nova data...`);
    const novaDB = await getNovaByOnChainId(novaOnChainId);
    if (!novaDB) {
      throw new Error('Nova not found in database');
    }

    const novaOnChain = await getNova(novaOnChainId);
    const currentRound = Number(novaOnChain.currentRound);

    console.log(`Current round: ${currentRound + 1} of ${novaOnChain.totalRounds}`);

    // Step 3: Get current round matches
    console.log(`\n[Step 3] Fetching current round matches...`);
    const matchIds = await getNovaMatchesOnChain(novaOnChainId);
    const currentRoundMatchIds = matchIds.slice(
      currentRound * novaDB.matchesPerRound,
      (currentRound + 1) * novaDB.matchesPerRound
    );

    console.log(`Found ${currentRoundMatchIds.length} matches for this round`);

    if (matchOutcomes.length !== currentRoundMatchIds.length) {
      throw new Error(`Expected ${currentRoundMatchIds.length} outcomes, got ${matchOutcomes.length}`);
    }

    // Step 4: Resolve each match
    console.log(`\n[Step 4] Resolving matches...`);
    for (let i = 0; i < currentRoundMatchIds.length; i++) {
      const matchId = currentRoundMatchIds[i];
      const outcome = matchOutcomes[i];

      console.log(`\nResolving match ${i + 1} (ID: ${matchId})...`);
      console.log(`Outcome: ${outcome ? 'Star 1 wins' : 'Star 2 wins'}`);

      const result = await resolveNovaMatch(telegramId, matchId, outcome);
      if (!result.success) {
        throw new Error(`Failed to resolve match ${matchId}: ${result.error}`);
      }
    }

    // Step 5: Advance to next round
    console.log(`\n[Step 5] Advancing to next round...`);
    const advanceResult = await advanceRound(user.walletId, novaOnChainId);

    if (advanceResult.status !== 'CONFIRMED') {
      throw new Error(`Advance round failed: ${advanceResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${advanceResult.txHash}`);

    // Step 6: Check if Nova is complete
    console.log(`\n[Step 6] Checking Nova status...`);
    const updatedNova = await getNova(novaOnChainId);
    const novaCompleted = updatedNova.status === 2; // COMPLETED
    const newRound = Number(updatedNova.currentRound);

    console.log(`Nova status: ${getNovaStatusLabel(updatedNova.status)}`);
    console.log(`New round: ${newRound + 1} of ${updatedNova.totalRounds}`);
    console.log(`Cluster 1 total photons: ${updatedNova.cluster1TotalPhotons}`);
    console.log(`Cluster 2 total photons: ${updatedNova.cluster2TotalPhotons}`);

    if (novaCompleted) {
      console.log(`\n🏆 Nova battle complete!`);
      console.log(`Winning cluster: ${updatedNova.winningClusterId}`);
    }

    console.log(`\n=== Round ${currentRound + 1} Completed ===`);

    const matchesDB = await getNovaMatchesDB(novaDB.id);

    return {
      success: true,
      roundNumber: currentRound + 1,
      matches: matchesDB.filter((m) => m.round === currentRound + 1),
      roundCompleted: true,
      novaCompleted,
    };
  } catch (error) {
    console.error(`\n❌ Complete round failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run a complete Nova round: create matches, (simulate betting), resolve, advance
 */
export async function runNovaRound(
  telegramId: string,
  novaOnChainId: bigint,
  matchOutcomes?: boolean[] // If not provided, randomly determines outcomes
): Promise<NovaRoundsResult> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Running Complete Nova Round`);
  console.log(`${'═'.repeat(60)}`);

  // Create matches for this round
  const createResult = await createRoundMatches(telegramId, novaOnChainId);
  if (!createResult.success) {
    return createResult;
  }

  console.log(`\n--- Simulating betting period ---`);
  console.log(`(In production, users would bet on matches here)`);

  // Generate random outcomes if not provided
  const outcomes = matchOutcomes || createResult.matches!.map(() => Math.random() > 0.5);

  // Complete the round
  return completeRoundAndAdvance(telegramId, novaOnChainId, outcomes);
}

/**
 * Helper functions
 */
function getNovaStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    0: 'PENDING',
    1: 'ACTIVE',
    2: 'COMPLETED',
    3: 'CANCELLED',
  };
  return labels[status] || 'UNKNOWN';
}

function getMatchStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    0: 'PENDING',
    1: 'BETTING',
    2: 'RESOLVED',
  };
  return labels[status] || 'UNKNOWN';
}

function findUserIdByAddress(
  members: Array<{ userId: number }>,
  _address: string
): number | undefined {
  // In production, would match by wallet address
  // For now, return first member's userId
  return members[0]?.userId;
}

/**
 * Test the nova rounds flow
 */
export async function testNovaRoundsFlow(telegramId: string, novaId: bigint): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Nova Rounds Flow`);
  console.log(`${'='.repeat(60)}`);

  // Run a single round
  const result = await runNovaRound(telegramId, novaId);

  if (result.success) {
    console.log(`\n✅ Flow 12 PASSED`);
    console.log(`Round ${result.roundNumber} completed`);
    if (result.novaCompleted) {
      console.log(`Nova battle has concluded!`);
    }
  } else {
    console.log(`\n❌ Flow 12 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  const novaId = BigInt(process.argv[3] || '1');
  testNovaRoundsFlow(telegramId, novaId).catch(console.error);
}
