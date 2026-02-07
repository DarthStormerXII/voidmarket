/**
 * POST /api/cluster/create
 *
 * Create a new cluster via Circle SDK.
 * Contract signature: createCluster(string name, bool isPrivate)
 *
 * Input: { telegramUserId, name, isPrivate }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const CLUSTER_MANAGER_ADDRESS = process.env.CLUSTER_MANAGER_ADDRESS!;

const CREATE_CLUSTER_ABI = [
  'function createCluster(string name, bool isPrivate) external returns (uint256)',
] as const;

interface CreateClusterRequest {
  telegramUserId: string;
  name: string;
  isPrivate: boolean;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateClusterRequest = await request.json();

    const { telegramUserId, name, isPrivate } = body;

    // Validate required fields
    if (!telegramUserId || !name || isPrivate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, name, isPrivate' },
        { status: 400 }
      );
    }

    // Validate cluster name
    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Cluster name cannot be empty' },
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

    // Execute the create cluster transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: CLUSTER_MANAGER_ADDRESS,
      abi: CREATE_CLUSTER_ABI,
      functionName: 'createCluster',
      args: [name, isPrivate],
    });

    // Auto-register cluster for ENS resolution (non-blocking)
    try {
      const { upsertClusterMetadata } = await import('@/lib/services/db');

      const tempId = Date.now();

      await upsertClusterMetadata({
        onChainId: tempId,
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description: body.description || undefined,
      });
    } catch (dbErr) {
      console.error('[API /cluster/create] DB registration error (non-critical):', dbErr);
    }

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /cluster/create] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create cluster' },
      { status: 500 }
    );
  }
}
