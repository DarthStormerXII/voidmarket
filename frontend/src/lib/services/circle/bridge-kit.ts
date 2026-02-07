/**
 * Circle Bridge Kit Service
 *
 * Cross-chain USDC transfers using Circle's BridgeKit SDK.
 * Uses the proven pattern from playground-circle reference implementation.
 *
 * BridgeKit handles the full CCTP flow:
 *   approve → depositForBurn → attestation polling → receiveMessage (mint)
 *
 * @see https://developers.circle.com/bridge-kit
 */

import { BridgeKit } from "@circle-fin/bridge-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";

// BridgeKit chain identifiers (must match SDK expectations)
export type BridgeChain =
  | "Ethereum_Sepolia"
  | "Base_Sepolia"
  | "Arc_Testnet";

// Mapping from VoidMarket chain IDs to BridgeKit chain names
export type VoidMarketChain = "ETH-SEPOLIA" | "BASE-SEPOLIA" | "ARC-TESTNET";

const CHAIN_MAP: Record<VoidMarketChain, BridgeChain> = {
  "ETH-SEPOLIA": "Ethereum_Sepolia",
  "BASE-SEPOLIA": "Base_Sepolia",
  "ARC-TESTNET": "Arc_Testnet",
};

const REVERSE_CHAIN_MAP: Record<BridgeChain, VoidMarketChain> = {
  Ethereum_Sepolia: "ETH-SEPOLIA",
  Base_Sepolia: "BASE-SEPOLIA",
  Arc_Testnet: "ARC-TESTNET",
};

// Chain metadata
export interface BridgeChainInfo {
  id: VoidMarketChain;
  bridgeKitId: BridgeChain;
  name: string;
  chainId: number;
  usdcDecimals: number;
  explorerUrl: string;
  domain: number; // CCTP domain ID
  usdcAddress: string;
}

