/**
 * POST /api/withdraw
 *
 * Transfer USDC from user's Arc wallet to a destination address.
 *
 * Input: { telegramUserId, destinationAddress, amount }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeTransfer } from '@/lib/services/circle/transaction';

interface WithdrawRequest {
  telegramUserId: string;
  destinationAddress: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequest = await request.json();
    const { telegramUserId, destinationAddress, amount } = body;

    if (!telegramUserId || !destinationAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, destinationAddress, amount' },
        { status: 400 }
      );
    }

    // Validate address
    if (!/^0x[0-9a-fA-F]{40}$/.test(destinationAddress)) {
      return NextResponse.json(
        { error: 'Invalid destination address' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const refId = `tg_${telegramUserId}`;
    const wallet = await getWalletByRefId(refId);

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found. Create a wallet first.' },
        { status: 404 }
      );
    }

    const result = await executeTransfer({
      walletId: wallet.id,
      to: destinationAddress,
      amount: amount.toString(),
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /withdraw] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to withdraw' },
      { status: 500 }
    );
  }
}
