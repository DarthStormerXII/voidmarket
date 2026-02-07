/**
 * Circle CCTP Bridge Service
 *
 * Handles cross-chain USDC transfers between supported chains and Arc Testnet.
 * Uses BridgeKit SDK for CCTP operations (proven pattern from playground-circle).
 *
 * Architecture:
 * - A server-side bridge wallet (BRIDGE_PRIVATE_KEY) handles CCTP operations
 * - BridgeKit manages the full burn → attestation → mint flow
 * - Post-bridge transfers move funds to/from user wallets
 *
 * Deposit flow (Source → Arc):
 *   1. User sends USDC to bridge wallet address on source chain
 *   2. BridgeKit bridges from source → Arc (via CCTP)
 *   3. Bridge wallet transfers to user's dev wallet on Arc
 *
 * Withdrawal flow (Arc → Destination):
 *   1. User's dev wallet transfers to bridge wallet on Arc
 *   2. BridgeKit bridges from Arc → destination (via CCTP)
 *   3. Bridge wallet transfers to user's external address
 */

import {
  bridgeWithKit,
  type VoidMarketChain,
  type BridgeResult,
  BRIDGE_CHAINS,
} from "./bridge-kit";
import { getOrCreateWallet, getWalletByRefId } from "./wallet";
import type { SupportedBlockchain } from "./client";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, baseSepolia } from "viem/chains";

// Arc Testnet chain definition for viem
const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { decimals: 18, name: "USDC", symbol: "USDC" },
  rpcUrls: {
    default: {
      http: [
        process.env.ARC_RPC_URL || "https://rpc-testnet.arc.circle.com",
      ],
    },
  },
  testnet: true,
});

// Chain configs for post-bridge transfers
const VIEM_CHAINS = {
  "ETH-SEPOLIA": {
    chain: sepolia,
    rpc:
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
    decimals: 6,
  },
  "BASE-SEPOLIA": {
    chain: baseSepolia,
    rpc:
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
      "https://base-sepolia-rpc.publicnode.com",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
    decimals: 6,
  },
  "ARC-TESTNET": {
    chain: arcTestnet,
    rpc: process.env.ARC_RPC_URL || "https://rpc-testnet.arc.circle.com",
    usdcAddress: "0x3600000000000000000000000000000000000000" as `0x${string}`,
    decimals: 18,
  },
} as const;

// ERC-20 transfer ABI (for post-bridge USDC transfers on non-Arc chains)
const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface BridgeTransferResult {
  status: string;
  sourceChain: SupportedBlockchain;
  destinationChain: SupportedBlockchain;
  burnTxHash?: string;
  mintTxHash?: string;
  transferTxHash?: string;
  bridgeWalletAddress?: string;
  error?: string;
}

/**
 * Get the bridge wallet private key from environment
 */
function getBridgePrivateKey(): string {
  const key = process.env.BRIDGE_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "BRIDGE_PRIVATE_KEY not configured. Required for CCTP bridge operations."
    );
  }
  return key;
}

/**
 * Get the bridge wallet address (derived from BRIDGE_PRIVATE_KEY)
 */
export function getBridgeWalletAddress(): string {
  const key = getBridgePrivateKey();
  const account = privateKeyToAccount(key as `0x${string}`);
  return account.address;
}

/**
 * Ensure wallets exist on both source and Arc chains for a user.
 * Circle uses the same address across chains with the same refId.
 */
export async function ensureMultiChainWallets(
  refId: string,
  sourceBlockchain: SupportedBlockchain
): Promise<{ sourceWalletId: string; arcWalletId: string }> {
  const sourceWallet = await getOrCreateWallet(refId, sourceBlockchain);
  const arcWallet = await getOrCreateWallet(refId, "ARC-TESTNET");

  return {
    sourceWalletId: sourceWallet.walletId,
    arcWalletId: arcWallet.walletId,
  };
}

/**
 * Transfer USDC from bridge wallet to a recipient on a specific chain.
 * Used after BridgeKit completes the CCTP bridge.
 *
 * On Arc Testnet: native transfer (USDC is the native currency)
 * On other chains: ERC-20 transfer
 */
async function transferFromBridgeWallet(
  chain: VoidMarketChain,
  recipient: string,
  amount: string
): Promise<string> {
  const privateKey = getBridgePrivateKey();
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const chainConfig = VIEM_CHAINS[chain];

  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpc),
  });

  const walletClient = createWalletClient({
    account,
    chain: chainConfig.chain,
    transport: http(chainConfig.rpc),
  });

  if (chain === "ARC-TESTNET") {
    // Arc: USDC is native currency, use value transfer
    const amountWei = parseUnits(amount, 18);
    const hash = await walletClient.sendTransaction({
      to: recipient as `0x${string}`,
      value: amountWei,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[Bridge] Arc native transfer: ${hash}`);
    return hash;
  } else {
    // Other chains: ERC-20 transfer
    const amountSmallest = parseUnits(amount, chainConfig.decimals);
    const hash = await walletClient.writeContract({
      address: chainConfig.usdcAddress,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [recipient as `0x${string}`, amountSmallest],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[Bridge] ERC-20 transfer on ${chain}: ${hash}`);
    return hash;
  }
}

