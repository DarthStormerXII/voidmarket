/**
 * Circle Gateway API Transfer Service
 *
 * Provides cross-chain USDC transfers via Gateway API burn intents + EIP-712 signing.
 * Supports all 9 testnet chains (8 EVM + Solana).
 *
 * Value: Chain-abstracted USDC transfers using burn intent protocol
 *
 * VERIFIED WORKING (2025-02-06):
 * - ✅ Avalanche Fuji ↔ Arc (both directions)
 * - ✅ Arc → Ethereum Sepolia
 * - ✅ Arc → Base Sepolia
 * - ✅ Arc → Sonic Testnet
 * - ✅ Arc → World Chain Sepolia
 * - ✅ Arc → Sei Atlantic
 * - ✅ Arc → HyperEVM Testnet
 *
 * CHAIN CONNECTIVITY (8/8 EVM chains connected):
 * - ETH Sepolia, Base Sepolia, Arc, Avalanche Fuji, Sonic, World Chain, Sei, HyperEVM
 *
 * KEY FINDINGS:
 * 1. EIP-712 domain uses ONLY name="GatewayWallet" and version="1" (NO chainId or verifyingContract!)
 * 2. Addresses must be lowercased before padding to bytes32
 * 3. Request body is an array: [{ burnIntent, signature }]
 * 4. Arc USDC (0x3600...) is ERC-20 interface for native USDC - deposit same as other chains
 * 5. Arc uses 6 decimals for ERC-20 interface (not 18)
 * 6. FEES vary by source chain (due to block confirmation times):
 *    - Fast chains (Arc, Fuji, Sonic, Sei, HyperEVM): ~0.03 USDC
 *    - Slow chains (ETH, Base, World Chain): ~2.5 USDC (65 ETH blocks, 13-19 min)
 */

import {
  type Address,
  type WalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  pad,
  maxUint256,
  erc20Abi,
} from 'viem';

// Gateway API Base URL
const GATEWAY_API_TESTNET = 'https://gateway-api-testnet.circle.com';

// Gateway contract addresses (same on all EVM chains)
export const GATEWAY_CONTRACTS = {
  WALLET: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const,
  MINTER: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const,
} as const;

// Chain identifiers
export type GatewayChainId =
  | 'ETH-SEPOLIA'
  | 'BASE-SEPOLIA'
  | 'ARC-TESTNET'
  | 'AVALANCHE-FUJI'
  | 'SONIC-TESTNET'
  | 'WORLD-CHAIN-SEPOLIA'
  | 'SEI-ATLANTIC'
  | 'HYPEREVM-TESTNET'
  | 'SOLANA-DEVNET';

// EVM chain identifiers (excludes Solana)
export type EVMGatewayChainId = Exclude<GatewayChainId, 'SOLANA-DEVNET'>;

// Domain IDs for all 9 supported chains
export const GATEWAY_DOMAINS: Record<GatewayChainId, number> = {
  'ETH-SEPOLIA': 0,
  'AVALANCHE-FUJI': 1,
  'SOLANA-DEVNET': 5,
  'BASE-SEPOLIA': 6,
  'SONIC-TESTNET': 13,
  'WORLD-CHAIN-SEPOLIA': 14,
  'SEI-ATLANTIC': 16,
  'HYPEREVM-TESTNET': 19,
  'ARC-TESTNET': 26,
} as const;

// Reverse lookup: domain ID to chain
export const DOMAIN_TO_CHAIN: Record<number, GatewayChainId> = {
  0: 'ETH-SEPOLIA',
  1: 'AVALANCHE-FUJI',
  5: 'SOLANA-DEVNET',
  6: 'BASE-SEPOLIA',
  13: 'SONIC-TESTNET',
  14: 'WORLD-CHAIN-SEPOLIA',
  16: 'SEI-ATLANTIC',
  19: 'HYPEREVM-TESTNET',
  26: 'ARC-TESTNET',
};

// Chain configuration with RPC endpoints, USDC addresses, and decimals
export interface ChainConfig {
  chainId: number;
  rpc: string;
  usdc: Address; // USDC token address
  decimals: number;
  explorerUrl: string;
  displayName: string;
  minFee: string; // Minimum fee for transfers FROM this chain (in USDC)
}

