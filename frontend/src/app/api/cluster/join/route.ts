/**
 * POST /api/cluster/join
 *
 * Join an existing cluster via Circle SDK.
 * Contract signature: joinCluster(uint256 clusterId, bytes32 inviteCode)
 *
 * Input: { telegramUserId, clusterId, inviteCode? }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const CLUSTER_MANAGER_ADDRESS = process.env.CLUSTER_MANAGER_ADDRESS!;

const JOIN_CLUSTER_ABI = [
  'function joinCluster(uint256 clusterId, bytes32 inviteCode) external',
] as const;

// bytes32(0) — default invite code for public clusters
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

interface JoinClusterRequest {
  telegramUserId: string;
  clusterId: string;
  inviteCode?: string; // bytes32 hex, optional for public clusters
}

export async function POST(request: NextRequest) {
  try {
    const body: JoinClusterRequest = await request.json();

    const { telegramUserId, clusterId, inviteCode } = body;

    // Validate required fields
    if (!telegramUserId || !clusterId) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, clusterId' },
        { status: 400 }
      );
    }

    // Validate invite code format if provided
    if (inviteCode && !/^0x[0-9a-fA-F]{64}$/.test(inviteCode)) {
      return NextResponse.json(
        { error: 'inviteCode must be a valid bytes32 hex string' },
        { status: 400 }
      );
    }

    const refId = `tg_${telegramUserId}`;

    // Get the wallet
    const wallet = await getWalletByRefId(refId);

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found. Create a wallet first.' },
        { status: 404 }
      );
    }

    // Use provided invite code or default to bytes32(0)
    const code = inviteCode ? (inviteCode as `0x${string}`) : ZERO_BYTES32;

    // Execute the join cluster transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: CLUSTER_MANAGER_ADDRESS,
      abi: JOIN_CLUSTER_ABI,
      functionName: 'joinCluster',
      args: [BigInt(clusterId), code],
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /cluster/join] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join cluster' },
      { status: 500 }
    );
  }
}
