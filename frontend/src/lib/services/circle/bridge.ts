/**
 * Circle CCTP Bridge Service
 *
 * Handles cross-chain USDC transfers between supported chains and Arc Testnet.
 * Uses Circle SDK's createTransaction which handles CCTP burn/mint automatically.
 */

import { getCircleClient, CIRCLE_CONFIG, type SupportedBlockchain } from './client';
import { getOrCreateWallet, getWalletByRefId } from './wallet';

export interface BridgeTransferResult {
  transactionId: string;
  status: string;
  sourceChain: SupportedBlockchain;
  destinationChain: SupportedBlockchain;
}

/**
 * Ensure wallets exist on both source and Arc chains for a user.
 * Circle uses the same address across chains with the same refId.
 */
export async function ensureMultiChainWallets(
  refId: string,
  sourceBlockchain: SupportedBlockchain
): Promise<{ sourceWalletId: string; arcWalletId: string }> {
  // Get or create wallet on source chain
  const sourceWallet = await getOrCreateWallet(refId, sourceBlockchain);

  // Get or create wallet on Arc Testnet
  const arcWallet = await getOrCreateWallet(refId, 'ARC-TESTNET');

  return {
    sourceWalletId: sourceWallet.walletId,
    arcWalletId: arcWallet.walletId,
  };
}

/**
 * Initiate a bridge transfer from a source chain to Arc Testnet.
 * Circle SDK handles CCTP burn/mint automatically when transferring
 * between wallets on different chains.
 */
export async function initiateBridgeTransfer(params: {
  refId: string;
  sourceBlockchain: SupportedBlockchain;
  amount: string;
}): Promise<BridgeTransferResult> {
  const { refId, sourceBlockchain, amount } = params;
  const client = getCircleClient();

  // Ensure wallets exist on both chains
  const { sourceWalletId, arcWalletId } = await ensureMultiChainWallets(refId, sourceBlockchain);

  // Get Arc wallet address for destination
  const arcWallet = await getWalletByRefId(refId);
  if (!arcWallet) {
    throw new Error('Arc wallet not found after creation');
  }

  // Create cross-chain transfer — Circle SDK handles CCTP
  const response = await (client as any).createTransaction({
    walletId: sourceWalletId,
    blockchain: sourceBlockchain,
    tokenId: '', // Native/default USDC token
    destinationAddress: arcWallet.address,
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
    throw new Error('Failed to create bridge transfer');
  }

  return {
    transactionId: tx.id,
    status: tx.state || 'PENDING',
    sourceChain: sourceBlockchain,
    destinationChain: 'ARC-TESTNET',
  };
}

/**
 * Initiate a bridge withdrawal from Arc Testnet to a destination chain.
 */
export async function initiateBridgeWithdrawal(params: {
  refId: string;
  destinationBlockchain: SupportedBlockchain;
  destinationAddress: string;
  amount: string;
}): Promise<BridgeTransferResult> {
  const { refId, destinationBlockchain, destinationAddress, amount } = params;
  const client = getCircleClient();

  // Get Arc wallet
  const arcWallet = await getWalletByRefId(refId);
  if (!arcWallet) {
    throw new Error('Arc wallet not found');
  }

  // Create cross-chain transfer from Arc to destination
  const response = await (client as any).createTransaction({
    walletId: arcWallet.id,
    blockchain: 'ARC-TESTNET',
    tokenId: '',
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
    throw new Error('Failed to create bridge withdrawal');
  }

  return {
    transactionId: tx.id,
    status: tx.state || 'PENDING',
    sourceChain: 'ARC-TESTNET',
    destinationChain: destinationBlockchain,
  };
}
