/**
 * POST /api/deposit
 *
 * Returns deposit information for a user's wallet.
 * Since Circle developer-controlled wallets have the same address across chains,
 * the user can send USDC to their address on any supported chain.
 *
 * Input: { telegramUserId }
 * Output: { address, supportedChains, currentBalances }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { getUnifiedBalance } from '@/lib/services/circle/gateway';
import { getSupportedDepositChains } from '@/lib/services/circle/bridge-kit';

interface DepositInfoRequest {
  telegramUserId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DepositInfoRequest = await request.json();
    const { telegramUserId } = body;

    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'Missing required field: telegramUserId' },
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

    // Get balances across all chains
    const balances = await getUnifiedBalance(wallet.address as `0x${string}`);

    // Get supported deposit chains
    const supportedChains = getSupportedDepositChains();

    return NextResponse.json({
      address: wallet.address,
      supportedChains: supportedChains.map(c => ({
        id: c.id,
        name: c.name,
        chainId: c.chainId,
        explorerUrl: c.explorerUrl,
      })),
      currentBalances: balances.balances,
      totalBalance: balances.totalUSDC,
    });
  } catch (error) {
    console.error('[API /deposit] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get deposit info' },
      { status: 500 }
    );
  }
}
