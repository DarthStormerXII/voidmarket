/**
 * GET /api/leaderboard
 *
 * Leaderboard data for clusters, stars, and bettors.
 * Query: ?tab=clusters|stars|bettors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllClusters } from '@/lib/services/contracts/cluster-service';
import { getAllClusterMetadata, getTopStarsByPhotons, getTopStarsByActivity } from '@/lib/services/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'clusters';

    if (tab === 'clusters') {
      const [onChainClusters, dbMetadata] = await Promise.all([
        getAllClusters(),
        getAllClusterMetadata(),
      ]);

      const metadataMap = new Map(dbMetadata.map((m) => [m.onChainId, m]));

      const clusters = onChainClusters
        .map((c) => {
          const meta = metadataMap.get(c.id);
          return {
            id: c.id,
            name: c.name,
            description: meta?.description || undefined,
            leader: c.leader,
            energy: c.energy,
            novasWon: c.novasWon,
            totalNovas: c.totalNovas,
            memberCount: c.memberCount,
            maxMembers: c.maxMembers,
            isPrivate: c.isPrivate,
          };
        })
        .sort((a, b) => b.energy - a.energy)
        .slice(0, 20);

      return NextResponse.json({ entries: clusters, tab });
    }

    if (tab === 'stars') {
      const stars = await getTopStarsByPhotons(20);
      const entries = stars.map((s) => ({
        name: s.name,
        walletAddress: s.walletAddress,
        starType: s.starType,
        totalPhotons: s.totalPhotons,
        betsWon: s.betsWon,
        betsLost: s.betsLost,
      }));

      return NextResponse.json({ entries, tab });
    }

    if (tab === 'bettors') {
      const stars = await getTopStarsByActivity(20);
      const entries = stars.map((s) => ({
        name: s.name,
        walletAddress: s.walletAddress,
        starType: s.starType,
        totalPhotons: s.totalPhotons,
        betsWon: s.betsWon,
        betsLost: s.betsLost,
      }));

      return NextResponse.json({ entries, tab });
    }

    return NextResponse.json({ error: 'Invalid tab parameter' }, { status: 400 });
  } catch (error) {
    console.error('[API /leaderboard] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
