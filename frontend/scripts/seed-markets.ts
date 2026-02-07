/**
 * Seed Markets Script
 *
 * Creates public prediction markets on Arc Testnet via the API.
 * Each market gets an ENS subdomain automatically.
 *
 * Usage:
 *   npx tsx scripts/seed-markets.ts
 *
 * Prerequisites:
 *   - Dev server running at http://localhost:3005
 *   - A wallet must exist for the seeder telegram user ID
 *     (the /api/market/create route uses getWalletByRefId)
 *
 * Set SEED_TELEGRAM_USER_ID env var or defaults to "test_user_123".
 * Set BASE_URL env var or defaults to "http://localhost:3005".
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';
const TELEGRAM_USER_ID = process.env.SEED_TELEGRAM_USER_ID || 'test_user_123';

interface MarketSeed {
  question: string;
  category: string;
  oracleType: string;
  daysUntilDeadline: number;
  daysUntilResolution: number;
}

const MARKETS: MarketSeed[] = [
  {
    question: 'Will Bitcoin reach $150,000 by end of 2026?',
    category: 'crypto',
    oracleType: 'manual',
    daysUntilDeadline: 30,
    daysUntilResolution: 31,
  },
  {
    question: 'Will Ethereum flip Bitcoin in market cap this cycle?',
    category: 'crypto',
    oracleType: 'manual',
    daysUntilDeadline: 60,
    daysUntilResolution: 61,
  },
  {
    question: 'Will Solana TVL surpass $50 billion in 2026?',
    category: 'crypto',
    oracleType: 'manual',
    daysUntilDeadline: 45,
    daysUntilResolution: 46,
  },
  {
    question: 'Will the US pass a stablecoin regulatory framework by Q3 2026?',
    category: 'politics',
    oracleType: 'manual',
    daysUntilDeadline: 90,
    daysUntilResolution: 91,
  },
  {
    question: 'Will a major bank launch a public blockchain product in 2026?',
    category: 'crypto',
    oracleType: 'manual',
    daysUntilDeadline: 120,
    daysUntilResolution: 121,
  },
  {
    question: 'Will AI-generated art win a major award in 2026?',
    category: 'culture',
    oracleType: 'manual',
    daysUntilDeadline: 60,
    daysUntilResolution: 61,
  },
  {
    question: 'Will Circle IPO before end of 2026?',
    category: 'crypto',
    oracleType: 'manual',
    daysUntilDeadline: 90,
    daysUntilResolution: 91,
  },
  {
    question: 'Will total crypto market cap reach $10 trillion in 2026?',
    category: 'crypto',
    oracleType: 'manual',
    daysUntilDeadline: 120,
    daysUntilResolution: 121,
  },
  {
    question: 'Will a country adopt Bitcoin as legal tender in 2026?',
    category: 'politics',
    oracleType: 'manual',
    daysUntilDeadline: 180,
    daysUntilResolution: 181,
  },
  {
    question: 'Will the Champions League final exceed 500 million viewers?',
    category: 'sports',
    oracleType: 'manual',
    daysUntilDeadline: 90,
    daysUntilResolution: 91,
  },
];

async function ensureWallet() {
  console.log(`\n[1/3] Ensuring wallet exists for user: ${TELEGRAM_USER_ID}`);

  const res = await fetch(`${BASE_URL}/api/wallet?telegramUserId=${TELEGRAM_USER_ID}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get/create wallet: ${err.error || res.statusText}`);
  }

  const data = await res.json();
  console.log(`  Wallet: ${data.address} (${data.isNew ? 'NEW' : 'existing'})`);
  return data;
}

async function createMarket(seed: MarketSeed, index: number) {
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + seed.daysUntilDeadline * 24 * 60 * 60;
  const resolutionDeadline = now + seed.daysUntilResolution * 24 * 60 * 60;

  const res = await fetch(`${BASE_URL}/api/market/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegramUserId: TELEGRAM_USER_ID,
      question: seed.question,
      deadline,
      resolutionDeadline,
      category: seed.category,
      oracleType: seed.oracleType,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`  [${index + 1}] FAILED: ${seed.question.slice(0, 50)}... — ${err.error || res.statusText}`);
    return null;
  }

  const data = await res.json();
  const slug = seed.question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  console.log(`  [${index + 1}] OK: ${slug}.voidmarket.eth`);
  console.log(`       txId: ${data.transactionId || 'pending'}`);
  return data;
}

async function main() {
  console.log('=== VoidMarket — Seed Markets ===');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Markets to create: ${MARKETS.length}`);

  await ensureWallet();

  console.log(`\n[2/3] Creating ${MARKETS.length} markets...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < MARKETS.length; i++) {
    const result = await createMarket(MARKETS[i], i);
    if (result) {
      success++;
    } else {
      failed++;
    }
    // Small delay between calls to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n[3/3] Done!`);
  console.log(`  Created: ${success}/${MARKETS.length}`);
  if (failed > 0) console.log(`  Failed: ${failed}`);
  console.log(`\nENS subdomains are now resolvable via the CCIP-Read gateway.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
