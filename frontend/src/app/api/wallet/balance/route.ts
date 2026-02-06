/**
 * GET /api/wallet/balance
 *
 * Get unified balance for a Telegram user
 * Input: ?telegramUserId=123456
 * Output: { arcBalance, gatewayBalances, totalBalance }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId, getWalletBalance } from '@/lib/services/circle/wallet';
import { getUnifiedBalance } from '@/lib/services/circle/gateway';
import type { Address } from 'viem';

export async function GET(request: NextRequest) {
  try {
    const telegramUserId = request.nextUrl.searchParams.get('telegramUserId');

    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'Missing telegramUserId parameter' },
        { status: 400 }
      );
    }

    const refId = `tg_${telegramUserId}`;

    // Get the wallet first
    const wallet = await getWalletByRefId(refId);

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found. Create a wallet first.' },
        { status: 404 }
      );
    }

    // Get Arc on-chain balance via Circle SDK
    const arcBalance = await getWalletBalance(wallet.id);

    // Get unified balance across chains via Gateway API
    const gatewayResult = await getUnifiedBalance(wallet.address as Address);

    // Arc balance is in native units (18 decimals), convert to number
    const arcBalanceNumber = parseFloat(arcBalance.native);

    return NextResponse.json({
      address: wallet.address,
      walletId: wallet.id,
      arcBalance: arcBalanceNumber.toFixed(6),
      gatewayBalances: gatewayResult.success ? gatewayResult.balances : [],
      totalBalance: gatewayResult.success
        ? gatewayResult.totalUSDC.toFixed(6)
        : arcBalanceNumber.toFixed(6),
    });
  } catch (error) {
    console.error('[API /wallet/balance] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
