/**
 * POST /api/market/fork
 *
 * Create a forked prediction market from an existing parent market.
 * Contract signature: createForkedMarket(uint256 parentMarketId, string customQuestion, uint256 deadline, uint256 resolutionDeadline)
 *
 * Input: { telegramUserId, parentMarketId, customQuestion?, deadline?, resolutionDeadline? }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const VOIDMARKET_CORE_ADDRESS = process.env.VOIDMARKET_CORE_ADDRESS!;

const CREATE_FORKED_MARKET_ABI = [
  'function createForkedMarket(uint256 parentMarketId, string customQuestion, uint256 deadline, uint256 resolutionDeadline) external returns (uint256)',
] as const;

interface ForkMarketRequest {
  telegramUserId: string;
  parentMarketId: string;
  customQuestion?: string;
  deadline?: number; // Unix timestamp
  resolutionDeadline?: number; // Unix timestamp
}

export async function POST(request: NextRequest) {
  try {
    const body: ForkMarketRequest = await request.json();

    const { telegramUserId, parentMarketId, customQuestion, deadline, resolutionDeadline } = body;

    // Validate required fields
    if (!telegramUserId || !parentMarketId) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, parentMarketId' },
        { status: 400 }
      );
    }

    // Default values for optional fields
    const question = customQuestion || '';
    const marketDeadline = deadline || Math.floor(Date.now() / 1000) + 86400; // Default: 24h from now
    const marketResolutionDeadline = resolutionDeadline || marketDeadline + 86400; // Default: 24h after deadline

    // Validate deadlines if provided
    if (deadline && deadline <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { error: 'Deadline must be in the future' },
        { status: 400 }
      );
    }

    if (deadline && resolutionDeadline && resolutionDeadline <= deadline) {
      return NextResponse.json(
        { error: 'Resolution deadline must be after the market deadline' },
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

    // Execute the fork market transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: VOIDMARKET_CORE_ADDRESS,
      abi: CREATE_FORKED_MARKET_ABI,
      functionName: 'createForkedMarket',
      args: [
        BigInt(parentMarketId),
        question,
        BigInt(marketDeadline),
        BigInt(marketResolutionDeadline),
      ],
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /market/fork] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fork market' },
      { status: 500 }
    );
  }
}
