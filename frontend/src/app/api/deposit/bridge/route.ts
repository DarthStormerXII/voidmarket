/**
 * POST /api/deposit/bridge
 *
 * Bridge USDC from a source chain (ETH-SEPOLIA, BASE-SEPOLIA) to Arc Testnet.
 *
 * Input: { telegramUserId, sourceChain: 'ETH-SEPOLIA' | 'BASE-SEPOLIA', amount }
 * Output: { transactionId, status, sourceChain, destinationChain }
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiateBridgeTransfer } from '@/lib/services/circle/bridge';
import type { SupportedBlockchain } from '@/lib/services/circle/client';

const VALID_SOURCE_CHAINS: SupportedBlockchain[] = ['ETH-SEPOLIA', 'BASE-SEPOLIA'];

interface BridgeRequest {
  telegramUserId: string;
  sourceChain: SupportedBlockchain;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: BridgeRequest = await request.json();
    const { telegramUserId, sourceChain, amount } = body;

    if (!telegramUserId || !sourceChain || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, sourceChain, amount' },
        { status: 400 }
      );
    }

    if (!VALID_SOURCE_CHAINS.includes(sourceChain)) {
      return NextResponse.json(
        { error: `Invalid sourceChain. Must be one of: ${VALID_SOURCE_CHAINS.join(', ')}` },
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

    const result = await initiateBridgeTransfer({
      refId,
      sourceBlockchain: sourceChain,
      amount: amount.toString(),
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      status: result.status,
      sourceChain: result.sourceChain,
      destinationChain: result.destinationChain,
    });
  } catch (error) {
    console.error('[API /deposit/bridge] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bridge deposit' },
      { status: 500 }
    );
  }
}
