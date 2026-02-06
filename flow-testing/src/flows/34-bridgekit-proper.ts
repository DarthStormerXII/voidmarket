/**
 * Test Circle BridgeKit SDK properly
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { createAdapterFromPrivateKey as createSolanaAdapterFromPrivateKey } from '@circle-fin/adapter-solana';
import { inspect } from 'util';

async function main() {
  console.log('='.repeat(70));
  console.log('BridgeKit SDK Proper Test');
  console.log('='.repeat(70));
  console.log('');

  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;

  if (!evmPrivateKey || !solanaPrivateKey) {
    console.error('Missing DEPLOYER_PRIVATE_KEY or SOLANA_PRIVATE_KEY');
    process.exit(1);
  }

  try {
    // Initialize BridgeKit
    const kit = new BridgeKit();

    console.log('Getting supported chains...');
    const chains = await kit.getSupportedChains();
    console.log('Supported chains:', chains);
    console.log('');

    // Initialize adapters
    console.log('Initializing adapters...');

    const viemAdapter = createViemAdapterFromPrivateKey({
      privateKey: evmPrivateKey,
    });

    const solanaAdapter = createSolanaAdapterFromPrivateKey({
      privateKey: solanaPrivateKey,
    });

    console.log('EVM adapter address:', await viemAdapter.getAddress?.() || 'unknown');
    console.log('Solana adapter address:', await solanaAdapter.getAddress?.() || 'unknown');
    console.log('');

    // Try to estimate a transfer
    console.log('Estimating transfer: Ethereum_Sepolia → Solana_Devnet (0.01 USDC)...');

    try {
      const estimate = await kit.estimate({
        from: { adapter: viemAdapter, chain: 'Ethereum_Sepolia' },
        to: { adapter: solanaAdapter, chain: 'Solana_Devnet' },
        amount: '0.01',
      });

      console.log('Estimate:', inspect(estimate, false, null, true));
    } catch (estErr: any) {
      console.log('Estimate error:', estErr.message);
    }

    console.log('');

    // Check if Arc is supported
    console.log('Checking Arc support...');
    try {
      const arcEstimate = await kit.estimate({
        from: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        to: { adapter: solanaAdapter, chain: 'Solana_Devnet' },
        amount: '0.01',
      });
      console.log('Arc estimate:', inspect(arcEstimate, false, null, true));
    } catch (arcErr: any) {
      console.log('Arc not supported or error:', arcErr.message);
    }

    // Try different chain naming conventions
    const chainVariants = [
      'Arc',
      'ARC',
      'arc',
      'Arc-Testnet',
      'ARC-TESTNET',
      'arc-testnet',
    ];

    console.log('');
    console.log('Trying different chain names for Arc...');
    for (const chainName of chainVariants) {
      try {
        await kit.estimate({
          from: { adapter: viemAdapter, chain: chainName },
          to: { adapter: solanaAdapter, chain: 'Solana_Devnet' },
          amount: '0.01',
        });
        console.log(`  ${chainName}: ✓ supported`);
      } catch (e: any) {
        console.log(`  ${chainName}: ✗ ${e.message.slice(0, 50)}`);
      }
    }

  } catch (err: any) {
    console.error('Error:', err.message || err);
    console.error(inspect(err, false, null, true));
  }
}

main().catch(console.error);
