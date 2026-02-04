/**
 * Complete the pending Fuji mint using attestation
 */

import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, formatUnits, erc20Abi } from 'viem';

import {
  GATEWAY_CONTRACTS,
  GATEWAY_MINTER_ABI,
  CHAIN_CONFIG,
} from '../services/circle/gateway-transfer.js';

// Attestation from the Arc → Fuji transfer
// Transfer ID: 0eb0c64f-8c5c-43d3-8468-1ea7fb35f266

async function main() {
  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('No private key found');
    process.exit(1);
  }

  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log('Account:', evmAccount.address);

  const fujiConfig = CHAIN_CONFIG['AVALANCHE-FUJI'];
  const fujiClient = createPublicClient({ transport: http(fujiConfig.rpc) });

  // Check current balance
  const balanceBefore = await fujiClient.readContract({
    address: fujiConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });
  console.log('Fuji USDC before mint:', formatUnits(balanceBefore, 6));

  // Note: We need the attestation and signature from the transfer
  // These expire after 10 minutes, so we'd need fresh ones
  console.log('');
  console.log('To complete a mint, we need fresh attestation (expires in 10 min)');
  console.log('Let me run a new complete transfer with immediate mint...');
}

main().catch(console.error);