export const BRIDGE_CHAINS: Record<VoidMarketChain, BridgeChainInfo> = {
  "ETH-SEPOLIA": {
    id: "ETH-SEPOLIA",
    bridgeKitId: "Ethereum_Sepolia",
    name: "Ethereum Sepolia",
    chainId: 11155111,
    usdcDecimals: 6,
    explorerUrl: "https://sepolia.etherscan.io",
    domain: 0,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
  "BASE-SEPOLIA": {
    id: "BASE-SEPOLIA",
    bridgeKitId: "Base_Sepolia",
    name: "Base Sepolia",
    chainId: 84532,
    usdcDecimals: 6,
    explorerUrl: "https://sepolia.basescan.org",
    domain: 6,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  "ARC-TESTNET": {
    id: "ARC-TESTNET",
    bridgeKitId: "Arc_Testnet",
    name: "Arc Testnet",
    chainId: 5042002,
    usdcDecimals: 18,
    explorerUrl: "https://testnet.arcscan.app",
    domain: 26,
    usdcAddress: "0x3600000000000000000000000000000000000000",
  },
};

// Bridge step result
export interface BridgeStep {
  name: string;
  state: "success" | "failed" | "pending" | "skipped";
  txHash?: string;
  data?: {
    txHash?: string;
    status?: string;
    blockNumber?: bigint;
    gasUsed?: bigint;
    explorerUrl?: string;
  };
}

// Bridge operation result
export interface BridgeResult {
  state: "completed" | "failed" | "pending";
  steps: BridgeStep[];
  burnTxHash?: string;
  mintTxHash?: string;
  error?: string;
}

// Bridge operation parameters
export interface BridgeParams {
  privateKey: string;
  fromChain: VoidMarketChain;
  toChain: VoidMarketChain;
  amount: string; // Human-readable (e.g., "10.00")
}

// Singleton BridgeKit instance
let bridgeKitInstance: BridgeKit | null = null;

/**
 * Get or create BridgeKit singleton instance
 */
export function createBridgeKit(): BridgeKit {
  if (!bridgeKitInstance) {
    bridgeKitInstance = new BridgeKit();
  }
  return bridgeKitInstance;
}

/**
 * Convert VoidMarket chain ID to BridgeKit chain name
 */
export function toBridgeChain(chain: VoidMarketChain): BridgeChain {
  const bridgeChain = CHAIN_MAP[chain];
  if (!bridgeChain) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return bridgeChain;
}

/**
 * Convert BridgeKit chain name to VoidMarket chain ID
 */
export function toVoidMarketChain(chain: BridgeChain): VoidMarketChain {
  return REVERSE_CHAIN_MAP[chain];
}

/**
 * Execute a cross-chain USDC bridge using BridgeKit SDK.
 *
 * This is the core CCTP bridge function. BridgeKit handles:
 * 1. USDC approval on source chain
 * 2. depositForBurn on TokenMessenger (burns USDC)
 * 3. Polling IRIS API for attestation
 * 4. receiveMessage on MessageTransmitter (mints USDC on destination)
 */
export async function bridgeWithKit(
  params: BridgeParams
): Promise<BridgeResult> {
  const { privateKey, fromChain, toChain, amount } = params;

  if (fromChain === toChain) {
    return {
      state: "failed",
      steps: [],
      error: "Source and destination chains must be different",
    };
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return {
      state: "failed",
      steps: [],
      error: "Invalid amount: must be a positive number",
    };
  }

  try {
    const kit = createBridgeKit();

    // Create viem adapter from the bridge wallet's private key
    const adapter = createViemAdapterFromPrivateKey({
      privateKey: privateKey as `0x${string}`,
    });

    // Track transaction hashes via events
    let burnTxHash: string | undefined;
    let mintTxHash: string | undefined;

    kit.on("burn", (payload) => {
      if (payload.values?.txHash) {
        burnTxHash = payload.values.txHash;
        console.log(`[BridgeKit] Burn TX: ${burnTxHash}`);
      }
    });

    kit.on("mint", (payload) => {
      if (payload.values?.txHash) {
        mintTxHash = payload.values.txHash;
        console.log(`[BridgeKit] Mint TX: ${mintTxHash}`);
      }
    });

    const fromBridgeChain = toBridgeChain(fromChain);
    const toBridgeChain_ = toBridgeChain(toChain);

    console.log(
      `[BridgeKit] Bridging ${amount} USDC: ${fromBridgeChain} → ${toBridgeChain_}`
    );

    // Execute bridge — BridgeKit handles the full CCTP flow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await kit.bridge({
      from: { adapter, chain: fromBridgeChain as any },
      to: { adapter, chain: toBridgeChain_ as any },
      amount: amount,
    });

    // Process result steps
    const steps: BridgeStep[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (
      result &&
      typeof result === "object" &&
      "steps" in result &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.isArray((result as any).steps)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const step of (result as any).steps) {
        const processedStep: BridgeStep = {
          name: step.name || "unknown",
          state: step.state || "pending",
          txHash: step.txHash,
          data: step.data
            ? {
                txHash: step.data.txHash,
                status: step.data.status,
                explorerUrl: step.data.explorerUrl,
                blockNumber: step.data.blockNumber,
                gasUsed: step.data.gasUsed,
              }
            : undefined,
        };

        if (step.name === "burn" && step.txHash) {
          burnTxHash = step.txHash;
        }
        if (step.name === "mint" && step.txHash) {
          mintTxHash = step.txHash;
        }

        steps.push(processedStep);
      }
    }

    const hasFailure = steps.some((s) => s.state === "failed");
    const allComplete = steps.every(
      (s) => s.state === "success" || s.state === "skipped"
    );

    console.log(
      `[BridgeKit] Bridge complete. Burn: ${burnTxHash}, Mint: ${mintTxHash}`
    );

    return {
      state: hasFailure ? "failed" : allComplete ? "completed" : "pending",
      steps,
      burnTxHash,
      mintTxHash,
    };
  } catch (error) {
    console.error("[BridgeKit] Bridge failed:", error);
    return {
      state: "failed",
      steps: [],
      error: error instanceof Error ? error.message : "Bridge failed",
    };
  }
}

/**
 * Get deposit chains (all chains except Arc — that's the destination)
 */
export function getSupportedDepositChains(): BridgeChainInfo[] {
  return Object.values(BRIDGE_CHAINS).filter((c) => c.id !== "ARC-TESTNET");
}

/**
 * Get chain explorer URL for a transaction or address
 */
export function getChainExplorerUrl(
  chain: VoidMarketChain,
  addressOrTx: string,
  type: "address" | "tx" = "address"
): string {
  const info = BRIDGE_CHAINS[chain];
  return `${info.explorerUrl}/${type}/${addressOrTx}`;
}

