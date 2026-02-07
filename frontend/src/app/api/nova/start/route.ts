/**
 * POST /api/nova/start
 *
 * Start a new Nova (cluster vs cluster competition) via Circle SDK.
 * Contract signature: startNova(uint256 cluster1Id, uint256 cluster2Id, uint256 totalRounds) payable
 *
 * Input: { telegramUserId, cluster1Id, cluster2Id, totalRounds, prizePool }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId, parseUSDCAmount } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const NOVA_MANAGER_ADDRESS = process.env.NOVA_MANAGER_ADDRESS!;

const START_NOVA_ABI = [
  'function startNova(uint256 cluster1Id, uint256 cluster2Id, uint256 totalRounds) external payable returns (uint256)',
] as const;

interface StartNovaRequest {
  telegramUserId: string;
  cluster1Id: string;
  cluster2Id: string;
  totalRounds: number;
  prizePool: number; // Amount in USDC to send as msg.value
}

export async function POST(request: NextRequest) {
  try {
    const body: StartNovaRequest = await request.json();

    const { telegramUserId, cluster1Id, cluster2Id, totalRounds, prizePool } = body;

    // Validate required fields
    if (!telegramUserId || !cluster1Id || !cluster2Id || !totalRounds || !prizePool) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, cluster1Id, cluster2Id, totalRounds, prizePool' },
        { status: 400 }
      );
    }

    // Validate totalRounds
    if (totalRounds <= 0) {
      return NextResponse.json(
        { error: 'totalRounds must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate prizePool
    if (prizePool <= 0) {
      return NextResponse.json(
        { error: 'prizePool must be greater than 0' },
        { status: 400 }
      );
    }

    // Clusters must be different
    if (cluster1Id === cluster2Id) {
      return NextResponse.json(
        { error: 'cluster1Id and cluster2Id must be different' },
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

    // Parse prize pool to wei (Arc uses 18 decimals for native USDC)
    const prizePoolWei = parseUSDCAmount(prizePool.toString(), 'ARC-TESTNET');

    // Execute the start nova transaction — prizePool sent as msg.value
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: NOVA_MANAGER_ADDRESS,
      abi: START_NOVA_ABI,
      functionName: 'startNova',
      args: [BigInt(cluster1Id), BigInt(cluster2Id), BigInt(totalRounds)],
      value: prizePoolWei,
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /nova/start] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start nova' },
      { status: 500 }
    );
  }
}
