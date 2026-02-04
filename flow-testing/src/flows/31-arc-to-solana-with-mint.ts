/**
 * Arc → Solana Complete Flow with Immediate Mint
 *
 * This flow:
 * 1. Deposits USDC to Arc Gateway
 * 2. Submits burn intent (Arc → Solana)
 * 3. Gets fresh attestation
 * 4. IMMEDIATELY calls Solana Gateway Minter (attestations expire in 10 min)
 *
 * Key: Must call Solana mint within 10 minutes of getting attestation!
 */

import 'dotenv/config';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, formatUnits, parseUnits, erc20Abi } from 'viem';

import {
  createSolanaConnection,
  loadKeypairFromEnv,
  getSolanaUsdcBalance,
  solanaAddressToBytes32,
  SOLANA_CONFIG,
  SOLANA_GATEWAY_CONTRACTS,
} from '../services/circle/solana-gateway.js';

import {
  depositToGateway,
  getGatewayInfo,
  submitTransfer,
  signBurnIntent,
  addressToBytes32,
  generateSalt,
  CHAIN_CONFIG,
  GATEWAY_DOMAINS,
  GATEWAY_CONTRACTS,
  type TransferSpec,
  type BurnIntent,
} from '../services/circle/gateway-transfer.js';

// Gateway Minter Program ID on Solana
const GATEWAY_MINTER_PROGRAM = new PublicKey('GATEmKK2ECL1brEngQZWCgMWPbvrEYqsV6u29dAaHavr');
const USDC_MINT = new PublicKey(SOLANA_GATEWAY_CONTRACTS.USDC_MINT);

// Known PDAs from successful transactions (these are fixed for devnet)
const GATEWAY_MINTER_CONFIG = new PublicKey('2xuXUonVks6zJFXH6D62nnLT5VRt8NLQ96c2xUnwdnKf');
const GATEWAY_SMALL_STATE = new PublicKey('EWBqDfsqTMpHyHpgytCstqhrCuqbs1uRPgNShqr7WbY3');
const NULL_ACCOUNT = new PublicKey('Ei7dhqkG7VB4mCWG7gXBUPEwcrHDXt3BsPR6F3555NPA');
const SOURCE_TOKEN_ACCOUNT = new PublicKey('892zGb9gTbaswJtMqLzUbzL7f84uBZRzWJZx36D3E9Pi');

