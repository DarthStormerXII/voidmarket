/**
 * GET /api/markets/[id]
 *
 * Get a single market by on-chain ID with bets and DB metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMarketById, getMarketBets } from '@/lib/services/contracts/market-service';
import { getMarketMetadata } from '@/lib/services/db';
import type { ApiMarket, ApiBet } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const marketId = parseInt(id);

    if (isNaN(marketId) || marketId <= 0) {
      return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
    }

    // Fetch on-chain data and DB metadata in parallel
    const [onChainMarket, bets, meta] = await Promise.all([
      getMarketById(marketId),
      getMarketBets(marketId),
      getMarketMetadata(marketId),
    ]);

    const market: ApiMarket = {
      id: onChainMarket.id,
      question: onChainMarket.question,
      creator: onChainMarket.creator,
      creatorName: meta?.creatorName || undefined,
      deadline: new Date(onChainMarket.deadline * 1000).toISOString(),
      resolutionDeadline: onChainMarket.resolutionDeadline
        ? new Date(onChainMarket.resolutionDeadline * 1000).toISOString()
        : undefined,
      status: onChainMarket.status,
      outcome: onChainMarket.status === 'resolved' ? onChainMarket.outcome : undefined,
      totalYesAmount: onChainMarket.totalYesAmount,
      totalNoAmount: onChainMarket.totalNoAmount,
      totalPool: onChainMarket.totalPool,
      totalBets: bets.length,
      isForked: onChainMarket.isForked,
      parentMarketId: onChainMarket.isForked ? onChainMarket.parentMarketId : undefined,
      category: (meta?.category as ApiMarket['category']) || 'custom',
      oracleType: meta?.oracleType || 'manual',
      oracleSource: meta?.oracleSource || undefined,
    };

    const apiBets: ApiBet[] = bets.map((b) => ({
      id: b.id,
      marketId: b.marketId,
      bettor: b.bettor,
      amount: b.amount,
      commitmentHash: b.commitmentHash,
      revealed: b.revealed,
      direction: b.revealed ? b.direction : undefined,
      timestamp: new Date(b.timestamp * 1000).toISOString(),
      claimed: b.claimed,
    }));

    return NextResponse.json({ market, bets: apiBets });
  } catch (error) {
    console.error('[API /markets/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market' },
      { status: 500 }
    );
  }
}
