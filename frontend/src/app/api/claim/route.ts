/**
 * POST /api/claim
 *
 * Claim winnings for a resolved bet.
 * Contract signature: claimWinnings(uint256 betId)
 *
 * Input: { telegramUserId, betId }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const VOIDMARKET_CORE_ADDRESS = process.env.VOIDMARKET_CORE_ADDRESS!;

const CLAIM_WINNINGS_ABI = [
  'function claimWinnings(uint256 betId) external',
] as const;

interface ClaimWinningsRequest {
  telegramUserId: string;
  betId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ClaimWinningsRequest = await request.json();

    const { telegramUserId, betId } = body;

    // Validate required fields
    if (!telegramUserId || !betId) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, betId' },
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

    // Execute the claim winnings transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: VOIDMARKET_CORE_ADDRESS,
      abi: CLAIM_WINNINGS_ABI,
      functionName: 'claimWinnings',
      args: [BigInt(betId)],
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /claim] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to claim winnings' },
      { status: 500 }
    );
  }
}
