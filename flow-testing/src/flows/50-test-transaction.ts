/**
 * Test Circle Developer-Controlled Wallet Transaction
 *
 * Fund the demo wallet and test a transaction
 */

import 'dotenv/config';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { createPublicClient, createWalletClient, http, formatUnits, erc20Abi, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const ARC_CONFIG = {
  chainId: 5042002,
  rpc: 'https://rpc.testnet.arc.network',
  usdc: '0x3600000000000000000000000000000000000000' as const,
};

async function main() {
  console.log('='.repeat(70));
  console.log('Test Circle Wallet Transaction');
  console.log('='.repeat(70));
  console.log('');

  // Initialize
  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });

  const fundingKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!fundingKey) {
    console.error('No funding key available');
    return;
  }

  const fundingAccount = privateKeyToAccount(fundingKey as `0x${string}`);
  console.log('Funding wallet:', fundingAccount.address);

  // Get any Arc wallet (since refId isn't being saved properly)
  const wallets = await circle.listWallets({});
  const arcWallet = wallets.data?.wallets?.find(w => w.blockchain === 'ARC-TESTNET');

  if (!arcWallet) {
    console.error('No Arc wallet found');
    return;
  }

  console.log('Demo user wallet:', arcWallet.address);
  console.log('');

  // Check balances
  const arcClient = createPublicClient({ transport: http(ARC_CONFIG.rpc) });

  const fundingBalance = await arcClient.readContract({
    address: ARC_CONFIG.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [fundingAccount.address],
  });

  const demoBalance = await arcClient.readContract({
    address: ARC_CONFIG.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [arcWallet.address as `0x${string}`],
  });

  console.log('=== Before Transfer ===');
  console.log('Funding wallet USDC:', formatUnits(fundingBalance, 6));
  console.log('Demo wallet USDC:', formatUnits(demoBalance, 6));
  console.log('');

  // Fund the demo wallet with 0.1 USDC from funding wallet
  const transferAmount = parseUnits('0.1', 6);

  if (fundingBalance < transferAmount) {
    console.log('Insufficient funding balance');
    return;
  }

  console.log('=== Funding Demo Wallet ===');
  console.log('Transferring 0.1 USDC to demo wallet...');

  const fundingClient = createWalletClient({
    account: fundingAccount,
    transport: http(ARC_CONFIG.rpc),
  });

  try {
    const txHash = await fundingClient.writeContract({
      address: ARC_CONFIG.usdc,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [arcWallet.address as `0x${string}`, transferAmount],
      chain: {
        id: ARC_CONFIG.chainId,
        name: 'Arc Testnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [ARC_CONFIG.rpc] } },
      } as any,
    });

    console.log('Transfer tx:', txHash);

    // Wait for confirmation
    await arcClient.waitForTransactionReceipt({ hash: txHash });
    console.log('Transfer confirmed ✓');
  } catch (e: any) {
    console.error('Transfer error:', e.message);
    return;
  }

  // Check new balances
  const demoBalanceAfter = await arcClient.readContract({
    address: ARC_CONFIG.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [arcWallet.address as `0x${string}`],
  });

  console.log('');
  console.log('=== After Transfer ===');
  console.log('Demo wallet USDC:', formatUnits(demoBalanceAfter, 6));
  console.log('');

  // Now test Circle SDK transaction (transfer back)
  console.log('=== Test Circle SDK Transaction ===');
  console.log('Using Circle SDK to transfer 0.05 USDC back...');
  console.log('');

  try {
    // Create transaction via Circle
    const txResponse = await circle.createContractExecutionTransaction({
      walletId: arcWallet.id,
      contractAddress: ARC_CONFIG.usdc,
      abiFunctionSignature: 'transfer(address,uint256)',
      abiParameters: [fundingAccount.address, parseUnits('0.05', 6).toString()],
      fee: {
        type: 'level',
        config: { feeLevel: 'HIGH' },
      },
    });

    console.log('Transaction created:');
    console.log('  ID:', txResponse.data?.id);
    console.log('  State:', txResponse.data?.state);

    // Wait for transaction to complete
    if (txResponse.data?.id) {
      console.log('Waiting for confirmation...');

      let attempts = 0;
      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 2000));
        const status = await circle.getTransaction({ id: txResponse.data.id });
        const state = status.data?.transaction?.state;

        console.log(`  Attempt ${attempts + 1}: ${state}`);

        if (state === 'CONFIRMED') {
          console.log('');
          console.log('✓ Circle SDK transaction confirmed!');
          console.log('  Tx Hash:', status.data?.transaction?.txHash);
          break;
        } else if (state === 'FAILED' || state === 'CANCELLED') {
          console.log('Transaction failed:', state);
          break;
        }

        attempts++;
      }
    }
  } catch (e: any) {
    console.error('Circle transaction error:', e.message);
    if (e.response?.data) {
      console.error('Details:', JSON.stringify(e.response.data, null, 2));
    }
  }

  // Final balances
  const finalFunding = await arcClient.readContract({
    address: ARC_CONFIG.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [fundingAccount.address],
  });

  const finalDemo = await arcClient.readContract({
    address: ARC_CONFIG.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [arcWallet.address as `0x${string}`],
  });

  console.log('');
  console.log('=== Final Balances ===');
  console.log('Funding wallet USDC:', formatUnits(finalFunding, 6));
  console.log('Demo wallet USDC:', formatUnits(finalDemo, 6));
}

main().catch(console.error);
