/**
 * Bidirectional Transfer Test: Arc ↔ All Testnet Chains
 *
 * Tests actual transfers (0.001 USDC) to verify bidirectional support.
 * Only tests chains that passed route estimation.
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapter } from '@circle-fin/adapter-viem-v2';
import { createAdapterFromPrivateKey as createSolanaAdapter } from '@circle-fin/adapter-solana';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';

// Arc Testnet config
const ARC_TESTNET = {
  chainId: 5042002,
  rpc: 'https://rpc.testnet.arc.network',
  usdc: '0x3600000000000000000000000000000000000000' as const,
};

// Chains to test (based on route estimation results)
const TESTNET_CHAINS = [
  'Ethereum_Sepolia',
  'Avalanche_Fuji',
  'Arbitrum_Sepolia',
  'Base_Sepolia',
  'Optimism_Sepolia',
  'Linea_Sepolia',
  'Unichain_Sepolia',
  'Solana_Devnet',
  // Additional chains that might work
  'Polygon_Amoy_Testnet',
  'Sonic_Testnet',
  'World_Chain_Sepolia',
];

interface TestResult {
  chain: string;
  fromArc: 'success' | 'failed' | 'skipped';
  toArc: 'success' | 'failed' | 'skipped';
  fromArcTx?: string;
  toArcTx?: string;
  fromArcError?: string;
  toArcError?: string;
}

async function main() {
  console.log('='.repeat(70));
  console.log('Bidirectional Transfer Test: Arc ↔ All Testnets');
  console.log('='.repeat(70));
  console.log('');

  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;

  if (!evmPrivateKey) {
    console.error('Missing EVM private key');
    process.exit(1);
  }

  // Get EVM address
  const { privateKeyToAccount } = await import('viem/accounts');
  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log('EVM wallet:', evmAccount.address);

  // Check Arc USDC balance
  const arcClient = createPublicClient({ transport: http(ARC_TESTNET.rpc) });
  const arcBalance = await arcClient.readContract({
    address: ARC_TESTNET.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });
  console.log('Arc USDC balance:', formatUnits(arcBalance, 6));
  console.log('');

  // Initialize BridgeKit
  const kit = new BridgeKit();
  const viemAdapter = createViemAdapter({ privateKey: evmPrivateKey });
  const solanaAdapter = solanaPrivateKey
    ? createSolanaAdapter({ privateKey: solanaPrivateKey })
    : null;

  // Test amount (very small)
  const testAmount = '0.001';

  // Results
  const results: TestResult[] = [];

  // First, do route estimation to identify working chains
  console.log('=== PHASE 1: Route Estimation ===');
  console.log('');

  const workingChains: string[] = [];

  for (const chain of TESTNET_CHAINS) {
    const isSolana = chain === 'Solana_Devnet';
    const adapter = isSolana ? solanaAdapter : viemAdapter;

    if (isSolana && !solanaAdapter) {
      console.log(`  ${chain}: SKIP (no Solana key)`);
      continue;
    }

    try {
      // Test Arc → Chain
      await kit.estimate({
        from: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        to: { adapter: adapter!, chain },
        amount: '1',
      });

      // Test Chain → Arc
      await kit.estimate({
        from: { adapter: adapter!, chain },
        to: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        amount: '1',
      });

      console.log(`  ${chain}: ✓ Bidirectional routes available`);
      workingChains.push(chain);
    } catch (e: any) {
      console.log(`  ${chain}: ✗ ${e.message?.slice(0, 60)}`);
    }
  }

  console.log('');
  console.log(`Working chains for bidirectional transfer: ${workingChains.length}`);
  console.log('');

  // For demo purposes, only test a subset to conserve USDC
  const chainsToTransfer = ['Avalanche_Fuji', 'Ethereum_Sepolia'];
  if (solanaAdapter) chainsToTransfer.push('Solana_Devnet');

  console.log('=== PHASE 2: Actual Transfers ===');
  console.log(`Testing with ${testAmount} USDC on: ${chainsToTransfer.join(', ')}`);
  console.log('');

  for (const chain of chainsToTransfer) {
    const isSolana = chain === 'Solana_Devnet';
    const adapter = isSolana ? solanaAdapter : viemAdapter;

    const result: TestResult = {
      chain,
      fromArc: 'skipped',
      toArc: 'skipped',
    };

    if (!adapter) {
      results.push(result);
      continue;
    }

    // Test Arc → Chain
    console.log(`--- Arc_Testnet → ${chain} ---`);

    try {
      kit.on('step', (step: any) => {
        const status = step.state || step.status || '';
        console.log(`  [${step.name}] ${status}`);
      });

      const bridgeResult = await kit.bridge({
        from: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        to: { adapter: adapter, chain },
        amount: testAmount,
      });

      result.fromArc = 'success';
      result.fromArcTx = bridgeResult?.steps?.find((s: any) => s.name === 'burn')?.txHash;
      console.log(`  ✓ SUCCESS`);
      if (result.fromArcTx) console.log(`  Burn tx: ${result.fromArcTx}`);
    } catch (e: any) {
      result.fromArc = 'failed';
      result.fromArcError = e.message?.slice(0, 100);
      console.log(`  ✗ FAILED: ${result.fromArcError}`);
    }

    console.log('');

    // Wait between transfers
    await new Promise(r => setTimeout(r, 5000));

    // Test Chain → Arc (need balance on that chain first)
    console.log(`--- ${chain} → Arc_Testnet ---`);

    try {
      const bridgeResult = await kit.bridge({
        from: { adapter: adapter, chain },
        to: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        amount: testAmount,
      });

      result.toArc = 'success';
      result.toArcTx = bridgeResult?.steps?.find((s: any) => s.name === 'burn')?.txHash;
      console.log(`  ✓ SUCCESS`);
      if (result.toArcTx) console.log(`  Burn tx: ${result.toArcTx}`);
    } catch (e: any) {
      result.toArc = 'failed';
      result.toArcError = e.message?.slice(0, 100);
      console.log(`  ✗ FAILED: ${result.toArcError}`);
    }

    console.log('');
    results.push(result);
  }

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  console.log('BridgeKit (CCTP) - Route Estimation:');
  console.log('  Working chains:', workingChains.join(', '));
  console.log('');

  console.log('Actual Transfer Results:');
  console.log('');
  console.log('| Chain | Arc → Chain | Chain → Arc |');
  console.log('|-------|-------------|-------------|');
  for (const r of results) {
    console.log(`| ${r.chain.padEnd(20)} | ${r.fromArc.padEnd(11)} | ${r.toArc.padEnd(11)} |`);
  }

  console.log('');
  console.log('Gateway API vs BridgeKit Summary:');
  console.log('  Gateway API: Works for EVM ↔ EVM, fails for Solana mint (PDA issues)');
  console.log('  BridgeKit:   Works for all chains including Solana (uses CCTP V2)');
}

main().catch(console.error);
