/**
 * Circle CCTP (Cross-Chain Transfer Protocol) Service
 *
 * Handles cross-chain USDC bridging from Sepolia/Base Sepolia to Arc Testnet
 */

import { circleClient, CIRCLE_CONFIG } from './client.js';
import { CCTP_CHAINS, CHAIN_IDS } from '../../config/chains.js';

export interface CCTPTransferParams {
  walletId: string;
  sourceChain: 'sepolia' | 'baseSepolia';
  amount: string; // USDC amount in human-readable format
  destinationAddress: string; // Arc Testnet destination
}

export interface CCTPTransferResult {
  transactionId: string;
  txHash?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  sourceChain: string;
  destinationChain: string;
  amount: string;
}

/**
 * Get the Circle blockchain identifier for a chain
 */
function getCircleBlockchain(chain: 'sepolia' | 'baseSepolia' | 'arcTestnet'): string {
  switch (chain) {
    case 'sepolia':
      return 'ETH-SEPOLIA';
    case 'baseSepolia':
      return 'BASE-SEPOLIA';
    case 'arcTestnet':
      return 'ARC-TESTNET';
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Initiate a CCTP transfer from source chain to Arc Testnet
 */
export async function initiateCCTPTransfer(
  params: CCTPTransferParams
): Promise<CCTPTransferResult> {
  const { walletId, sourceChain, amount, destinationAddress } = params;

  const sourceBlockchain = getCircleBlockchain(sourceChain);
  const destinationBlockchain = getCircleBlockchain('arcTestnet');

  // Get USDC token ID for the source chain
  const cctpConfig = CCTP_CHAINS[sourceChain];
  if (!cctpConfig) {
    throw new Error(`CCTP not supported on ${sourceChain}`);
  }

  // Create cross-chain transfer
  const response = await (circleClient as any).createTransaction({
    walletId,
    blockchain: sourceBlockchain,
    tokenId: cctpConfig.usdc, // USDC contract on source chain
    destinationAddress,
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
    throw new Error('Failed to create CCTP transfer');
  }

  return {
    transactionId: tx.id,
    txHash: tx.txHash || tx.transactionHash,
    status: 'PENDING',
    sourceChain,
    destinationChain: 'arcTestnet',
    amount,
  };
}

/**
 * Check CCTP transfer status
 */
export async function getCCTPTransferStatus(
  transactionId: string
): Promise<CCTPTransferResult> {
  const response = await circleClient.getTransaction({
    id: transactionId,
  });

  const tx = response.data?.transaction;
  if (!tx) {
    throw new Error('Transaction not found');
  }

  let status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  switch (tx.state) {
    case 'COMPLETE':
    case 'CONFIRMED':
      status = 'CONFIRMED';
      break;
    case 'FAILED':
      status = 'FAILED';
      break;
    default:
      status = 'PENDING';
  }

  return {
    transactionId: tx.id,
    txHash: tx.txHash,
    status,
    sourceChain: tx.blockchain || 'unknown',
    destinationChain: 'arcTestnet',
    amount: tx.amounts?.[0] || '0',
  };
}

/**
 * Wait for CCTP transfer to complete
 * Note: CCTP transfers typically take 10-20 minutes
 */
export async function waitForCCTPTransfer(
  transactionId: string,
  timeoutMs = 30 * 60 * 1000, // 30 minutes default
  pollIntervalMs = 30000 // 30 seconds
): Promise<CCTPTransferResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await getCCTPTransferStatus(transactionId);

    if (result.status === 'CONFIRMED' || result.status === 'FAILED') {
      return result;
    }

    console.log(
      `CCTP transfer ${transactionId} still pending... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`
    );

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`CCTP transfer timed out after ${timeoutMs / 1000}s`);
}

/**
 * Get supported CCTP routes
 */
export function getSupportedCCTPRoutes(): Array<{
  sourceChain: string;
  sourceChainId: number;
  destinationChain: string;
  destinationChainId: number;
}> {
  return [
    {
      sourceChain: 'Sepolia',
      sourceChainId: CHAIN_IDS.SEPOLIA,
      destinationChain: 'Arc Testnet',
      destinationChainId: CHAIN_IDS.ARC_TESTNET,
    },
    {
      sourceChain: 'Base Sepolia',
      sourceChainId: CHAIN_IDS.BASE_SEPOLIA,
      destinationChain: 'Arc Testnet',
      destinationChainId: CHAIN_IDS.ARC_TESTNET,
    },
  ];
}

/**
 * Check if a chain supports CCTP to Arc
 */
export function isCCTPSupportedToArc(chainId: number): boolean {
  return chainId === CHAIN_IDS.SEPOLIA || chainId === CHAIN_IDS.BASE_SEPOLIA;
}
