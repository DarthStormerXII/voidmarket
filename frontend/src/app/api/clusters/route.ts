/**
 * GET /api/clusters
 *
 * List clusters from on-chain + DB metadata.
 * Query: ?sort=energy&limit=10
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllClusters } from '@/lib/services/contracts/cluster-service';
import { getAllClusterMetadata } from '@/lib/services/db';
import type { ApiCluster } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'energy';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch on-chain clusters and DB metadata in parallel
    const [onChainClusters, dbMetadata] = await Promise.all([
      getAllClusters(),
      getAllClusterMetadata(),
    ]);

    // Build metadata lookup
    const metadataMap = new Map(dbMetadata.map((m) => [m.onChainId, m]));

    let clusters: ApiCluster[] = onChainClusters.map((c) => {
      const meta = metadataMap.get(c.id);
      return {
        id: c.id,
        name: c.name,
        description: meta?.description || undefined,
        leader: c.leader,
        energy: c.energy,
        novasWon: c.novasWon,
        totalNovas: c.totalNovas,
        isPrivate: c.isPrivate,
        memberCount: c.memberCount,
        maxMembers: c.maxMembers,
      };
    });

    // Sort
    if (sort === 'energy') {
      clusters.sort((a, b) => b.energy - a.energy);
    } else if (sort === 'members') {
      clusters.sort((a, b) => b.memberCount - a.memberCount);
    } else if (sort === 'novasWon') {
      clusters.sort((a, b) => b.novasWon - a.novasWon);
    }

    const total = clusters.length;
    clusters = clusters.slice(0, limit);

    return NextResponse.json({ clusters, total });
  } catch (error) {
    console.error('[API /clusters] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch clusters' },
      { status: 500 }
    );
  }
}
