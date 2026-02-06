/**
 * Test Circle BridgeKit SDK for EVM ↔ Solana transfers
 *
 * BridgeKit handles all the complexity including Solana mint automatically.
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { createAdapterFromPrivateKey as createSolanaAdapterFromPrivateKey } from '@circle-fin/adapter-solana';
import { inspect } from 'util';

async function main() {
  console.log('='.repeat(70));
  console.log('BridgeKit SDK Test - Arc → Solana');
  console.log('='.repeat(70));
  console.log('');

  // Get private keys
  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;

  if (!evmPrivateKey || !solanaPrivateKey) {
    console.error('Missing DEPLOYER_PRIVATE_KEY or SOLANA_PRIVATE_KEY');
    process.exit(1);
  }

  console.log('Initializing BridgeKit...');

  try {
    // Initialize BridgeKit
    const kit = new BridgeKit();

    // Initialize adapters
    const viemAdapter = createViemAdapterFromPrivateKey({
      privateKey: evmPrivateKey,
    });

    const solanaAdapter = createSolanaAdapterFromPrivateKey({
      privateKey: solanaPrivateKey,
    });

    console.log('Adapters initialized.');
    console.log('');

    // Get supported chains
    console.log('Getting supported routes...');
    const routes = await kit.getRoutes();
    console.log('Supported routes:', routes?.length || 'unknown');

    // Log some route info
    if (routes && routes.length > 0) {
      console.log('Sample routes:');
      for (const route of routes.slice(0, 5)) {
        console.log(`  ${route.from} → ${route.to}`);
      }
    }

    console.log('');

    // Try to bridge from Ethereum Sepolia to Solana Devnet
    // Note: Arc might not be supported in BridgeKit yet
    console.log('Attempting bridge: Ethereum_Sepolia → Solana_Devnet');
    console.log('Amount: 0.01 USDC');
    console.log('');

    const result = await kit.bridge({
      from: { adapter: viemAdapter, chain: 'Ethereum_Sepolia' },
      to: { adapter: solanaAdapter, chain: 'Solana_Devnet' },
      amount: '0.01',
    });

    console.log('Bridge Result:');
    console.log(inspect(result, false, null, true));

  } catch (err: any) {
    console.error('Error:', err.message || err);
    if (err.cause) {
      console.error('Cause:', err.cause);
    }

    // Log available chains/methods
    console.log('');
    console.log('Checking BridgeKit capabilities...');
    try {
      const kit = new BridgeKit();
      console.log('BridgeKit methods:', Object.keys(kit));
    } catch (e) {
      console.error('Could not inspect BridgeKit:', e);
    }
  }
}

main().catch(console.error);
