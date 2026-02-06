/**
 * GET /api/transaction/[id]
 *
 * Poll transaction status
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus } from '@/lib/services/circle/transaction';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Missing transaction ID' },
        { status: 400 }
      );
    }

    const result = await getTransactionStatus(transactionId);

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
      errorReason: result.errorReason,
    });
  } catch (error) {
    console.error('[API /transaction] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get transaction status' },
      { status: 500 }
    );
  }
}
