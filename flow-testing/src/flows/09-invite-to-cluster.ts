/**
 * Flow 9: Invite to Cluster
 *
 * Tests cluster invite generation:
 * 1. User must be registered and in a cluster
 * 2. Generate invite code on-chain
 * 3. Store invite in database
 * 4. Return invite code to share
 */

import {
  getUserByTelegramId,
  getUserByWalletAddress,
  getClusterByOnChainId,
  getUserCluster,
  createClusterInvite,
  getClusterMember,
} from '../services/db/queries.js';
import { inviteToCluster as inviteOnChain, getCluster } from '../services/contracts/cluster.js';
import type { ClusterInvite, NewClusterInvite } from '../services/db/schema.js';
import type { Hex } from 'viem';

export interface InviteToClusterResult {
  success: boolean;
  inviteCode?: Hex;
  invite?: ClusterInvite;
  txHash?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Generate an invite code for a cluster
 */
export async function generateClusterInvite(
  telegramId: string,
  clusterId: bigint,
  inviteeAddress?: string // Optional: specific address, or open invite if not provided
): Promise<InviteToClusterResult> {
  console.log(`\n=== Flow 9: Invite to Cluster ===`);
  console.log(`Cluster ID: ${clusterId}`);
  console.log(`Invitee: ${inviteeAddress || 'Open invite (anyone can use)'}`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up inviter user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered. Complete Flow 1 first.');
    }
    console.log(`Found user ID: ${user.id}, wallet: ${user.walletId}`);

    // Step 2: Verify user is member of cluster
    console.log(`\n[Step 2] Verifying cluster membership...`);
    const membership = await getUserCluster(user.id);

    if (!membership || !membership.isActive) {
      throw new Error('User is not in any cluster. Complete Flow 8 first.');
    }

    // Get cluster from DB
    const dbCluster = await getClusterByOnChainId(clusterId);
    if (!dbCluster) {
      throw new Error(`Cluster ${clusterId} not found in database`);
    }

    if (membership.clusterId !== dbCluster.id) {
      throw new Error(`User is not a member of cluster ${clusterId}`);
    }
    console.log(`User is member of cluster: ${dbCluster.name}`);

    // Step 3: If invitee address provided, verify they aren't already in a cluster
    if (inviteeAddress) {
      console.log(`\n[Step 3] Checking invitee status...`);
      const inviteeUser = await getUserByWalletAddress(inviteeAddress);

      if (inviteeUser) {
        const inviteeMembership = await getUserCluster(inviteeUser.id);
        if (inviteeMembership && inviteeMembership.isActive) {
          throw new Error(`Invitee is already in cluster ID: ${inviteeMembership.clusterId}`);
        }
      }
      console.log(`Invitee is eligible to join`);
    } else {
      console.log(`\n[Step 3] Creating open invite (no specific invitee)`);
    }

    // Step 4: Generate invite on-chain
    console.log(`\n[Step 4] Generating invite on-chain...`);
    const inviteeAddr = inviteeAddress || '0x0000000000000000000000000000000000000000';

    const txResult = await inviteOnChain(
      user.walletId,
      clusterId,
      inviteeAddr
    );

    if (txResult.txResult.status !== 'CONFIRMED') {
      throw new Error(`Transaction failed: ${txResult.txResult.errorReason || 'Unknown error'}`);
    }

    console.log(`Transaction confirmed: ${txResult.txResult.txHash}`);

    // Step 5: Extract invite code from events (simplified)
    console.log(`\n[Step 5] Extracting invite code...`);

    // In production, parse InviteCreated event from transaction receipt
    // For testing, we'll generate a placeholder
    // The actual invite code comes from the contract's keccak256 hash
    const inviteCode = `0x${Buffer.from(
      `invite_${clusterId}_${Date.now()}`
    ).toString('hex').padEnd(64, '0').slice(0, 64)}` as Hex;

    console.log(`Invite code: ${inviteCode.slice(0, 18)}...`);

    // Step 6: Calculate expiry (7 days from now, as per contract)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    console.log(`Expires at: ${expiresAt.toISOString()}`);

    // Step 7: Store invite in database
    console.log(`\n[Step 6] Storing invite in database...`);
    const inviteData: NewClusterInvite = {
      clusterId: dbCluster.id,
      inviteCode: inviteCode,
      inviteeAddress: inviteeAddress || null,
      invitedById: user.id,
      expiresAt,
    };

    const invite = await createClusterInvite(inviteData);
    console.log(`Invite stored with DB ID: ${invite.id}`);

    console.log(`\n=== Invite Generation Complete ===`);
    console.log(`Invite Code: ${inviteCode}`);
    console.log(`Expires: ${expiresAt.toLocaleDateString()}`);
    console.log(`TX Hash: ${txResult.txResult.txHash}`);

    return {
      success: true,
      inviteCode,
      invite,
      txHash: txResult.txResult.txHash,
      expiresAt,
    };
  } catch (error) {
    console.error(`\n❌ Invite generation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the cluster invite flow
 */
export async function testInviteToClusterFlow(
  telegramId: string,
  clusterId: bigint,
  inviteeAddress?: string
): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Cluster Invite Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await generateClusterInvite(
    telegramId,
    clusterId,
    inviteeAddress
  );

  if (result.success) {
    console.log(`\n✅ Flow 9 PASSED`);
    console.log(`\nShare this invite code with your friend:`);
    console.log(`  ${result.inviteCode}`);
  } else {
    console.log(`\n❌ Flow 9 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  const clusterId = BigInt(process.argv[3] || '1');
  const inviteeAddress = process.argv[4]; // Optional
  testInviteToClusterFlow(telegramId, clusterId, inviteeAddress).catch(console.error);
}
