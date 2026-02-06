/**
 * Test Gateway API Balance Tracking
 *
 * Verifies that Gateway is tracking deposits made by your wallet.
 */

import 'dotenv/config';
import { getUnifiedGatewayBalance, getSupportedDepositChains, estimateTransferFee } from '../services/circle/modular-gateway.js';
import { privateKeyToAccount } from 'viem/accounts';

async function main() {
  console.log('='.repeat(70));
  console.log('Gateway API Balance Test');
  console.log('='.repeat(70));
  console.log('');

  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('Missing EVM private key');
    process.exit(1);
  }

  const account = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log('Wallet:', account.address);
  console.log('');

  // Check Circle config
  console.log('=== Circle Configuration ===');
  console.log('CLIENT_URL:', process.env.CIRCLE_CLIENT_URL ? '✓ Set' : '✗ Missing');
  console.log('CLIENT_KEY:', process.env.CIRCLE_CLIENT_KEY ? '✓ Set' : '✗ Missing');
  console.log('');

  // Get Gateway balances
  console.log('=== Gateway API Balances ===');
  console.log('(These are funds deposited to Gateway Wallet contract)');
  console.log('');

  try {
    const { total, balances } = await getUnifiedGatewayBalance(account.address);

    console.log('Unified Balance:', total, 'USDC');
    console.log('');
    console.log('Per-chain breakdown:');
    for (const b of balances) {
      const bal = parseFloat(b.balance || '0');
      if (bal > 0) {
        console.log(`  ${b.chain}: ${b.balance} USDC ✓`);
      } else {
        console.log(`  ${b.chain}: 0 USDC`);
      }
    }
  } catch (e: any) {
    console.error('Gateway API error:', e.message);
  }

  console.log('');
  console.log('=== Supported Deposit Chains ===');
  const chains = getSupportedDepositChains();
  console.log('');
  console.log('| Chain | Fee | Est. Time |');
  console.log('|-------|-----|-----------|');
  for (const chain of chains) {
    const { fee, estimatedTime } = estimateTransferFee(chain.id);
    console.log(`| ${chain.name.padEnd(20)} | ${fee.padEnd(12)} | ${estimatedTime} |`);
  }

  console.log('');
  console.log('=== How Gateway Works ===');
  console.log('1. User deposits USDC to Gateway Wallet (0x0077777d...) on source chain');
  console.log('2. Gateway indexes the deposit after finalization');
  console.log('3. User signs burn intent to move funds to destination');
  console.log('4. Gateway mints USDC on destination chain');
  console.log('');
  console.log('Note: Gateway API is permissionless (no auth needed)');
  console.log('      Modular Wallet transactions show in Circle Console');
}

main().catch(console.error);
