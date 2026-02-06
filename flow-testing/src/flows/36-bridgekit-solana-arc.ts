/**
 * BridgeKit: Solana Devnet → Arc Testnet Transfer
 *
 * Tests the reverse direction of the cross-chain transfer.
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapter } from '@circle-fin/adapter-viem-v2';
import { createAdapterFromPrivateKey as createSolanaAdapter } from '@circle-fin/adapter-solana';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { Connection } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { inspect } from 'util';

// Arc Testnet config
const ARC_TESTNET = {
  chainId: 5042002,
  rpc: 'https://rpc.testnet.arc.network',
  usdc: '0x3600000000000000000000000000000000000000' as const,
};

// Solana Devnet USDC
const SOLANA_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

async function main() {
  console.log('='.repeat(70));
  console.log('BridgeKit: Solana Devnet → Arc Testnet');
  console.log('='.repeat(70));
  console.log('');

  // Get private keys
  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;

  if (!evmPrivateKey || !solanaPrivateKey) {
    console.error('Missing DEPLOYER_PRIVATE_KEY or SOLANA_PRIVATE_KEY');
    process.exit(1);
  }

  // Initialize clients for balance checking
  const arcClient = createPublicClient({ transport: http(ARC_TESTNET.rpc) });
  const solanaConnection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Parse Solana keypair
  const solanaSecretKey = bs58.decode(solanaPrivateKey);
  const solanaKeypair = Keypair.fromSecretKey(solanaSecretKey);

  // Get EVM address from private key
  const { privateKeyToAccount } = await import('viem/accounts');
  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);

  console.log('Solana wallet:', solanaKeypair.publicKey.toBase58());
  console.log('EVM wallet:', evmAccount.address);
  console.log('');

  // Check initial balances
  console.log('=== INITIAL BALANCES ===');

  let solanaUsdcBefore = 0n;
  try {
    const solanaAta = await getAssociatedTokenAddress(SOLANA_USDC_MINT, solanaKeypair.publicKey);
    const solanaAccount = await getAccount(solanaConnection, solanaAta);
    solanaUsdcBefore = solanaAccount.amount;
  } catch (e) {
    console.log('Solana ATA does not exist');
  }
  console.log('Solana USDC:', formatUnits(solanaUsdcBefore, 6));

  const arcUsdcBefore = await arcClient.readContract({
    address: ARC_TESTNET.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });
  console.log('Arc USDC:', formatUnits(arcUsdcBefore, 6));
  console.log('');

  // Check if we have enough Solana USDC
  const transferAmount = '0.005';
  const transferAmountBigInt = BigInt(Math.floor(parseFloat(transferAmount) * 1_000_000));

  if (solanaUsdcBefore < transferAmountBigInt) {
    console.log('Insufficient Solana USDC for transfer.');
    console.log('Have:', formatUnits(solanaUsdcBefore, 6));
    console.log('Need:', transferAmount);
    console.log('');
    console.log('Please get USDC from https://faucet.circle.com/ first.');
    process.exit(0);
  }

  // Initialize BridgeKit
  console.log('=== BRIDGEKIT TRANSFER ===');
  console.log('Initializing BridgeKit...');

  const kit = new BridgeKit();

  // Create adapters
  const viemAdapter = createViemAdapter({
    privateKey: evmPrivateKey,
  });

  const solanaAdapterInstance = createSolanaAdapter({
    privateKey: solanaPrivateKey,
  });

  console.log('Adapters initialized.');
  console.log('');

  // Estimate transfer first
  console.log(`Estimating Solana_Devnet → Arc_Testnet transfer (${transferAmount} USDC)...`);

  try {
    const estimate = await kit.estimate({
      from: { adapter: solanaAdapterInstance, chain: 'Solana_Devnet' },
      to: { adapter: viemAdapter, chain: 'Arc_Testnet' },
      amount: transferAmount,
    });

    console.log('Estimate result:');
    console.log('  Route found:', estimate ? 'yes' : 'no');
    if (estimate) {
      console.log('  Fees:', inspect(estimate.fees, false, 2, true));
    }
  } catch (estErr: any) {
    console.log('Estimate error:', estErr.message);
  }

  console.log('');
  console.log('Executing bridge transfer...');
  console.log('  From: Solana_Devnet');
  console.log('  To: Arc_Testnet');
  console.log('  Amount:', transferAmount, 'USDC');
  console.log('');

  try {
    // Listen to events
    kit.on('step', (step: any) => {
      console.log('[Step]', step.type || step.name || 'unknown', step.status || '');
    });

    kit.on('error', (err: any) => {
      console.error('[Error]', err.message || err);
    });

    // Execute bridge
    const result = await kit.bridge({
      from: { adapter: solanaAdapterInstance, chain: 'Solana_Devnet' },
      to: { adapter: viemAdapter, chain: 'Arc_Testnet' },
      amount: transferAmount,
    });

    console.log('');
    console.log('Bridge completed!');
    console.log('Result state:', result?.state);

    // Show transaction URLs
    if (result?.steps) {
      console.log('');
      console.log('Transaction URLs:');
      for (const step of result.steps) {
        console.log(`  ${step.name}: ${step.state}`);
        if (step.explorerUrl) {
          console.log(`    ${step.explorerUrl}`);
        }
      }
    }

  } catch (bridgeErr: any) {
    console.error('Bridge error:', bridgeErr.message);
    if (bridgeErr.cause) {
      console.error('Cause:', bridgeErr.cause);
    }
  }

  // Check final balances
  console.log('');
  console.log('=== FINAL BALANCES ===');

  let solanaUsdcAfter = 0n;
  try {
    const solanaAta = await getAssociatedTokenAddress(SOLANA_USDC_MINT, solanaKeypair.publicKey);
    const solanaAccount = await getAccount(solanaConnection, solanaAta);
    solanaUsdcAfter = solanaAccount.amount;
  } catch (e) {
    // ATA might not exist
  }
  console.log('Solana USDC:', formatUnits(solanaUsdcBefore, 6), '→', formatUnits(solanaUsdcAfter, 6));

  const arcUsdcAfter = await arcClient.readContract({
    address: ARC_TESTNET.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });
  console.log('Arc USDC:', formatUnits(arcUsdcBefore, 6), '→', formatUnits(arcUsdcAfter, 6));

  const solanaChange = Number(formatUnits(solanaUsdcAfter - solanaUsdcBefore, 6));
  const arcChange = Number(formatUnits(arcUsdcAfter - arcUsdcBefore, 6));

  console.log('');
  console.log('Changes:');
  console.log('  Solana:', solanaChange >= 0 ? '+' : '', solanaChange.toFixed(6), 'USDC');
  console.log('  Arc:', arcChange >= 0 ? '+' : '', arcChange.toFixed(6), 'USDC');

  if (solanaChange < 0 && arcChange > 0) {
    console.log('');
    console.log('✓ SUCCESS! Solana → Arc transfer verified!');
  }
}

main().catch(console.error);
