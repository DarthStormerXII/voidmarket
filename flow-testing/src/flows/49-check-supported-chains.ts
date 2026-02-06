/**
 * Check supported blockchains for Developer-Controlled Wallets
 */

import 'dotenv/config';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

async function main() {
  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });

  console.log('Checking supported blockchains...');
  console.log('');

  // List existing wallets to see what blockchains are used
  const wallets = await circle.listWallets({});
  const blockchains = new Set<string>();

  for (const w of wallets.data?.wallets || []) {
    blockchains.add(w.blockchain!);
  }

  console.log('Blockchains from existing wallets:');
  for (const b of blockchains) {
    console.log(`  - ${b}`);
  }

  console.log('');

  // Try common blockchain identifiers
  const testChains = [
    'ETH-SEPOLIA',
    'ETH_SEPOLIA',
    'ETHEREUM-SEPOLIA',
    'SEPOLIA',
    'BASE-SEPOLIA',
    'BASE_SEPOLIA',
    'AVAX-FUJI',
    'AVALANCHE-FUJI',
    'ARB-SEPOLIA',
    'MATIC-AMOY',
    'POLYGON-AMOY',
    'SOL-DEVNET',
    'ARC-TESTNET',
  ];

  console.log('Testing blockchain identifiers...');

  const walletSets = await circle.listWalletSets();
  const walletSetId = walletSets.data?.walletSets?.[0]?.id;

  if (!walletSetId) {
    console.log('No wallet set available');
    return;
  }

  for (const chain of testChains) {
    try {
      const result = await circle.createWallets({
        walletSetId,
        blockchains: [chain],
        count: 1,
        refId: `test_chain_${chain}_${Date.now()}`,
      });

      if (result.data?.wallets?.[0]) {
        console.log(`  ✓ ${chain} - SUPPORTED`);
      }
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('not supported') || msg.includes('deprecated')) {
        console.log(`  ✗ ${chain} - Not supported`);
      } else {
        console.log(`  ? ${chain} - Error: ${msg.slice(0, 40)}`);
      }
    }
  }
}

main().catch(console.error);