// USDC addresses from Circle docs: https://developers.circle.com/stablecoins/usdc-contract-addresses
// Fee requirements based on block confirmation times: https://developers.circle.com/gateway/references/supported-blockchains
export const CHAIN_CONFIG: Record<EVMGatewayChainId, ChainConfig> = {
  'ETH-SEPOLIA': {
    chainId: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    explorerUrl: 'https://sepolia.etherscan.io',
    displayName: 'Ethereum Sepolia',
    minFee: '2.5', // ~65 ETH blocks, 13-19 minutes
  },
  'BASE-SEPOLIA': {
    chainId: 84532,
    rpc: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    decimals: 6,
    explorerUrl: 'https://sepolia.basescan.org',
    displayName: 'Base Sepolia',
    minFee: '2.5', // ~65 ETH blocks, 13-19 minutes
  },
  'ARC-TESTNET': {
    chainId: 5042002,
    rpc: 'https://rpc.testnet.arc.network',
    usdc: '0x3600000000000000000000000000000000000000', // ERC-20 interface for native USDC
    decimals: 6, // ERC-20 uses 6 decimals
    explorerUrl: 'https://testnet.arcscan.app',
    displayName: 'Arc Testnet',
    minFee: '0.03', // ~1 block, ~0.5 seconds
  },
  'AVALANCHE-FUJI': {
    chainId: 43113,
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    decimals: 6,
    explorerUrl: 'https://testnet.snowtrace.io',
    displayName: 'Avalanche Fuji',
    minFee: '0.03', // ~1 block, ~8 seconds
  },
  'SONIC-TESTNET': {
    chainId: 64165,
    rpc: 'https://rpc.blaze.soniclabs.com', // Blaze testnet RPC
    usdc: '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51',
    decimals: 6,
    explorerUrl: 'https://testnet.sonicscan.org',
    displayName: 'Sonic Testnet',
    minFee: '0.03', // ~1 block, ~8 seconds
  },
  'WORLD-CHAIN-SEPOLIA': {
    chainId: 4801,
    rpc: 'https://worldchain-sepolia.g.alchemy.com/public',
    usdc: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    decimals: 6,
    explorerUrl: 'https://sepolia.worldscan.org',
    displayName: 'World Chain Sepolia',
    minFee: '2.5', // ~65 ETH blocks, 13-19 minutes
  },
  'SEI-ATLANTIC': {
    chainId: 1328,
    rpc: 'https://evm-rpc-testnet.sei-apis.com',
    usdc: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    decimals: 6,
    explorerUrl: 'https://seitrace.com',
    displayName: 'Sei Atlantic',
    minFee: '0.03', // ~1 block, ~5 seconds
  },
  'HYPEREVM-TESTNET': {
    chainId: 998,
    rpc: 'https://rpc.hyperliquid-testnet.xyz/evm',
    usdc: '0x2B3370eE501B4a559b57D449569354196457D8Ab',
    decimals: 6,
    explorerUrl: 'https://testnet.purrsec.com',
    displayName: 'HyperEVM Testnet',
    minFee: '0.03', // ~1 block, ~5 seconds
  },
} as const;

// EIP-712 Types for Gateway burn intents
// IMPORTANT: Domain ONLY has name and version - NO chainId or verifyingContract
const EIP712_DOMAIN = {
  name: 'GatewayWallet',
  version: '1',
} as const;

const EIP712_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
  ],
  TransferSpec: [
    { name: 'version', type: 'uint32' },
    { name: 'sourceDomain', type: 'uint32' },
    { name: 'destinationDomain', type: 'uint32' },
    { name: 'sourceContract', type: 'bytes32' },
    { name: 'destinationContract', type: 'bytes32' },
    { name: 'sourceToken', type: 'bytes32' },
    { name: 'destinationToken', type: 'bytes32' },
    { name: 'sourceDepositor', type: 'bytes32' },
    { name: 'destinationRecipient', type: 'bytes32' },
    { name: 'sourceSigner', type: 'bytes32' },
    { name: 'destinationCaller', type: 'bytes32' },
    { name: 'value', type: 'uint256' },
    { name: 'salt', type: 'bytes32' },
    { name: 'hookData', type: 'bytes' },
  ],
  BurnIntent: [
    { name: 'maxBlockHeight', type: 'uint256' },
    { name: 'maxFee', type: 'uint256' },
    { name: 'spec', type: 'TransferSpec' },
  ],
} as const;

