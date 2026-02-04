/**
 * VoidMarket Telegram Bot
 *
 * Commands for interacting with VoidMarket prediction markets
 */

import { Bot, Context, session, InlineKeyboard } from 'grammy';
import { getOrCreateWallet, getWalletBalance } from '../circle/wallet.js';
import { createUser, getUserByTelegramId, getProfileByUserId } from '../db/queries.js';
import { formatUSDC, truncateAddress } from '../../utils/format.js';
import 'dotenv/config';

// Bot token from environment
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
}

// Mini App URL
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://t.me/voidmarket_bot/app';

// Session data type
interface SessionData {
  step?: string;
  tempData?: Record<string, unknown>;
}

// Custom context with session
type BotContext = Context & { session: SessionData };

// Create bot instance
const bot = new Bot<BotContext>(BOT_TOKEN);

// Use session middleware
bot.use(
  session({
    initial: (): SessionData => ({}),
  })
);

// ============================================================================
// Command Handlers
// ============================================================================

/**
 * /start - Welcome and registration
 */
bot.command('start', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) {
    return ctx.reply('Could not identify user');
  }

  try {
    // Check if user already exists
    let user = await getUserByTelegramId(telegramId);

    if (!user) {
      // Create wallet with RefID based on Telegram ID
      const refId = `telegram:${telegramId}`;
      const wallet = await getOrCreateWallet(refId);

      // Create user in database
      user = await createUser({
        telegramId,
        username: ctx.from?.username,
        walletId: wallet.walletId,
        walletAddress: wallet.address,
        refId,
      });

      await ctx.reply(
        `🌟 Welcome to VoidMarket!\n\n` +
          `Your wallet has been created:\n` +
          `\`${wallet.address}\`\n\n` +
          `Fund your wallet with USDC to start betting on predictions.\n\n` +
          `Use /help to see available commands.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `Welcome back to VoidMarket! 🌟\n\n` +
          `Your wallet: \`${truncateAddress(user.walletAddress)}\`\n\n` +
          `Use /balance to check your funds or /bet to place predictions.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('Start command error:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
});

/**
 * /help - Show available commands
 */
bot.command('help', async (ctx) => {
  await ctx.reply(
    `🎯 *VoidMarket Commands*\n\n` +
      `*Wallet*\n` +
      `/balance - Check your USDC balance\n` +
      `/deposit - Get deposit instructions\n` +
      `/withdraw <amount> <address> - Withdraw USDC\n\n` +
      `*Betting*\n` +
      `/bet - Open Mini App to place bets\n` +
      `/markets - View open markets\n` +
      `/mybets - View your active bets\n` +
      `/reveal <betId> - Reveal your bet\n` +
      `/claim <betId> - Claim winnings\n\n` +
      `*Profile*\n` +
      `/profile - View your star profile\n` +
      `/setname <name> - Set display name\n\n` +
      `*Clusters*\n` +
      `/cluster - View your cluster\n` +
      `/clusters - Browse public clusters\n` +
      `/createcluster <name> - Create a new cluster\n` +
      `/join <code> - Join cluster with invite code\n\n` +
      `*Nova Battles*\n` +
      `/novas - View active Nova battles\n` +
      `/rewards - Check unclaimed rewards`,
    { parse_mode: 'Markdown' }
  );
});

/**
 * /balance - Check wallet balance
 */
bot.command('balance', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      return ctx.reply('Please use /start to create your wallet first.');
    }

    const balance = await getWalletBalance(user.walletId);

    await ctx.reply(
      `💰 *Your Balance*\n\n` +
        `USDC: ${formatUSDC(BigInt(balance.native || '0'))}\n\n` +
        `Wallet: \`${truncateAddress(user.walletAddress)}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Balance command error:', error);
    await ctx.reply('Could not fetch balance. Please try again.');
  }
});

/**
 * /deposit - Show deposit instructions
 */
bot.command('deposit', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      return ctx.reply('Please use /start to create your wallet first.');
    }

    await ctx.reply(
      `💳 *Deposit USDC*\n\n` +
        `Send USDC to your wallet address:\n\n` +
        `\`${user.walletAddress}\`\n\n` +
        `*Supported Networks:*\n` +
        `• Arc Testnet (native)\n` +
        `• Sepolia (via CCTP)\n` +
        `• Base Sepolia (via CCTP)\n\n` +
        `_Cross-chain deposits may take 10-20 minutes._`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Deposit command error:', error);
    await ctx.reply('An error occurred. Please try again.');
  }
});

/**
 * /bet - Open Mini App for betting
 */
bot.command('bet', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('Open VoidMarket', MINI_APP_URL);

  await ctx.reply('🎯 *Place a Bet*\n\nOpen the Mini App to browse markets and place bets:', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
});

/**
 * /profile - View user profile
 */
bot.command('profile', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      return ctx.reply('Please use /start to create your wallet first.');
    }

    const profile = await getProfileByUserId(user.id);

    if (!profile) {
      return ctx.reply(
        'You haven\'t created a profile yet.\n\nUse /setname <name> to get started!'
      );
    }

    await ctx.reply(
      `⭐ *${profile.displayName}*\n\n` +
        `Type: ${profile.starType}\n` +
        `Photons: ${profile.photons}\n` +
        `Total Bets: ${profile.totalBets}\n` +
        `Wins: ${profile.totalWins}\n` +
        `Earnings: ${formatUSDC(profile.totalEarnings)}\n\n` +
        (profile.ensSubdomain ? `ENS: \`${profile.ensSubdomain}\`` : ''),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Profile command error:', error);
    await ctx.reply('Could not fetch profile. Please try again.');
  }
});

/**
 * /markets - List open markets (preview)
 */
bot.command('markets', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('Browse Markets', MINI_APP_URL);

  await ctx.reply(
    '📊 *Open Markets*\n\nView and bet on prediction markets in the Mini App:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );
});

/**
 * /mybets - View user's bets
 */
bot.command('mybets', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('View My Bets', `${MINI_APP_URL}?tab=mybets`);

  await ctx.reply('🎲 *Your Bets*\n\nView your active and past bets in the Mini App:', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
});

/**
 * /cluster - View current cluster
 */
bot.command('cluster', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('View Cluster', `${MINI_APP_URL}?tab=cluster`);

  await ctx.reply('👥 *Your Cluster*\n\nView your cluster details in the Mini App:', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
});

/**
 * /novas - View active Nova battles
 */
bot.command('novas', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('View Novas', `${MINI_APP_URL}?tab=novas`);

  await ctx.reply('⚔️ *Nova Battles*\n\nView active cluster battles in the Mini App:', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
});

// ============================================================================
// Error Handler
// ============================================================================

bot.catch((err) => {
  console.error('Bot error:', err);
});

// ============================================================================
// Start Bot
// ============================================================================

export function startBot() {
  console.log('Starting VoidMarket Telegram Bot...');
  bot.start();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startBot();
}

export { bot };