/**
 * Initiate a bridge transfer from a source chain to Arc Testnet.
 *
 * Flow:
 * 1. BridgeKit bridges USDC from source → Arc (using server bridge wallet)
 * 2. Bridge wallet transfers USDC to user's dev wallet on Arc
 */
export async function initiateBridgeTransfer(params: {
  refId: string;
  sourceBlockchain: SupportedBlockchain;
  amount: string;
}): Promise<BridgeTransferResult> {
  const { refId, sourceBlockchain, amount } = params;

  // Get user's Arc wallet for the final transfer
  const arcWallet = await getWalletByRefId(refId);
  if (!arcWallet) {
    throw new Error("Arc wallet not found. Create a wallet first.");
  }

  const privateKey = getBridgePrivateKey();

  console.log(
    `[Bridge] Deposit: ${amount} USDC from ${sourceBlockchain} → ARC-TESTNET for ${refId}`
  );

  // Step 1: Bridge via BridgeKit (CCTP)
  const bridgeResult: BridgeResult = await bridgeWithKit({
    privateKey,
    fromChain: sourceBlockchain as VoidMarketChain,
    toChain: "ARC-TESTNET",
    amount,
  });

  if (bridgeResult.state === "failed") {
    return {
      status: "FAILED",
      sourceChain: sourceBlockchain,
      destinationChain: "ARC-TESTNET",
      error: bridgeResult.error || "Bridge failed",
      burnTxHash: bridgeResult.burnTxHash,
      bridgeWalletAddress: getBridgeWalletAddress(),
    };
  }

  // Step 2: Transfer from bridge wallet to user's dev wallet on Arc
  let transferTxHash: string | undefined;
  try {
    transferTxHash = await transferFromBridgeWallet(
      "ARC-TESTNET",
      arcWallet.address,
      amount
    );
  } catch (err) {
    console.error("[Bridge] Post-bridge transfer failed:", err);
    // Bridge succeeded but final transfer failed — funds are in bridge wallet
    return {
      status: "PARTIAL",
      sourceChain: sourceBlockchain,
      destinationChain: "ARC-TESTNET",
      burnTxHash: bridgeResult.burnTxHash,
      mintTxHash: bridgeResult.mintTxHash,
      error: "Bridge succeeded but final transfer to your wallet failed. Contact support.",
      bridgeWalletAddress: getBridgeWalletAddress(),
    };
  }

  return {
    status: bridgeResult.state === "completed" ? "CONFIRMED" : "PENDING",
    sourceChain: sourceBlockchain,
    destinationChain: "ARC-TESTNET",
    burnTxHash: bridgeResult.burnTxHash,
    mintTxHash: bridgeResult.mintTxHash,
    transferTxHash,
    bridgeWalletAddress: getBridgeWalletAddress(),
  };
}

/**
 * Initiate a bridge withdrawal from Arc Testnet to a destination chain.
 *
 * Flow:
 * 1. BridgeKit bridges USDC from Arc → destination (using server bridge wallet)
 * 2. Bridge wallet transfers USDC to user's external address on destination
 */
export async function initiateBridgeWithdrawal(params: {
  refId: string;
  destinationBlockchain: SupportedBlockchain;
  destinationAddress: string;
  amount: string;
}): Promise<BridgeTransferResult> {
  const { refId, destinationBlockchain, destinationAddress, amount } = params;

  const privateKey = getBridgePrivateKey();

  console.log(
    `[Bridge] Withdraw: ${amount} USDC from ARC-TESTNET → ${destinationBlockchain} for ${refId}`
  );

  // Step 1: Bridge via BridgeKit (CCTP)
  const bridgeResult: BridgeResult = await bridgeWithKit({
    privateKey,
    fromChain: "ARC-TESTNET",
    toChain: destinationBlockchain as VoidMarketChain,
    amount,
  });

  if (bridgeResult.state === "failed") {
    return {
      status: "FAILED",
      sourceChain: "ARC-TESTNET",
      destinationChain: destinationBlockchain,
      error: bridgeResult.error || "Bridge failed",
      burnTxHash: bridgeResult.burnTxHash,
      bridgeWalletAddress: getBridgeWalletAddress(),
    };
  }

  // Step 2: Transfer from bridge wallet to user's destination address
  let transferTxHash: string | undefined;
  try {
    transferTxHash = await transferFromBridgeWallet(
      destinationBlockchain as VoidMarketChain,
      destinationAddress,
      amount
    );
  } catch (err) {
    console.error("[Bridge] Post-bridge transfer failed:", err);
    return {
      status: "PARTIAL",
      sourceChain: "ARC-TESTNET",
      destinationChain: destinationBlockchain,
      burnTxHash: bridgeResult.burnTxHash,
      mintTxHash: bridgeResult.mintTxHash,
      error: "Bridge succeeded but final transfer failed. Contact support.",
      bridgeWalletAddress: getBridgeWalletAddress(),
    };
  }

  return {
    status: bridgeResult.state === "completed" ? "CONFIRMED" : "PENDING",
    sourceChain: "ARC-TESTNET",
    destinationChain: destinationBlockchain,
    burnTxHash: bridgeResult.burnTxHash,
    mintTxHash: bridgeResult.mintTxHash,
    transferTxHash,
    bridgeWalletAddress: getBridgeWalletAddress(),
  };
}
