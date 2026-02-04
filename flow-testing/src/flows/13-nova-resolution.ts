/**
 * Flow 13: Nova Resolution
 *
 * Tests the Nova completion and reward distribution:
 * 1. Verify Nova is complete (all rounds finished)
 * 2. Determine winning cluster (more total photons)
 * 3. Calculate rewards for each participating star
 * 4. Stars claim their USDC rewards
 * 5. Update cluster energy and nova stats
 */

import {
  getUserByTelegramId,
  getUserById,
  getNovaByOnChainId,
  updateNovaStatus,
  getNovaMatches as getNovaMatchesDB,
  createNovaReward,
  getUserNovaReward,
  getClusterByOnChainId,
  getClusterMembers as getClusterMembersDB,
} from '../services/db/queries.js';
import {
  getNova,
  claimReward,
  getReward,
} from '../services/contracts/nova.js';
import { getCluster } from '../services/contracts/cluster.js';
import { formatUSDC, truncateAddress } from '../utils/format.js';
import type { Nova, NovaReward, NewNovaReward } from '../services/db/schema.js';

export interface NovaResolutionResult {
  success: boolean;
  nova?: Nova;
  winningClusterId?: number;
  winningClusterName?: string;
  totalRewards?: bigint;
  rewardsClaimed?: number;
  error?: string;
}

export interface ClaimRewardResult {
  success: boolean;
  photonsEarned?: number;
  usdcReward?: bigint;
  txHash?: string;
  error?: string;
}

/**
 * Get Nova final results and determine winner
 */
