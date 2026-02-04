/**
 * Complete Gateway Flow: Deposit → Transfer → Mint
 *
 * This test does the full flow with immediate minting on destination.
 * Tests Arc → Fuji with proper balance verification.
 */

import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, formatUnits, erc20Abi } from 'viem';

import {
  executeGatewayTransfer,
  depositToGateway,
  mintOnDestination,
  CHAIN_CONFIG,
  GATEWAY_CONTRACTS,
  GATEWAY_MINTER_ABI,
} from '../services/circle/gateway-transfer.js';

async function main() {
  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('No private key found');
    process.exit(1);
  }

  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log('Account:', evmAccount.address);
  console.log('');

  // Configs
  const arcConfig = CHAIN_CONFIG['ARC-TESTNET'];
  const fujiConfig = CHAIN_CONFIG['AVALANCHE-FUJI'];

  const arcClient = createPublicClient({ transport: http(arcConfig.rpc) });
  const fujiClient = createPublicClient({ transport: http(fujiConfig.rpc) });

  const arcWalletClient = createWalletClient({
    account: evmAccount,
    transport: http(arcConfig.rpc),
  });

  const fujiWalletClient = createWalletClient({
    account: evmAccount,
    transport: http(fujiConfig.rpc),
  });

  // Step 1: Check balances BEFORE
  console.log('=== BEFORE ===');
  const arcBefore = await arcClient.readContract({
    address: arcConfig.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [evmAccount.address],
  });
  const fujiBefore = await fujiClient.readContract({
    address: fujiConfig.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [evmAccount.address],
  });
  console.log('Arc USDC:', formatUnits(arcBefore, 6));
  console.log('Fuji USDC:', formatUnits(fujiBefore, 6));
  console.log('');

  // Step 2: Deposit to Gateway
  console.log('[1] Depositing 0.002 USDC to Arc Gateway...');
  const depositResult = await depositToGateway({
    amount: '0.002',
    chain: 'ARC-TESTNET',
    walletClient: arcWalletClient as any,
    address: evmAccount.address,
  });
  if (!depositResult.success) {
    console.error('Deposit failed:', depositResult.error);
    process.exit(1);
  }
  console.log('Deposit tx:', depositResult.txHash);
  console.log('Waiting 5s for indexing...');
  await new Promise(r => setTimeout(r, 5000));

  // Step 3: Create and submit transfer
  console.log('');
  console.log('[2] Creating transfer Arc → Fuji (0.001 USDC)...');
  const transferResult = await executeGatewayTransfer({
    amount: '0.001',
    fromChain: 'ARC-TESTNET',
    toChain: 'AVALANCHE-FUJI',
    account: evmAccount,
  });

  if (!transferResult.success) {
    console.error('Transfer failed:', transferResult.error);
    process.exit(1);
  }

  console.log('Transfer ID:', transferResult.transferId);
  console.log('Fee:', transferResult.fees?.total, transferResult.fees?.token);
  console.log('Attestation:', transferResult.attestation?.slice(0, 40) + '...');
  console.log('Signature:', transferResult.operatorSignature?.slice(0, 40) + '...');

  // Step 4: IMMEDIATELY call gatewayMint on Fuji
  if (transferResult.attestation && transferResult.operatorSignature) {
    console.log('');
    console.log('[3] Calling gatewayMint on Fuji...');

    const mintResult = await mintOnDestination({
      attestation: transferResult.attestation,
      operatorSignature: transferResult.operatorSignature,
      destinationChain: 'AVALANCHE-FUJI',
      walletClient: fujiWalletClient as any,
    });

    if (mintResult.success) {
      console.log('✓ Mint tx:', mintResult.txHash);
      console.log('Explorer:', `${fujiConfig.explorerUrl}/tx/${mintResult.txHash}`);
    } else {
      console.log('✗ Mint failed:', mintResult.error);
    }
  } else {
    console.log('No attestation/signature returned');
  }

  // Step 5: Check balances AFTER
  console.log('');
  console.log('Waiting 5s for confirmation...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('');
  console.log('=== AFTER ===');
  const arcAfter = await arcClient.readContract({
    address: arcConfig.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [evmAccount.address],
  });
  const fujiAfter = await fujiClient.readContract({
    address: fujiConfig.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [evmAccount.address],
  });
  console.log('Arc USDC:', formatUnits(arcBefore, 6), '→', formatUnits(arcAfter, 6));
  console.log('Fuji USDC:', formatUnits(fujiBefore, 6), '→', formatUnits(fujiAfter, 6));

  // Verification
  console.log('');
  console.log('=== VERIFICATION ===');
  const arcChange = parseFloat(formatUnits(arcAfter - arcBefore, 6));
  const fujiChange = parseFloat(formatUnits(fujiAfter - fujiBefore, 6));
  console.log('Arc change:', arcChange.toFixed(6), 'USDC', arcChange < 0 ? '(decreased ✓)' : '');
  console.log('Fuji change:', fujiChange.toFixed(6), 'USDC', fujiChange > 0 ? '(increased ✓)' : '');
}

main().catch(console.error);
