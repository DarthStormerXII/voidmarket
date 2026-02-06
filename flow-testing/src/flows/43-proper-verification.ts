/**
 * Proper Verification: Test transfers with before/after balance checks
 *
 * Tests a subset of key chains with actual balance verification.
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapter } from '@circle-fin/adapter-viem-v2';
import { createAdapterFromPrivateKey as createSolanaAdapter } from '@circle-fin/adapter-solana';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';

// Chain configs with USDC addresses
const CHAIN_CONFIGS: Record<string, { rpc: string; usdc: `0x${string}`; explorer: string }> = {
  Arc_Testnet: {
    rpc: 'https://rpc.testnet.arc.network',
    usdc: '0x3600000000000000000000000000000000000000',
    explorer: 'https://testnet.arcscan.app/tx/',
  },
  Ethereum_Sepolia: {
    rpc: 'https://rpc.sepolia.org',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    explorer: 'https://sepolia.etherscan.io/tx/',
  },
  Avalanche_Fuji: {
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    explorer: 'https://testnet.snowtrace.io/tx/',
  },
  Base_Sepolia: {
    rpc: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    explorer: 'https://sepolia.basescan.org/tx/',
  },
  Arbitrum_Sepolia: {
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    explorer: 'https://sepolia.arbiscan.io/tx/',
  },
  Optimism_Sepolia: {
    rpc: 'https://sepolia.optimism.io',
    usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    explorer: 'https://sepolia-optimism.etherscan.io/tx/',
  },
  Polygon_Amoy_Testnet: {
    rpc: 'https://rpc-amoy.polygon.technology',
    usdc: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    explorer: 'https://amoy.polygonscan.com/tx/',
  },
};

const SOLANA_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

interface TransferResult {
  chain: string;
  direction: 'Arc→Chain' | 'Chain→Arc';
  success: boolean;
  sourceBefore: string;
  sourceAfter: string;
  destBefore: string;
  destAfter: string;
  sourceChange: string;
  destChange: string;
  error?: string;
  txHash?: string;
}

async function getEvmBalance(rpc: string, usdc: `0x${string}`, address: `0x${string}`): Promise<bigint> {
  const client = createPublicClient({ transport: http(rpc) });
  return client.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });
}

async function getSolanaBalance(connection: Connection, owner: PublicKey): Promise<bigint> {
  try {
    const ata = await getAssociatedTokenAddress(SOLANA_USDC_MINT, owner);
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch {
    return 0n;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('Proper Verification: Before/After Balance Checks');
  console.log('='.repeat(70));
  console.log('');

  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;

  if (!evmPrivateKey) {
    console.error('Missing EVM private key');
    process.exit(1);
  }

  const { privateKeyToAccount } = await import('viem/accounts');
  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log('EVM wallet:', evmAccount.address);

  let solanaKeypair: Keypair | null = null;
  if (solanaPrivateKey) {
    solanaKeypair = Keypair.fromSecretKey(bs58.decode(solanaPrivateKey));
    console.log('Solana wallet:', solanaKeypair.publicKey.toBase58());
  }

  const kit = new BridgeKit();
  const viemAdapter = createViemAdapter({ privateKey: evmPrivateKey });
  const solanaAdapter = solanaPrivateKey ? createSolanaAdapter({ privateKey: solanaPrivateKey }) : null;
  const solanaConnection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const testAmount = '0.001';
  const results: TransferResult[] = [];

  // Chains to test (EVM only for now, then Solana separately)
  const evmChains = [
    'Avalanche_Fuji',
    'Arbitrum_Sepolia',
    'Optimism_Sepolia',
    'Polygon_Amoy_Testnet',
  ];

  console.log('');
  console.log(`Testing ${testAmount} USDC transfers on: ${evmChains.join(', ')}`);
  console.log('');

  for (const chain of evmChains) {
    const config = CHAIN_CONFIGS[chain];
    if (!config) {
      console.log(`Skipping ${chain} - no config`);
      continue;
    }

    console.log('='.repeat(60));
    console.log(`Testing: Arc_Testnet ↔ ${chain}`);
    console.log('='.repeat(60));

    // ========================================
    // Arc → Chain
    // ========================================
    console.log('');
    console.log(`[1] Arc_Testnet → ${chain}`);

    const arcBefore1 = await getEvmBalance(CHAIN_CONFIGS.Arc_Testnet.rpc, CHAIN_CONFIGS.Arc_Testnet.usdc, evmAccount.address);
    const chainBefore1 = await getEvmBalance(config.rpc, config.usdc, evmAccount.address);

    console.log(`  Arc USDC before:   ${formatUnits(arcBefore1, 6)}`);
    console.log(`  ${chain} USDC before: ${formatUnits(chainBefore1, 6)}`);

    const result1: TransferResult = {
      chain,
      direction: 'Arc→Chain',
      success: false,
      sourceBefore: formatUnits(arcBefore1, 6),
      sourceAfter: '',
      destBefore: formatUnits(chainBefore1, 6),
      destAfter: '',
      sourceChange: '',
      destChange: '',
    };

    try {
      const bridgeResult = await kit.bridge({
        from: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        to: { adapter: viemAdapter, chain },
        amount: testAmount,
      });

      result1.txHash = bridgeResult?.steps?.find((s: any) => s.name === 'burn')?.txHash;

      // Wait for mint to complete
      console.log('  Waiting 20s for mint...');
      await new Promise(r => setTimeout(r, 20000));

      const arcAfter1 = await getEvmBalance(CHAIN_CONFIGS.Arc_Testnet.rpc, CHAIN_CONFIGS.Arc_Testnet.usdc, evmAccount.address);
      const chainAfter1 = await getEvmBalance(config.rpc, config.usdc, evmAccount.address);

      result1.sourceAfter = formatUnits(arcAfter1, 6);
      result1.destAfter = formatUnits(chainAfter1, 6);

      const arcChange = Number(formatUnits(arcAfter1 - arcBefore1, 6));
      const chainChange = Number(formatUnits(chainAfter1 - chainBefore1, 6));

      result1.sourceChange = arcChange.toFixed(6);
      result1.destChange = chainChange.toFixed(6);

      console.log(`  Arc USDC after:    ${result1.sourceAfter} (${arcChange >= 0 ? '+' : ''}${arcChange.toFixed(6)})`);
      console.log(`  ${chain} USDC after:  ${result1.destAfter} (${chainChange >= 0 ? '+' : ''}${chainChange.toFixed(6)})`);

      if (arcChange < 0 && chainChange > 0) {
        result1.success = true;
        console.log('  ✓ VERIFIED: Arc decreased, destination increased');
      } else {
        console.log('  ⚠ Balance change unexpected');
      }
    } catch (e: any) {
      result1.error = e.message?.slice(0, 100);
      console.log(`  ✗ FAILED: ${result1.error}`);
    }

    results.push(result1);

    // ========================================
    // Chain → Arc
    // ========================================
    console.log('');
    console.log(`[2] ${chain} → Arc_Testnet`);

    const chainBefore2 = await getEvmBalance(config.rpc, config.usdc, evmAccount.address);
    const arcBefore2 = await getEvmBalance(CHAIN_CONFIGS.Arc_Testnet.rpc, CHAIN_CONFIGS.Arc_Testnet.usdc, evmAccount.address);

    console.log(`  ${chain} USDC before: ${formatUnits(chainBefore2, 6)}`);
    console.log(`  Arc USDC before:   ${formatUnits(arcBefore2, 6)}`);

    const result2: TransferResult = {
      chain,
      direction: 'Chain→Arc',
      success: false,
      sourceBefore: formatUnits(chainBefore2, 6),
      sourceAfter: '',
      destBefore: formatUnits(arcBefore2, 6),
      destAfter: '',
      sourceChange: '',
      destChange: '',
    };

    // Check if we have balance to transfer back
    if (chainBefore2 < BigInt(Math.floor(parseFloat(testAmount) * 1_000_000))) {
      result2.error = 'Insufficient balance on destination chain';
      console.log(`  ✗ SKIPPED: ${result2.error}`);
      results.push(result2);
      continue;
    }

    try {
      const bridgeResult = await kit.bridge({
        from: { adapter: viemAdapter, chain },
        to: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        amount: testAmount,
      });

      result2.txHash = bridgeResult?.steps?.find((s: any) => s.name === 'burn')?.txHash;

      console.log('  Waiting 20s for mint...');
      await new Promise(r => setTimeout(r, 20000));

      const chainAfter2 = await getEvmBalance(config.rpc, config.usdc, evmAccount.address);
      const arcAfter2 = await getEvmBalance(CHAIN_CONFIGS.Arc_Testnet.rpc, CHAIN_CONFIGS.Arc_Testnet.usdc, evmAccount.address);

      result2.sourceAfter = formatUnits(chainAfter2, 6);
      result2.destAfter = formatUnits(arcAfter2, 6);

      const chainChange = Number(formatUnits(chainAfter2 - chainBefore2, 6));
      const arcChange = Number(formatUnits(arcAfter2 - arcBefore2, 6));

      result2.sourceChange = chainChange.toFixed(6);
      result2.destChange = arcChange.toFixed(6);

      console.log(`  ${chain} USDC after:  ${result2.sourceAfter} (${chainChange >= 0 ? '+' : ''}${chainChange.toFixed(6)})`);
      console.log(`  Arc USDC after:    ${result2.destAfter} (${arcChange >= 0 ? '+' : ''}${arcChange.toFixed(6)})`);

      if (chainChange < 0 && arcChange > 0) {
        result2.success = true;
        console.log('  ✓ VERIFIED: Source decreased, Arc increased');
      } else {
        console.log('  ⚠ Balance change unexpected');
      }
    } catch (e: any) {
      result2.error = e.message?.slice(0, 100);
      console.log(`  ✗ FAILED: ${result2.error}`);
    }

    results.push(result2);
    console.log('');
  }

  // ========================================
  // Summary
  // ========================================
  console.log('');
  console.log('='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  console.log('| Chain | Direction | Success | Source Change | Dest Change |');
  console.log('|-------|-----------|---------|---------------|-------------|');
  for (const r of results) {
    const success = r.success ? '✓' : (r.error ? '✗' : '⚠');
    console.log(`| ${r.chain.padEnd(20)} | ${r.direction.padEnd(9)} | ${success.padEnd(7)} | ${r.sourceChange.padStart(13)} | ${r.destChange.padStart(11)} |`);
  }

  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;

  console.log('');
  console.log(`Verified: ${successCount}/${totalTests} transfers`);
}

main().catch(console.error);
