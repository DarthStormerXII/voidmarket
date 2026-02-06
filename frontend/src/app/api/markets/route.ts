/**
 * GET /api/markets
 *
 * List markets from on-chain + DB metadata.
 * Query: ?status=active&category=crypto&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllMarkets, getMarketBetIds } from '@/lib/services/contracts/market-service';
import { getAllMarketMetadata } from '@/lib/services/db';
import type { ApiMarket } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const categoryFilter = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch on-chain markets and DB metadata in parallel
    const [onChainMarkets, dbMetadata] = await Promise.all([
      getAllMarkets(),
      getAllMarketMetadata(),
    ]);

    // Build metadata lookup by onChainId
    const metadataMap = new Map(dbMetadata.map((m) => [m.onChainId, m]));

    // Map and filter markets
    let markets: ApiMarket[] = await Promise.all(
      onChainMarkets.map(async (m) => {
        const meta = metadataMap.get(m.id);
        let totalBets = 0;
        try {
          const betIds = await getMarketBetIds(m.id);
          totalBets = betIds.length;
        } catch {
          // If getMarketBets fails, default to 0
        }

        return {
          id: m.id,
          question: m.question,
          creator: m.creator,
          creatorName: meta?.creatorName || undefined,
          deadline: new Date(m.deadline * 1000).toISOString(),
          resolutionDeadline: m.resolutionDeadline
            ? new Date(m.resolutionDeadline * 1000).toISOString()
            : undefined,
          status: m.status,
          outcome: m.status === 'resolved' ? m.outcome : undefined,
          totalYesAmount: m.totalYesAmount,
          totalNoAmount: m.totalNoAmount,
          totalPool: m.totalPool,
          totalBets,
          isForked: m.isForked,
          parentMarketId: m.isForked ? m.parentMarketId : undefined,
          category: (meta?.category as ApiMarket['category']) || 'custom',
          oracleType: meta?.oracleType || 'manual',
          oracleSource: meta?.oracleSource || undefined,
        };
      })
    );

    // Apply filters
    if (statusFilter) {
      markets = markets.filter((m) => m.status === statusFilter);
    }
    if (categoryFilter) {
      markets = markets.filter((m) => m.category === categoryFilter);
    }

    // Apply limit
    const total = markets.length;
    markets = markets.slice(0, limit);

    return NextResponse.json({ markets, total });
  } catch (error) {
    console.error('[API /markets] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
