/**
 * GET /api/markets
 *
 * List markets from on-chain + DB metadata.
 * Query params:
 *   - search   (string)  — case-insensitive substring match on question text
 *   - status   (string)  — "active" | "resolved" | "cancelled" | "all" (default "all")
 *   - category (string)  — market category filter
 *   - sort     (string)  — "newest" (default) | "ending-soon" | "pool-size" | "hot"
 *   - offset   (number)  — pagination offset (default 0)
 *   - limit    (number)  — max results per page (default 20, max 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllMarkets, getMarketBetIds } from '@/lib/services/contracts/market-service';
import { getAllMarketMetadata } from '@/lib/services/db';
import type { ApiMarket } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchFilter = searchParams.get('search')?.trim() || '';
    const statusFilter = searchParams.get('status') || 'all';
    const categoryFilter = searchParams.get('category');
    const sortBy = searchParams.get('sort') || 'newest';
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));

    // Fetch on-chain markets and DB metadata in parallel
    const [onChainMarkets, dbMetadata] = await Promise.all([
      getAllMarkets(),
      getAllMarketMetadata(),
    ]);

    // Build metadata lookup by onChainId
    const metadataMap = new Map(dbMetadata.map((m) => [m.onChainId, m]));

    // Map all markets to ApiMarket shape
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

    // --- Apply filters ---

    // Search: case-insensitive substring match on question
    if (searchFilter) {
      const query = searchFilter.toLowerCase();
      markets = markets.filter((m) => m.question.toLowerCase().includes(query));
    }

    // Status filter (skip when "all")
    if (statusFilter && statusFilter !== 'all') {
      markets = markets.filter((m) => m.status === statusFilter);
    }

    // Category filter
    if (categoryFilter) {
      markets = markets.filter((m) => m.category === categoryFilter);
    }

    // --- Apply sort ---
    switch (sortBy) {
      case 'ending-soon':
        markets.sort(
          (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
        break;
      case 'pool-size':
        markets.sort((a, b) => parseFloat(b.totalPool) - parseFloat(a.totalPool));
        break;
      case 'hot':
        markets.sort((a, b) => b.totalBets - a.totalBets);
        break;
      case 'newest':
      default:
        // Newest = highest id first (most recently created on-chain)
        markets.sort((a, b) => b.id - a.id);
        break;
    }

    // --- Apply pagination ---
    const total = markets.length;
    markets = markets.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({ markets, total, offset, limit, hasMore });
  } catch (error) {
    console.error('[API /markets] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
