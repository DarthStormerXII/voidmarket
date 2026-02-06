/**
 * GET /api/wallet
 *
 * Get or create wallet for a Telegram user
 * Input: ?telegramUserId=123456
 * Output: { walletId, address, isNew }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateWallet } from '@/lib/services/circle/wallet';

export async function GET(request: NextRequest) {
  try {
    const telegramUserId = request.nextUrl.searchParams.get('telegramUserId');

    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'Missing telegramUserId parameter' },
        { status: 400 }
      );
    }

    // Use tg_ prefix for deterministic wallet lookup
    const refId = `tg_${telegramUserId}`;

    const wallet = await getOrCreateWallet(refId);

    return NextResponse.json({
      walletId: wallet.walletId,
      address: wallet.address,
      isNew: wallet.isNew,
    });
  } catch (error) {
    console.error('[API /wallet] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get/create wallet' },
      { status: 500 }
    );
  }
}
