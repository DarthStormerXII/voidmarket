import 'dotenv/config';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

async function main() {
  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });

  // Check demo user wallets
  const demoWallets = await circle.listWallets({ refId: 'tg_user_voidmarket_demo' });
  console.log('Demo user wallets:');
  for (const w of demoWallets.data?.wallets || []) {
    console.log(`  ${w.blockchain}: ${w.address} (${w.state})`);
  }

  // Check all wallets
  console.log('');
  console.log('All wallets:');
  const allWallets = await circle.listWallets({});
  for (const w of allWallets.data?.wallets || []) {
    console.log(`  ${w.blockchain}: ${w.address} [${w.refId || 'no refId'}]`);
  }

  // Check if ARC-TESTNET wallet exists for demo user
  const arcWallet = demoWallets.data?.wallets?.find(w => w.blockchain === 'ARC-TESTNET');
  if (!arcWallet) {
    console.log('');
    console.log('Creating ARC-TESTNET wallet for demo user...');

    const walletSets = await circle.listWalletSets();
    const walletSetId = walletSets.data?.walletSets?.[0]?.id;

    if (walletSetId) {
      const result = await circle.createWallets({
        walletSetId,
        blockchains: ['ARC-TESTNET'],
        count: 1,
        refId: 'tg_user_voidmarket_demo',
      });

      const newWallet = result.data?.wallets?.[0];
      if (newWallet) {
        console.log('Created:', newWallet.blockchain, newWallet.address);
      }
    }
  }
}

main().catch(console.error);
