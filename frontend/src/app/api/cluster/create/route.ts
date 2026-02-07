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
import { upsertClusterMetadata, checkEnsNameCollision } from '@/lib/services/db';

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

    // Check for ENS name collision BEFORE on-chain transaction
    const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
    const collision = await checkEnsNameCollision(normalizedName, 'cluster');
    if (collision.taken) {
      return NextResponse.json(
        { error: `Name "${name}" is already taken by a ${collision.ownedBy}. Choose a different name.` },
        { status: 409 }
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

    // Register cluster for ENS resolution (non-blocking)
    try {
      const tempId = Date.now();
      await upsertClusterMetadata({
        onChainId: tempId,
        name: normalizedName,
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
