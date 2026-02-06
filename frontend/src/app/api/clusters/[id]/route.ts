/**
 * GET /api/clusters/[id]
 *
 * Get a single cluster by on-chain ID with member details.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getClusterById,
  getClusterMemberDetails,
} from '@/lib/services/contracts/cluster-service';
import { getClusterMetadata } from '@/lib/services/db';
import type { ApiCluster, ApiMember } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clusterId = parseInt(id);

    if (isNaN(clusterId) || clusterId <= 0) {
      return NextResponse.json({ error: 'Invalid cluster ID' }, { status: 400 });
    }

    // Fetch on-chain data and DB metadata in parallel
    const [onChainCluster, members, meta] = await Promise.all([
      getClusterById(clusterId),
      getClusterMemberDetails(clusterId),
      getClusterMetadata(clusterId),
    ]);

    const cluster: ApiCluster = {
      id: onChainCluster.id,
      name: onChainCluster.name,
      description: meta?.description || undefined,
      leader: onChainCluster.leader,
      energy: onChainCluster.energy,
      novasWon: onChainCluster.novasWon,
      totalNovas: onChainCluster.totalNovas,
      isPrivate: onChainCluster.isPrivate,
      memberCount: onChainCluster.memberCount,
      maxMembers: onChainCluster.maxMembers,
    };

    const apiMembers: ApiMember[] = members.map((m) => ({
      address: m.memberAddress,
      clusterId: m.clusterId,
      photons: m.photons,
      joinedAt: new Date(m.joinedAt * 1000).toISOString(),
      isActive: m.isActive,
    }));

    return NextResponse.json({ cluster, members: apiMembers });
  } catch (error) {
    console.error('[API /clusters/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch cluster' },
      { status: 500 }
    );
  }
}
