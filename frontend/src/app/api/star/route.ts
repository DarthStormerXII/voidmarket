/**
 * GET /api/star  — Get star profile (DB + on-chain)
 * POST /api/star — Upsert star profile in DB
 *
 * Query: ?telegramUserId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateWallet } from '@/lib/services/circle/wallet';
import {
  upsertStar,
  getStarByTelegramId,
  getStarByAddress,
  checkEnsNameCollision,
} from '@/lib/services/db';
import { getMemberByAddress } from '@/lib/services/contracts/cluster-service';
import type { ApiStar } from '@/types';

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

    // Look up star in DB by telegram ID
    const dbStar = await getStarByTelegramId(telegramUserId);

    if (!dbStar) {
      return NextResponse.json({ star: null });
    }

    // Enrich with on-chain data (photons, cluster membership)
    let onChainPhotons = 0;
    let onChainClusterId: number | undefined;

    try {
      const member = await getMemberByAddress(dbStar.walletAddress);
      if (member.isActive) {
        onChainPhotons = member.photons;
        onChainClusterId = member.clusterId > 0 ? member.clusterId : undefined;
      }
    } catch {
      // Member might not exist on-chain yet
    }

    const star: ApiStar = {
      name: dbStar.name,
      address: dbStar.walletAddress,
      telegramId: dbStar.telegramId || undefined,
      starType: dbStar.starType as ApiStar['starType'],
      description: dbStar.description || undefined,
      clusterId: onChainClusterId,
      totalPhotons: onChainPhotons || dbStar.totalPhotons,
      betsWon: dbStar.betsWon,
      betsLost: dbStar.betsLost,
    };

    return NextResponse.json({ star });
  } catch (error) {
    console.error('[API /star GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch star' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { telegramUserId, name, starType, description } = body;

    if (!telegramUserId || !name || !starType) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramUserId, name, starType' },
        { status: 400 }
      );
    }

    // Check for ENS name collision across all entity types
    const collision = await checkEnsNameCollision(name, 'star');
    if (collision.taken) {
      return NextResponse.json(
        { error: `Name "${name}" is already taken by a ${collision.ownedBy}. Choose a different name.` },
        { status: 409 }
      );
    }

    // Get or create wallet
    const refId = `tg_${telegramUserId}`;
    const wallet = await getOrCreateWallet(refId);

    // Upsert star in DB
    const dbStar = await upsertStar({
      name,
      walletAddress: wallet.address,
      telegramId: telegramUserId,
      circleWalletId: wallet.walletId,
      starType,
      description,
    });

    const star: ApiStar = {
      name: dbStar.name,
      address: dbStar.walletAddress,
      telegramId: dbStar.telegramId || undefined,
      starType: dbStar.starType as ApiStar['starType'],
      description: dbStar.description || undefined,
      totalPhotons: dbStar.totalPhotons,
      betsWon: dbStar.betsWon,
      betsLost: dbStar.betsLost,
    };

    return NextResponse.json({ star, walletAddress: wallet.address });
  } catch (error) {
    console.error('[API /star POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upsert star' },
      { status: 500 }
    );
  }
}
