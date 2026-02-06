/**
 * Check current balances across all chains
 */

import 'dotenv/config';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';

const CHAIN_CONFIGS: Record<string, { rpc: string; usdc: `0x${string}` }> = {
  Arc_Testnet: {
    rpc: 'https://rpc.testnet.arc.network',
    usdc: '0x3600000000000000000000000000000000000000',
  },
  Ethereum_Sepolia: {
    rpc: 'https://rpc.sepolia.org',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  Avalanche_Fuji: {
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
  },
  Base_Sepolia: {
    rpc: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  Arbitrum_Sepolia: {
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
  Optimism_Sepolia: {
    rpc: 'https://sepolia.optimism.io',
    usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
  Polygon_Amoy_Testnet: {
    rpc: 'https://rpc-amoy.polygon.technology',
    usdc: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  },
  Linea_Sepolia: {
    rpc: 'https://rpc.sepolia.linea.build',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
};

async function main() {
  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('Missing EVM private key');
    process.exit(1);
  }

  const { privateKeyToAccount } = await import('viem/accounts');
  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);

  console.log('='.repeat(50));
  console.log('Current USDC Balances');
  console.log('Wallet:', evmAccount.address);
  console.log('='.repeat(50));
  console.log('');

  for (const [chain, config] of Object.entries(CHAIN_CONFIGS)) {
    try {
      const client = createPublicClient({ transport: http(config.rpc) });
      const balance = await client.readContract({
        address: config.usdc,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [evmAccount.address],
      });
      console.log(`${chain.padEnd(25)}: ${formatUnits(balance, 6)} USDC`);
    } catch (e: any) {
      console.log(`${chain.padEnd(25)}: ERROR - ${e.message?.slice(0, 40)}`);
    }
  }
}

main().catch(console.error);