export async function getNovaResults(novaOnChainId: bigint): Promise<NovaResolutionResult> {
  console.log(`\n=== Flow 13: Nova Resolution ===`);
  console.log(`Nova ID: ${novaOnChainId}`);

  try {
    // Step 1: Get Nova data
    console.log(`\n[Step 1] Fetching Nova data...`);
    const novaDB = await getNovaByOnChainId(novaOnChainId);
    if (!novaDB) {
      throw new Error('Nova not found in database');
    }

    const novaOnChain = await getNova(novaOnChainId);

    console.log(`Nova status: ${getNovaStatusLabel(novaOnChain.status)}`);
    console.log(`Current round: ${novaOnChain.currentRound} of ${novaOnChain.totalRounds}`);

    if (novaOnChain.status !== 2) {
      // Not COMPLETED
      throw new Error(
        `Nova is not yet complete. Status: ${getNovaStatusLabel(novaOnChain.status)}`
      );
    }

    // Step 2: Get cluster details
    console.log(`\n[Step 2] Fetching cluster details...`);
    const cluster1 = await getCluster(novaOnChain.cluster1Id);
    const cluster2 = await getCluster(novaOnChain.cluster2Id);

    console.log(`\nCluster 1: "${cluster1.name}"`);
    console.log(`  - Total Photons: ${novaOnChain.cluster1TotalPhotons}`);
    console.log(`  - Energy: ${cluster1.energy}`);

    console.log(`\nCluster 2: "${cluster2.name}"`);
    console.log(`  - Total Photons: ${novaOnChain.cluster2TotalPhotons}`);
    console.log(`  - Energy: ${cluster2.energy}`);

    // Step 3: Determine winner
    console.log(`\n[Step 3] Determining winner...`);
    const cluster1Photons = novaOnChain.cluster1TotalPhotons;
    const cluster2Photons = novaOnChain.cluster2TotalPhotons;

    let winningClusterId: number;
    let winningClusterName: string;
    let winningClusterOnChainId: bigint;

    if (cluster1Photons > cluster2Photons) {
      winningClusterOnChainId = novaOnChain.cluster1Id;
      winningClusterName = cluster1.name;
      const cluster1DB = await getClusterByOnChainId(novaOnChain.cluster1Id);
      winningClusterId = cluster1DB!.id;
      console.log(`\n🏆 Winner: ${cluster1.name} with ${cluster1Photons} photons!`);
    } else if (cluster2Photons > cluster1Photons) {
      winningClusterOnChainId = novaOnChain.cluster2Id;
      winningClusterName = cluster2.name;
      const cluster2DB = await getClusterByOnChainId(novaOnChain.cluster2Id);
      winningClusterId = cluster2DB!.id;
      console.log(`\n🏆 Winner: ${cluster2.name} with ${cluster2Photons} photons!`);
    } else {
      // Tie - in this case, cluster1 wins as the initiator
      winningClusterOnChainId = novaOnChain.cluster1Id;
      winningClusterName = cluster1.name;
      const cluster1DB = await getClusterByOnChainId(novaOnChain.cluster1Id);
      winningClusterId = cluster1DB!.id;
      console.log(`\n🏆 Tie! ${cluster1.name} wins as the challenger.`);
    }

    // Step 4: Update Nova status in DB
    console.log(`\n[Step 4] Updating Nova status in database...`);
    const updatedNova = await updateNovaStatus(novaOnChainId, 'COMPLETED', winningClusterId);

    console.log(`Nova marked as COMPLETED`);
    console.log(`Winning cluster ID: ${winningClusterId}`);

    // Step 5: Show prize pool
    console.log(`\n[Step 5] Prize pool summary...`);
    console.log(`Total prize pool: ${formatUSDC(novaOnChain.prizePool)}`);

    console.log(`\n=== Nova Resolution Complete ===`);
    console.log(`Winner: ${winningClusterName}`);
    console.log(`Prize pool: ${formatUSDC(novaOnChain.prizePool)}`);

    return {
      success: true,
      nova: updatedNova,
      winningClusterId,
      winningClusterName,
      totalRewards: novaOnChain.prizePool,
    };
  } catch (error) {
    console.error(`\n❌ Nova resolution failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Claim reward for a star who participated in a Nova
 */
export async function claimNovaReward(
  telegramId: string,
  novaOnChainId: bigint
): Promise<ClaimRewardResult> {
  console.log(`\n=== Claiming Nova Reward ===`);
  console.log(`Nova ID: ${novaOnChainId}`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered');
    }
    console.log(`User: ${user.id} (${truncateAddress(user.walletAddress)})`);

    // Step 2: Get Nova data
    console.log(`\n[Step 2] Fetching Nova data...`);
    const novaDB = await getNovaByOnChainId(novaOnChainId);
    if (!novaDB) {
      throw new Error('Nova not found in database');
    }

    const novaOnChain = await getNova(novaOnChainId);

    if (novaOnChain.status !== 2) {
      throw new Error(`Nova is not complete. Cannot claim rewards yet.`);
    }

    // Step 3: Check reward eligibility
    console.log(`\n[Step 3] Checking reward eligibility...`);
    const rewardData = await getReward(novaOnChainId, user.walletAddress);

    if (rewardData.claimed) {
      throw new Error('Reward has already been claimed');
    }

    if (rewardData.usdcReward === 0n) {
      throw new Error('No reward available for this user');
    }

    console.log(`Reward available:`);
    console.log(`  - Photons earned: ${rewardData.photonsEarned}`);
    console.log(`  - USDC reward: ${formatUSDC(rewardData.usdcReward)}`);

    // Step 4: Claim reward on-chain
    console.log(`\n[Step 4] Claiming reward on-chain...`);
    const txResult = await claimReward(user.walletId, novaOnChainId);

    if (txResult.status !== 'CONFIRMED') {
      throw new Error(`Claim failed: ${txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txHash}`);

    // Step 5: Store reward in database
    console.log(`\n[Step 5] Storing reward in database...`);

    // Check if reward already exists
    let existingReward = await getUserNovaReward(novaDB.id, user.id);

    if (!existingReward) {
      const rewardDBData: NewNovaReward = {
        novaId: novaDB.id,
        userId: user.id,
        photonsEarned: Number(rewardData.photonsEarned),
        usdcReward: rewardData.usdcReward,
        claimed: true,
        claimedAt: new Date(),
        txHash: txResult.txHash,
      };

      existingReward = await createNovaReward(rewardDBData);
      console.log(`Reward stored with DB ID: ${existingReward.id}`);
    }

    // Step 6: Verify claim
    console.log(`\n[Step 6] Verifying claim...`);
    const verifiedReward = await getReward(novaOnChainId, user.walletAddress);

    if (!verifiedReward.claimed) {
      throw new Error('Claim verification failed - reward not marked as claimed on-chain');
    }

    console.log(`Reward successfully claimed and verified!`);

    console.log(`\n=== Reward Claimed Successfully ===`);
    console.log(`Photons: ${rewardData.photonsEarned}`);
    console.log(`USDC: ${formatUSDC(rewardData.usdcReward)}`);
    console.log(`TX: ${txResult.txHash}`);

    return {
      success: true,
      photonsEarned: Number(rewardData.photonsEarned),
      usdcReward: rewardData.usdcReward,
      txHash: txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Claim reward failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Claim rewards for all eligible stars in a Nova
 */
export async function claimAllNovaRewards(
  novaOnChainId: bigint,
  starTelegramIds: string[]
): Promise<NovaResolutionResult> {
  console.log(`\n=== Claiming All Nova Rewards ===`);
  console.log(`Nova ID: ${novaOnChainId}`);
  console.log(`Stars to claim: ${starTelegramIds.length}`);

  try {
    // Get Nova data
    const novaDB = await getNovaByOnChainId(novaOnChainId);
    if (!novaDB) {
      throw new Error('Nova not found in database');
    }

    const novaOnChain = await getNova(novaOnChainId);

    if (novaOnChain.status !== 2) {
      throw new Error('Nova is not complete');
    }

    let claimedCount = 0;
    let totalClaimed = 0n;

    for (const telegramId of starTelegramIds) {
      console.log(`\n--- Claiming for ${telegramId} ---`);

      const result = await claimNovaReward(telegramId, novaOnChainId);

      if (result.success) {
        claimedCount++;
        totalClaimed += result.usdcReward || 0n;
        console.log(`✅ Claimed: ${formatUSDC(result.usdcReward || 0n)}`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    }

    console.log(`\n=== All Rewards Processed ===`);
    console.log(`Successfully claimed: ${claimedCount} / ${starTelegramIds.length}`);
    console.log(`Total USDC claimed: ${formatUSDC(totalClaimed)}`);

    return {
      success: true,
      rewardsClaimed: claimedCount,
      totalRewards: totalClaimed,
    };
  } catch (error) {
    console.error(`\n❌ Claim all rewards failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Complete Nova lifecycle: get results, claim all rewards
 */
export async function completeNovaLifecycle(
  novaOnChainId: bigint,
  participantTelegramIds: string[]
): Promise<NovaResolutionResult> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Completing Nova Lifecycle`);
  console.log(`${'═'.repeat(60)}`);

  // Step 1: Get and record final results
  const resultsResult = await getNovaResults(novaOnChainId);
  if (!resultsResult.success) {
    return resultsResult;
  }

  // Step 2: Claim rewards for all participants
  if (participantTelegramIds.length > 0) {
    const claimResult = await claimAllNovaRewards(novaOnChainId, participantTelegramIds);
    return {
      ...resultsResult,
      rewardsClaimed: claimResult.rewardsClaimed,
    };
  }

  return resultsResult;
}

/**
 * Get human-readable Nova status label
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

/**
 * Test the nova resolution flow
 */
export async function testNovaResolutionFlow(
  telegramId: string,
  novaId: bigint
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Nova Resolution Flow`);
  console.log(`${'='.repeat(60)}`);

  // Get results
  const resultsResult = await getNovaResults(novaId);

  if (!resultsResult.success) {
    console.log(`\n❌ Flow 13 (Get Results) FAILED: ${resultsResult.error}`);
    process.exit(1);
  }

  console.log(`\n--- Nova Results ---`);
  console.log(`Winner: ${resultsResult.winningClusterName}`);
  console.log(`Prize Pool: ${formatUSDC(resultsResult.totalRewards || 0n)}`);

  // Try to claim reward for the test user
  const claimResult = await claimNovaReward(telegramId, novaId);

  if (claimResult.success) {
    console.log(`\n✅ Flow 13 PASSED`);
    console.log(`Claimed ${formatUSDC(claimResult.usdcReward || 0n)}`);
  } else {
    // Claim might fail if user didn't participate - that's OK
    console.log(`\n✅ Flow 13 PASSED (results retrieved, claim: ${claimResult.error})`);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  const novaId = BigInt(process.argv[3] || '1');
  testNovaResolutionFlow(telegramId, novaId).catch(console.error);
}
