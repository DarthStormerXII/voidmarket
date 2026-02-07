/**
 * Circle Bridge Kit Service
 *
 * Handles cross-chain USDC deposits to Arc Testnet.
 * Since developer-controlled wallets don't expose private keys,
 * deposits work via:
 * 1. User sends USDC to their address on any supported chain
 * 2. Gateway API detects the balance
 * 3. Admin triggers CCTP bridge to Arc Testnet
 */

// Supported chains for deposits
export type BridgeChain =
  | 'ETH-SEPOLIA'
  | 'BASE-SEPOLIA'
  | 'ARC-TESTNET';

export interface BridgeChainInfo {
  id: BridgeChain;
  name: string;
  chainId: number;
  usdcDecimals: number;
  explorerUrl: string;
  domain: number; // CCTP domain ID
}

export const BRIDGE_CHAINS: Record<BridgeChain, BridgeChainInfo> = {
  'ETH-SEPOLIA': {
    id: 'ETH-SEPOLIA',
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    usdcDecimals: 6,
    explorerUrl: 'https://sepolia.etherscan.io',
    domain: 0,
  },
  'BASE-SEPOLIA': {
    id: 'BASE-SEPOLIA',
    name: 'Base Sepolia',
    chainId: 84532,
    usdcDecimals: 6,
    explorerUrl: 'https://sepolia.basescan.org',
    domain: 6,
  },
  'ARC-TESTNET': {
    id: 'ARC-TESTNET',
    name: 'Arc Testnet',
    chainId: 5042002,
    usdcDecimals: 18,
    explorerUrl: 'https://testnet.arcscan.app',
    domain: 26,
  },
};

export function getSupportedDepositChains(): BridgeChainInfo[] {
  // All chains except Arc (that's the destination)
  return Object.values(BRIDGE_CHAINS).filter(c => c.id !== 'ARC-TESTNET');
}

export function getChainExplorerUrl(chain: BridgeChain, addressOrTx: string, type: 'address' | 'tx' = 'address'): string {
  const info = BRIDGE_CHAINS[chain];
  return `${info.explorerUrl}/${type}/${addressOrTx}`;
}
