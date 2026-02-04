/**
 * Direct Transaction Service (Testing Only)
 *
 * Executes transactions directly using viem with private keys.
 * This bypasses Circle SDK for testing purposes.
 */

import {
  createWalletClient,
  http,
  encodeFunctionData,
  parseAbi,
  type Abi,
  type Account,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { publicClients, ARC_TESTNET_CHAIN } from '../../config/chains.js';

// Test accounts (loaded from environment or defaults)
const TEST_PRIVATE_KEY = (process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.ADMIN_PRIVATE_KEY ||
  '0x1db85f1330137a46544eed6a034b623d75f0f5f2e238f2708ad243de22bee3d1') as `0x${string}`;

// Create test account
const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY);

// Create wallet client for Arc Testnet
const walletClient = createWalletClient({
  account: testAccount,
  chain: ARC_TESTNET_CHAIN,
  transport: http(ARC_TESTNET_CHAIN.rpcUrls.default.http[0]),
});

export interface DirectTransactionResult {
  txHash: Hash;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  errorReason?: string;
}

export interface DirectContractCallParams {
  contractAddress: Address;
  abi: Abi | readonly string[];
  functionName: string;
  args?: unknown[];
  value?: bigint;
  account?: Account; // Optional override account
}

/**
 * Get test account address
 */
export function getTestAccountAddress(): Address {
  return testAccount.address;
}

/**
 * Get test account
 */
export function getTestAccount(): Account {
  return testAccount;
}

/**
 * Create a new test account from private key
 */
export function createTestAccount(privateKey: `0x${string}`): Account {
  return privateKeyToAccount(privateKey);
}

/**
 * Execute a contract call directly using viem
 */
export async function executeDirectContractCall(
  params: DirectContractCallParams
): Promise<DirectTransactionResult> {
  const { contractAddress, abi, functionName, args = [], value, account } = params;

  // Parse ABI if it's human-readable format
  const parsedAbi = typeof abi[0] === 'string' ? parseAbi(abi as readonly string[]) : abi;

  // Encode the function call
  const data = encodeFunctionData({
    abi: parsedAbi,
    functionName,
    args,
  });

  try {
    // Use provided account or default test account
    const txAccount = account || testAccount;

    // Create wallet client for specific account if different
    const client =
      account && account.address !== testAccount.address
        ? createWalletClient({
            account: account,
            chain: ARC_TESTNET_CHAIN,
            transport: http(ARC_TESTNET_CHAIN.rpcUrls.default.http[0]),
          })
        : walletClient;

    // Send transaction
    const txHash = await client.sendTransaction({
      to: contractAddress,
      data,
      value,
      account: txAccount,
    });

    console.log(`  Transaction sent: ${txHash}`);

    return {
      txHash,
      status: 'PENDING',
    };
  } catch (error) {
    console.error('Transaction failed:', error);
    return {
      txHash: '0x' as Hash,
      status: 'FAILED',
      errorReason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForDirectTransaction(
  txHash: Hash,
  timeoutMs = 60000
): Promise<DirectTransactionResult> {
  try {
    const receipt = await publicClients.arcTestnet.waitForTransactionReceipt({
      hash: txHash,
      timeout: timeoutMs,
    });

    return {
      txHash,
      status: receipt.status === 'success' ? 'CONFIRMED' : 'FAILED',
      errorReason: receipt.status !== 'success' ? 'Transaction reverted' : undefined,
    };
  } catch (error) {
    return {
      txHash,
      status: 'FAILED',
      errorReason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute contract call and wait for confirmation
 */
export async function executeDirectAndWait(
  params: DirectContractCallParams
): Promise<DirectTransactionResult> {
  const result = await executeDirectContractCall(params);

  if (result.status === 'FAILED') {
    return result;
  }

  return waitForDirectTransaction(result.txHash);
}

/**
 * Send native USDC transfer
 */
export async function sendDirectTransfer(
  to: Address,
  amount: bigint,
  account?: Account
): Promise<DirectTransactionResult> {
  try {
    const txAccount = account || testAccount;
    const client =
      account && account.address !== testAccount.address
        ? createWalletClient({
            account: account,
            chain: ARC_TESTNET_CHAIN,
            transport: http(ARC_TESTNET_CHAIN.rpcUrls.default.http[0]),
          })
        : walletClient;

    const txHash = await client.sendTransaction({
      to,
      value: amount,
      account: txAccount,
    });

    console.log(`  Transfer sent: ${txHash}`);

    return {
      txHash,
      status: 'PENDING',
    };
  } catch (error) {
    return {
      txHash: '0x' as Hash,
      status: 'FAILED',
      errorReason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get account balance
 */
export async function getBalance(address?: Address): Promise<bigint> {
  const targetAddress = address || testAccount.address;
  return publicClients.arcTestnet.getBalance({ address: targetAddress });
}

/**
 * Fund a test account from the main test account
 */
export async function fundTestAccount(address: Address, amount: bigint): Promise<DirectTransactionResult> {
  const result = await sendDirectTransfer(address, amount);
  if (result.status === 'PENDING') {
    return waitForDirectTransaction(result.txHash);
  }
  return result;
}

export { testAccount, walletClient };
