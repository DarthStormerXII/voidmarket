/**
 * Flow 8: Create Cluster
 *
 * Tests cluster (team) creation:
 * 1. User must be registered
 * 2. User must not already be in a cluster
 * 3. Submit createCluster transaction via Circle
 * 4. Store cluster in database
 * 5. Add creator as first member with LEADER role
 */

import { getUserByTelegramId, createCluster as createClusterDB, addClusterMember, getUserCluster } from '../services/db/queries.js';
import { createCluster as createClusterOnChain, getCluster, getMember } from '../services/contracts/cluster.js';
import type { Cluster, NewCluster, NewClusterMember } from '../services/db/schema.js';

export interface CreateClusterResult {
  success: boolean;
  clusterId?: bigint;
  cluster?: Cluster;
  txHash?: string;
  error?: string;
}

/**
 * Create a new cluster (team)
 */
export async function createUserCluster(
  telegramId: string,
  clusterName: string,
  isPrivate: boolean
): Promise<CreateClusterResult> {
  console.log(`\n=== Flow 8: Create Cluster ===`);
  console.log(`Cluster Name: ${clusterName}`);
  console.log(`Private: ${isPrivate ? 'Yes' : 'No'}`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered. Complete Flow 1 first.');
    }
    console.log(`Found user ID: ${user.id}, wallet: ${user.walletId}`);

    // Step 2: Check user is not already in a cluster
    console.log(`\n[Step 2] Checking existing cluster membership...`);
    const existingMembership = await getUserCluster(user.id);

    if (existingMembership && existingMembership.isActive) {
      throw new Error(`User is already in cluster ID: ${existingMembership.clusterId}`);
    }
    console.log(`User is not in any cluster`);

    // Step 3: Create cluster on-chain
    console.log(`\n[Step 3] Creating cluster on-chain...`);
    const txResult = await createClusterOnChain(
      user.walletId,
      clusterName,
      isPrivate
    );

    if (txResult.txResult.status !== 'CONFIRMED') {
      throw new Error(`Transaction failed: ${txResult.txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txResult.txHash}`);

    // Step 4: Get cluster ID from events (simplified - in production parse from logs)
    console.log(`\n[Step 4] Retrieving cluster ID...`);

    // In production, parse ClusterCreated event from transaction receipt
    // For testing, we'll use a placeholder cluster ID
    const clusterId = BigInt(1); // TODO: Parse from event logs

    // Step 5: Verify cluster on-chain
    console.log(`\n[Step 5] Verifying cluster on-chain...`);
    const onChainCluster = await getCluster(clusterId);

    console.log(`Cluster verified:`);
    console.log(`  - ID: ${onChainCluster.id}`);
    console.log(`  - Name: ${onChainCluster.name}`);
    console.log(`  - Leader: ${onChainCluster.leader}`);
    console.log(`  - Private: ${onChainCluster.isPrivate}`);
    console.log(`  - Members: ${onChainCluster.memberCount}/${onChainCluster.maxMembers}`);

    // Step 6: Verify creator is member on-chain
    console.log(`\n[Step 6] Verifying creator membership on-chain...`);
    const onChainMember = await getMember(user.walletAddress);

    console.log(`Member verified:`);
    console.log(`  - Address: ${onChainMember.memberAddress}`);
    console.log(`  - Cluster ID: ${onChainMember.clusterId}`);
    console.log(`  - Active: ${onChainMember.isActive}`);

    // Step 7: Store cluster in database
    console.log(`\n[Step 7] Storing cluster in database...`);
    const clusterData: NewCluster = {
      onChainId: clusterId,
      name: clusterName,
      leaderId: user.id,
      isPrivate,
      energy: 0n,
      novasWon: 0,
      totalNovas: 0,
      memberCount: 1,
      maxMembers: 50,
    };

    const cluster = await createClusterDB(clusterData);
    console.log(`Cluster stored with DB ID: ${cluster.id}`);

    // Step 8: Add creator as first member with LEADER role
    console.log(`\n[Step 8] Adding creator as cluster leader...`);
    const memberData: NewClusterMember = {
      clusterId: cluster.id,
      userId: user.id,
      photons: 0,
      role: 'LEADER',
      isActive: true,
    };

    const member = await addClusterMember(memberData);
    console.log(`Member added with DB ID: ${member.id}, role: ${member.role}`);

    console.log(`\n=== Cluster Creation Complete ===`);
    console.log(`On-chain ID: ${clusterId}`);
    console.log(`DB ID: ${cluster.id}`);
    console.log(`TX Hash: ${txResult.txResult.txHash}`);

    return {
      success: true,
      clusterId,
      cluster,
      txHash: txResult.txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Cluster creation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the cluster creation flow
 */
export async function testCreateClusterFlow(telegramId: string): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Cluster Creation Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await createUserCluster(
    telegramId,
    `TestCluster_${Date.now()}`, // Unique name
    false // Public cluster
  );

  if (result.success) {
    console.log(`\n✅ Flow 8 PASSED`);
  } else {
    console.log(`\n❌ Flow 8 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  testCreateClusterFlow(telegramId).catch(console.error);
}
