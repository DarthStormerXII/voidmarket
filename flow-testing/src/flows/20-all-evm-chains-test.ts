/**
 * Flow 20: All EVM Chains Gateway Transfer Test
 *
 * Tests Gateway transfers between all EVM testnet chains and Arc:
 * - ETH-SEPOLIA ↔ Arc
 * - BASE-SEPOLIA ↔ Arc
 * - SONIC-TESTNET ↔ Arc
 * - WORLD-CHAIN-SEPOLIA ↔ Arc
 * - SEI-ATLANTIC ↔ Arc
 * - HYPEREVM-TESTNET ↔ Arc
 * (AVALANCHE-FUJI already verified in previous tests)
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  pad,
  erc20Abi,
  type Address,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, baseSepolia, avalancheFuji } from 'viem/chains';
import 'dotenv/config';

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const GATEWAY_API = 'https://gateway-api-testnet.circle.com';
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const;
const GATEWAY_MINTER = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const;

// Custom chain definitions
const arcChain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
} as const;

const sonicChain = {
  id: 64165,
  name: 'Sonic Testnet',
  nativeCurrency: { name: 'S', symbol: 'S', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sonic.testnet.soniclabs.com'] } },
} as const;

const worldChainChain = {
  id: 4801,
  name: 'World Chain Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://worldchain-sepolia.g.alchemy.com/public'] } },
} as const;

const seiChain = {
  id: 1328,
  name: 'Sei Atlantic',
  nativeCurrency: { name: 'SEI', symbol: 'SEI', decimals: 18 },
  rpcUrls: { default: { http: ['https://evm-rpc-testnet.sei-apis.com'] } },
} as const;

const hyperEvmChain = {
  id: 998,
  name: 'HyperEVM Testnet',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] } },
} as const;

interface ChainConfig {
  domain: number;
  chain: any;
  rpc: string;
  usdc: Address;
  decimals: number;
  displayName: string;
  minFee: string; // Minimum fee for transfers FROM this chain
}

// CORRECT USDC ADDRESSES from Circle docs:
// https://developers.circle.com/stablecoins/usdc-contract-addresses
const CHAINS: Record<string, ChainConfig> = {
  'ETH-SEPOLIA': {
    domain: 0,
    chain: sepolia,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    displayName: 'Ethereum Sepolia',
    minFee: '2.5', // ETH Sepolia needs higher fee due to ~65 block confirmations
  },
  'BASE-SEPOLIA': {
    domain: 6,
    chain: baseSepolia,
    rpc: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    decimals: 6,
    displayName: 'Base Sepolia',
    minFee: '2.5', // Base also needs ~65 ETH blocks
  },
  'SONIC-TESTNET': {
    domain: 13,
    chain: sonicChain,
    rpc: 'https://rpc.blaze.soniclabs.com', // Blaze testnet RPC
    usdc: '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51', // Correct from Circle docs
    decimals: 6,
    displayName: 'Sonic Testnet',
    minFee: '0.03', // Fast finality (~1 block)
  },
  'WORLD-CHAIN-SEPOLIA': {
    domain: 14,
    chain: worldChainChain,
    rpc: 'https://worldchain-sepolia.g.alchemy.com/public',
    usdc: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88', // Correct from Circle docs
    decimals: 6,
    displayName: 'World Chain Sepolia',
    minFee: '2.5', // World Chain also needs ~65 ETH blocks
  },
  'SEI-ATLANTIC': {
    domain: 16,
    chain: seiChain,
    rpc: 'https://evm-rpc-testnet.sei-apis.com',
    usdc: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED', // Correct from Circle docs
    decimals: 6,
    displayName: 'Sei Atlantic',
    minFee: '0.03', // Fast finality (~1 block)
  },
  'HYPEREVM-TESTNET': {
    domain: 19,
    chain: hyperEvmChain,
    rpc: 'https://rpc.hyperliquid-testnet.xyz/evm',
    usdc: '0x2B3370eE501B4a559b57D449569354196457D8Ab', // Correct from Circle docs
    decimals: 6,
    displayName: 'HyperEVM Testnet',
    minFee: '0.03', // Fast finality (~1 block)
  },
  'ARC-TESTNET': {
    domain: 26,
    chain: arcChain,
    rpc: 'https://rpc.testnet.arc.network',
    usdc: '0x3600000000000000000000000000000000000000',
    decimals: 6,
    displayName: 'Arc Testnet',
    minFee: '0.03', // Fast finality (~1 block)
  },
  'AVALANCHE-FUJI': {
    domain: 1,
    chain: avalancheFuji,
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    decimals: 6,
    displayName: 'Avalanche Fuji',
    minFee: '0.03', // Fast finality (~1 block)
  },
};

const BURN_INTENT_TYPES = {
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

function addressToBytes32(address: Address): `0x${string}` {
  return pad(address.toLowerCase() as Address, { size: 32 }) as `0x${string}`;
}

function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

async function getGatewayBalance(address: Address): Promise<Record<string, number>> {
  const domains = Object.values(CHAINS).map(c => c.domain);
  const sources = domains.map(domain => ({ domain, depositor: address }));

  try {
    const res = await fetch(`${GATEWAY_API}/v1/balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'USDC', sources }),
    });

    if (!res.ok) return {};

    const data = await res.json();
    const balances: Record<string, number> = {};

    for (const b of (Array.isArray(data) ? data : data.balances || [])) {
      const chainName = Object.entries(CHAINS).find(([_, c]) => c.domain === b.domain)?.[0];
      if (chainName) balances[chainName] = parseFloat(b.balance);
    }

    return balances;
  } catch {
    return {};
  }
}

async function getGatewayInfo() {
  const res = await fetch(`${GATEWAY_API}/v1/info`);
  return res.json();
}

async function checkChainConnectivity(chainId: string): Promise<{ connected: boolean; error?: string }> {
  const config = CHAINS[chainId];
  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpc, { timeout: 10000 }),
    });
    await publicClient.getBlockNumber();
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message?.slice(0, 100) };
  }
}

async function checkUSDCBalance(
  chainId: string,
  address: Address
): Promise<{ balance: string; raw: bigint; error?: string }> {
  const config = CHAINS[chainId];
  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpc, { timeout: 15000 }),
    });
    const balance = await publicClient.readContract({
      address: config.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    });
    return { balance: formatUnits(balance, config.decimals), raw: balance };
  } catch (e: any) {
    return { balance: '0', raw: 0n, error: e.message?.slice(0, 100) };
  }
}

async function executeTransfer(params: {
  fromChain: string;
  toChain: string;
  amount: string;
  account: ReturnType<typeof privateKeyToAccount>;
}): Promise<{ success: boolean; transferId?: string; fee?: string; error?: string }> {
  const { fromChain, toChain, amount, account } = params;
  const sourceConfig = CHAINS[fromChain];
  const destConfig = CHAINS[toChain];

  try {
    // Get gateway info for max block height
    const gatewayInfo = await getGatewayInfo();
    const sourceInfo = gatewayInfo.domains.find((d: any) => d.domain === sourceConfig.domain);

    if (!sourceInfo) {
      return { success: false, error: `Chain ${fromChain} not found in Gateway info` };
    }

    const maxBlockHeight = BigInt(sourceInfo.burnIntentExpirationHeight) + 10000n;
    const transferAmount = parseUnits(amount, sourceConfig.decimals);
    // Use per-chain minimum fee (ETH/Base/World Chain need higher fees due to 65 block confirmations)
    const maxFee = parseUnits(sourceConfig.minFee, sourceConfig.decimals);
    const salt = generateSalt();

    const spec = {
      version: 1,
      sourceDomain: sourceConfig.domain,
      destinationDomain: destConfig.domain,
      sourceContract: addressToBytes32(GATEWAY_WALLET),
      destinationContract: addressToBytes32(GATEWAY_MINTER),
      sourceToken: addressToBytes32(sourceConfig.usdc),
      destinationToken: addressToBytes32(destConfig.usdc),
      sourceDepositor: addressToBytes32(account.address),
      destinationRecipient: addressToBytes32(account.address),
      sourceSigner: addressToBytes32(account.address),
      destinationCaller: addressToBytes32('0x0000000000000000000000000000000000000000'),
      value: transferAmount,
      salt,
      hookData: '0x' as `0x${string}`,
    };

    const burnIntent = { maxBlockHeight, maxFee, spec };

    // Sign
    const domain = { name: 'GatewayWallet', version: '1' };
    const types = {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
      ],
      ...BURN_INTENT_TYPES,
    };

    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: 'BurnIntent',
      message: burnIntent,
    });

    // Submit
    const requestBody = [
      {
        burnIntent: {
          maxBlockHeight: maxBlockHeight.toString(),
          maxFee: maxFee.toString(),
          spec: {
            version: spec.version,
            sourceDomain: spec.sourceDomain,
            destinationDomain: spec.destinationDomain,
            sourceContract: spec.sourceContract,
            destinationContract: spec.destinationContract,
            sourceToken: spec.sourceToken,
            destinationToken: spec.destinationToken,
            sourceDepositor: spec.sourceDepositor,
            destinationRecipient: spec.destinationRecipient,
            sourceSigner: spec.sourceSigner,
            destinationCaller: spec.destinationCaller,
            value: spec.value.toString(),
            salt: spec.salt,
            hookData: spec.hookData,
          },
        },
        signature,
      },
    ];

    const response = await fetch(`${GATEWAY_API}/v1/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return { success: false, error: responseText.slice(0, 200) };
    }

    const results = JSON.parse(responseText);
    const result = Array.isArray(results) ? results[0] : results;

    return {
      success: true,
      transferId: result.transferId,
      fee: result.fees?.total,
    };
  } catch (e: any) {
    return { success: false, error: e.message?.slice(0, 200) };
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('   ALL EVM CHAINS GATEWAY TRANSFER TEST');
  console.log('═'.repeat(80));

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  console.log(`\nWallet: ${account.address}`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Phase 1: Chain Connectivity Check
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('PHASE 1: CHAIN CONNECTIVITY CHECK');
  console.log('─'.repeat(80));

  const chainResults: Record<string, { connected: boolean; error?: string }> = {};
  const chainsToTest = Object.keys(CHAINS).filter(c => c !== 'ARC-TESTNET');

  for (const chainId of Object.keys(CHAINS)) {
    const result = await checkChainConnectivity(chainId);
    chainResults[chainId] = result;
    const status = result.connected ? '✅' : '❌';
    console.log(`  ${status} ${CHAINS[chainId].displayName} (domain ${CHAINS[chainId].domain})`);
    if (result.error) console.log(`     Error: ${result.error}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Phase 2: Gateway Balance Check
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('PHASE 2: GATEWAY BALANCE CHECK');
  console.log('─'.repeat(80));

  const gatewayBalances = await getGatewayBalance(account.address);
  console.log('\nGateway Balances:');
  for (const [chainId, config] of Object.entries(CHAINS)) {
    const bal = gatewayBalances[chainId] || 0;
    const status = bal >= 0.03 ? '✅' : '⚠️ ';
    console.log(`  ${status} ${config.displayName}: ${bal.toFixed(6)} USDC`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Phase 3: On-Chain USDC Balance Check
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('PHASE 3: ON-CHAIN USDC BALANCE CHECK');
  console.log('─'.repeat(80));

  console.log('\nOn-Chain USDC Balances:');
  for (const [chainId, config] of Object.entries(CHAINS)) {
    if (!chainResults[chainId]?.connected) {
      console.log(`  ⚪ ${config.displayName}: [Not connected]`);
      continue;
    }
    const result = await checkUSDCBalance(chainId, account.address);
    if (result.error) {
      console.log(`  ⚠️  ${config.displayName}: Error - ${result.error}`);
    } else {
      console.log(`  ✅ ${config.displayName}: ${result.balance} USDC`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Phase 4: Gateway Transfer Tests (X → Arc)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('PHASE 4: GATEWAY TRANSFERS (X → ARC)');
  console.log('─'.repeat(80));

  const toArcResults: Record<string, { success: boolean; transferId?: string; fee?: string; error?: string }> = {};
  const TEST_AMOUNT = '0.001';

  for (const chainId of chainsToTest) {
    if (!chainResults[chainId]?.connected) {
      console.log(`\n⚪ ${CHAINS[chainId].displayName} → Arc: [Chain not connected]`);
      toArcResults[chainId] = { success: false, error: 'Chain not connected' };
      continue;
    }

    const gatewayBal = gatewayBalances[chainId] || 0;
    if (gatewayBal < 0.03) {
      console.log(`\n⚪ ${CHAINS[chainId].displayName} → Arc: [Insufficient Gateway balance: ${gatewayBal.toFixed(6)}]`);
      toArcResults[chainId] = { success: false, error: 'Insufficient Gateway balance' };
      continue;
    }

    console.log(`\n📤 Testing ${CHAINS[chainId].displayName} → Arc (${TEST_AMOUNT} USDC)...`);
    const result = await executeTransfer({
      fromChain: chainId,
      toChain: 'ARC-TESTNET',
      amount: TEST_AMOUNT,
      account,
    });

    toArcResults[chainId] = result;

    if (result.success) {
      console.log(`   ✅ Success! Transfer ID: ${result.transferId?.slice(0, 20)}...`);
      console.log(`   Fee: ${result.fee || 'N/A'} USDC`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Phase 5: Gateway Transfer Tests (Arc → X)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('PHASE 5: GATEWAY TRANSFERS (ARC → X)');
  console.log('─'.repeat(80));

  const fromArcResults: Record<string, { success: boolean; transferId?: string; fee?: string; error?: string }> = {};
  const arcGatewayBal = gatewayBalances['ARC-TESTNET'] || 0;

  for (const chainId of chainsToTest) {
    if (!chainResults['ARC-TESTNET']?.connected) {
      console.log(`\n⚪ Arc → ${CHAINS[chainId].displayName}: [Arc not connected]`);
      fromArcResults[chainId] = { success: false, error: 'Arc not connected' };
      continue;
    }

    if (arcGatewayBal < 0.03) {
      console.log(`\n⚪ Arc → ${CHAINS[chainId].displayName}: [Insufficient Arc Gateway balance: ${arcGatewayBal.toFixed(6)}]`);
      fromArcResults[chainId] = { success: false, error: 'Insufficient Arc Gateway balance' };
      continue;
    }

    console.log(`\n📤 Testing Arc → ${CHAINS[chainId].displayName} (${TEST_AMOUNT} USDC)...`);
    const result = await executeTransfer({
      fromChain: 'ARC-TESTNET',
      toChain: chainId,
      amount: TEST_AMOUNT,
      account,
    });

    fromArcResults[chainId] = result;

    if (result.success) {
      console.log(`   ✅ Success! Transfer ID: ${result.transferId?.slice(0, 20)}...`);
      console.log(`   Fee: ${result.fee || 'N/A'} USDC`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('   SUMMARY');
  console.log('═'.repeat(80));

  console.log('\n📊 Chain Connectivity:');
  let connectedCount = 0;
  for (const [chainId, result] of Object.entries(chainResults)) {
    const status = result.connected ? '✅' : '❌';
    console.log(`   ${status} ${CHAINS[chainId].displayName}`);
    if (result.connected) connectedCount++;
  }
  console.log(`   Total: ${connectedCount}/${Object.keys(CHAINS).length} chains connected`);

  console.log('\n📊 Transfers TO Arc:');
  let toArcSuccess = 0;
  for (const [chainId, result] of Object.entries(toArcResults)) {
    const status = result.success ? '✅' : result.error?.includes('Insufficient') || result.error?.includes('not connected') ? '⚪' : '❌';
    console.log(`   ${status} ${CHAINS[chainId].displayName} → Arc${result.success ? ` (${result.fee || 'N/A'} fee)` : ''}`);
    if (result.success) toArcSuccess++;
  }

  console.log('\n📊 Transfers FROM Arc:');
  let fromArcSuccess = 0;
  for (const [chainId, result] of Object.entries(fromArcResults)) {
    const status = result.success ? '✅' : result.error?.includes('Insufficient') || result.error?.includes('not connected') ? '⚪' : '❌';
    console.log(`   ${status} Arc → ${CHAINS[chainId].displayName}${result.success ? ` (${result.fee || 'N/A'} fee)` : ''}`);
    if (result.success) fromArcSuccess++;
  }

  console.log('\n' + '─'.repeat(80));
  console.log('FINAL RESULTS:');
  console.log('─'.repeat(80));
  console.log(`   Chains Connected: ${connectedCount}/${Object.keys(CHAINS).length}`);
  console.log(`   Transfers TO Arc: ${toArcSuccess}/${chainsToTest.length}`);
  console.log(`   Transfers FROM Arc: ${fromArcSuccess}/${chainsToTest.length}`);
  console.log(`   Total Success Rate: ${toArcSuccess + fromArcSuccess}/${chainsToTest.length * 2} transfers`);
  console.log('═'.repeat(80));
}

main().catch(console.error);
