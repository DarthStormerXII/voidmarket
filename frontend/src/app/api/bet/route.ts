/**
 * POST /api/bet
 *
 * Place a bet via Circle SDK
 * Input: { telegramUserId, marketId, outcome, amount, contractAddress }
 * Output: { transactionId, status: "PENDING" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId, parseUSDCAmount } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

// VoidMarket contract ABI for placeBet
const PLACE_BET_ABI = [
  'function placeBet(uint256 marketId, bool outcome, uint256 amount) external',
] as const;

interface PlaceBetRequest {
  telegramUserId: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  amount: number;
  contractAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PlaceBetRequest = await request.json();

    const { telegramUserId, marketId, outcome, amount, contractAddress } = body;

    // Validate required fields
    if (!telegramUserId || !marketId || !outcome || !amount || !contractAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, marketId, outcome, amount, contractAddress' },
        { status: 400 }
      );
    }

    // Validate outcome
    if (outcome !== 'YES' && outcome !== 'NO') {
      return NextResponse.json(
        { error: 'Outcome must be "YES" or "NO"' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
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

    // Parse amount to wei (Arc uses 18 decimals)
    const amountWei = parseUSDCAmount(amount.toString(), 'ARC-TESTNET');

    // Execute the bet transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress,
      abi: PLACE_BET_ABI,
      functionName: 'placeBet',
      args: [BigInt(marketId), outcome === 'YES', amountWei],
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /bet] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to place bet' },
      { status: 500 }
    );
  }
}
