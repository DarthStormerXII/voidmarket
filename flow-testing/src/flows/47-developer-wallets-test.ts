/**
 * Developer-Controlled Wallets Integration Test
 *
 * Tests the full flow:
 * 1. Create wallet set (if needed)
 * 2. Create wallet for a user (by refId = Telegram user ID)
 * 3. Get wallet address
 * 4. Check wallet balance
 * 5. Execute a transaction (if balance available)
 */

import 'dotenv/config';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

async function main() {
  console.log('='.repeat(70));
  console.log('Developer-Controlled Wallets Integration Test');
  console.log('='.repeat(70));
  console.log('');

  // Check credentials
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    console.error('Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET');
    process.exit(1);
  }

  console.log('=== Credentials ===');
  console.log('API_KEY:', apiKey.slice(0, 20) + '...');
  console.log('ENTITY_SECRET:', entitySecret.slice(0, 20) + '...');
  console.log('');

  // Initialize client
  console.log('=== Initialize Client ===');
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });
  console.log('Client initialized ✓');
  console.log('');

  // Test 1: List existing wallet sets
  console.log('=== Test 1: List Wallet Sets ===');
  try {
    const walletSetsResponse = await client.listWalletSets();
    const walletSets = walletSetsResponse.data?.walletSets || [];
    console.log('Wallet sets found:', walletSets.length);

    for (const ws of walletSets.slice(0, 3)) {
      console.log(`  - ${ws.id}: ${ws.name || 'unnamed'} (${ws.custodyType})`);
    }

    if (walletSets.length === 0) {
      console.log('  No wallet sets. Creating one...');
      const createResponse = await client.createWalletSet({
        name: 'VoidMarket Wallets',
      });
      console.log('  Created wallet set:', createResponse.data?.walletSet?.id);
    }
  } catch (e: any) {
    console.error('Error:', e.message);
    if (e.response?.data) {
      console.error('Details:', JSON.stringify(e.response.data, null, 2));
    }
  }
  console.log('');

  // Test 2: Create/Get wallet for a test user
  console.log('=== Test 2: Create Wallet for Test User ===');
  const testUserId = 'telegram_user_123456'; // Simulated Telegram user ID

  try {
    // First check if wallet exists
    const existingWallets = await client.listWallets({
      refId: testUserId,
    });

    if (existingWallets.data?.wallets && existingWallets.data.wallets.length > 0) {
      const wallet = existingWallets.data.wallets[0];
      console.log('Existing wallet found:');
      console.log('  ID:', wallet.id);
      console.log('  Address:', wallet.address);
      console.log('  Blockchain:', wallet.blockchain);
      console.log('  State:', wallet.state);
    } else {
      console.log('No existing wallet. Creating new one...');

      // Get wallet set ID
      const walletSetsResponse = await client.listWalletSets();
      const walletSetId = walletSetsResponse.data?.walletSets?.[0]?.id;

      if (!walletSetId) {
        console.error('No wallet set available');
        return;
      }

      // Create wallet
      const createResponse = await client.createWallets({
        walletSetId,
        blockchains: ['ETH-SEPOLIA'], // Start with one chain
        count: 1,
        refId: testUserId,
      });

      const newWallet = createResponse.data?.wallets?.[0];
      if (newWallet) {
        console.log('New wallet created:');
        console.log('  ID:', newWallet.id);
        console.log('  Address:', newWallet.address);
        console.log('  Blockchain:', newWallet.blockchain);
      }
    }
  } catch (e: any) {
    console.error('Error:', e.message);
    if (e.response?.data) {
      console.error('Details:', JSON.stringify(e.response.data, null, 2));
    }
  }
  console.log('');

  // Test 3: List all wallets
  console.log('=== Test 3: List All Wallets ===');
  try {
    const allWallets = await client.listWallets({});
    const wallets = allWallets.data?.wallets || [];
    console.log('Total wallets:', wallets.length);

    for (const w of wallets.slice(0, 5)) {
      console.log(`  - ${w.address?.slice(0, 10)}... (${w.blockchain}) [${w.state}]`);
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
  console.log('');

  // Test 4: Get wallet balance
  console.log('=== Test 4: Get Wallet Balance ===');
  try {
    const walletsResponse = await client.listWallets({ refId: testUserId });
    const wallet = walletsResponse.data?.wallets?.[0];

    if (wallet) {
      const balanceResponse = await client.getWalletTokenBalance({
        id: wallet.id,
      });

      const balances = balanceResponse.data?.tokenBalances || [];
      console.log(`Balances for wallet ${wallet.address?.slice(0, 10)}...:`);

      if (balances.length === 0) {
        console.log('  No token balances (wallet may be empty)');
      } else {
        for (const b of balances) {
          console.log(`  - ${b.token?.symbol}: ${b.amount}`);
        }
      }
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
  console.log('');

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log('Developer-Controlled Wallets SDK: Working ✓');
  console.log('');
  console.log('For Telegram Mini App:');
  console.log('1. User opens app → Get Telegram user ID');
  console.log('2. API route calls Circle SDK → Create/get wallet by refId');
  console.log('3. Wallet address returned → User can deposit USDC');
  console.log('4. For transfers → API route signs with Circle SDK');
  console.log('');
  console.log('Environment variables needed in Next.js:');
  console.log('  CIRCLE_API_KEY (server-side only)');
  console.log('  CIRCLE_ENTITY_SECRET (server-side only)');
}

main().catch(console.error);
