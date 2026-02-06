/**
 * GET /api/novas/[id]
 *
 * Get a single nova by on-chain ID with matches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNovaById, getNovaMatches } from '@/lib/services/contracts/nova-service';
import type { ApiNova, ApiMatch } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const novaId = parseInt(id);

    if (isNaN(novaId) || novaId <= 0) {
      return NextResponse.json({ error: 'Invalid nova ID' }, { status: 400 });
    }

    // Fetch nova and matches in parallel
    const [onChainNova, matches] = await Promise.all([
      getNovaById(novaId),
      getNovaMatches(novaId),
    ]);

    const nova: ApiNova = {
      id: onChainNova.id,
      cluster1Id: onChainNova.cluster1Id,
      cluster2Id: onChainNova.cluster2Id,
      totalRounds: onChainNova.totalRounds,
      currentRound: onChainNova.currentRound,
      status: onChainNova.status,
      prizePool: onChainNova.prizePool,
      winningClusterId: onChainNova.winningClusterId || undefined,
      cluster1TotalPhotons: onChainNova.cluster1TotalPhotons,
      cluster2TotalPhotons: onChainNova.cluster2TotalPhotons,
      startedAt: new Date(onChainNova.startedAt * 1000).toISOString(),
      matchesPerRound: onChainNova.matchesPerRound,
    };

    const apiMatches: ApiMatch[] = matches.map((m) => ({
      id: m.id,
      novaId: m.novaId,
      round: m.round,
      star1: m.star1,
      star2: m.star2,
      marketId: m.marketId,
      status: m.status,
      winner: m.winner !== '0x0000000000000000000000000000000000000000' ? m.winner : undefined,
      star1Photons: m.star1Photons,
      star2Photons: m.star2Photons,
      bettingDeadline: new Date(m.bettingDeadline * 1000).toISOString(),
    }));

    return NextResponse.json({ nova, matches: apiMatches });
  } catch (error) {
    console.error('[API /novas/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch nova' },
      { status: 500 }
    );
  }
}
