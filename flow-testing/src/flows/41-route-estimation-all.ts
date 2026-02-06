/**
 * Route Estimation: Arc ↔ All Testnets
 *
 * Tests route availability (no actual transfers) to map out support matrix.
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapter } from '@circle-fin/adapter-viem-v2';
import { createAdapterFromPrivateKey as createSolanaAdapter } from '@circle-fin/adapter-solana';
import { getGatewayInfo, GATEWAY_DOMAINS } from '../services/circle/gateway-transfer.js';

// All testnet chains from BridgeKit
const ALL_TESTNETS = [
  'Arbitrum_Sepolia',
  'Arc_Testnet',
  'Avalanche_Fuji',
  'Base_Sepolia',
  'Codex_Testnet',
  'Ethereum_Sepolia',
  'HyperEVM_Testnet',
  'Ink_Testnet',
  'Linea_Sepolia',
  'Monad_Testnet',
  'Optimism_Sepolia',
  'Plume_Testnet',
  'Polygon_Amoy_Testnet',
  'Sei_Testnet',
  'Solana_Devnet',
  'Sonic_Testnet',
  'Unichain_Sepolia',
  'World_Chain_Sepolia',
  'XDC_Apothem',
];

interface ChainStatus {
  chain: string;
  bridgeKitFromArc: boolean;
  bridgeKitToArc: boolean;
  gatewaySupported: boolean;
  gatewayDomain?: number;
}

async function main() {
  console.log('='.repeat(70));
  console.log('Route Estimation: Arc ↔ All Testnets');
  console.log('='.repeat(70));
  console.log('');

  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;

  if (!evmPrivateKey) {
    console.error('Missing EVM private key');
    process.exit(1);
  }

  // Get Gateway API domains
  console.log('Fetching Gateway API domains...');
  let gatewayDomains: number[] = [];
  try {
    const gatewayInfo = await getGatewayInfo();
    gatewayDomains = gatewayInfo.domains.map((d: any) => d.domain);
    console.log('Gateway domains:', gatewayDomains);
  } catch (e: any) {
    console.log('Gateway API error:', e.message);
  }

  // Domain mapping
  const domainToChain: Record<number, string> = {
    0: 'Ethereum_Sepolia',
    1: 'Avalanche_Fuji',
    2: 'Optimism_Sepolia',
    3: 'Arbitrum_Sepolia',
    5: 'Solana_Devnet',
    6: 'Base_Sepolia',
    7: 'Polygon_Amoy_Testnet',
    10: 'Unichain_Sepolia',
    11: 'Linea_Sepolia',
    12: 'Codex_Testnet',
    13: 'Sonic_Testnet',
    14: 'World_Chain_Sepolia',
    15: 'Monad_Testnet',
    16: 'Sei_Testnet',
    18: 'XDC_Apothem',
    19: 'HyperEVM_Testnet',
    21: 'Ink_Testnet',
    22: 'Plume_Testnet',
    26: 'Arc_Testnet',
  };

  const chainToDomain: Record<string, number> = {};
  for (const [domain, chain] of Object.entries(domainToChain)) {
    chainToDomain[chain] = parseInt(domain);
  }

  console.log('');
  console.log('Testing BridgeKit routes...');
  console.log('');

  // Initialize BridgeKit
  const kit = new BridgeKit();
  const viemAdapter = createViemAdapter({ privateKey: evmPrivateKey });
  const solanaAdapter = solanaPrivateKey
    ? createSolanaAdapter({ privateKey: solanaPrivateKey })
    : null;

  const results: ChainStatus[] = [];

  for (const chain of ALL_TESTNETS) {
    if (chain === 'Arc_Testnet') continue;

    const isSolana = chain === 'Solana_Devnet';
    const adapter = isSolana ? solanaAdapter : viemAdapter;

    const status: ChainStatus = {
      chain,
      bridgeKitFromArc: false,
      bridgeKitToArc: false,
      gatewaySupported: gatewayDomains.includes(chainToDomain[chain]),
      gatewayDomain: chainToDomain[chain],
    };

    if (isSolana && !solanaAdapter) {
      console.log(`  ${chain}: SKIP (no Solana key)`);
      results.push(status);
      continue;
    }

    // Test Arc → Chain
    try {
      await kit.estimate({
        from: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        to: { adapter: adapter!, chain },
        amount: '1',
      });
      status.bridgeKitFromArc = true;
    } catch (e) {
      // Route not available
    }

    // Test Chain → Arc
    try {
      await kit.estimate({
        from: { adapter: adapter!, chain },
        to: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        amount: '1',
      });
      status.bridgeKitToArc = true;
    } catch (e) {
      // Route not available
    }

    const fromArc = status.bridgeKitFromArc ? '✓' : '✗';
    const toArc = status.bridgeKitToArc ? '✓' : '✗';
    const gateway = status.gatewaySupported ? `✓ (${status.gatewayDomain})` : '✗';

    console.log(`  ${chain.padEnd(25)} | Arc→: ${fromArc} | →Arc: ${toArc} | Gateway: ${gateway}`);
    results.push(status);
  }

  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  // Bidirectional BridgeKit support
  const bidirectional = results.filter(r => r.bridgeKitFromArc && r.bridgeKitToArc);
  console.log(`BridgeKit Bidirectional (Arc ↔ Chain): ${bidirectional.length} chains`);
  for (const r of bidirectional) {
    console.log(`  - ${r.chain}`);
  }

  // Gateway supported
  const gatewayOnly = results.filter(r => r.gatewaySupported);
  console.log('');
  console.log(`Gateway API Supported: ${gatewayOnly.length} chains`);
  for (const r of gatewayOnly) {
    console.log(`  - ${r.chain} (domain ${r.gatewayDomain})`);
  }

  // Not supported by BridgeKit
  const notSupported = results.filter(r => !r.bridgeKitFromArc && !r.bridgeKitToArc);
  console.log('');
  console.log(`NOT Supported by BridgeKit: ${notSupported.length} chains`);
  for (const r of notSupported) {
    const gateway = r.gatewaySupported ? '(has Gateway)' : '';
    console.log(`  - ${r.chain} ${gateway}`);
  }

  // Final recommendation
  console.log('');
  console.log('='.repeat(70));
  console.log('RECOMMENDATION FOR UNIFIED BALANCE DEMO');
  console.log('='.repeat(70));
  console.log('');
  console.log('For deposits TO Arc (unified balance):');
  console.log('  Use BridgeKit for: ' + bidirectional.map(r => r.chain).join(', '));
  console.log('');
  console.log('For withdrawals FROM Arc:');
  console.log('  Use BridgeKit for: ' + bidirectional.map(r => r.chain).join(', '));
  console.log('');
  console.log('Note: Gateway API works for EVM chains but has Solana mint issues.');
  console.log('      BridgeKit (CCTP V2) handles everything including Solana.');
}

main().catch(console.error);
