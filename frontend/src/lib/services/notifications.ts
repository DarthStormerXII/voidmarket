/**
 * Notification Service
 *
 * Fire-and-forget notification triggers that send Telegram DMs
 * for key market events. All functions catch errors internally
 * and never throw.
 */

import { sendTelegramDM } from './telegram-bot';

/**
 * Notify all bettors that a market has been resolved.
 */
export async function notifyMarketResolved({
  marketId,
  question,
  outcome,
  bettorTelegramIds,
}: {
  marketId: number;
  question: string;
  outcome: string;
  bettorTelegramIds: string[];
}): Promise<void> {
  try {
    const message =
      `*Market Resolved*\n\n` +
      `Market #${marketId}: _${question}_\n\n` +
      `Outcome: *${outcome}*\n\n` +
      `Check VoidMarket to see if you won!`;

    await Promise.allSettled(
      bettorTelegramIds.map((id) => sendTelegramDM(id, message))
    );
  } catch (error) {
    console.error('[Notifications] notifyMarketResolved error:', error);
  }
}

/**
 * Notify bettors about an approaching reveal deadline.
 */
export async function notifyRevealDeadline({
  marketId,
  question,
  hoursRemaining,
  bettorTelegramIds,
}: {
  marketId: number;
  question: string;
  hoursRemaining: number;
  bettorTelegramIds: string[];
}): Promise<void> {
  try {
    const message =
      `*Reveal Deadline Approaching*\n\n` +
      `Market #${marketId}: _${question}_\n\n` +
      `You have *${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'}* left to reveal your bet.\n\n` +
      `Open VoidMarket to reveal now before your bet is forfeited!`;

    await Promise.allSettled(
      bettorTelegramIds.map((id) => sendTelegramDM(id, message))
    );
  } catch (error) {
    console.error('[Notifications] notifyRevealDeadline error:', error);
  }
}

/**
 * Notify two stars that they have been matched in a Nova round.
 */
export async function notifyNovaMatch({
  novaId,
  star1TelegramId,
  star2TelegramId,
  round,
}: {
  novaId: number;
  star1TelegramId: string;
  star2TelegramId: string;
  round: number;
}): Promise<void> {
  try {
    const message =
      `*Nova Match*\n\n` +
      `You have been matched in Nova #${novaId}, Round ${round}!\n\n` +
      `Open VoidMarket to view your matchup and compete.`;

    await Promise.allSettled([
      sendTelegramDM(star1TelegramId, message),
      sendTelegramDM(star2TelegramId, message),
    ]);
  } catch (error) {
    console.error('[Notifications] notifyNovaMatch error:', error);
  }
}

/**
 * Notify a bettor that their winnings are ready to claim.
 */
export async function notifyWinningsReady({
  betId,
  amount,
  bettorTelegramId,
}: {
  betId: number;
  amount: string;
  bettorTelegramId: string;
}): Promise<void> {
  try {
    const message =
      `*Winnings Ready!*\n\n` +
      `Your bet #${betId} won *${amount} USDC*!\n\n` +
      `Open VoidMarket to claim your winnings.`;

    await sendTelegramDM(bettorTelegramId, message);
  } catch (error) {
    console.error('[Notifications] notifyWinningsReady error:', error);
  }
}
