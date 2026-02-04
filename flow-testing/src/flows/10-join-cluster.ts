/**
 * Flow 10: Join Cluster
 *
 * Tests joining a cluster with an invite code:
 * 1. User must be registered
 * 2. User must not already be in a cluster
 * 3. Invite code must be valid and not expired
 * 4. Submit joinCluster transaction via Circle
 * 5. Update database (mark invite used, add member, update count)
 */

import {
  getUserByTelegramId,
  getUserCluster,
  getClusterByOnChainId,
  getInviteByCode,
  markInviteUsed,
  addClusterMember,
} from '../services/db/queries.js';
import { joinCluster as joinClusterOnChain, getCluster, getMember, isMemberOf } from '../services/contracts/cluster.js';
import { db, schema } from '../services/db/client.js';
import { eq } from 'drizzle-orm';
import type { ClusterMember, NewClusterMember } from '../services/db/schema.js';
import type { Hex } from 'viem';

export interface JoinClusterResult {
  success: boolean;
  clusterId?: bigint;
  membership?: ClusterMember;
  txHash?: string;
  error?: string;
}

/**
 * Join a cluster using an invite code
 */
export async function joinUserCluster(
  telegramId: string,
  clusterId: bigint,
  inviteCode: Hex
): Promise<JoinClusterResult> {
  console.log(`\n=== Flow 10: Join Cluster ===`);
  console.log(`Cluster ID: ${clusterId}`);
  console.log(`Invite Code: ${inviteCode.slice(0, 18)}...`);

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

    // Step 3: Validate invite code in database
    console.log(`\n[Step 3] Validating invite code...`);
    const invite = await getInviteByCode(inviteCode);

    if (!invite) {
      throw new Error('Invalid invite code or invite has been used/expired');
    }

    // Check invite is for this cluster
    const dbCluster = await getClusterByOnChainId(clusterId);
    if (!dbCluster) {
      throw new Error(`Cluster ${clusterId} not found in database`);
    }

    if (invite.clusterId !== dbCluster.id) {
      throw new Error('Invite code is for a different cluster');
    }

    // Check if invite is for specific address
    if (invite.inviteeAddress && invite.inviteeAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
      throw new Error('This invite is for a different address');
    }

    console.log(`Invite is valid:`);
    console.log(`  - Cluster: ${dbCluster.name}`);
    console.log(`  - Invited by: User ${invite.invitedById}`);
    console.log(`  - Expires: ${invite.expiresAt.toISOString()}`);

    // Step 4: Verify cluster on-chain
    console.log(`\n[Step 4] Verifying cluster on-chain...`);
    const onChainCluster = await getCluster(clusterId);

    if (onChainCluster.memberCount >= onChainCluster.maxMembers) {
      throw new Error('Cluster is full');
    }

    console.log(`Cluster has space: ${onChainCluster.memberCount}/${onChainCluster.maxMembers} members`);

    // Step 5: Join cluster on-chain
    console.log(`\n[Step 5] Joining cluster on-chain...`);
    const txResult = await joinClusterOnChain(
      user.walletId,
      clusterId,
      inviteCode
    );

    if (txResult.status !== 'CONFIRMED') {
      throw new Error(`Transaction failed: ${txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txHash}`);

    // Step 6: Verify membership on-chain
    console.log(`\n[Step 6] Verifying membership on-chain...`);
    const isMember = await isMemberOf(user.walletAddress, clusterId);

    if (!isMember) {
      throw new Error('Membership not confirmed on-chain');
    }

    const onChainMember = await getMember(user.walletAddress);
    console.log(`Membership verified:`);
    console.log(`  - Cluster ID: ${onChainMember.clusterId}`);
    console.log(`  - Photons: ${onChainMember.photons}`);
    console.log(`  - Active: ${onChainMember.isActive}`);

    // Step 7: Mark invite as used
    console.log(`\n[Step 7] Marking invite as used...`);
    await markInviteUsed(inviteCode, user.id);
    console.log(`Invite marked as used`);

    // Step 8: Add member to database
    console.log(`\n[Step 8] Adding member to database...`);
    const memberData: NewClusterMember = {
      clusterId: dbCluster.id,
      userId: user.id,
      photons: 0,
      role: 'MEMBER',
      isActive: true,
    };

    const membership = await addClusterMember(memberData);
    console.log(`Member added with DB ID: ${membership.id}`);

    // Step 9: Update cluster member count
    console.log(`\n[Step 9] Updating cluster member count...`);
    await db
      .update(schema.clusters)
      .set({
        memberCount: dbCluster.memberCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.clusters.id, dbCluster.id));

    console.log(`Cluster member count updated: ${dbCluster.memberCount + 1}`);

    console.log(`\n=== Cluster Join Complete ===`);
    console.log(`Cluster: ${dbCluster.name}`);
    console.log(`Role: MEMBER`);
    console.log(`TX Hash: ${txResult.txHash}`);

    return {
      success: true,
      clusterId,
      membership,
      txHash: txResult.txHash,
    };
  } catch (error) {
    console.error(`\n❌ Cluster join failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the cluster join flow
 */
export async function testJoinClusterFlow(
  telegramId: string,
  clusterId: bigint,
  inviteCode: Hex
): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Cluster Join Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await joinUserCluster(
    telegramId,
    clusterId,
    inviteCode
  );

  if (result.success) {
    console.log(`\n✅ Flow 10 PASSED`);
  } else {
    console.log(`\n❌ Flow 10 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  const clusterId = BigInt(process.argv[3] || '1');
  const inviteCode = (process.argv[4] || '0x') as Hex;

  if (!inviteCode || inviteCode === '0x') {
    console.error('Usage: npx tsx 10-join-cluster.ts <telegramId> <clusterId> <inviteCode>');
    process.exit(1);
  }

  testJoinClusterFlow(telegramId, clusterId, inviteCode).catch(console.error);
}
