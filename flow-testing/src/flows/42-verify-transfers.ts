/**
 * Verify Actual Transfers: Test a few chains bidirectionally
 *
 * We already verified:
 * - Arc ↔ Solana_Devnet (BridgeKit) ✓
 * - Arc ↔ Avalanche_Fuji (Gateway API) ✓
 *
 * Now test:
 * - Arc ↔ Base_Sepolia (BridgeKit)
 * - Arc ↔ Ethereum_Sepolia (BridgeKit)
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapter } from '@circle-fin/adapter-viem-v2';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';

const ARC_TESTNET = {
  rpc: 'https://rpc.testnet.arc.network',
  usdc: '0x3600000000000000000000000000000000000000' as const,
};

async function main() {
  console.log('='.repeat(70));
  console.log('Verify Actual Transfers');
  console.log('='.repeat(70));
  console.log('');

  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('Missing EVM private key');
    process.exit(1);
  }

  const { privateKeyToAccount } = await import('viem/accounts');
  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log('Wallet:', evmAccount.address);

  // Check Arc balance
  const arcClient = createPublicClient({ transport: http(ARC_TESTNET.rpc) });
  const arcBalance = await arcClient.readContract({
    address: ARC_TESTNET.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });
  console.log('Arc USDC:', formatUnits(arcBalance, 6));
  console.log('');

  const kit = new BridgeKit();
  const viemAdapter = createViemAdapter({ privateKey: evmPrivateKey });

  const testAmount = '0.001';
  const chainsToTest = ['Base_Sepolia', 'Ethereum_Sepolia'];

  for (const chain of chainsToTest) {
    console.log('='.repeat(50));
    console.log(`Testing: Arc_Testnet ↔ ${chain}`);
    console.log('='.repeat(50));
    console.log('');

    // Arc → Chain
    console.log(`[1] Arc_Testnet → ${chain} (${testAmount} USDC)`);
    try {
      kit.on('step', (step: any) => {
        console.log(`    [${step.name}] ${step.state || ''}`);
      });

      const result1 = await kit.bridge({
        from: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        to: { adapter: viemAdapter, chain },
        amount: testAmount,
      });

      console.log('    ✓ SUCCESS');
      if (result1?.steps) {
        for (const step of result1.steps) {
          if (step.explorerUrl) {
            console.log(`    ${step.name}: ${step.explorerUrl}`);
          }
        }
      }
    } catch (e: any) {
      console.log('    ✗ FAILED:', e.message?.slice(0, 100));
    }

    console.log('');

    // Wait for the transfer to complete
    console.log('    Waiting 30s for transfer to complete...');
    await new Promise(r => setTimeout(r, 30000));

    // Chain → Arc
    console.log(`[2] ${chain} → Arc_Testnet (${testAmount} USDC)`);
    try {
      const result2 = await kit.bridge({
        from: { adapter: viemAdapter, chain },
        to: { adapter: viemAdapter, chain: 'Arc_Testnet' },
        amount: testAmount,
      });

      console.log('    ✓ SUCCESS');
      if (result2?.steps) {
        for (const step of result2.steps) {
          if (step.explorerUrl) {
            console.log(`    ${step.name}: ${step.explorerUrl}`);
          }
        }
      }
    } catch (e: any) {
      console.log('    ✗ FAILED:', e.message?.slice(0, 100));
    }

    console.log('');
  }

  // Final balance
  const arcBalanceAfter = await arcClient.readContract({
    address: ARC_TESTNET.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });

  console.log('='.repeat(70));
  console.log('FINAL');
  console.log('='.repeat(70));
  console.log('Arc USDC:', formatUnits(arcBalance, 6), '→', formatUnits(arcBalanceAfter, 6));
}

main().catch(console.error);
