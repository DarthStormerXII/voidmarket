/**
 * Quick verification test: Arc → Fuji (known working)
 */

import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, formatUnits, erc20Abi } from 'viem';

import {
  executeGatewayTransfer,
  depositToGateway,
  CHAIN_CONFIG,
} from '../services/circle/gateway-transfer.js';

async function main() {
  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('No private key found');
    process.exit(1);
  }

  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log('Account:', evmAccount.address);

  // Check Arc balance
  const arcConfig = CHAIN_CONFIG['ARC-TESTNET'];
  const arcClient = createPublicClient({ transport: http(arcConfig.rpc) });
  const arcBalanceBefore = await arcClient.readContract({
    address: arcConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });

  // Check Fuji balance
  const fujiConfig = CHAIN_CONFIG['AVALANCHE-FUJI'];
  const fujiClient = createPublicClient({ transport: http(fujiConfig.rpc) });
  const fujiBalanceBefore = await fujiClient.readContract({
    address: fujiConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });

  console.log('=== Arc → Fuji Test (0.001 USDC) ===');
  console.log('Arc USDC before:', formatUnits(arcBalanceBefore, 6));
  console.log('Fuji USDC before:', formatUnits(fujiBalanceBefore, 6));

  // Deposit and transfer
  const arcWalletClient = createWalletClient({
    account: evmAccount,
    transport: http(arcConfig.rpc),
  });

  console.log('Depositing to Gateway...');
  const depositResult = await depositToGateway({
    amount: '0.001',
    chain: 'ARC-TESTNET',
    walletClient: arcWalletClient as any,
    address: evmAccount.address,
  });
  console.log('Deposit:', depositResult.success ? `OK - ${depositResult.txHash}` : depositResult.error);

  // Wait for indexing
  console.log('Waiting 5s for indexing...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('Executing transfer...');
  const result = await executeGatewayTransfer({
    amount: '0.001',
    fromChain: 'ARC-TESTNET',
    toChain: 'AVALANCHE-FUJI',
    account: evmAccount,
  });

  if (result.success) {
    console.log('✓ Transfer ID:', result.transferId);
    console.log('  Fee:', result.fees?.total, result.fees?.token);

    // Wait and check balances
    console.log('Waiting 15s for settlement...');
    await new Promise(r => setTimeout(r, 15000));

    const arcBalanceAfter = await arcClient.readContract({
      address: arcConfig.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [evmAccount.address],
    });

    const fujiBalanceAfter = await fujiClient.readContract({
      address: fujiConfig.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [evmAccount.address],
    });

    console.log('');
    console.log('=== Balance Changes ===');
    console.log('Arc USDC:', formatUnits(arcBalanceBefore, 6), '→', formatUnits(arcBalanceAfter, 6));
    console.log('Fuji USDC:', formatUnits(fujiBalanceBefore, 6), '→', formatUnits(fujiBalanceAfter, 6));
  } else {
    console.log('✗ Error:', result.error);
  }
}

main().catch(console.error);
