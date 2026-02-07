/**
 * POST /api/cluster/leave
 *
 * Leave the current cluster via Circle SDK.
 * Contract signature: leaveCluster()
 *
 * Input: { telegramUserId }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const CLUSTER_MANAGER_ADDRESS = process.env.CLUSTER_MANAGER_ADDRESS!;

const LEAVE_CLUSTER_ABI = [
  'function leaveCluster() external',
] as const;

interface LeaveClusterRequest {
  telegramUserId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LeaveClusterRequest = await request.json();

    const { telegramUserId } = body;

    // Validate required fields
    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'Missing required field: telegramUserId' },
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

    // Execute the leave cluster transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: CLUSTER_MANAGER_ADDRESS,
      abi: LEAVE_CLUSTER_ABI,
      functionName: 'leaveCluster',
      args: [],
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /cluster/leave] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to leave cluster' },
      { status: 500 }
    );
  }
}
