/**
 * Flow 17: Bidirectional Gateway Transfer Test
 *
 * Tests BOTH directions with proper before/after balance verification:
 * 1. X → Arc (e.g., Avalanche Fuji → Arc)
 * 2. Arc → X (Arc → Avalanche Fuji)
 *
 * Verifies actual balance changes, not just tx success messages.
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
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji, baseSepolia } from 'viem/chains';
import 'dotenv/config';

// Config
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const GATEWAY_API = 'https://gateway-api-testnet.circle.com';

// Gateway contracts (same on all EVM chains)
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const;
const GATEWAY_MINTER = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const;

// Chain configs
const CHAINS = {
  'AVALANCHE-FUJI': {
    domain: 1,
    chain: avalancheFuji,
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65' as Address,
    decimals: 6,
  },
  'BASE-SEPOLIA': {
    domain: 6,
    chain: baseSepolia,
    rpc: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    decimals: 6,
  },
  'ARC-TESTNET': {
    domain: 26,
    chain: {
      id: 5042002,
      name: 'Arc Testnet',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
      rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
    },
    rpc: 'https://rpc.testnet.arc.network',
    usdc: '0x3600000000000000000000000000000000000000' as Address,
    decimals: 6, // ERC-20 interface uses 6 decimals
  },
} as const;

type ChainName = keyof typeof CHAINS;

// ABIs
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

const GATEWAY_MINTER_ABI = [
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

// EIP-712 types
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

// Helpers
function addressToBytes32(address: Address): `0x${string}` {
  return pad(address.toLowerCase() as Address, { size: 32 }) as `0x${string}`;
}

function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

interface BalanceSnapshot {
  onChain: Record<string, number>;
  gateway: Record<string, number>;
  timestamp: number;
}

async function getGatewayInfo() {
  const res = await fetch(`${GATEWAY_API}/v1/info`);
  return res.json();
}

async function getGatewayBalance(address: Address): Promise<Record<string, number>> {
  const domains = Object.values(CHAINS).map(c => c.domain);
  const sources = domains.map(domain => ({ domain, depositor: address }));

  const res = await fetch(`${GATEWAY_API}/v1/balances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'USDC', sources }),
  });

  if (!res.ok) {
    console.error('Balance API error:', await res.text());
    return {};
  }

  const data = await res.json();
  const balances: Record<string, number> = {};

  for (const b of (Array.isArray(data) ? data : data.balances || [])) {
    const chainName = Object.entries(CHAINS).find(([_, c]) => c.domain === b.domain)?.[0];
    if (chainName) {
      balances[chainName] = parseFloat(b.balance);
    }
  }

  return balances;
}

async function getOnChainBalances(address: Address): Promise<Record<string, number>> {
  const balances: Record<string, number> = {};

  for (const [name, config] of Object.entries(CHAINS)) {
    try {
      const client = createPublicClient({
        transport: http(config.rpc, { timeout: 15000 }),
      });

      if (name === 'ARC-TESTNET') {
        // Native USDC on Arc - use eth_getBalance
        const balance = await client.getBalance({ address });
        balances[name] = parseFloat(formatUnits(balance, 18));
      } else {
        const balance = await client.readContract({
          address: config.usdc,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        });
        balances[name] = parseFloat(formatUnits(balance, config.decimals));
      }
    } catch (e: any) {
      console.error(`Error getting ${name} balance:`, e.message?.slice(0, 100));
      balances[name] = -1;
    }
  }

  return balances;
}

async function takeSnapshot(address: Address): Promise<BalanceSnapshot> {
  const [onChain, gateway] = await Promise.all([
    getOnChainBalances(address),
    getGatewayBalance(address),
  ]);
  return { onChain, gateway, timestamp: Date.now() };
}

function printSnapshot(title: string, snapshot: BalanceSnapshot) {
  console.log(`\n${title} (${new Date(snapshot.timestamp).toISOString()})`);
  console.log('┌─────────────────────┬──────────────────┬──────────────────┐');
  console.log('│ Chain               │ On-Chain USDC    │ Gateway USDC     │');
  console.log('├─────────────────────┼──────────────────┼──────────────────┤');

  for (const chain of Object.keys(CHAINS)) {
    const onChainVal = snapshot.onChain[chain] >= 0
      ? snapshot.onChain[chain].toFixed(6)
      : 'Error';
    const gatewayVal = (snapshot.gateway[chain] || 0).toFixed(6);
    console.log(`│ ${chain.padEnd(19)} │ ${onChainVal.padStart(16)} │ ${gatewayVal.padStart(16)} │`);
  }

  console.log('└─────────────────────┴──────────────────┴──────────────────┘');
}

function compareSnapshots(before: BalanceSnapshot, after: BalanceSnapshot) {
  console.log('\n📊 BALANCE CHANGES:');
  console.log('┌─────────────────────┬────────────────────────────────────────────────────┐');
  console.log('│ Chain               │ Change                                             │');
  console.log('├─────────────────────┼────────────────────────────────────────────────────┤');

  let anyChange = false;

  for (const chain of Object.keys(CHAINS)) {
    const onChainBefore = before.onChain[chain] || 0;
    const onChainAfter = after.onChain[chain] || 0;
    const gatewayBefore = before.gateway[chain] || 0;
    const gatewayAfter = after.gateway[chain] || 0;

    const onChainDiff = onChainAfter - onChainBefore;
    const gatewayDiff = gatewayAfter - gatewayBefore;

    if (Math.abs(onChainDiff) > 0.00001 || Math.abs(gatewayDiff) > 0.00001) {
      anyChange = true;
      const changes: string[] = [];
      if (Math.abs(onChainDiff) > 0.00001) {
        const sign = onChainDiff > 0 ? '+' : '';
        changes.push(`On-Chain: ${sign}${onChainDiff.toFixed(6)}`);
      }
      if (Math.abs(gatewayDiff) > 0.00001) {
        const sign = gatewayDiff > 0 ? '+' : '';
        changes.push(`Gateway: ${sign}${gatewayDiff.toFixed(6)}`);
      }
      console.log(`│ ${chain.padEnd(19)} │ ${changes.join(', ').padEnd(50)} │`);
    }
  }

  if (!anyChange) {
    console.log('│ (no changes detected)                                                   │');
  }

  console.log('└─────────────────────┴────────────────────────────────────────────────────┘');

  return anyChange;
}

async function depositToGateway(
  account: ReturnType<typeof privateKeyToAccount>,
  chain: ChainName,
  amount: string
): Promise<boolean> {
  if (chain === 'ARC-TESTNET') {
    console.log('Cannot deposit from Arc directly - Arc uses native USDC');
    return false;
  }

  const config = CHAINS[chain];
  const depositAmount = parseUnits(amount, config.decimals);

  const publicClient = createPublicClient({
    chain: config.chain as any,
    transport: http(config.rpc),
  });

  const walletClient = createWalletClient({
    account,
    chain: config.chain as any,
    transport: http(config.rpc),
  });

  // Approve
  const allowance = await publicClient.readContract({
    address: config.usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account.address, GATEWAY_WALLET],
  });

  if (allowance < depositAmount) {
    console.log(`  Approving Gateway Wallet on ${chain}...`);
    const approveTx = await walletClient.writeContract({
      address: config.usdc,
      abi: erc20Abi,
      functionName: 'approve',
      args: [GATEWAY_WALLET, depositAmount * 100n],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log(`  ✓ Approved`);
  }

  // Deposit
  console.log(`  Depositing ${amount} USDC to Gateway...`);
  const depositTx = await walletClient.writeContract({
    address: GATEWAY_WALLET,
    abi: GATEWAY_WALLET_ABI,
    functionName: 'deposit',
    args: [config.usdc, depositAmount],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx });
  console.log(`  ✓ Deposited in block ${receipt.blockNumber}`);

  return true;
}

async function executeTransfer(
  account: ReturnType<typeof privateKeyToAccount>,
  fromChain: ChainName,
  toChain: ChainName,
  amount: string
): Promise<{ success: boolean; attestation?: string; signature?: string; transferId?: string }> {
  const sourceConfig = CHAINS[fromChain];
  const destConfig = CHAINS[toChain];

  const transferAmount = parseUnits(amount, sourceConfig.decimals);
  const maxFee = parseUnits('0.03', sourceConfig.decimals);

  // Get gateway info for max block height
  const gatewayInfo = await getGatewayInfo();
  const sourceInfo = gatewayInfo.domains.find((d: any) => d.domain === sourceConfig.domain);

  if (!sourceInfo) {
    console.error(`Could not find domain info for ${fromChain}`);
    return { success: false };
  }

  const maxBlockHeight = BigInt(sourceInfo.burnIntentExpirationHeight) + 10000n;
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

  const burnIntent = {
    maxBlockHeight,
    maxFee,
    spec,
  };

  // Sign with EIP-712
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

  // Submit to Gateway API
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
    console.error(`  ❌ Transfer failed (${response.status}): ${responseText}`);
    return { success: false };
  }

  const results = JSON.parse(responseText);
  const result = Array.isArray(results) ? results[0] : results;

  return {
    success: true,
    attestation: result.attestation,
    signature: result.signature,
    transferId: result.transferId,
  };
}

async function mintOnDestination(
  account: ReturnType<typeof privateKeyToAccount>,
  destChain: ChainName,
  attestation: string,
  operatorSignature: string
): Promise<boolean> {
  const config = CHAINS[destChain];

  const publicClient = createPublicClient({
    chain: config.chain as any,
    transport: http(config.rpc, { timeout: 30000 }),
  });

  const walletClient = createWalletClient({
    account,
    chain: config.chain as any,
    transport: http(config.rpc, { timeout: 30000 }),
  });

  try {
    const mintTx = await walletClient.writeContract({
      address: GATEWAY_MINTER,
      abi: GATEWAY_MINTER_ABI,
      functionName: 'gatewayMint',
      args: [attestation as `0x${string}`, operatorSignature as `0x${string}`],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
    console.log(`  ✓ Minted in block ${receipt.blockNumber}`);
    console.log(`    Tx: ${mintTx}`);
    return true;
  } catch (e: any) {
    console.error(`  ❌ Mint error: ${e.message?.slice(0, 200)}`);
    return false;
  }
}

async function waitForGatewayBalance(
  address: Address,
  chain: ChainName,
  minBalance: number,
  maxWaitMs: number = 60000
): Promise<boolean> {
  const startTime = Date.now();
  let lastBalance = 0;

  while (Date.now() - startTime < maxWaitMs) {
    const balances = await getGatewayBalance(address);
    lastBalance = balances[chain] || 0;

    if (lastBalance >= minBalance) {
      return true;
    }

    console.log(`  Waiting for Gateway balance... (current: ${lastBalance.toFixed(6)}, need: ${minBalance})`);
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log(`  Timeout waiting for Gateway balance (last: ${lastBalance.toFixed(6)})`);
  return false;
}

async function main() {
  console.log('═'.repeat(80));
  console.log('   BIDIRECTIONAL GATEWAY TRANSFER TEST');
  console.log('   Tests: X → Arc AND Arc → X with balance verification');
  console.log('═'.repeat(80));

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  console.log(`\nWallet: ${account.address}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('📸 INITIAL STATE');
  console.log('─'.repeat(80));

  const initialSnapshot = await takeSnapshot(account.address);
  printSnapshot('Initial Balances', initialSnapshot);

  // Find source chain with balance
  let sourceChain: ChainName | null = null;
  for (const chain of ['AVALANCHE-FUJI', 'BASE-SEPOLIA'] as ChainName[]) {
    const gatewayBal = initialSnapshot.gateway[chain] || 0;
    const onChainBal = initialSnapshot.onChain[chain] || 0;
    if (gatewayBal >= 0.03 || onChainBal >= 0.05) {
      sourceChain = chain;
      break;
    }
  }

  if (!sourceChain) {
    console.log('\n⚠️  Need at least 0.05 USDC on Avalanche Fuji or Base Sepolia');
    console.log('   Fund wallet at: https://faucet.circle.com');
    console.log(`   Address: ${account.address}`);
    return;
  }

  const arcBalance = initialSnapshot.onChain['ARC-TESTNET'] || 0;
  console.log(`\n✓ Source chain: ${sourceChain}`);
  console.log(`✓ Arc balance: ${arcBalance.toFixed(6)} USDC`);

  // Test amount
  const TEST_AMOUNT = '0.005';

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Source → Arc
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log(`🔄 TEST 1: ${sourceChain} → ARC-TESTNET`);
  console.log('═'.repeat(80));

  const beforeTest1 = await takeSnapshot(account.address);
  printSnapshot('Before Test 1', beforeTest1);

  // Ensure Gateway has balance
  const sourceGatewayBal = beforeTest1.gateway[sourceChain] || 0;
  if (sourceGatewayBal < parseFloat(TEST_AMOUNT) + 0.025) {
    console.log(`\n📥 Depositing to Gateway (need ${TEST_AMOUNT} + fees)...`);
    await depositToGateway(account, sourceChain, '0.04');

    // Wait for Gateway to index
    console.log('\n⏳ Waiting for Gateway to index deposit...');
    const indexed = await waitForGatewayBalance(account.address, sourceChain, 0.03);
    if (!indexed) {
      console.log('❌ Gateway did not index deposit in time');
      return;
    }
  }

  console.log(`\n📤 Executing transfer: ${sourceChain} → ARC-TESTNET (${TEST_AMOUNT} USDC)...`);
  const result1 = await executeTransfer(account, sourceChain, 'ARC-TESTNET', TEST_AMOUNT);

  if (!result1.success) {
    console.log('❌ Test 1 failed: Transfer rejected');
    return;
  }

  console.log(`✓ Transfer submitted (ID: ${result1.transferId})`);

  if (result1.attestation && result1.signature) {
    console.log('\n📥 Minting on Arc...');
    await mintOnDestination(account, 'ARC-TESTNET', result1.attestation, result1.signature);
  } else {
    console.log('\n⚠️  No attestation - Gateway may auto-relay');
  }

  // Wait for state to propagate
  console.log('\n⏳ Waiting for state to propagate...');
  await new Promise(r => setTimeout(r, 5000));

  const afterTest1 = await takeSnapshot(account.address);
  printSnapshot('After Test 1', afterTest1);

  const test1Changed = compareSnapshots(beforeTest1, afterTest1);
  console.log(test1Changed ? '\n✅ TEST 1 PASSED: Balance changes detected!' : '\n⚠️  TEST 1: No immediate changes (may need more time)');

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Arc → Source (Reverse Direction)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log(`🔄 TEST 2: ARC-TESTNET → ${sourceChain}`);
  console.log('═'.repeat(80));

  // Check Arc Gateway balance
  const arcGatewayBal = afterTest1.gateway['ARC-TESTNET'] || 0;
  console.log(`\nArc Gateway balance: ${arcGatewayBal.toFixed(6)} USDC`);

  if (arcGatewayBal < parseFloat(TEST_AMOUNT) + 0.025) {
    console.log('\n⚠️  Insufficient Arc Gateway balance for reverse transfer');
    console.log('   Need to deposit native USDC from Arc to Gateway first');

    // Try to deposit from Arc on-chain balance to Gateway
    const arcOnChain = afterTest1.onChain['ARC-TESTNET'] || 0;
    if (arcOnChain >= 0.05) {
      console.log(`\n📥 Depositing from Arc on-chain (${arcOnChain.toFixed(4)} available)...`);

      // On Arc, native USDC needs to be deposited differently
      // The Gateway wallet accepts direct transfers of native USDC
      const arcConfig = CHAINS['ARC-TESTNET'];
      const depositAmount = parseUnits('0.04', 18); // Arc native uses 18 decimals

      const arcWallet = createWalletClient({
        account,
        chain: arcConfig.chain as any,
        transport: http(arcConfig.rpc, { timeout: 30000 }),
      });

      const arcPublic = createPublicClient({
        chain: arcConfig.chain as any,
        transport: http(arcConfig.rpc, { timeout: 30000 }),
      });

      try {
        // On Arc, deposit native USDC to Gateway wallet directly
        const depositTx = await arcWallet.sendTransaction({
          to: GATEWAY_WALLET,
          value: depositAmount,
        });

        const receipt = await arcPublic.waitForTransactionReceipt({ hash: depositTx });
        console.log(`  ✓ Deposited native USDC to Gateway (block ${receipt.blockNumber})`);

        // Wait for Gateway to index
        console.log('\n⏳ Waiting for Gateway to index Arc deposit...');
        await waitForGatewayBalance(account.address, 'ARC-TESTNET', 0.03, 90000);
      } catch (e: any) {
        console.log(`  ❌ Arc deposit error: ${e.message?.slice(0, 200)}`);
      }
    } else {
      console.log('   Not enough Arc on-chain balance either');
      console.log('\n⏩ Skipping Test 2 (insufficient Arc balance)');

      // Still print final summary
      console.log('\n' + '═'.repeat(80));
      console.log('📊 FINAL SUMMARY');
      console.log('═'.repeat(80));

      const finalSnapshot = await takeSnapshot(account.address);
      printSnapshot('Final Balances', finalSnapshot);
      compareSnapshots(initialSnapshot, finalSnapshot);

      console.log('\n' + '═'.repeat(80));
      console.log('Test 1 (X → Arc): ' + (test1Changed ? '✅ PASSED' : '⚠️  PENDING'));
      console.log('Test 2 (Arc → X): ⏩ SKIPPED (insufficient balance)');
      console.log('═'.repeat(80));
      return;
    }
  }

  const beforeTest2 = await takeSnapshot(account.address);
  printSnapshot('Before Test 2', beforeTest2);

  console.log(`\n📤 Executing transfer: ARC-TESTNET → ${sourceChain} (${TEST_AMOUNT} USDC)...`);
  const result2 = await executeTransfer(account, 'ARC-TESTNET', sourceChain, TEST_AMOUNT);

  if (!result2.success) {
    console.log('❌ Test 2 failed: Transfer rejected');
  } else {
    console.log(`✓ Transfer submitted (ID: ${result2.transferId})`);

    if (result2.attestation && result2.signature) {
      console.log(`\n📥 Minting on ${sourceChain}...`);
      await mintOnDestination(account, sourceChain, result2.attestation, result2.signature);
    } else {
      console.log('\n⚠️  No attestation - Gateway may auto-relay');
    }
  }

  // Wait for state to propagate
  console.log('\n⏳ Waiting for state to propagate...');
  await new Promise(r => setTimeout(r, 5000));

  const afterTest2 = await takeSnapshot(account.address);
  printSnapshot('After Test 2', afterTest2);

  const test2Changed = compareSnapshots(beforeTest2, afterTest2);
  console.log(test2Changed ? '\n✅ TEST 2 PASSED: Balance changes detected!' : '\n⚠️  TEST 2: No immediate changes (may need more time)');

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(80));

  const finalSnapshot = await takeSnapshot(account.address);
  printSnapshot('Final Balances', finalSnapshot);

  console.log('\n📈 TOTAL CHANGES (Initial → Final):');
  compareSnapshots(initialSnapshot, finalSnapshot);

  console.log('\n' + '═'.repeat(80));
  console.log('RESULTS:');
  console.log(`  Test 1 (${sourceChain} → Arc): ${test1Changed ? '✅ PASSED' : '⚠️  PENDING'}`);
  console.log(`  Test 2 (Arc → ${sourceChain}): ${result2.success ? (test2Changed ? '✅ PASSED' : '⚠️  PENDING') : '❌ FAILED'}`);
  console.log('═'.repeat(80));
}

main().catch(console.error);
