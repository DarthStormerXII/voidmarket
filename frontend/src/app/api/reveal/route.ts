/**
 * POST /api/reveal
 *
 * Reveal a bet after market resolution.
 * Contract signature: revealBet(uint256 betId, bool direction, bytes32 salt)
 *
 * Input: { telegramUserId, betId, direction, salt }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const VOIDMARKET_CORE_ADDRESS = process.env.VOIDMARKET_CORE_ADDRESS!;

const REVEAL_BET_ABI = [
  'function revealBet(uint256 betId, bool direction, bytes32 salt) external',
] as const;

interface RevealBetRequest {
  telegramUserId: string;
  betId: string;
  direction: boolean;
  salt: string; // bytes32 hex
}

export async function POST(request: NextRequest) {
  try {
    const body: RevealBetRequest = await request.json();

    const { telegramUserId, betId, direction, salt } = body;

    // Validate required fields
    if (!telegramUserId || !betId || direction === undefined || !salt) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, betId, direction, salt' },
        { status: 400 }
      );
    }

    // Validate salt format (bytes32)
    if (!/^0x[0-9a-fA-F]{64}$/.test(salt)) {
      return NextResponse.json(
        { error: 'salt must be a valid bytes32 hex string' },
        { status: 400 }
      );
    }

    const refId = `tg_${telegramUserId}`;

    // Get the wallet
    const wallet = await getWalletByRefId(refId);

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found.' },
        { status: 404 }
      );
    }

    // Execute the reveal transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: VOIDMARKET_CORE_ADDRESS,
      abi: REVEAL_BET_ABI,
      functionName: 'revealBet',
      args: [BigInt(betId), direction, salt as `0x${string}`],
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /reveal] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reveal bet' },
      { status: 500 }
    );
  }
}
