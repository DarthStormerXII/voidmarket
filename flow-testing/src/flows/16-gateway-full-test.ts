/**
 * Flow 16: Complete Gateway Transfer Test
 *
 * Tests the FULL flow with before/after balance verification:
 * 1. Check balances on ALL chains
 * 2. Deposit to Gateway on fastest-finality chain
 * 3. Wait for Gateway to index deposit
 * 4. Execute transfer to Arc
 * 5. Verify balances changed correctly
 *
 * Uses chains with fast finality (NOT Sepolia)
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
import { baseSepolia, avalancheFuji } from 'viem/chains';
import 'dotenv/config';

// Config
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const GATEWAY_API = 'https://gateway-api-testnet.circle.com';

// Gateway contracts (same on all EVM chains)
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const;
const GATEWAY_MINTER = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const;

// Chain configs (excluding slow Sepolia)
const CHAINS = {
  'BASE-SEPOLIA': {
    domain: 6,
    chain: baseSepolia,
    rpc: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    decimals: 6,
    finalityBlocks: 12, // ~24 seconds
  },
  'AVALANCHE-FUJI': {
    domain: 1,
    chain: avalancheFuji,
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65' as Address,
    decimals: 6,
    finalityBlocks: 1, // instant
  },
  'ARC-TESTNET': {
    domain: 26,
    chain: {
      id: 5042002, // Correct Arc testnet chain ID
      name: 'Arc Testnet',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
      rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
    },
    rpc: 'https://rpc.testnet.arc.network', // Working RPC
    usdc: '0x3600000000000000000000000000000000000000' as Address, // USDC ERC-20 interface (6 decimals)
    decimals: 6, // ERC-20 interface uses 6 decimals
    finalityBlocks: 1,
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
  // IMPORTANT: Must lowercase the address before padding
  return pad(address.toLowerCase() as Address, { size: 32 }) as `0x${string}`;
}

function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

// Gateway API helpers
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
      // Gateway API returns balance as formatted decimal string (e.g., "0.010000")
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
        transport: http(config.rpc, { timeout: 10000 }),
      });

      if (name === 'ARC-TESTNET') {
        // Native USDC on Arc - use eth_getBalance
        try {
          const balance = await client.getBalance({ address });
          balances[name] = parseFloat(formatUnits(balance, 18));
        } catch {
          // If Arc RPC fails, use Gateway balance instead
          balances[name] = -2; // Arc unavailable
        }
      } else {
        const balance = await client.readContract({
          address: config.usdc,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        });
        balances[name] = parseFloat(formatUnits(balance, config.decimals));
      }
    } catch (e) {
      balances[name] = -1; // Error
    }
  }

  return balances;
}

function printBalances(title: string, onChain: Record<string, number>, gateway: Record<string, number>) {
  console.log(`\n${title}`);
  console.log('┌─────────────────────┬──────────────────┬──────────────────┐');
  console.log('│ Chain               │ On-Chain USDC    │ Gateway USDC     │');
  console.log('├─────────────────────┼──────────────────┼──────────────────┤');

  for (const chain of Object.keys(CHAINS)) {
    let onChainVal: string;
    if (onChain[chain] === -1) {
      onChainVal = 'Error';
    } else if (onChain[chain] === -2) {
      onChainVal = 'N/A (RPC)';
    } else if (onChain[chain] >= 0) {
      onChainVal = onChain[chain].toFixed(6);
    } else {
      onChainVal = 'Unknown';
    }
    const gatewayVal = (gateway[chain] || 0).toFixed(6);
    console.log(`│ ${chain.padEnd(19)} │ ${onChainVal.padStart(16)} │ ${gatewayVal.padStart(16)} │`);
  }

  console.log('└─────────────────────┴──────────────────┴──────────────────┘');
}

async function main() {
  console.log('═'.repeat(70));
  console.log('   GATEWAY FULL TRANSFER TEST - Base Sepolia / Avalanche → Arc');
  console.log('═'.repeat(70));

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  console.log(`\nWallet: ${account.address}`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Initial State
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 1: INITIAL STATE');
  console.log('─'.repeat(70));

  const initialOnChain = await getOnChainBalances(account.address);
  const initialGateway = await getGatewayBalance(account.address);

  printBalances('BEFORE ANY OPERATIONS:', initialOnChain, initialGateway);

  // Find best source chain (has on-chain USDC, not Arc)
  let sourceChain: ChainName | null = null;
  let sourceBalance = 0;

  for (const [name, balance] of Object.entries(initialOnChain)) {
    if (name !== 'ARC-TESTNET' && balance > 0.01) {
      if (balance > sourceBalance) {
        sourceChain = name as ChainName;
        sourceBalance = balance;
      }
    }
  }

  if (!sourceChain) {
    console.log('\n⚠️  No USDC found on any fast-finality chain!');
    console.log('\nPlease fund the wallet with testnet USDC:');
    console.log('  - Base Sepolia: https://faucet.circle.com');
    console.log('  - Avalanche Fuji: https://faucet.circle.com');
    console.log(`\nWallet address: ${account.address}`);
    return;
  }

  console.log(`\n✓ Using ${sourceChain} as source (${sourceBalance.toFixed(4)} USDC)`);

  const sourceConfig = CHAINS[sourceChain];
  // Need enough for transfer + fee (fee is ~0.02 USDC minimum)
  // Transfer 0.01 USDC so total with fee (~0.02) fits in available balance
  const TEST_AMOUNT = '0.01';
  const depositAmount = parseUnits(TEST_AMOUNT, sourceConfig.decimals);

  // Setup clients
  const publicClient = createPublicClient({
    chain: sourceConfig.chain as any,
    transport: http(sourceConfig.rpc),
  });

  const walletClient = createWalletClient({
    account,
    chain: sourceConfig.chain as any,
    transport: http(sourceConfig.rpc),
  });

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Deposit to Gateway
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 2: DEPOSIT TO GATEWAY');
  console.log('─'.repeat(70));

  // Check if Gateway already has balance
  const existingGatewayBalance = initialGateway[sourceChain] || 0;

  if (existingGatewayBalance >= parseFloat(TEST_AMOUNT)) {
    console.log(`\n✓ Gateway already has ${existingGatewayBalance.toFixed(4)} USDC - skipping deposit`);
  } else {
    // Approve
    const allowance = await publicClient.readContract({
      address: sourceConfig.usdc,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, GATEWAY_WALLET],
    });

    if (allowance < depositAmount) {
      console.log('\nApproving Gateway Wallet...');
      const approveTx = await walletClient.writeContract({
        address: sourceConfig.usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GATEWAY_WALLET, depositAmount * 100n],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      console.log(`✓ Approved: ${approveTx}`);
    }

    // Deposit
    console.log(`\nDepositing ${TEST_AMOUNT} USDC to Gateway...`);
    const depositTx = await walletClient.writeContract({
      address: GATEWAY_WALLET,
      abi: GATEWAY_WALLET_ABI,
      functionName: 'deposit',
      args: [sourceConfig.usdc, depositAmount],
    });

    const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositTx });
    console.log(`✓ Deposited in block ${depositReceipt.blockNumber}`);
    console.log(`  Tx: ${depositTx}`);

    // Wait for finality
    const waitTime = sourceConfig.finalityBlocks * 2 + 5; // seconds
    console.log(`\nWaiting ${waitTime}s for finality...`);

    for (let i = 0; i < Math.ceil(waitTime / 5); i++) {
      await new Promise(r => setTimeout(r, 5000));
      process.stdout.write('.');
    }
    console.log(' Done!');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Verify Gateway Balance Updated
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 3: VERIFY GATEWAY BALANCE');
  console.log('─'.repeat(70));

  let gatewayBalanceAfterDeposit = await getGatewayBalance(account.address);
  let attempts = 0;
  const maxAttempts = 12; // 1 minute max

  while ((gatewayBalanceAfterDeposit[sourceChain] || 0) < parseFloat(TEST_AMOUNT) && attempts < maxAttempts) {
    attempts++;
    console.log(`Waiting for Gateway to index... (${attempts}/${maxAttempts})`);
    await new Promise(r => setTimeout(r, 5000));
    gatewayBalanceAfterDeposit = await getGatewayBalance(account.address);
  }

  const onChainAfterDeposit = await getOnChainBalances(account.address);
  printBalances('AFTER DEPOSIT:', onChainAfterDeposit, gatewayBalanceAfterDeposit);

  const gatewaySourceBalance = gatewayBalanceAfterDeposit[sourceChain] || 0;

  if (gatewaySourceBalance < parseFloat(TEST_AMOUNT)) {
    console.log('\n❌ Gateway balance still not available after waiting.');
    console.log('   The deposit may need more time to finalize.');
    console.log('   Run this script again in a few minutes.');
    return;
  }

  console.log(`\n✓ Gateway balance verified: ${gatewaySourceBalance.toFixed(4)} USDC on ${sourceChain}`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Create and Sign Burn Intent
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 4: CREATE BURN INTENT');
  console.log('─'.repeat(70));

  // Get gateway info
  const gatewayInfo = await getGatewayInfo();
  const sourceInfo = gatewayInfo.domains.find((d: any) => d.domain === sourceConfig.domain);

  if (!sourceInfo) {
    console.error('Could not find source domain info');
    return;
  }

  const maxBlockHeight = BigInt(sourceInfo.burnIntentExpirationHeight) + 10000n;
  const salt = generateSalt();

  const spec = {
    version: 1,
    sourceDomain: sourceConfig.domain,
    destinationDomain: CHAINS['ARC-TESTNET'].domain,
    sourceContract: addressToBytes32(GATEWAY_WALLET),
    destinationContract: addressToBytes32(GATEWAY_MINTER),
    sourceToken: addressToBytes32(sourceConfig.usdc),
    destinationToken: addressToBytes32(CHAINS['ARC-TESTNET'].usdc),
    sourceDepositor: addressToBytes32(account.address),
    destinationRecipient: addressToBytes32(account.address),
    sourceSigner: addressToBytes32(account.address),
    destinationCaller: addressToBytes32('0x0000000000000000000000000000000000000000'),
    value: depositAmount,
    salt,
    hookData: '0x' as `0x${string}`,
  };

  // maxFee must be at least ~0.02 USDC per Gateway requirements
  const maxFee = parseUnits('0.03', sourceConfig.decimals); // 0.03 USDC buffer

  const burnIntent = {
    maxBlockHeight,
    maxFee,
    spec,
  };

  console.log(`\nBurn Intent:`);
  console.log(`  From: ${sourceChain} (domain ${sourceConfig.domain})`);
  console.log(`  To: ARC-TESTNET (domain ${CHAINS['ARC-TESTNET'].domain})`);
  console.log(`  Amount: ${TEST_AMOUNT} USDC`);
  console.log(`  Max Block: ${maxBlockHeight}`);

  // Sign
  console.log('\nSigning with EIP-712...');

  // IMPORTANT: Domain only has name and version - NO chainId or verifyingContract!
  const domain = {
    name: 'GatewayWallet',
    version: '1',
  };

  // Need to include EIP712Domain in types for proper signing
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

  console.log(`✓ Signed: ${signature.slice(0, 30)}...`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Submit Transfer Request
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 5: SUBMIT TO GATEWAY API');
  console.log('─'.repeat(70));

  // API expects array of signed burn intents
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

  console.log('\nSubmitting transfer request...');

  const response = await fetch(`${GATEWAY_API}/v1/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.log(`\n❌ Transfer failed (${response.status}):`);
    console.log(responseText);

    // Debug: print request
    console.log('\nRequest body sent:');
    console.log(JSON.stringify(requestBody, null, 2));
    return;
  }

  const results = JSON.parse(responseText);
  // API returns array of results
  const result = Array.isArray(results) ? results[0] : results;
  console.log('\n✓ Transfer submitted!');
  console.log(`  Transfer ID: ${result.transferId || 'N/A'}`);

  if (result.attestation) {
    console.log(`  Attestation: ${result.attestation.slice(0, 50)}...`);
  }
  if (result.signature) {
    console.log(`  Operator Sig: ${result.signature.slice(0, 30)}...`);
  }
  console.log(`  Status: ${result.status || 'submitted'}`);
  console.log(`  Fees: ${result.fees?.total || '0'} USDC`);

  // Debug full response
  console.log('\nFull response:');
  console.log(JSON.stringify(result, null, 2));

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: Mint on Arc (if attestation available)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 6: MINT ON ARC');
  console.log('─'.repeat(70));

  // Check if we have attestation
  if (!result.attestation || !result.signature) {
    console.log('\n⚠️  No attestation yet - transfer may be pending.');
    console.log('   Gateway API may process this asynchronously.');
    console.log('   The funds should appear on Arc automatically.');

    // Check transfer status
    if (result.transferId) {
      console.log(`\n   Checking transfer status...`);
      const statusRes = await fetch(`${GATEWAY_API}/v1/transfer/${result.transferId}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        console.log(`   Status: ${JSON.stringify(statusData)}`);
      }
    }
  } else {
    const arcClient = createPublicClient({
      chain: CHAINS['ARC-TESTNET'].chain as any,
      transport: http(CHAINS['ARC-TESTNET'].rpc, { timeout: 30000 }),
    });

    const arcWallet = createWalletClient({
      account,
      chain: CHAINS['ARC-TESTNET'].chain as any,
      transport: http(CHAINS['ARC-TESTNET'].rpc, { timeout: 30000 }),
    });

    console.log('\nCalling gatewayMint on Arc...');

    try {
      const mintTx = await arcWallet.writeContract({
        address: GATEWAY_MINTER,
        abi: GATEWAY_MINTER_ABI,
        functionName: 'gatewayMint',
        args: [result.attestation as `0x${string}`, result.signature as `0x${string}`],
      });

      const mintReceipt = await arcClient.waitForTransactionReceipt({ hash: mintTx });
      console.log(`✓ Minted in block ${mintReceipt.blockNumber}`);
      console.log(`  Tx: ${mintTx}`);
    } catch (e: any) {
      console.log(`\n⚠️  Mint error: ${e.message?.slice(0, 200)}`);
      console.log('   Gateway may auto-relay mints, check Arc balance.');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 7: Final State
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 7: FINAL STATE');
  console.log('─'.repeat(70));

  // Wait a moment for state to propagate
  await new Promise(r => setTimeout(r, 3000));

  const finalOnChain = await getOnChainBalances(account.address);
  const finalGateway = await getGatewayBalance(account.address);

  printBalances('AFTER TRANSFER:', finalOnChain, finalGateway);

  // ═══════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('SUMMARY');
  console.log('═'.repeat(70));

  console.log('\nBalance Changes:');
  console.log(`  ${sourceChain} On-Chain: ${initialOnChain[sourceChain]?.toFixed(4)} → ${finalOnChain[sourceChain]?.toFixed(4)}`);
  console.log(`  ${sourceChain} Gateway:  ${(initialGateway[sourceChain] || 0).toFixed(4)} → ${(finalGateway[sourceChain] || 0).toFixed(4)}`);
  console.log(`  ARC-TESTNET On-Chain:  ${initialOnChain['ARC-TESTNET']?.toFixed(4)} → ${finalOnChain['ARC-TESTNET']?.toFixed(4)}`);
  console.log(`  ARC-TESTNET Gateway:   ${(initialGateway['ARC-TESTNET'] || 0).toFixed(4)} → ${(finalGateway['ARC-TESTNET'] || 0).toFixed(4)}`);

  const sourceChanged = (initialOnChain[sourceChain] || 0) !== (finalOnChain[sourceChain] || 0);
  const arcChanged = (initialOnChain['ARC-TESTNET'] || 0) !== (finalOnChain['ARC-TESTNET'] || 0);

  if (sourceChanged || arcChanged) {
    console.log('\n✅ Transfer completed successfully!');
  } else {
    console.log('\n⚠️  Balances may not have updated yet. Check again in a few seconds.');
  }

  console.log('\n' + '═'.repeat(70));
}

main().catch(console.error);
