/**
 * POST /api/market/create
 *
 * Create a new prediction market via Circle SDK.
 * Contract signature: createMarket(string question, uint256 deadline, uint256 resolutionDeadline)
 *
 * Input: { telegramUserId, question, deadline, resolutionDeadline, category?, oracleType? }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const VOIDMARKET_CORE_ADDRESS = process.env.VOIDMARKET_CORE_ADDRESS!;

const CREATE_MARKET_ABI = [
  'function createMarket(string question, uint256 deadline, uint256 resolutionDeadline) external returns (uint256)',
] as const;

interface CreateMarketRequest {
  telegramUserId: string;
  question: string;
  deadline: number; // Unix timestamp
  resolutionDeadline: number; // Unix timestamp
  category?: string;
  oracleType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMarketRequest = await request.json();

    const { telegramUserId, question, deadline, resolutionDeadline } = body;

    // Validate required fields
    if (!telegramUserId || !question || !deadline || !resolutionDeadline) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, question, deadline, resolutionDeadline' },
        { status: 400 }
      );
    }

    // Validate deadlines
    if (deadline <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { error: 'Deadline must be in the future' },
        { status: 400 }
      );
    }

    if (resolutionDeadline <= deadline) {
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

    // Execute the create market transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: VOIDMARKET_CORE_ADDRESS,
      abi: CREATE_MARKET_ABI,
      functionName: 'createMarket',
      args: [question, BigInt(deadline), BigInt(resolutionDeadline)],
    });

    // Auto-register market for ENS resolution (non-blocking)
    try {
      const { upsertMarketMetadata } = await import('@/lib/services/db');

      // Create a slug from the question
      const slug = question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);

      // Placeholder on-chain ID (real ID requires parsing tx receipt)
      const tempId = Date.now();

      await upsertMarketMetadata({
        onChainId: tempId,
        name: slug || `market-${tempId}`,
        category: body.category || 'custom',
        oracleType: body.oracleType || 'manual',
        creatorName: `star-${telegramUserId}`,
      });
    } catch (dbErr) {
      console.error('[API /market/create] DB registration error (non-critical):', dbErr);
    }

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /market/create] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create market' },
      { status: 500 }
    );
  }
}
