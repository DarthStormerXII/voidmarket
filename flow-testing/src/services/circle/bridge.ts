/**
 * Circle Bridge Kit Integration
 *
 * Enables cross-chain USDC transfers via CCTP.
 * Users can bridge USDC from ETH Sepolia or Base Sepolia to Arc Testnet.
 *
 * Value: Onboard users from any supported chain to Arc Testnet
 */

import { BridgeKit } from '@circle-fin/bridge-kit';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';

// Supported chains for bridging
export type BridgeChain =
  | 'Ethereum_Sepolia'
  | 'Base_Sepolia'
  | 'Arc_Testnet';

// Chain display names
export const CHAIN_DISPLAY_NAMES: Record<BridgeChain, string> = {
  Ethereum_Sepolia: 'Ethereum Sepolia',
  Base_Sepolia: 'Base Sepolia',
  Arc_Testnet: 'Arc Testnet',
};

// Explorer URLs
const EXPLORERS: Record<BridgeChain, string> = {
  Ethereum_Sepolia: 'https://sepolia.etherscan.io',
  Base_Sepolia: 'https://sepolia.basescan.org',
  Arc_Testnet: 'https://testnet.arcscan.app',
};

// Bridge step result
export interface BridgeStep {
  name: string;
  state: 'success' | 'failed' | 'pending' | 'skipped';
  txHash?: string;
  error?: string;
}

// Bridge operation result
export interface BridgeResult {
  success: boolean;
  state: 'completed' | 'failed' | 'pending';
  steps: BridgeStep[];
  burnTxHash?: string;
  mintTxHash?: string;
  error?: string;
}

// Singleton instance
let bridgeKitInstance: BridgeKit | null = null;

function getBridgeKit(): BridgeKit {
  if (!bridgeKitInstance) {
    bridgeKitInstance = new BridgeKit();
  }
  return bridgeKitInstance;
}

/**
 * Bridge USDC to Arc Testnet
 *
 * @param privateKey - User's private key (from Circle wallet or external)
 * @param fromChain - Source chain
 * @param amount - Amount in USDC (e.g., "10.00")
 * @returns Bridge result with transaction details
 */
export async function bridgeToArc(
  privateKey: string,
  fromChain: 'Ethereum_Sepolia' | 'Base_Sepolia',
  amount: string
): Promise<BridgeResult> {
  return bridgeUSDC(privateKey, fromChain, 'Arc_Testnet', amount);
}

/**
 * Bridge USDC between any supported chains
 *
 * @param privateKey - User's private key
 * @param fromChain - Source chain
 * @param toChain - Destination chain
 * @param amount - Amount in USDC (e.g., "10.00")
 * @returns Bridge result with transaction details
 */
export async function bridgeUSDC(
  privateKey: string,
  fromChain: BridgeChain,
  toChain: BridgeChain,
  amount: string
): Promise<BridgeResult> {
  // Validate chains are different
  if (fromChain === toChain) {
    return {
      success: false,
      state: 'failed',
      steps: [],
      error: 'Source and destination chains must be different',
    };
  }

  // Validate amount
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return {
      success: false,
      state: 'failed',
      steps: [],
      error: 'Invalid amount: must be a positive number',
    };
  }

  try {
    const kit = getBridgeKit();

    // Create adapter from private key
    const adapter = createViemAdapterFromPrivateKey({
      privateKey: privateKey as `0x${string}`,
    });

    // Track transaction hashes
    let burnTxHash: string | undefined;
    let mintTxHash: string | undefined;

    // Set up event listeners
    kit.on('burn', (payload: { values?: { txHash?: string } }) => {
      if (payload.values?.txHash) {
        burnTxHash = payload.values.txHash;
      }
    });

    kit.on('mint', (payload: { values?: { txHash?: string } }) => {
      if (payload.values?.txHash) {
        mintTxHash = payload.values.txHash;
      }
    });

    // Execute bridge transfer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await kit.bridge({
      from: { adapter, chain: fromChain as any },
      to: { adapter, chain: toChain as any },
      amount,
    });

    // Process result steps
    const steps: BridgeStep[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (result && typeof result === 'object' && 'steps' in result) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const step of (result as any).steps || []) {
        const processedStep: BridgeStep = {
          name: step.name || 'unknown',
          state: step.state || 'pending',
          txHash: step.txHash,
        };

        if (step.name === 'burn' && step.txHash) {
          burnTxHash = step.txHash;
        }
        if (step.name === 'mint' && step.txHash) {
          mintTxHash = step.txHash;
        }

        steps.push(processedStep);
      }
    }

    // Determine overall state
    const hasFailure = steps.some((s) => s.state === 'failed');
    const allComplete = steps.every((s) => s.state === 'success' || s.state === 'skipped');

    return {
      success: !hasFailure && allComplete,
      state: hasFailure ? 'failed' : allComplete ? 'completed' : 'pending',
      steps,
      burnTxHash,
      mintTxHash,
    };
  } catch (error) {
    return {
      success: false,
      state: 'failed',
      steps: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get explorer URL for a transaction
 */
export function getTxExplorerUrl(chain: BridgeChain, txHash: string): string {
  return `${EXPLORERS[chain]}/tx/${txHash}`;
}

/**
 * Get supported source chains for bridging to Arc
 */
export function getSourceChainsForArc(): BridgeChain[] {
  return ['Ethereum_Sepolia', 'Base_Sepolia'];
}
