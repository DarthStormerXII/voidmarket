/**
 * Chain Support Matrix: Gateway API vs BridgeKit (CCTP)
 *
 * Tests all available chains on both systems to determine:
 * 1. Which chains work with Gateway API
 * 2. Which chains work with BridgeKit (CCTP)
 * 3. Bidirectional transfer support
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapter } from '@circle-fin/adapter-viem-v2';
import { createAdapterFromPrivateKey as createSolanaAdapter } from '@circle-fin/adapter-solana';
import { getGatewayInfo } from '../services/circle/gateway-transfer.js';

async function main() {
  console.log('='.repeat(70));
  console.log('Chain Support Matrix: Gateway API vs BridgeKit (CCTP)');
  console.log('='.repeat(70));
  console.log('');

  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;

  if (!evmPrivateKey) {
    console.error('Missing EVM private key');
    process.exit(1);
  }

  // ========================================================================
  // PART 1: Gateway API Supported Chains
  // ========================================================================
  console.log('=== GATEWAY API SUPPORTED CHAINS ===');
  console.log('');

  try {
    const gatewayInfo = await getGatewayInfo();

    console.log('Gateway domains:');
    console.log('');

    const gatewayChains: { name: string; domain: number; usdc: string }[] = [];

    for (const domain of gatewayInfo.domains) {
      const chainName = getChainNameFromDomain(domain.domain);
      console.log(`  Domain ${domain.domain}: ${chainName}`);
      console.log(`    USDC: ${domain.usdcAddress}`);
      console.log(`    Status: ${domain.status || 'active'}`);
      console.log('');

      gatewayChains.push({
        name: chainName,
        domain: domain.domain,
        usdc: domain.usdcAddress,
      });
    }

    console.log('Total Gateway chains:', gatewayChains.length);
  } catch (e: any) {
    console.error('Gateway API error:', e.message);
  }

  console.log('');
  console.log('');

  // ========================================================================
  // PART 2: BridgeKit (CCTP) Supported Chains
  // ========================================================================
  console.log('=== BRIDGEKIT (CCTP) SUPPORTED CHAINS ===');
  console.log('');

  try {
    const kit = new BridgeKit();
    const chains = await kit.getSupportedChains();

    console.log('BridgeKit supported chains:');
    console.log('');

    // Separate testnet and mainnet
    const testnets = chains.filter((c: string) =>
      c.includes('Testnet') || c.includes('Devnet') || c.includes('Sepolia') || c.includes('Amoy') || c.includes('Blaze')
    );
    const mainnets = chains.filter((c: string) => !testnets.includes(c));

    console.log('Testnets:');
    for (const chain of testnets.sort()) {
      console.log(`  - ${chain}`);
    }

    console.log('');
    console.log('Mainnets:');
    for (const chain of mainnets.sort()) {
      console.log(`  - ${chain}`);
    }

    console.log('');
    console.log('Total BridgeKit chains:', chains.length);
    console.log('  Testnets:', testnets.length);
    console.log('  Mainnets:', mainnets.length);
  } catch (e: any) {
    console.error('BridgeKit error:', e.message);
  }

  console.log('');
  console.log('');

  // ========================================================================
  // PART 3: Route Availability Matrix
  // ========================================================================
  console.log('=== ROUTE ESTIMATION TEST ===');
  console.log('');

  if (!solanaPrivateKey) {
    console.log('Skipping Solana tests (no SOLANA_PRIVATE_KEY)');
  }

  const kit = new BridgeKit();
  const viemAdapter = createViemAdapter({ privateKey: evmPrivateKey });
  const solanaAdapter = solanaPrivateKey
    ? createSolanaAdapter({ privateKey: solanaPrivateKey })
    : null;

  // Test chains we care about for the demo
  const testChains = [
    'Arc_Testnet',
    'Ethereum_Sepolia',
    'Avalanche_Fuji',
    'Arbitrum_Sepolia',
    'Base_Sepolia',
    'Optimism_Sepolia',
    'Polygon_Amoy',
    'Linea_Sepolia',
    'Unichain_Sepolia',
    'Sonic_Blaze',
    'Solana_Devnet',
  ];

  console.log('Testing route availability from Arc_Testnet to other chains:');
  console.log('');

  for (const destChain of testChains) {
    if (destChain === 'Arc_Testnet') continue;

    const isSolana = destChain === 'Solana_Devnet';
    const destAdapter = isSolana ? solanaAdapter : viemAdapter;

    if (isSolana && !solanaAdapter) {
      console.log(`  Arc_Testnet → ${destChain}: SKIP (no Solana key)`);
      continue;
    }

    try {
      const estimate = await kit.estimate({
        from: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        to: { adapter: destAdapter!, chain: destChain },
        amount: '1',
      });

      const fee = estimate?.fees?.total || 'unknown';
      console.log(`  Arc_Testnet → ${destChain}: ✓ (fee: ${fee})`);
    } catch (e: any) {
      const msg = e.message?.slice(0, 50) || 'error';
      console.log(`  Arc_Testnet → ${destChain}: ✗ (${msg})`);
    }
  }

  console.log('');
  console.log('Testing route availability TO Arc_Testnet from other chains:');
  console.log('');

  for (const srcChain of testChains) {
    if (srcChain === 'Arc_Testnet') continue;

    const isSolana = srcChain === 'Solana_Devnet';
    const srcAdapter = isSolana ? solanaAdapter : viemAdapter;

    if (isSolana && !solanaAdapter) {
      console.log(`  ${srcChain} → Arc_Testnet: SKIP (no Solana key)`);
      continue;
    }

    try {
      const estimate = await kit.estimate({
        from: { adapter: srcAdapter!, chain: srcChain },
        to: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        amount: '1',
      });

      const fee = estimate?.fees?.total || 'unknown';
      console.log(`  ${srcChain} → Arc_Testnet: ✓ (fee: ${fee})`);
    } catch (e: any) {
      const msg = e.message?.slice(0, 50) || 'error';
      console.log(`  ${srcChain} → Arc_Testnet: ✗ (${msg})`);
    }
  }
}

function getChainNameFromDomain(domain: number): string {
  const domainMap: Record<number, string> = {
    0: 'Ethereum Sepolia',
    1: 'Avalanche Fuji',
    2: 'OP Sepolia',
    3: 'Arbitrum Sepolia',
    5: 'Solana Devnet',
    6: 'Base Sepolia',
    7: 'Polygon Amoy',
    11: 'Linea Sepolia',
    14: 'Unichain Sepolia',
    21: 'Sonic Blaze',
    26: 'Arc Testnet',
  };
  return domainMap[domain] || `Unknown (${domain})`;
}

main().catch(console.error);
