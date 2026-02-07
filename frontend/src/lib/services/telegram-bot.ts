/**
 * Telegram Bot Service
 *
 * Lazy-initialized grammY Bot instance for sending DMs.
 * Only uses the Bot API client for outbound messages —
 * no long-polling or webhook is started.
 */

import { Bot } from 'grammy';

let _bot: Bot | null = null;

/**
 * Get or create the Bot instance (lazy singleton).
 */
function getBot(): Bot {
  if (!_bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }
    _bot = new Bot(token);
  }
  return _bot;
}

/**
 * Send a Telegram DM to a user.
 *
 * @param telegramId - Numeric Telegram user ID (as string)
 * @param message    - Plain-text or Markdown message body
 * @returns true if sent successfully, false otherwise
 */
export async function sendTelegramDM(
  telegramId: string,
  message: string
): Promise<boolean> {
  try {
    const bot = getBot();
    await bot.api.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
    });
    return true;
  } catch (error) {
    console.error(
      `[Telegram] Failed to send DM to ${telegramId}:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
