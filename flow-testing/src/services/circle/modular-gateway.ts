/**
 * Circle Modular Wallets + Gateway API Integration
 *
 * Proper integration for Telegram Mini App:
 * - Modular Wallets: User authentication, wallet creation, tx signing (Console visibility)
 * - Gateway API: Cross-chain USDC transfers (permissionless, on-chain)
 *
 * Flow:
 * 1. User authenticates via Telegram → Modular Wallet created
 * 2. User deposits USDC on any chain → Gateway Wallet contract
 * 3. User signs burn intent with Modular Wallet
 * 4. Gateway processes transfer → USDC arrives on Arc
 */

import { CIRCLE_CONFIG } from './client.js';
import {
  createBurnIntent,
  submitTransfer,
  depositToGateway,
  GATEWAY_CONTRACTS,
  GATEWAY_DOMAINS,
  CHAIN_CONFIG,
  type EVMGatewayChainId,
  type TransferResult,
  type SignedBurnIntent,
} from './gateway-transfer.js';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  formatUnits,
  erc20Abi,
  custom,
} from 'viem';

// Gateway API endpoints
const GATEWAY_API_TESTNET = 'https://gateway-api-testnet.circle.com';

/**
 * Gateway balance response
 */
export interface GatewayBalance {
  domain: number;
  chain: string;
  balance: string;
  depositor: string;
}

/**
 * Get unified balance across all chains from Gateway API
 */
export async function getUnifiedGatewayBalance(
  depositor: Address
): Promise<{
  total: string;
  balances: GatewayBalance[];
}> {
  // Only query EVM domains (exclude Solana for now)
  const evmDomains = [0, 1, 6, 13, 14, 16, 19, 26];

  const response = await fetch(`${GATEWAY_API_TESTNET}/v1/balances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'USDC',
      sources: evmDomains.map((domain) => ({ depositor, domain })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Gateway balance error: ${response.status}`);
  }

  const data = await response.json();

  const domainToChain: Record<number, string> = {
    0: 'Ethereum Sepolia',
    1: 'Avalanche Fuji',
    5: 'Solana Devnet',
    6: 'Base Sepolia',
    13: 'Sonic Testnet',
    14: 'World Chain',
    16: 'Sei Atlantic',
    19: 'HyperEVM',
    26: 'Arc Testnet',
  };

  const balances = data.balances.map((b: any) => ({
    domain: b.domain,
    chain: domainToChain[b.domain] || `Domain ${b.domain}`,
    balance: b.balance,
    depositor: b.depositor,
  }));

  const total = balances.reduce(
    (sum: number, b: GatewayBalance) => sum + parseFloat(b.balance || '0'),
    0
  );

  return {
    total: total.toFixed(6),
    balances,
  };
}

/**
 * Execute Gateway transfer using an EIP-1193 provider (Modular Wallet)
 *
 * This is the proper integration where:
 * - User wallet is Modular Wallet (shows in Circle Console)
 * - Transfer uses Gateway API (permissionless)
 */
export async function executeGatewayTransferWithProvider(params: {
  amount: string;
  fromChain: EVMGatewayChainId;
  toChain: EVMGatewayChainId;
  provider: any; // EIP-1193 provider from Modular Wallet SDK
  address: Address;
  recipient?: Address;
}): Promise<TransferResult> {
  const { amount, fromChain, toChain, provider, address, recipient = address } = params;

  if (fromChain === toChain) {
    return { success: false, error: 'Source and destination must differ' };
  }

  try {
    // Create wallet client from provider
    const walletClient = createWalletClient({
      account: address,
      transport: custom(provider),
    });

    // Step 1: Deposit to Gateway if needed (approve + deposit)
    // This transaction shows in Circle Console
    const depositResult = await depositToGateway({
      amount,
      chain: fromChain,
      walletClient: walletClient as any,
      address,
    });

    if (!depositResult.success) {
      return { success: false, error: `Deposit failed: ${depositResult.error}` };
    }

    // Step 2: Create burn intent
    const burnIntent = await createBurnIntent({
      amount,
      fromChain,
      toChain,
      depositor: address,
      recipient,
    });

    // Step 3: Sign burn intent using Modular Wallet
    // This signature is created by the user's Modular Wallet
    const signature = await walletClient.signTypedData({
      account: address,
      domain: { name: 'GatewayWallet', version: '1' },
      types: {
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
      },
      primaryType: 'BurnIntent',
      message: burnIntent,
    });

    // Step 4: Submit to Gateway API
    const signedIntent: SignedBurnIntent = {
      burnIntent,
      signature: signature as `0x${string}`,
    };

    return await submitTransfer([signedIntent]);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get on-chain USDC balance (not Gateway balance)
 */
export async function getOnChainUsdcBalance(
  chain: EVMGatewayChainId,
  address: Address
): Promise<string> {
  const config = CHAIN_CONFIG[chain];
  const client = createPublicClient({ transport: http(config.rpc) });

  const balance = await client.readContract({
    address: config.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  return formatUnits(balance, config.decimals);
}

/**
 * Check if Gateway has received a deposit (finalized)
 */
export async function isDepositFinalized(
  chain: EVMGatewayChainId,
  depositor: Address,
  expectedAmount: string
): Promise<boolean> {
  const { balances } = await getUnifiedGatewayBalance(depositor);
  const domain = GATEWAY_DOMAINS[chain];
  const balance = balances.find((b) => b.domain === domain);

  if (!balance) return false;

  return parseFloat(balance.balance) >= parseFloat(expectedAmount);
}

/**
 * Configuration for Modular Wallet SDK (frontend)
 */
export function getModularWalletConfig() {
  return {
    clientUrl: CIRCLE_CONFIG.CLIENT_URL,
    clientKey: CIRCLE_CONFIG.CLIENT_KEY,
    // Chains where users can deposit
    supportedChains: Object.keys(CHAIN_CONFIG),
    // Primary chain for unified balance
    primaryChain: 'ARC-TESTNET',
    // Gateway contracts (same on all EVM chains)
    gatewayWallet: GATEWAY_CONTRACTS.WALLET,
    gatewayMinter: GATEWAY_CONTRACTS.MINTER,
  };
}

/**
 * Get supported chains for deposits (to Arc unified balance)
 */
export function getSupportedDepositChains(): Array<{
  id: EVMGatewayChainId;
  name: string;
  domain: number;
  minFee: string;
  estimatedTime: string;
}> {
  return Object.entries(CHAIN_CONFIG)
    .filter(([id]) => id !== 'ARC-TESTNET')
    .map(([id, config]) => ({
      id: id as EVMGatewayChainId,
      name: config.displayName,
      domain: GATEWAY_DOMAINS[id as EVMGatewayChainId],
      minFee: config.minFee,
      estimatedTime: parseFloat(config.minFee) > 1 ? '13-19 min' : '< 1 min',
    }));
}

/**
 * Estimate transfer fee
 */
export function estimateTransferFee(fromChain: EVMGatewayChainId): {
  fee: string;
  estimatedTime: string;
} {
  const config = CHAIN_CONFIG[fromChain];
  return {
    fee: `~${config.minFee} USDC`,
    estimatedTime: parseFloat(config.minFee) > 1 ? '13-19 min' : '< 1 min',
  };
}
