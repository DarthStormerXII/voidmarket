/**
 * Flow 14: Gateway Cross-Chain Transfer Test
 *
 * Live integration test for Gateway API transfers.
 * Tests actual fund movement between chains.
 */

import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import 'dotenv/config';

import {
  getUnifiedBalance,
  formatBalance,
  GATEWAY_DOMAINS,
} from '../services/circle/gateway.js';
import {
  createBurnIntent,
  signBurnIntent,
  submitTransfer,
  getTransferStatus,
  waitForTransfer,
  CHAIN_CONFIG,
  GATEWAY_CONTRACTS,
  type GatewayChainId,
} from '../services/circle/gateway-transfer.js';

// Test configuration
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const TEST_AMOUNT = '0.01'; // 0.01 USDC for testing

// ERC20 ABI for approval and balance check
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Gateway Wallet ABI for deposits
const GATEWAY_WALLET_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

async function main() {
  console.log('='.repeat(60));
  console.log('Gateway Cross-Chain Transfer Integration Test');
  console.log('='.repeat(60));

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('Error: DEPLOYER_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  // Setup account
  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  console.log(`\nTest wallet: ${account.address}`);

  // Step 1: Check unified balance before transfer
  console.log('\n' + '-'.repeat(60));
  console.log('Step 1: Checking unified balance BEFORE transfer');
  console.log('-'.repeat(60));

  const balanceBefore = await getUnifiedBalance(account.address);

  if (!balanceBefore.success) {
    console.error('Failed to get balance:', balanceBefore.error);
    process.exit(1);
  }

  console.log('\nCurrent balances:');
  console.log(formatBalance(balanceBefore));
  console.log(`\nTotal unified USDC: $${balanceBefore.totalUSDC.toFixed(6)}`);

  // Find a source chain with balance
  let sourceChainBalance = balanceBefore.balances.find(
    (b) => b.balanceUSDC > 0 && b.chain !== 'ARC-TESTNET'
  );

  if (!sourceChainBalance) {
    console.log('\n⚠️  No USDC balance found on any source chain.');
    console.log('To test transfers, you need USDC on one of these chains:');
    for (const chain of Object.keys(GATEWAY_DOMAINS)) {
      if (chain !== 'ARC-TESTNET') {
        const config = CHAIN_CONFIG[chain as GatewayChainId];
        console.log(`  - ${chain}: Get testnet USDC from faucet`);
        if (config.usdc) {
          console.log(`    USDC address: ${config.usdc}`);
        }
      }
    }

    // Check on-chain balance directly for ETH Sepolia
    console.log('\nChecking on-chain USDC balance on ETH Sepolia...');

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(CHAIN_CONFIG['ETH-SEPOLIA'].rpc),
    });

    const usdcAddress = CHAIN_CONFIG['ETH-SEPOLIA'].usdc!;
    const onChainBalance = await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });

    console.log(`On-chain USDC balance: ${formatUnits(onChainBalance, 6)} USDC`);

    if (onChainBalance === 0n) {
      console.log('\n📍 To get testnet USDC on Sepolia:');
      console.log('   1. Visit https://faucet.circle.com');
      console.log('   2. Connect wallet or enter address');
      console.log('   3. Request USDC on Ethereum Sepolia');
      console.log(`   4. Your address: ${account.address}`);
      return;
    }

    // User has on-chain balance but Gateway shows $0
    // Need to deposit to Gateway Wallet contract first
    console.log('\n💡 You have USDC on-chain but Gateway balance is $0.');
    console.log('This means you need to deposit to the Gateway Wallet contract first.');

    // Step: Deposit to Gateway
    console.log('\n' + '-'.repeat(60));
    console.log('Step 1b: Depositing USDC to Gateway Wallet');
    console.log('-'.repeat(60));

    const depositAmount = parseUnits(TEST_AMOUNT, 6); // ETH Sepolia has 6 decimals

    // First approve
    console.log(`\nApproving Gateway Wallet to spend ${TEST_AMOUNT} USDC...`);

    const walletClientForDeposit = createWalletClient({
      account,
      chain: sepolia,
      transport: http(CHAIN_CONFIG['ETH-SEPOLIA'].rpc),
    });

    // Check current allowance
    const currentAllowance = await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, GATEWAY_CONTRACTS.WALLET],
    });

    console.log(`Current allowance: ${formatUnits(currentAllowance, 6)} USDC`);

    if (currentAllowance < depositAmount) {
      console.log('Approving...');
      const approveHash = await walletClientForDeposit.writeContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [GATEWAY_CONTRACTS.WALLET, depositAmount * 10n], // Approve 10x for future
      });

      console.log(`Approval tx: ${approveHash}`);

      // Wait for approval
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log(`Approval confirmed in block ${approveReceipt.blockNumber}`);
    } else {
      console.log('Already approved.');
    }

    // Now deposit
    console.log(`\nDepositing ${TEST_AMOUNT} USDC to Gateway Wallet...`);

    const depositHash = await walletClientForDeposit.writeContract({
      address: GATEWAY_CONTRACTS.WALLET,
      abi: GATEWAY_WALLET_ABI,
      functionName: 'deposit',
      args: [usdcAddress, depositAmount],
    });

    console.log(`Deposit tx: ${depositHash}`);
    console.log(`Explorer: https://sepolia.etherscan.io/tx/${depositHash}`);

    // Wait for deposit
    const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
    console.log(`Deposit confirmed in block ${depositReceipt.blockNumber}`);

    // Wait a moment for Gateway to index
    console.log('\nWaiting 5 seconds for Gateway to index deposit...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Re-check Gateway balance
    const balanceAfterDeposit = await getUnifiedBalance(account.address);
    console.log('\nGateway balance after deposit:');
    console.log(formatBalance(balanceAfterDeposit));

    // Continue with transfer using on-chain balance
    sourceChainBalance = {
      chain: 'ETH-SEPOLIA',
      domain: 0,
      balance: onChainBalance.toString(),
      balanceUSDC: parseFloat(formatUnits(onChainBalance, 6))
    };
  }

  const sourceChain = sourceChainBalance?.chain as GatewayChainId || 'ETH-SEPOLIA';
  const availableBalance = sourceChainBalance?.balanceUSDC || 0;

  console.log(`\nSource chain: ${sourceChain}`);
  console.log(`Available balance: $${availableBalance.toFixed(6)} USDC`);

  // Check if we have enough for test amount
  const testAmountNum = parseFloat(TEST_AMOUNT);
  if (availableBalance < testAmountNum) {
    console.log(`\n⚠️  Insufficient balance for test amount ($${TEST_AMOUNT})`);
    console.log('Please fund the wallet with more testnet USDC.');
    return;
  }

  // Step 2: Create burn intent
  console.log('\n' + '-'.repeat(60));
  console.log('Step 2: Creating burn intent');
  console.log('-'.repeat(60));

  const intent = createBurnIntent({
    amount: TEST_AMOUNT,
    fromChain: sourceChain,
    toChain: 'ARC-TESTNET',
    depositor: account.address,
    recipient: account.address,
  });

  console.log('\nBurn Intent:');
  console.log(`  Amount: ${formatUnits(intent.amount, CHAIN_CONFIG[sourceChain].decimals)} USDC`);
  console.log(`  Source: ${sourceChain} (domain ${GATEWAY_DOMAINS[sourceChain]})`);
  console.log(`  Destination: ARC-TESTNET (domain ${GATEWAY_DOMAINS['ARC-TESTNET']})`);
  console.log(`  Nonce: ${intent.nonce}`);
  console.log(`  Deadline: ${new Date(Number(intent.deadline) * 1000).toISOString()}`);

  // Step 3: Setup wallet client and sign
  console.log('\n' + '-'.repeat(60));
  console.log('Step 3: Signing burn intent (EIP-712)');
  console.log('-'.repeat(60));

  const chainConfig = CHAIN_CONFIG[sourceChain];

  // Create a custom chain definition
  const sourceChainDef = {
    id: chainConfig.chainId,
    name: chainConfig.displayName,
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [chainConfig.rpc] },
    },
  } as const;

  const walletClient = createWalletClient({
    account,
    chain: sourceChainDef,
    transport: http(chainConfig.rpc),
  });

  try {
    const signedIntent = await signBurnIntent(
      intent,
      walletClient,
      account.address,
      sourceChain
    );

    console.log(`\nSignature: ${signedIntent.signature.slice(0, 20)}...${signedIntent.signature.slice(-10)}`);
    console.log(`Source domain: ${signedIntent.sourceDomain}`);

    // Step 4: Submit to Gateway API
    console.log('\n' + '-'.repeat(60));
    console.log('Step 4: Submitting to Gateway API');
    console.log('-'.repeat(60));

    console.log('\nSubmitting signed intent to Gateway API...');
    const transferResult = await submitTransfer([signedIntent]);

    if (!transferResult.success) {
      console.error('\n❌ Transfer submission failed:', transferResult.error);

      // Check if we need to deposit to Gateway Wallet first
      if (transferResult.error?.includes('insufficient') || transferResult.error?.includes('balance')) {
        console.log('\n💡 You may need to deposit USDC to the Gateway Wallet contract first.');
        console.log(`Gateway Wallet: ${GATEWAY_CONTRACTS.WALLET}`);
        console.log('\nTo deposit:');
        console.log('1. Approve Gateway Wallet to spend your USDC');
        console.log('2. Call depositFor() on Gateway Wallet contract');
      }
      return;
    }

    console.log('\n✅ Transfer submitted successfully!');
    console.log(`Transfer ID: ${transferResult.transferId}`);
    console.log(`Status: ${transferResult.status}`);

    // Step 5: Wait for completion
    if (transferResult.transferId) {
      console.log('\n' + '-'.repeat(60));
      console.log('Step 5: Waiting for transfer completion');
      console.log('-'.repeat(60));

      console.log('\nPolling for status...');
      const finalResult = await waitForTransfer(transferResult.transferId, {
        timeoutMs: 120000, // 2 minutes
        pollIntervalMs: 5000,
      });

      console.log(`\nFinal status: ${finalResult.status}`);

      if (finalResult.attestation) {
        console.log(`Attestation: ${finalResult.attestation.slice(0, 30)}...`);
      }
    }

    // Step 6: Check balance after transfer
    console.log('\n' + '-'.repeat(60));
    console.log('Step 6: Checking unified balance AFTER transfer');
    console.log('-'.repeat(60));

    // Wait a bit for balance to update
    console.log('\nWaiting 10 seconds for balance to update...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const balanceAfter = await getUnifiedBalance(account.address);

    if (balanceAfter.success) {
      console.log('\nNew balances:');
      console.log(formatBalance(balanceAfter));

      // Compare
      console.log('\n' + '-'.repeat(60));
      console.log('Balance Comparison');
      console.log('-'.repeat(60));

      for (const chain of ['ETH-SEPOLIA', 'BASE-SEPOLIA', 'ARC-TESTNET'] as const) {
        const before = balanceBefore.balances.find((b) => b.chain === chain)?.balanceUSDC || 0;
        const after = balanceAfter.balances.find((b) => b.chain === chain)?.balanceUSDC || 0;
        const diff = after - before;
        const sign = diff >= 0 ? '+' : '';
        console.log(`${chain}: $${before.toFixed(6)} -> $${after.toFixed(6)} (${sign}${diff.toFixed(6)})`);
      }

      console.log(`\nTotal: $${balanceBefore.totalUSDC.toFixed(6)} -> $${balanceAfter.totalUSDC.toFixed(6)}`);
    }

  } catch (error) {
    console.error('\n❌ Error during transfer:', error);

    if (error instanceof Error && error.message.includes('user rejected')) {
      console.log('Transfer was rejected by user/signer.');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Gateway Transfer Test Complete');
  console.log('='.repeat(60));
}

// Also export a function to just check balances
export async function checkGatewayBalance(address: `0x${string}`) {
  console.log(`Checking Gateway balance for ${address}...\n`);

  const balance = await getUnifiedBalance(address);

  if (balance.success) {
    console.log(formatBalance(balance));
    return balance;
  } else {
    console.error('Error:', balance.error);
    return null;
  }
}

// Run if executed directly
main().catch(console.error);