// Transfer spec structure
export interface TransferSpec {
  version: number;
  sourceDomain: number;
  destinationDomain: number;
  sourceContract: `0x${string}`;
  destinationContract: `0x${string}`;
  sourceToken: `0x${string}`;
  destinationToken: `0x${string}`;
  sourceDepositor: `0x${string}`;
  destinationRecipient: `0x${string}`;
  sourceSigner: `0x${string}`;
  destinationCaller: `0x${string}`;
  value: bigint;
  salt: `0x${string}`;
  hookData: `0x${string}`;
}

// Burn intent structure
export interface BurnIntent {
  maxBlockHeight: bigint;
  maxFee: bigint;
  spec: TransferSpec;
}

// Signed burn intent ready for submission
export interface SignedBurnIntent {
  burnIntent: BurnIntent;
  signature: `0x${string}`;
}

// Transfer result from Gateway API
export interface TransferResult {
  success: boolean;
  transferId?: string;
  attestation?: `0x${string}`;
  operatorSignature?: `0x${string}`;
  fees?: {
    total: string;
    token: string;
  };
  expirationBlock?: string;
  error?: string;
}

// Gateway Minter ABI for minting on destination chain
export const GATEWAY_MINTER_ABI = [
  {
    type: 'function',
    name: 'gatewayMint',
    inputs: [
      { name: 'attestation', type: 'bytes' },
      { name: 'operatorSignature', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// Gateway Wallet ABI for deposits
export const GATEWAY_WALLET_ABI = [
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

/**
 * Pad an address to bytes32 format for cross-chain messaging
 * IMPORTANT: Must lowercase the address before padding
 */
export function addressToBytes32(address: Address): `0x${string}` {
  return pad(address.toLowerCase() as Address, { size: 32 }) as `0x${string}`;
}

/**
 * Generate random salt for burn intent
 */
export function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as `0x${string}`;
}

/**
 * Get Gateway info including current block heights
 */
export async function getGatewayInfo(): Promise<{
  domains: Array<{
    domain: number;
    chain: string;
    network: string;
    processedHeight: string;
    burnIntentExpirationHeight: string;
  }>;
}> {
  const response = await fetch(`${GATEWAY_API_TESTNET}/v1/info`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Gateway info: ${response.status}`);
  }
  return response.json();
}

/**
 * Create a burn intent for cross-chain transfer
 */
export async function createBurnIntent(params: {
  amount: string;
  fromChain: EVMGatewayChainId;
  toChain: EVMGatewayChainId;
  depositor: Address;
  recipient?: Address;
  maxFee?: string; // In USDC, defaults to chain-specific minimum
}): Promise<BurnIntent> {
  const {
    amount,
    fromChain,
    toChain,
    depositor,
    recipient = depositor,
  } = params;

  const sourceConfig = CHAIN_CONFIG[fromChain];
  const destConfig = CHAIN_CONFIG[toChain];
  // Use provided maxFee or chain-specific minimum (ETH/Base/World Chain need ~2.5 USDC)
  const maxFee = params.maxFee ?? sourceConfig.minFee;

  // Get Gateway info for max block height
  const gatewayInfo = await getGatewayInfo();
  const sourceInfo = gatewayInfo.domains.find(
    (d) => d.domain === GATEWAY_DOMAINS[fromChain]
  );

  if (!sourceInfo) {
    throw new Error(`Source chain ${fromChain} not found in Gateway info`);
  }

  // Max block height with buffer
  const maxBlockHeight = BigInt(sourceInfo.burnIntentExpirationHeight) + 10000n;

  const spec: TransferSpec = {
    version: 1,
    sourceDomain: GATEWAY_DOMAINS[fromChain],
    destinationDomain: GATEWAY_DOMAINS[toChain],
    sourceContract: addressToBytes32(GATEWAY_CONTRACTS.WALLET),
    destinationContract: addressToBytes32(GATEWAY_CONTRACTS.MINTER),
    sourceToken: addressToBytes32(sourceConfig.usdc),
    destinationToken: addressToBytes32(destConfig.usdc),
    sourceDepositor: addressToBytes32(depositor),
    destinationRecipient: addressToBytes32(recipient),
    sourceSigner: addressToBytes32(depositor),
    destinationCaller: addressToBytes32(
      '0x0000000000000000000000000000000000000000'
    ),
    value: parseUnits(amount, sourceConfig.decimals),
    salt: generateSalt(),
    hookData: '0x' as `0x${string}`,
  };

  return {
    maxBlockHeight,
    maxFee: parseUnits(maxFee, sourceConfig.decimals),
    spec,
  };
}

/**
 * Sign a burn intent using EIP-712 typed data
 * Uses local account signing (doesn't require RPC support for eth_signTypedData)
 */
export async function signBurnIntent(
  burnIntent: BurnIntent,
  account: { signTypedData: (params: any) => Promise<`0x${string}`> }
): Promise<SignedBurnIntent> {
  const signature = await account.signTypedData({
    domain: EIP712_DOMAIN,
    types: EIP712_TYPES,
    primaryType: 'BurnIntent',
    message: burnIntent,
  });

  return {
    burnIntent,
    signature,
  };
}

/**
 * Submit signed burn intent to Gateway API
 */
export async function submitTransfer(
  signedIntents: SignedBurnIntent[]
): Promise<TransferResult> {
  try {
    // Format for API - array of objects with burnIntent and signature
    const requestBody = signedIntents.map((si) => ({
      burnIntent: {
        maxBlockHeight: si.burnIntent.maxBlockHeight.toString(),
        maxFee: si.burnIntent.maxFee.toString(),
        spec: {
          version: si.burnIntent.spec.version,
          sourceDomain: si.burnIntent.spec.sourceDomain,
          destinationDomain: si.burnIntent.spec.destinationDomain,
          sourceContract: si.burnIntent.spec.sourceContract,
          destinationContract: si.burnIntent.spec.destinationContract,
          sourceToken: si.burnIntent.spec.sourceToken,
          destinationToken: si.burnIntent.spec.destinationToken,
          sourceDepositor: si.burnIntent.spec.sourceDepositor,
          destinationRecipient: si.burnIntent.spec.destinationRecipient,
          sourceSigner: si.burnIntent.spec.sourceSigner,
          destinationCaller: si.burnIntent.spec.destinationCaller,
          value: si.burnIntent.spec.value.toString(),
          salt: si.burnIntent.spec.salt,
          hookData: si.burnIntent.spec.hookData,
        },
      },
      signature: si.signature,
    }));

    const response = await fetch(`${GATEWAY_API_TESTNET}/v1/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `Gateway API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      return { success: false, error: errorMessage };
    }

    const results = JSON.parse(responseText);
    // API returns array, get first result
    const result = Array.isArray(results) ? results[0] : results;

    return {
      success: true,
      transferId: result.transferId,
      attestation: result.attestation,
      operatorSignature: result.signature,
      fees: result.fees,
      expirationBlock: result.expirationBlock,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute complete cross-chain transfer
 *
 * 1. Creates burn intent
 * 2. Signs with EIP-712
 * 3. Submits to Gateway API
 * 4. Returns attestation for minting
 */
export async function executeGatewayTransfer(params: {
  amount: string;
  fromChain: EVMGatewayChainId;
  toChain: EVMGatewayChainId;
  account: {
    address: Address;
    signTypedData: (params: any) => Promise<`0x${string}`>;
  };
  recipient?: Address;
  maxFee?: string;
}): Promise<TransferResult> {
  const {
    amount,
    fromChain,
    toChain,
    account,
    recipient = account.address,
    maxFee,
  } = params;

  // Validate chains are different
  if (fromChain === toChain) {
    return { success: false, error: 'Source and destination chains must differ' };
  }

  try {
    // Create burn intent
    const burnIntent = await createBurnIntent({
      amount,
      fromChain,
      toChain,
      depositor: account.address,
      recipient,
      maxFee,
    });

    // Sign burn intent
    const signedIntent = await signBurnIntent(burnIntent, account);

    // Submit to Gateway API
    return await submitTransfer([signedIntent]);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mint USDC on destination chain using attestation
 */
export async function mintOnDestination(params: {
  attestation: `0x${string}`;
  operatorSignature: `0x${string}`;
  destinationChain: EVMGatewayChainId;
  walletClient: WalletClient;
}): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> {
  const { attestation, operatorSignature, destinationChain, walletClient } =
    params;

  const config = CHAIN_CONFIG[destinationChain];

  try {
    const publicClient = createPublicClient({
      transport: http(config.rpc),
    });

    const txHash = await walletClient.writeContract({
      address: GATEWAY_CONTRACTS.MINTER,
      abi: GATEWAY_MINTER_ABI,
      functionName: 'gatewayMint',
      args: [attestation, operatorSignature],
      chain: {
        id: config.chainId,
        name: config.displayName,
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [config.rpc] } },
      } as any,
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Deposit USDC to Gateway Wallet (required before transfer)
 */
export async function depositToGateway(params: {
  amount: string;
  chain: EVMGatewayChainId;
  walletClient: WalletClient;
  address: Address;
}): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> {
  const { amount, chain, walletClient, address } = params;
  const config = CHAIN_CONFIG[chain];

  try {
    const publicClient = createPublicClient({
      transport: http(config.rpc),
    });

    const depositAmount = parseUnits(amount, config.decimals);

    // Check allowance
    const allowance = await publicClient.readContract({
      address: config.usdc,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, GATEWAY_CONTRACTS.WALLET],
    });

    // Approve if needed
    if (allowance < depositAmount) {
      const approveTx = await walletClient.writeContract({
        address: config.usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GATEWAY_CONTRACTS.WALLET, maxUint256],
        chain: {
          id: config.chainId,
          name: config.displayName,
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: [config.rpc] } },
        } as any,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    }

    // Deposit
    const txHash = await walletClient.writeContract({
      address: GATEWAY_CONTRACTS.WALLET,
      abi: GATEWAY_WALLET_ABI,
      functionName: 'deposit',
      args: [config.usdc, depositAmount],
      chain: {
        id: config.chainId,
        name: config.displayName,
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [config.rpc] } },
      } as any,
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all EVM chains (excludes Solana)
 */
export function getEVMChains(): EVMGatewayChainId[] {
  return Object.keys(CHAIN_CONFIG) as EVMGatewayChainId[];
}

/**
 * Get all chains that can transfer TO Arc
 */
export function getChainsToArc(): EVMGatewayChainId[] {
  return getEVMChains().filter((chain) => chain !== 'ARC-TESTNET');
}

/**
 * Get all chains that can transfer FROM Arc
 */
export function getChainsFromArc(): EVMGatewayChainId[] {
  return getEVMChains().filter((chain) => chain !== 'ARC-TESTNET');
}

/**
 * Format amount for display based on chain decimals
 */
export function formatAmountForChain(
  amount: bigint,
  chainId: EVMGatewayChainId
): string {
  const decimals = CHAIN_CONFIG[chainId].decimals;
  return formatUnits(amount, decimals);
}

/**
 * Parse amount from human-readable to wei based on chain decimals
 */
export function parseAmountForChain(
  amount: string,
  chainId: EVMGatewayChainId
): bigint {
  const decimals = CHAIN_CONFIG[chainId].decimals;
  return parseUnits(amount, decimals);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerTxUrl(
  chainId: EVMGatewayChainId,
  txHash: string
): string {
  const config = CHAIN_CONFIG[chainId];
  return `${config.explorerUrl}/tx/${txHash}`;
}

/**
 * Validate minimum transfer amount (0.001 USDC)
 */
export function validateMinimumAmount(amount: string): boolean {
  const parsed = parseFloat(amount);
  return !isNaN(parsed) && parsed >= 0.001;
}

/**
 * Get chain config by domain ID
 */
export function getChainByDomain(domain: number): ChainConfig | undefined {
  const chainId = DOMAIN_TO_CHAIN[domain];
  if (!chainId || chainId === 'SOLANA-DEVNET') return undefined;
  return CHAIN_CONFIG[chainId as EVMGatewayChainId];
}
