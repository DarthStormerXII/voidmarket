/**
 * Flow 18: Arc → Avalanche Fuji Transfer Test
 *
 * Tests the reverse direction: Arc → X chain
 * 1. Deposit to Gateway on Arc using ERC-20 interface
 * 2. Execute transfer Arc → Fuji
 * 3. Verify balance changes
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
import { avalancheFuji } from 'viem/chains';
import 'dotenv/config';

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const GATEWAY_API = 'https://gateway-api-testnet.circle.com';
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const;
const GATEWAY_MINTER = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const;

const arcChain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const CHAINS = {
  'AVALANCHE-FUJI': {
    domain: 1,
    chain: avalancheFuji,
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65' as Address,
    decimals: 6,
  },
  'ARC-TESTNET': {
    domain: 26,
    chain: arcChain,
    rpc: 'https://rpc.testnet.arc.network',
    usdc: '0x3600000000000000000000000000000000000000' as Address,
    decimals: 6, // ERC-20 interface uses 6 decimals
  },
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
}

async function getGatewayInfo() {
  const res = await fetch(`${GATEWAY_API}/v1/info`);
  return res.json();
}

async function main() {
  console.log('═'.repeat(70));
  console.log('   ARC → AVALANCHE FUJI GATEWAY TRANSFER TEST');
  console.log('═'.repeat(70));

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  console.log(`\nWallet: ${account.address}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('INITIAL STATE');
  console.log('─'.repeat(70));

  const arcPublic = createPublicClient({
    chain: arcChain as any,
    transport: http(CHAINS['ARC-TESTNET'].rpc, { timeout: 30000 }),
  });

  const fujiPublic = createPublicClient({
    chain: avalancheFuji,
    transport: http(CHAINS['AVALANCHE-FUJI'].rpc),
  });

  // Get balances
  const arcNative = await arcPublic.getBalance({ address: account.address });
  const arcErc20 = await arcPublic.readContract({
    address: CHAINS['ARC-TESTNET'].usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  const fujiBalance = await fujiPublic.readContract({
    address: CHAINS['AVALANCHE-FUJI'].usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });

  const gatewayBalances = await getGatewayBalance(account.address);

  console.log('\nOn-Chain Balances:');
  console.log(`  Arc Native:  ${formatUnits(arcNative, 18)} USDC`);
  console.log(`  Arc ERC-20:  ${formatUnits(arcErc20, 6)} USDC`);
  console.log(`  Fuji USDC:   ${formatUnits(fujiBalance, 6)} USDC`);

  console.log('\nGateway Balances:');
  console.log(`  Arc Gateway: ${(gatewayBalances['ARC-TESTNET'] || 0).toFixed(6)} USDC`);
  console.log(`  Fuji Gateway: ${(gatewayBalances['AVALANCHE-FUJI'] || 0).toFixed(6)} USDC`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Deposit to Gateway on Arc
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 1: DEPOSIT TO GATEWAY ON ARC');
  console.log('─'.repeat(70));

  const arcGatewayBal = gatewayBalances['ARC-TESTNET'] || 0;
  const TEST_AMOUNT = '0.005';
  const DEPOSIT_AMOUNT = '0.04'; // Need extra for fees

  if (arcGatewayBal < 0.03) {
    console.log(`\n📥 Depositing ${DEPOSIT_AMOUNT} USDC to Gateway on Arc...`);

    const arcWallet = createWalletClient({
      account,
      chain: arcChain as any,
      transport: http(CHAINS['ARC-TESTNET'].rpc, { timeout: 30000 }),
    });

    // Arc uses 6 decimals for ERC-20 interface
    const depositAmount = parseUnits(DEPOSIT_AMOUNT, 6);

    // Check/Set allowance
    const allowance = await arcPublic.readContract({
      address: CHAINS['ARC-TESTNET'].usdc,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, GATEWAY_WALLET],
    });

    console.log(`Current allowance: ${formatUnits(allowance, 6)} USDC`);

    if (allowance < depositAmount) {
      console.log('Approving Gateway...');
      const approveTx = await arcWallet.writeContract({
        address: CHAINS['ARC-TESTNET'].usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GATEWAY_WALLET, depositAmount * 100n],
      });
      const approveReceipt = await arcPublic.waitForTransactionReceipt({ hash: approveTx });
      console.log(`✓ Approved in block ${approveReceipt.blockNumber}`);
    }

    // Deposit
    console.log('Depositing to Gateway...');
    try {
      const depositTx = await arcWallet.writeContract({
        address: GATEWAY_WALLET,
        abi: GATEWAY_WALLET_ABI,
        functionName: 'deposit',
        args: [CHAINS['ARC-TESTNET'].usdc, depositAmount],
      });
      const depositReceipt = await arcPublic.waitForTransactionReceipt({ hash: depositTx });
      console.log(`✓ Deposited in block ${depositReceipt.blockNumber}`);
      console.log(`  Tx: ${depositTx}`);
    } catch (e: any) {
      console.error(`❌ Deposit error: ${e.message?.slice(0, 300)}`);
      return;
    }

    // Wait for Gateway to index
    console.log('\n⏳ Waiting for Gateway to index...');
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const newBalances = await getGatewayBalance(account.address);
      const newArcBal = newBalances['ARC-TESTNET'] || 0;
      console.log(`  Gateway Arc balance: ${newArcBal.toFixed(6)} USDC`);
      if (newArcBal >= 0.03) break;
    }
  } else {
    console.log(`\n✓ Gateway already has ${arcGatewayBal.toFixed(4)} USDC`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Create and Submit Transfer
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 2: EXECUTE TRANSFER ARC → FUJI');
  console.log('─'.repeat(70));

  // Get updated Gateway balance
  const preTransferBalances = await getGatewayBalance(account.address);
  const preTransferArc = preTransferBalances['ARC-TESTNET'] || 0;
  const preTransferFuji = preTransferBalances['AVALANCHE-FUJI'] || 0;

  console.log(`\nPre-transfer Gateway balances:`);
  console.log(`  Arc: ${preTransferArc.toFixed(6)} USDC`);
  console.log(`  Fuji: ${preTransferFuji.toFixed(6)} USDC`);

  if (preTransferArc < parseFloat(TEST_AMOUNT) + 0.025) {
    console.log('\n❌ Insufficient Arc Gateway balance for transfer');
    return;
  }

  // Get gateway info
  const gatewayInfo = await getGatewayInfo();
  const arcInfo = gatewayInfo.domains.find((d: any) => d.domain === CHAINS['ARC-TESTNET'].domain);

  if (!arcInfo) {
    console.error('Could not find Arc domain info');
    return;
  }

  const maxBlockHeight = BigInt(arcInfo.burnIntentExpirationHeight) + 10000n;
  const transferAmount = parseUnits(TEST_AMOUNT, CHAINS['ARC-TESTNET'].decimals);
  const maxFee = parseUnits('0.03', CHAINS['ARC-TESTNET'].decimals);
  const salt = generateSalt();

  const spec = {
    version: 1,
    sourceDomain: CHAINS['ARC-TESTNET'].domain,
    destinationDomain: CHAINS['AVALANCHE-FUJI'].domain,
    sourceContract: addressToBytes32(GATEWAY_WALLET),
    destinationContract: addressToBytes32(GATEWAY_MINTER),
    sourceToken: addressToBytes32(CHAINS['ARC-TESTNET'].usdc),
    destinationToken: addressToBytes32(CHAINS['AVALANCHE-FUJI'].usdc),
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
  console.log('\nSigning burn intent...');
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

  console.log(`✓ Signed: ${signature.slice(0, 30)}...`);

  // Submit
  console.log('\nSubmitting to Gateway API...');
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
    console.log(`\n❌ Transfer failed (${response.status}):`);
    console.log(responseText);
    return;
  }

  const results = JSON.parse(responseText);
  const result = Array.isArray(results) ? results[0] : results;

  console.log('\n✓ Transfer submitted!');
  console.log(`  Transfer ID: ${result.transferId}`);
  console.log(`  Fee: ${result.fees?.total || 'N/A'} USDC`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Mint on Fuji
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 3: MINT ON AVALANCHE FUJI');
  console.log('─'.repeat(70));

  if (result.attestation && result.signature) {
    const fujiWallet = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(CHAINS['AVALANCHE-FUJI'].rpc),
    });

    console.log('\nCalling gatewayMint...');

    try {
      const mintTx = await fujiWallet.writeContract({
        address: GATEWAY_MINTER,
        abi: GATEWAY_MINTER_ABI,
        functionName: 'gatewayMint',
        args: [result.attestation as `0x${string}`, result.signature as `0x${string}`],
      });

      const mintReceipt = await fujiPublic.waitForTransactionReceipt({ hash: mintTx });
      console.log(`✓ Minted in block ${mintReceipt.blockNumber}`);
      console.log(`  Tx: ${mintTx}`);
    } catch (e: any) {
      console.log(`⚠️  Mint error: ${e.message?.slice(0, 200)}`);
      console.log('   Gateway may auto-relay');
    }
  } else {
    console.log('\n⚠️  No attestation yet - Gateway may auto-relay');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Final State
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('FINAL STATE');
  console.log('─'.repeat(70));

  await new Promise(r => setTimeout(r, 5000));

  const finalArcNative = await arcPublic.getBalance({ address: account.address });
  const finalFujiBalance = await fujiPublic.readContract({
    address: CHAINS['AVALANCHE-FUJI'].usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  const finalGateway = await getGatewayBalance(account.address);

  console.log('\nOn-Chain Balances:');
  console.log(`  Arc Native:  ${formatUnits(finalArcNative, 18)} USDC`);
  console.log(`  Fuji USDC:   ${formatUnits(finalFujiBalance, 6)} USDC`);

  console.log('\nGateway Balances:');
  console.log(`  Arc Gateway: ${(finalGateway['ARC-TESTNET'] || 0).toFixed(6)} USDC`);
  console.log(`  Fuji Gateway: ${(finalGateway['AVALANCHE-FUJI'] || 0).toFixed(6)} USDC`);

  console.log('\n' + '═'.repeat(70));
  console.log('BALANCE CHANGES:');
  console.log('═'.repeat(70));

  const arcNativeChange = parseFloat(formatUnits(finalArcNative, 18)) - parseFloat(formatUnits(arcNative, 18));
  const fujiChange = parseFloat(formatUnits(finalFujiBalance, 6)) - parseFloat(formatUnits(fujiBalance, 6));
  const arcGatewayChange = (finalGateway['ARC-TESTNET'] || 0) - (gatewayBalances['ARC-TESTNET'] || 0);
  const fujiGatewayChange = (finalGateway['AVALANCHE-FUJI'] || 0) - (gatewayBalances['AVALANCHE-FUJI'] || 0);

  console.log(`  Arc Native:     ${arcNativeChange >= 0 ? '+' : ''}${arcNativeChange.toFixed(6)} USDC`);
  console.log(`  Fuji On-Chain:  ${fujiChange >= 0 ? '+' : ''}${fujiChange.toFixed(6)} USDC`);
  console.log(`  Arc Gateway:    ${arcGatewayChange >= 0 ? '+' : ''}${arcGatewayChange.toFixed(6)} USDC`);
  console.log(`  Fuji Gateway:   ${fujiGatewayChange >= 0 ? '+' : ''}${fujiGatewayChange.toFixed(6)} USDC`);

  if (fujiChange > 0 || fujiGatewayChange > 0) {
    console.log('\n✅ ARC → FUJI TRANSFER SUCCESSFUL!');
  } else {
    console.log('\n⚠️  Balance changes may take a moment to reflect');
  }

  console.log('═'.repeat(70));
}

main().catch(console.error);
