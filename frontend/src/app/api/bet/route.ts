/**
 * POST /api/bet
 *
 * Place a bet via Circle SDK using commit-reveal scheme.
 * The contract signature is: placeBet(uint256 marketId, bytes32 commitmentHash) payable
 * Amount is sent as msg.value (native USDC on Arc, 18 decimals).
 *
 * Input: { telegramUserId, marketId, commitmentHash, amount }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId, parseUSDCAmount } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';

const VOIDMARKET_CORE_ADDRESS = process.env.VOIDMARKET_CORE_ADDRESS!;

// Correct ABI matching the contract: placeBet(uint256, bytes32) payable
const PLACE_BET_ABI = [
  'function placeBet(uint256 marketId, bytes32 commitmentHash) external payable returns (uint256)',
] as const;

interface PlaceBetRequest {
  telegramUserId: string;
  marketId: string;
  commitmentHash: string; // bytes32 hex
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: PlaceBetRequest = await request.json();

    const { telegramUserId, marketId, commitmentHash, amount } = body;

    // Validate required fields
    if (!telegramUserId || !marketId || !commitmentHash || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, marketId, commitmentHash, amount' },
        { status: 400 }
      );
    }

    // Validate commitment hash format (bytes32)
    if (!/^0x[0-9a-fA-F]{64}$/.test(commitmentHash)) {
      return NextResponse.json(
        { error: 'commitmentHash must be a valid bytes32 hex string' },
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

    // Parse amount to wei (Arc uses 18 decimals for native USDC)
    const amountWei = parseUSDCAmount(amount.toString(), 'ARC-TESTNET');

    // Execute the bet transaction — amount sent as msg.value
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: VOIDMARKET_CORE_ADDRESS,
      abi: PLACE_BET_ABI,
      functionName: 'placeBet',
      args: [BigInt(marketId), commitmentHash as `0x${string}`],
      value: amountWei,
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
