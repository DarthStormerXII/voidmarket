/**
 * Flow 22: Bidirectional All Chains Test
 *
 * Tests X → Arc for all fast EVM chains (excluding ETH Sepolia due to slow confirmations)
 *
 * Strategy:
 * 1. Deposit USDC to Arc Gateway
 * 2. Send Arc → X to fund each chain's Gateway balance
 * 3. Wait for transfers to complete
 * 4. Test X → Arc for each chain
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  pad,
  erc20Abi,
  maxUint256,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji, baseSepolia } from 'viem/chains';
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
  rpcUrls: { default: { http: ['https://rpc.blaze.soniclabs.com'] } },
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
  minFee: string;
}

// Fast chains only (excluding ETH Sepolia)
const CHAINS: Record<string, ChainConfig> = {
  'AVALANCHE-FUJI': {
    domain: 1,
    chain: avalancheFuji,
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    decimals: 6,
    displayName: 'Avalanche Fuji',
    minFee: '0.03',
  },
  'BASE-SEPOLIA': {
    domain: 6,
    chain: baseSepolia,
    rpc: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    decimals: 6,
    displayName: 'Base Sepolia',
    minFee: '2.5', // Slow but let's try with higher fee
  },
  'SONIC-TESTNET': {
    domain: 13,
    chain: sonicChain,
    rpc: 'https://rpc.blaze.soniclabs.com',
    usdc: '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51',
    decimals: 6,
    displayName: 'Sonic Testnet',
    minFee: '0.03',
  },
  'WORLD-CHAIN-SEPOLIA': {
    domain: 14,
    chain: worldChainChain,
    rpc: 'https://worldchain-sepolia.g.alchemy.com/public',
    usdc: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    decimals: 6,
    displayName: 'World Chain Sepolia',
    minFee: '2.5', // Slow but let's try
  },
  'SEI-ATLANTIC': {
    domain: 16,
    chain: seiChain,
    rpc: 'https://evm-rpc-testnet.sei-apis.com',
    usdc: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    decimals: 6,
    displayName: 'Sei Atlantic',
    minFee: '0.03',
  },
  'HYPEREVM-TESTNET': {
    domain: 19,
    chain: hyperEvmChain,
    rpc: 'https://rpc.hyperliquid-testnet.xyz/evm',
    usdc: '0x2B3370eE501B4a559b57D449569354196457D8Ab',
    decimals: 6,
    displayName: 'HyperEVM Testnet',
    minFee: '0.03',
  },
  'ARC-TESTNET': {
    domain: 26,
    chain: arcChain,
    rpc: 'https://rpc.testnet.arc.network',
    usdc: '0x3600000000000000000000000000000000000000',
    decimals: 6,
    displayName: 'Arc Testnet',
    minFee: '0.03',
  },
};

// Only test fast chains (skip Base and World Chain due to 65 block confirmations)
const FAST_CHAINS = ['AVALANCHE-FUJI', 'SONIC-TESTNET', 'SEI-ATLANTIC', 'HYPEREVM-TESTNET'];

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

const GATEWAY_WALLET_ABI = [
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
    const gatewayInfo = await getGatewayInfo();
    const sourceInfo = gatewayInfo.domains.find((d: any) => d.domain === sourceConfig.domain);

    if (!sourceInfo) {
      return { success: false, error: `Chain ${fromChain} not found in Gateway info` };
    }

    const maxBlockHeight = BigInt(sourceInfo.burnIntentExpirationHeight) + 10000n;
    const transferAmount = parseUnits(amount, sourceConfig.decimals);
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
  console.log('   BIDIRECTIONAL ALL CHAINS TEST (Fast Chains Only)');
  console.log('═'.repeat(80));

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  console.log(`\nWallet: ${account.address}`);
  console.log(`Testing chains: ${FAST_CHAINS.join(', ')}`);

  const TEST_AMOUNT = '0.001';

  // ═══════════════════════════════════════════════════════════════════════════════
  // Step 1: Check Initial Balances
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 1: INITIAL GATEWAY BALANCES');
  console.log('─'.repeat(80));

  let gatewayBalances = await getGatewayBalance(account.address);
  console.log('\nGateway Balances:');
  for (const chainId of [...FAST_CHAINS, 'ARC-TESTNET']) {
    const bal = gatewayBalances[chainId] || 0;
    console.log(`  ${CHAINS[chainId].displayName}: ${bal.toFixed(6)} USDC`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Step 2: Deposit to Arc Gateway if needed
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 2: ENSURE ARC GATEWAY HAS FUNDS');
  console.log('─'.repeat(80));

  const arcGatewayBal = gatewayBalances['ARC-TESTNET'] || 0;
  const requiredForTests = FAST_CHAINS.length * 0.035; // 0.001 + 0.03 fee + buffer per chain

  if (arcGatewayBal < requiredForTests) {
    console.log(`\nArc Gateway balance (${arcGatewayBal.toFixed(4)}) < required (${requiredForTests.toFixed(4)})`);
    console.log('Depositing more USDC to Arc Gateway...');

    const arcPublic = createPublicClient({
      chain: arcChain as any,
      transport: http(CHAINS['ARC-TESTNET'].rpc, { timeout: 30000 }),
    });

    const arcWallet = createWalletClient({
      account,
      chain: arcChain as any,
      transport: http(CHAINS['ARC-TESTNET'].rpc, { timeout: 30000 }),
    });

    const depositAmount = parseUnits('0.2', 6); // Deposit 0.2 USDC

    // Check allowance
    const allowance = await arcPublic.readContract({
      address: CHAINS['ARC-TESTNET'].usdc,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, GATEWAY_WALLET],
    });

    if (allowance < depositAmount) {
      console.log('Approving Gateway...');
      const approveTx = await arcWallet.writeContract({
        address: CHAINS['ARC-TESTNET'].usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GATEWAY_WALLET, maxUint256],
      });
      await arcPublic.waitForTransactionReceipt({ hash: approveTx });
      console.log('✓ Approved');
    }

    // Deposit
    console.log('Depositing 0.2 USDC to Gateway...');
    const depositTx = await arcWallet.writeContract({
      address: GATEWAY_WALLET,
      abi: GATEWAY_WALLET_ABI,
      functionName: 'deposit',
      args: [CHAINS['ARC-TESTNET'].usdc, depositAmount],
    });
    await arcPublic.waitForTransactionReceipt({ hash: depositTx });
    console.log(`✓ Deposited. Tx: ${depositTx}`);

    // Wait for Gateway to index
    console.log('\n⏳ Waiting for Gateway to index deposit...');
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      gatewayBalances = await getGatewayBalance(account.address);
      const newBal = gatewayBalances['ARC-TESTNET'] || 0;
      console.log(`  Arc Gateway: ${newBal.toFixed(6)} USDC`);
      if (newBal >= requiredForTests) break;
    }
  } else {
    console.log(`\n✓ Arc Gateway has sufficient balance: ${arcGatewayBal.toFixed(4)} USDC`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Step 3: Send Arc → X for each fast chain
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 3: FUND OTHER CHAINS (Arc → X)');
  console.log('─'.repeat(80));

  const arcToXResults: Record<string, { success: boolean; transferId?: string; error?: string }> = {};

  for (const chainId of FAST_CHAINS) {
    const existingBal = gatewayBalances[chainId] || 0;

    if (existingBal >= 0.03) {
      console.log(`\n✓ ${CHAINS[chainId].displayName} already has ${existingBal.toFixed(4)} USDC`);
      arcToXResults[chainId] = { success: true, transferId: 'existing-balance' };
      continue;
    }

    console.log(`\n📤 Arc → ${CHAINS[chainId].displayName} (0.035 USDC)...`);
    const result = await executeTransfer({
      fromChain: 'ARC-TESTNET',
      toChain: chainId,
      amount: '0.035', // 0.001 for test + 0.03 fee + buffer
      account,
    });

    arcToXResults[chainId] = result;

    if (result.success) {
      console.log(`   ✅ Success! ID: ${result.transferId?.slice(0, 20)}... Fee: ${result.fee}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Step 4: Wait for transfers to complete
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 4: WAIT FOR TRANSFERS TO COMPLETE');
  console.log('─'.repeat(80));

  console.log('\n⏳ Waiting 30 seconds for transfers to settle...');
  await new Promise(r => setTimeout(r, 30000));

  // Check balances again
  gatewayBalances = await getGatewayBalance(account.address);
  console.log('\nUpdated Gateway Balances:');
  for (const chainId of FAST_CHAINS) {
    const bal = gatewayBalances[chainId] || 0;
    const status = bal >= 0.03 ? '✅' : '⚠️ ';
    console.log(`  ${status} ${CHAINS[chainId].displayName}: ${bal.toFixed(6)} USDC`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Step 5: Test X → Arc for each chain
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 5: TEST X → ARC TRANSFERS');
  console.log('─'.repeat(80));

  const xToArcResults: Record<string, { success: boolean; transferId?: string; fee?: string; error?: string }> = {};

  for (const chainId of FAST_CHAINS) {
    const bal = gatewayBalances[chainId] || 0;

    if (bal < 0.03) {
      console.log(`\n⚪ ${CHAINS[chainId].displayName} → Arc: [Insufficient balance: ${bal.toFixed(4)}]`);
      xToArcResults[chainId] = { success: false, error: 'Insufficient balance' };
      continue;
    }

    console.log(`\n📤 ${CHAINS[chainId].displayName} → Arc (${TEST_AMOUNT} USDC)...`);
    const result = await executeTransfer({
      fromChain: chainId,
      toChain: 'ARC-TESTNET',
      amount: TEST_AMOUNT,
      account,
    });

    xToArcResults[chainId] = result;

    if (result.success) {
      console.log(`   ✅ Success! ID: ${result.transferId?.slice(0, 20)}... Fee: ${result.fee}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('   FINAL RESULTS');
  console.log('═'.repeat(80));

  console.log('\n📊 Arc → X Transfers:');
  for (const chainId of FAST_CHAINS) {
    const result = arcToXResults[chainId];
    const status = result?.success ? '✅' : '❌';
    console.log(`   ${status} Arc → ${CHAINS[chainId].displayName}`);
  }

  console.log('\n📊 X → Arc Transfers:');
  let successCount = 0;
  for (const chainId of FAST_CHAINS) {
    const result = xToArcResults[chainId];
    const status = result?.success ? '✅' : result?.error?.includes('Insufficient') ? '⚪' : '❌';
    console.log(`   ${status} ${CHAINS[chainId].displayName} → Arc${result?.success ? ` (fee: ${result.fee})` : ''}`);
    if (result?.success) successCount++;
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`X → Arc Success Rate: ${successCount}/${FAST_CHAINS.length}`);
  console.log('═'.repeat(80));
}

main().catch(console.error);
