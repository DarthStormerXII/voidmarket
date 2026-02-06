/**
 * Circle Transaction Service
 *
 * Execute transactions from developer-controlled wallets
 * Supports contract calls, native transfers, and token transfers
 */

import { getCircleClient } from './client';
import { encodeFunctionData, parseAbi, type Abi } from 'viem';

export interface TransactionResult {
  transactionId: string;
  txHash?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  errorReason?: string;
}

export interface ContractCallParams {
  walletId: string;
  contractAddress: string;
  abi: Abi | readonly string[];
  functionName: string;
  args?: unknown[];
  value?: bigint;
}

export interface TransferParams {
  walletId: string;
  to: string;
  amount: string; // In human-readable units (e.g., "1.5" for 1.5 USDC)
}

/**
 * Execute a contract call from a Circle wallet
 */
export async function executeContractCall(
  params: ContractCallParams
): Promise<TransactionResult> {
  const { walletId, contractAddress, abi, functionName, args = [], value } = params;
  const client = getCircleClient();

  // Encode the function call
  const callData = encodeFunctionData({
    abi: typeof abi[0] === 'string' ? parseAbi(abi as readonly string[]) : abi,
    functionName,
    args,
  });

  // Create transaction request
  const response = await (client as any).createContractExecutionTransaction({
    walletId,
    contractAddress,
    callData,
    amount: value ? (value / 10n ** 18n).toString() : undefined, // Convert from wei to USDC
    fee: {
      type: 'level',
      config: {
        feeLevel: 'HIGH', // Ensure fast confirmation
      },
    },
  });

  const tx = response.data as any;
  if (!tx) {
    throw new Error('Failed to create transaction');
  }

  return {
    transactionId: tx.id,
    txHash: tx.txHash || tx.transactionHash,
    status: mapTransactionState(tx.state),
  };
}

/**
 * Execute a native USDC transfer
 */
export async function executeTransfer(
  params: TransferParams
): Promise<TransactionResult> {
  const { walletId, to, amount } = params;
  const client = getCircleClient();

  const response = await (client as any).createTransaction({
    walletId,
    blockchain: 'ARC-TESTNET',
    tokenId: '', // Native token
    destinationAddress: to,
    amounts: [amount],
    fee: {
      type: 'level',
      config: {
        feeLevel: 'HIGH',
      },
    },
  });

  const tx = response.data as any;
  if (!tx) {
    throw new Error('Failed to create transfer');
  }

  return {
    transactionId: tx.id,
    txHash: tx.txHash || tx.transactionHash,
    status: mapTransactionState(tx.state),
  };
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  transactionId: string
): Promise<TransactionResult> {
  const client = getCircleClient();
  const response = await client.getTransaction({
    id: transactionId,
  });

  const tx = response.data?.transaction;
  if (!tx) {
    throw new Error('Transaction not found');
  }

  return {
    transactionId: tx.id,
    txHash: tx.txHash,
    status: mapTransactionState(tx.state),
    errorReason: tx.errorReason,
  };
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  transactionId: string,
  timeoutMs = 60000,
  pollIntervalMs = 2000
): Promise<TransactionResult> {
  const startTime = Date.now();
  const client = getCircleClient();

  while (Date.now() - startTime < timeoutMs) {
    const response = await client.getTransaction({
      id: transactionId,
    });

    const tx = response.data?.transaction;
    if (!tx) {
      throw new Error('Transaction not found');
    }

    const status = mapTransactionState(tx.state);

    if (status === 'CONFIRMED' || status === 'FAILED' || status === 'CANCELLED') {
      return {
        transactionId: tx.id,
        txHash: tx.txHash,
        status,
        errorReason: tx.errorReason,
      };
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Transaction timed out after ${timeoutMs}ms`);
}

/**
 * Execute contract call and wait for confirmation
 */
export async function executeAndWait(
  params: ContractCallParams
): Promise<TransactionResult> {
  const result = await executeContractCall(params);
  return waitForTransaction(result.transactionId);
}

/**
 * Map Circle transaction state to our status
 */
function mapTransactionState(
  state: string
): 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' {
  switch (state) {
    case 'COMPLETE':
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'FAILED':
      return 'FAILED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}
