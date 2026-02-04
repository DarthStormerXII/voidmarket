/**
 * Flow 11: Start Nova Battle
 *
 * Tests the Nova (cluster battle) creation flow:
 * 1. Verify both clusters exist and are valid
 * 2. Configure Nova parameters (rounds, prize pool, betting duration)
 * 3. Start Nova on-chain with prize pool deposit
 * 4. Store Nova data in database
 * 5. Verify Nova created on-chain
 */

import {
  getUserByTelegramId,
  getClusterByOnChainId,
  createNova as createNovaDB,
  getNovaByOnChainId,
} from '../services/db/queries.js';
import {
  startNova as startNovaOnChain,
  getNova,
} from '../services/contracts/nova.js';
import { getCluster } from '../services/contracts/cluster.js';
import { formatUSDC, parseUSDC } from '../utils/format.js';
import type { Nova, NewNova } from '../services/db/schema.js';

export interface StartNovaResult {
  success: boolean;
  novaId?: bigint;
  nova?: Nova;
  txHash?: string;
  error?: string;
}

/**
 * Start a Nova battle between two clusters
 */
export async function startNovaBattle(
  telegramId: string,
  cluster1OnChainId: bigint,
  cluster2OnChainId: bigint,
  totalRounds: number,
  prizePoolUSDC: string, // e.g., "100.00" for 100 USDC
  bettingDurationSeconds: number = 3600, // Default 1 hour per match
  matchesPerRound: number = 3
): Promise<StartNovaResult> {
  console.log(`\n=== Flow 11: Start Nova Battle ===`);
  console.log(`Cluster 1 ID: ${cluster1OnChainId}`);
  console.log(`Cluster 2 ID: ${cluster2OnChainId}`);
  console.log(`Total Rounds: ${totalRounds}`);
  console.log(`Prize Pool: ${prizePoolUSDC} USDC`);
  console.log(`Betting Duration: ${bettingDurationSeconds}s per match`);
  console.log(`Matches Per Round: ${matchesPerRound}`);

  try {
    // Step 1: Get user (initiator)
    console.log(`\n[Step 1] Looking up initiator user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered. Complete Flow 1 first.');
    }
    console.log(`Found user ID: ${user.id} (${user.walletAddress})`);

    // Step 2: Verify Cluster 1 exists
    console.log(`\n[Step 2] Verifying Cluster 1...`);
    const cluster1DB = await getClusterByOnChainId(cluster1OnChainId);
    if (!cluster1DB) {
      throw new Error(`Cluster 1 (ID: ${cluster1OnChainId}) not found in database`);
    }

    const cluster1OnChain = await getCluster(cluster1OnChainId);
    console.log(`Cluster 1: "${cluster1OnChain.name}"`);
    console.log(`  - Leader: ${cluster1OnChain.leader}`);
    console.log(`  - Members: ${cluster1OnChain.memberCount}`);
    console.log(`  - Energy: ${cluster1OnChain.energy}`);

    // Step 3: Verify Cluster 2 exists
    console.log(`\n[Step 3] Verifying Cluster 2...`);
    const cluster2DB = await getClusterByOnChainId(cluster2OnChainId);
    if (!cluster2DB) {
      throw new Error(`Cluster 2 (ID: ${cluster2OnChainId}) not found in database`);
    }

    const cluster2OnChain = await getCluster(cluster2OnChainId);
    console.log(`Cluster 2: "${cluster2OnChain.name}"`);
    console.log(`  - Leader: ${cluster2OnChain.leader}`);
    console.log(`  - Members: ${cluster2OnChain.memberCount}`);
    console.log(`  - Energy: ${cluster2OnChain.energy}`);

    // Step 4: Validate clusters can battle
    console.log(`\n[Step 4] Validating clusters...`);
    if (cluster1OnChainId === cluster2OnChainId) {
      throw new Error('A cluster cannot battle itself');
    }

    // Both clusters need minimum members for matches
    const minMembers = BigInt(matchesPerRound);
    if (cluster1OnChain.memberCount < minMembers) {
      throw new Error(`Cluster 1 needs at least ${matchesPerRound} members for ${matchesPerRound} matches per round`);
    }
    if (cluster2OnChain.memberCount < minMembers) {
      throw new Error(`Cluster 2 needs at least ${matchesPerRound} members for ${matchesPerRound} matches per round`);
    }
    console.log(`Both clusters have sufficient members`);

    // Step 5: Parse prize pool
    console.log(`\n[Step 5] Preparing prize pool...`);
    const prizePoolWei = parseUSDC(prizePoolUSDC);
    console.log(`Prize pool in wei: ${prizePoolWei}`);

    // Step 6: Start Nova on-chain
    console.log(`\n[Step 6] Starting Nova on-chain...`);
    const txResult = await startNovaOnChain(
      user.walletId,
      cluster1OnChainId,
      cluster2OnChainId,
      BigInt(totalRounds),
      prizePoolWei
    );

    if (txResult.txResult.status !== 'CONFIRMED') {
      throw new Error(`Transaction failed: ${txResult.txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txResult.txHash}`);

    // Step 7: Get Nova ID from chain
    console.log(`\n[Step 7] Retrieving Nova ID...`);
    // TODO: Parse from NovaStarted event. For now, use a placeholder
    const novaId = BigInt(1); // Will be parsed from events in production

    // Verify Nova on-chain
    const onChainNova = await getNova(novaId);
    console.log(`Nova created on-chain:`);
    console.log(`  - ID: ${onChainNova.id}`);
    console.log(`  - Status: ${getNovaStatusLabel(onChainNova.status)}`);
    console.log(`  - Prize Pool: ${formatUSDC(onChainNova.prizePool)}`);
    console.log(`  - Total Rounds: ${onChainNova.totalRounds}`);
    console.log(`  - Current Round: ${onChainNova.currentRound}`);

    // Step 8: Store Nova in database
    console.log(`\n[Step 8] Storing Nova in database...`);
    const novaData: NewNova = {
      onChainId: novaId,
      cluster1Id: cluster1DB.id,
      cluster2Id: cluster2DB.id,
      totalRounds,
      currentRound: 0,
      status: 'PENDING',
      prizePool: prizePoolWei,
      bettingDuration: bettingDurationSeconds,
      matchesPerRound,
      startedAt: new Date(),
    };

    const nova = await createNovaDB(novaData);
    console.log(`Nova stored with DB ID: ${nova.id}`);

    console.log(`\n=== Nova Battle Started Successfully ===`);
    console.log(`On-chain Nova ID: ${novaId}`);
    console.log(`Database Nova ID: ${nova.id}`);
    console.log(`${cluster1OnChain.name} vs ${cluster2OnChain.name}`);
    console.log(`TX Hash: ${txResult.txResult.txHash}`);

    return {
      success: true,
      novaId,
      nova,
      txHash: txResult.txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Start Nova failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
 * Test the start nova flow
 */
export async function testStartNovaFlow(
  telegramId: string,
  cluster1Id: bigint,
  cluster2Id: bigint
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Start Nova Flow`);
  console.log(`${'='.repeat(60)}`);

  const result = await startNovaBattle(
    telegramId,
    cluster1Id,
    cluster2Id,
    3, // 3 rounds
    '50.00', // 50 USDC prize pool
    3600, // 1 hour betting per match
    2 // 2 matches per round
  );

  if (result.success) {
    console.log(`\n✅ Flow 11 PASSED`);
    console.log(`Nova ID: ${result.novaId}`);
  } else {
    console.log(`\n❌ Flow 11 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  const cluster1Id = BigInt(process.argv[3] || '1');
  const cluster2Id = BigInt(process.argv[4] || '2');
  testStartNovaFlow(telegramId, cluster1Id, cluster2Id).catch(console.error);
}
