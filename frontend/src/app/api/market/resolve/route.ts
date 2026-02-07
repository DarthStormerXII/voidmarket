/**
 * POST /api/market/resolve
 *
 * Resolve a prediction market via Circle SDK.
 * Contract signature: resolveMarket(uint256 marketId, bool outcome)
 *
 * After the on-chain transaction is submitted, all bettors for
 * the market are notified via Telegram DM (fire-and-forget).
 *
 * Input: { telegramUserId, marketId, outcome: boolean }
 * Output: { transactionId, txHash, status }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import { executeContractCall } from '@/lib/services/circle/transaction';
import { getBetsByMarketId } from '@/lib/services/db';
import { notifyMarketResolved } from '@/lib/services/notifications';

const VOIDMARKET_CORE_ADDRESS = process.env.VOIDMARKET_CORE_ADDRESS!;

const RESOLVE_MARKET_ABI = [
  'function resolveMarket(uint256 marketId, bool outcome) external',
] as const;

interface ResolveMarketRequest {
  telegramUserId: string;
  marketId: number;
  outcome: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResolveMarketRequest = await request.json();

    const { telegramUserId, marketId, outcome } = body;

    // Validate required fields
    if (!telegramUserId || marketId === undefined || outcome === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, marketId, outcome' },
        { status: 400 }
      );
    }

    if (typeof outcome !== 'boolean') {
      return NextResponse.json(
        { error: 'outcome must be a boolean' },
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

    // Execute the resolve market transaction
    const result = await executeContractCall({
      walletId: wallet.id,
      contractAddress: VOIDMARKET_CORE_ADDRESS,
      abi: RESOLVE_MARKET_ABI,
      functionName: 'resolveMarket',
      args: [BigInt(marketId), outcome],
    });

    // Notify bettors (fire-and-forget — don't await)
    getBetsByMarketId(marketId)
      .then((bets) => {
        const uniqueTelegramIds = [
          ...new Set(
            bets
              .map((b: { telegram_user_id?: string }) => b.telegram_user_id)
              .filter((id): id is string => !!id)
          ),
        ];

        if (uniqueTelegramIds.length > 0) {
          notifyMarketResolved({
            marketId,
            question: `Market #${marketId}`,
            outcome: outcome ? 'YES' : 'NO',
            bettorTelegramIds: uniqueTelegramIds,
          });
        }
      })
      .catch((err) => {
        console.error('[API /market/resolve] Notification lookup error:', err);
      });

    return NextResponse.json({
      transactionId: result.transactionId,
      txHash: result.txHash,
      status: result.status,
    });
  } catch (error) {
    console.error('[API /market/resolve] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve market' },
      { status: 500 }
    );
  }
}