async function main() {
  console.log('='.repeat(70));
  console.log('Arc → Solana Complete Flow with Immediate Mint');
  console.log('='.repeat(70));
  console.log('');

  // Load credentials
  const solanaKeypair = loadKeypairFromEnv();
  console.log('Solana wallet:', solanaKeypair.publicKey.toBase58());

  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('No EVM private key found');
    process.exit(1);
  }
  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log('EVM wallet:', evmAccount.address);
  console.log('');

  // Connections
  const solanaConnection = createSolanaConnection();
  const arcConfig = CHAIN_CONFIG['ARC-TESTNET'];
  const arcPublicClient = createPublicClient({ transport: http(arcConfig.rpc) });
  const arcWalletClient = createWalletClient({
    account: evmAccount,
    transport: http(arcConfig.rpc),
  });

  // ========================================================================
  // INITIAL BALANCES
  // ========================================================================
  console.log('=== INITIAL BALANCES ===');
  const solanaUsdc = await getSolanaUsdcBalance(solanaConnection, solanaKeypair.publicKey);
  console.log('Solana USDC:', solanaUsdc.formatted);

  const arcUsdcBefore = await arcPublicClient.readContract({
    address: arcConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });
  console.log('Arc USDC:', formatUnits(arcUsdcBefore, 6));
  console.log('');

  const testAmount = '0.01'; // 0.01 USDC

  // ========================================================================
  // STEP 1: Deposit to Arc Gateway
  // ========================================================================
  console.log('=== STEP 1: Deposit to Arc Gateway ===');
  const depositResult = await depositToGateway({
    amount: testAmount,
    chain: 'ARC-TESTNET',
    walletClient: arcWalletClient as any,
    address: evmAccount.address,
  });

  if (!depositResult.success) {
    console.error('Deposit failed:', depositResult.error);
    process.exit(1);
  }
  console.log('✓ Deposit tx:', depositResult.txHash);

  console.log('Waiting 5s for indexing...');
  await new Promise(r => setTimeout(r, 5000));

  // ========================================================================
  // STEP 2: Create and Submit Burn Intent
  // ========================================================================
  console.log('');
  console.log('=== STEP 2: Create Burn Intent (Arc → Solana) ===');

  const gatewayInfo = await getGatewayInfo();
  const arcInfo = gatewayInfo.domains.find(d => d.domain === 26);
  if (!arcInfo) throw new Error('Arc not in gateway');

  const maxBlockHeight = BigInt(arcInfo.burnIntentExpirationHeight) + 10000n;
  const value = parseUnits(testAmount, 6);
  const maxFee = parseUnits('0.03', 6);

  // For Solana destination, destinationCaller should be zero address
  // This allows anyone to call the mint (including us)
  const spec: TransferSpec = {
    version: 1,
    sourceDomain: GATEWAY_DOMAINS['ARC-TESTNET'],
    destinationDomain: 5, // Solana
    sourceContract: addressToBytes32(GATEWAY_CONTRACTS.WALLET as `0x${string}`),
    destinationContract: solanaAddressToBytes32(SOLANA_GATEWAY_CONTRACTS.MINTER),
    sourceToken: addressToBytes32(arcConfig.usdc),
    destinationToken: solanaAddressToBytes32(SOLANA_GATEWAY_CONTRACTS.USDC_MINT),
    sourceDepositor: addressToBytes32(evmAccount.address),
    destinationRecipient: solanaAddressToBytes32(solanaKeypair.publicKey),
    sourceSigner: addressToBytes32(evmAccount.address),
    destinationCaller: addressToBytes32('0x0000000000000000000000000000000000000000' as `0x${string}`),
    value,
    salt: generateSalt(),
    hookData: '0x' as `0x${string}`,
  };

  const burnIntent: BurnIntent = { maxBlockHeight, maxFee, spec };

  console.log('Signing with EIP-712...');
  const signed = await signBurnIntent(burnIntent, evmAccount);

  console.log('Submitting to Gateway API...');
  const transferResult = await submitTransfer([signed]);

  if (!transferResult.success) {
    console.error('Transfer failed:', transferResult.error);
    process.exit(1);
  }

  console.log('✓ Transfer submitted!');
  console.log('  Transfer ID:', transferResult.transferId);
  console.log('  Fee:', transferResult.fees?.total, transferResult.fees?.token);
  console.log('  Attestation length:', transferResult.attestation?.length);
  console.log('');

  // ========================================================================
  // STEP 3: Call Solana Gateway Minter IMMEDIATELY
  // ========================================================================
  console.log('=== STEP 3: Call Solana Gateway Minter (IMMEDIATELY!) ===');
  console.log('⚠️  Attestation expires in 10 minutes - calling mint now...');

  if (!transferResult.attestation) {
    console.error('No attestation received!');
    process.exit(1);
  }

  // Get user's USDC ATA
  const userAta = await getAssociatedTokenAddress(USDC_MINT, solanaKeypair.publicKey);
  console.log('User ATA:', userAta.toBase58());

  // Decode attestation (remove 0x prefix)
  const attestationBytes = Buffer.from(transferResult.attestation.slice(2), 'hex');
  console.log('Attestation length:', attestationBytes.length, 'bytes');

  // Build instruction data
  // Based on successful transaction analysis: prefix is [0x0c, 0x00, 0xc4, 0x00, 0x00, 0x00]
  const prefix = Buffer.from([0x0c, 0x00, 0xc4, 0x00, 0x00, 0x00]);
  const instructionData = Buffer.concat([prefix, attestationBytes]);

  console.log('Instruction data length:', instructionData.length, 'bytes');

  // Build instruction matching successful transaction structure
  const accounts = [
    { pubkey: solanaKeypair.publicKey, isSigner: true, isWritable: true },   // 0: payer (signer)
    { pubkey: solanaKeypair.publicKey, isSigner: true, isWritable: true },   // 1: destination_caller (MUST be signer!)
    { pubkey: GATEWAY_MINTER_CONFIG, isSigner: false, isWritable: false }, // 2: gateway_minter config
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 3: system
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },   // 4: token program
    { pubkey: NULL_ACCOUNT, isSigner: false, isWritable: false },        // 5: some PDA
    { pubkey: GATEWAY_MINTER_PROGRAM, isSigner: false, isWritable: false }, // 6: program
    { pubkey: SOURCE_TOKEN_ACCOUNT, isSigner: false, isWritable: true },  // 7: source token account
    { pubkey: userAta, isSigner: false, isWritable: true },             // 8: recipient ATA
    { pubkey: GATEWAY_SMALL_STATE, isSigner: false, isWritable: true },   // 9: small state
  ];

  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: GATEWAY_MINTER_PROGRAM,
    data: instructionData,
  });

  console.log('');
  console.log('Sending Solana mint transaction...');

  try {
    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(solanaConnection, tx, [solanaKeypair]);
    console.log('✓ Solana mint successful!');
    console.log('Signature:', sig);
    console.log('Explorer: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');
  } catch (e: any) {
    console.log('✗ Solana mint failed:', e.message);
    if (e.logs) {
      console.log('Logs:');
      for (const log of e.logs.slice(-10)) {
        console.log('  ', log);
      }
    }

    // If the automatic mint failed, wait for Gateway relayers
    console.log('');
    console.log('Waiting 60s for Gateway relayers to process...');
    await new Promise(r => setTimeout(r, 60000));
  }

  // ========================================================================
  // FINAL BALANCES
  // ========================================================================
  console.log('');
  console.log('=== FINAL BALANCES ===');

  const solanaUsdcAfter = await getSolanaUsdcBalance(solanaConnection, solanaKeypair.publicKey);
  const arcUsdcAfter = await arcPublicClient.readContract({
    address: arcConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });

  console.log('');
  console.log('Solana USDC:', solanaUsdc.formatted, '→', solanaUsdcAfter.formatted);
  console.log('Arc USDC:', formatUnits(arcUsdcBefore, 6), '→', formatUnits(arcUsdcAfter, 6));

  const solanaChange = parseFloat(solanaUsdcAfter.formatted) - parseFloat(solanaUsdc.formatted);
  const arcChange = parseFloat(formatUnits(arcUsdcAfter, 6)) - parseFloat(formatUnits(arcUsdcBefore, 6));

  console.log('');
  console.log('Changes:');
  console.log('  Solana:', solanaChange >= 0 ? '+' : '', solanaChange.toFixed(6), 'USDC');
  console.log('  Arc:', arcChange >= 0 ? '+' : '', arcChange.toFixed(6), 'USDC');

  if (solanaChange > 0) {
    console.log('');
    console.log('✓ SUCCESS! Arc → Solana transfer verified!');
  } else if (arcChange < 0 && solanaChange === 0) {
    console.log('');
    console.log('⚠️  Arc deducted but Solana not credited yet.');
    console.log('   The Gateway relayers may still process this.');
    console.log('   Transfer ID:', transferResult.transferId);
  }
}

main().catch(console.error);
