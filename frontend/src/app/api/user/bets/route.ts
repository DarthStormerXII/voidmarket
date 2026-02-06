/**
 * GET /api/user/bets
 *
 * Get all bets for a user across all markets.
 * Query: ?telegramUserId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByRefId } from '@/lib/services/circle/wallet';
import {
  getMarketCount,
  getUserBetsForMarket,
  getBetById,
  getMarketById,
} from '@/lib/services/contracts/market-service';
import type { ApiBet } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramUserId = searchParams.get('telegramUserId');

    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'Missing telegramUserId query parameter' },
        { status: 400 }
      );
    }

    const refId = `tg_${telegramUserId}`;
    const wallet = await getWalletByRefId(refId);

    if (!wallet) {
      return NextResponse.json({ bets: [] });
    }

    const marketCount = await getMarketCount();
    if (marketCount === 0) {
      return NextResponse.json({ bets: [] });
    }

    // For each market, check if user has bets
    const allBetIds: number[] = [];
    const betMarketMap = new Map<number, number>(); // betId -> marketId

    await Promise.all(
      Array.from({ length: marketCount }, (_, i) => i + 1).map(async (marketId) => {
        try {
          const userBetIds = await getUserBetsForMarket(marketId, wallet.address);
          for (const betId of userBetIds) {
            allBetIds.push(betId);
            betMarketMap.set(betId, marketId);
          }
        } catch {
          // Skip markets that fail
        }
      })
    );

    if (allBetIds.length === 0) {
      return NextResponse.json({ bets: [] });
    }

    // Fetch all bet details
    const bets = await Promise.all(
      allBetIds.map(async (betId) => {
        const bet = await getBetById(betId);
        let marketQuestion: string | undefined;
        try {
          const market = await getMarketById(bet.marketId);
          marketQuestion = market.question;
        } catch {
          // Skip if market fetch fails
        }

        const apiBet: ApiBet = {
          id: bet.id,
          marketId: bet.marketId,
          marketQuestion,
          bettor: bet.bettor,
          amount: bet.amount,
          commitmentHash: bet.commitmentHash,
          revealed: bet.revealed,
          direction: bet.revealed ? bet.direction : undefined,
          timestamp: new Date(bet.timestamp * 1000).toISOString(),
          claimed: bet.claimed,
        };
        return apiBet;
      })
    );

    // Sort by timestamp descending (most recent first)
    bets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ bets });
  } catch (error) {
    console.error('[API /user/bets] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user bets' },
      { status: 500 }
    );
  }
}
