/**
 * Flow 15: Gateway Cross-Chain Transfer V2
 *
 * Correctly implements Circle Gateway API transfer flow:
 * 1. Deposit USDC to Gateway Wallet
 * 2. Wait for finality (balance appears)
 * 3. Create burn intent with full spec
 * 4. Sign with EIP-712
 * 5. Submit to /v1/transfer API
 * 6. Receive attestation
 * 7. Call gatewayMint on destination
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  pad,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type Address,
  erc20Abi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import 'dotenv/config';

import {
  getUnifiedBalance,
  formatBalance,
} from '../services/circle/gateway.js';

// Config
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const TEST_AMOUNT = '0.01'; // 0.01 USDC
const GATEWAY_API = 'https://gateway-api-testnet.circle.com';

// Contract addresses (same across all EVM chains)
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const;
const GATEWAY_MINTER = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const;

// Token addresses
const USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const;
const USDC_ARC = '0x0000000000000000000000000000000000000001' as const; // Native USDC on Arc

// Domain IDs
const SEPOLIA_DOMAIN = 0;
const ARC_DOMAIN = 26;

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

// EIP-712 Types for burn intent
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

// Pad address to bytes32
function addressToBytes32(address: Address): `0x${string}` {
  return pad(address, { size: 32 }) as `0x${string}`;
}

// Generate random salt
function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

// Fetch gateway info
async function getGatewayInfo() {
  const response = await fetch(`${GATEWAY_API}/v1/info`);
  return response.json();
}

async function main() {
  console.log('='.repeat(60));
  console.log('Gateway Cross-Chain Transfer V2 (Sepolia → Arc)');
  console.log('='.repeat(60));

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('Error: DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  console.log(`\nWallet: ${account.address}`);

  // Setup clients
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });

  // Step 1: Check USDC balance
  console.log('\n--- Step 1: Check USDC Balance ---');

  const usdcBalance = await publicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });

  console.log(`On-chain USDC: ${formatUnits(usdcBalance, 6)} USDC`);

  // Step 2: Check Gateway balance
  console.log('\n--- Step 2: Check Gateway Balance ---');

  const gatewayBalance = await getUnifiedBalance(account.address);
  console.log(formatBalance(gatewayBalance));

  const sepoliaGatewayBalance = gatewayBalance.balances.find(b => b.chain === 'ETH-SEPOLIA')?.balanceUSDC || 0;
  console.log(`\nGateway Sepolia balance: ${sepoliaGatewayBalance} USDC`);

  // Step 3: Deposit if needed
  const depositAmount = parseUnits(TEST_AMOUNT, 6);

  if (sepoliaGatewayBalance < parseFloat(TEST_AMOUNT)) {
    console.log('\n--- Step 3: Deposit to Gateway ---');

    // Check allowance
    const allowance = await publicClient.readContract({
      address: USDC_SEPOLIA,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, GATEWAY_WALLET],
    });

    if (allowance < depositAmount) {
      console.log('Approving USDC...');
      const approveTx = await walletClient.writeContract({
        address: USDC_SEPOLIA,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GATEWAY_WALLET, depositAmount * 10n],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      console.log(`Approved: ${approveTx}`);
    }

    console.log(`Depositing ${TEST_AMOUNT} USDC...`);
    const depositTx = await walletClient.writeContract({
      address: GATEWAY_WALLET,
      abi: GATEWAY_WALLET_ABI,
      functionName: 'deposit',
      args: [USDC_SEPOLIA, depositAmount],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx });
    console.log(`Deposited in block ${receipt.blockNumber}`);
    console.log(`Tx: https://sepolia.etherscan.io/tx/${depositTx}`);

    // Wait for finality
    console.log('\nWaiting for finality (Sepolia requires ~64 blocks)...');
    console.log('This may take 10-15 minutes. Checking every 30 seconds...');

    let attempts = 0;
    const maxAttempts = 40; // ~20 minutes max

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 30000));
      attempts++;

      const newBalance = await getUnifiedBalance(account.address);
      const newSepoliaBalance = newBalance.balances.find(b => b.chain === 'ETH-SEPOLIA')?.balanceUSDC || 0;

      console.log(`[${attempts}] Gateway balance: ${newSepoliaBalance} USDC`);

      if (newSepoliaBalance >= parseFloat(TEST_AMOUNT)) {
        console.log('Deposit finalized!');
        break;
      }
    }
  } else {
    console.log('\n--- Step 3: Deposit (Skipped - sufficient balance) ---');
  }

  // Step 4: Get gateway info for maxBlockHeight
  console.log('\n--- Step 4: Fetch Gateway Info ---');

  const gatewayInfo = await getGatewayInfo();
  const sepoliaInfo = gatewayInfo.domains.find((d: any) => d.domain === SEPOLIA_DOMAIN);
  const arcInfo = gatewayInfo.domains.find((d: any) => d.domain === ARC_DOMAIN);

  if (!sepoliaInfo || !arcInfo) {
    console.error('Could not find domain info');
    process.exit(1);
  }

  console.log(`Sepolia burn intent expiration: ${sepoliaInfo.burnIntentExpirationHeight}`);
  console.log(`Arc processed height: ${arcInfo.processedHeight}`);

  // Step 5: Create burn intent
  console.log('\n--- Step 5: Create Burn Intent ---');

  const salt = generateSalt();
  const maxBlockHeight = BigInt(sepoliaInfo.burnIntentExpirationHeight) + 1000n; // Add buffer

  const spec = {
    version: 1,
    sourceDomain: SEPOLIA_DOMAIN,
    destinationDomain: ARC_DOMAIN,
    sourceContract: addressToBytes32(GATEWAY_WALLET),
    destinationContract: addressToBytes32(GATEWAY_MINTER),
    sourceToken: addressToBytes32(USDC_SEPOLIA),
    destinationToken: addressToBytes32(USDC_ARC),
    sourceDepositor: addressToBytes32(account.address),
    destinationRecipient: addressToBytes32(account.address),
    sourceSigner: addressToBytes32(account.address),
    destinationCaller: addressToBytes32('0x0000000000000000000000000000000000000000'),
    value: depositAmount,
    salt,
    hookData: '0x' as `0x${string}`,
  };

  const burnIntent = {
    maxBlockHeight,
    maxFee: 0n,
    spec,
  };

  console.log('Burn Intent created:');
  console.log(`  Source: Sepolia (domain ${SEPOLIA_DOMAIN})`);
  console.log(`  Destination: Arc (domain ${ARC_DOMAIN})`);
  console.log(`  Amount: ${TEST_AMOUNT} USDC`);
  console.log(`  Max Block Height: ${maxBlockHeight}`);

  // Step 6: Sign with EIP-712
  console.log('\n--- Step 6: Sign Burn Intent (EIP-712) ---');

  const domain = {
    name: 'Gateway',
    version: '1',
    chainId: sepolia.id,
    verifyingContract: GATEWAY_WALLET,
  };

  const signature = await account.signTypedData({
    domain,
    types: BURN_INTENT_TYPES,
    primaryType: 'BurnIntent',
    message: burnIntent,
  });

  console.log(`Signature: ${signature.slice(0, 20)}...`);

  // Step 7: Submit to Gateway API
  console.log('\n--- Step 7: Submit to Gateway API ---');

  const requestBody = {
    burnIntent: {
      maxBlockHeight: maxBlockHeight.toString(),
      maxFee: '0',
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
  };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${GATEWAY_API}/v1/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log(`\nResponse status: ${response.status}`);
  console.log(`Response: ${responseText}`);

  if (!response.ok) {
    console.error('\nTransfer request failed');
    return;
  }

  const result = JSON.parse(responseText);
  console.log('\nTransfer successful!');
  console.log(`Transfer ID: ${result.transferId}`);
  console.log(`Attestation: ${result.attestation?.slice(0, 50)}...`);

  // Step 8: Check final balance
  console.log('\n--- Step 8: Check Final Balance ---');

  const finalBalance = await getUnifiedBalance(account.address);
  console.log(formatBalance(finalBalance));

  console.log('\n' + '='.repeat(60));
  console.log('Done!');
}

main().catch(console.error);
