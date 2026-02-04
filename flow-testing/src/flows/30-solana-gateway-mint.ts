/**
 * Manually call Solana Gateway Minter with attestation
 *
 * Based on analysis of successful Gateway mint transactions.
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
import bs58 from 'bs58';

import {
  loadKeypairFromEnv,
  createSolanaConnection,
  getSolanaUsdcBalance,
  SOLANA_GATEWAY_CONTRACTS,
} from '../services/circle/solana-gateway.js';

// Gateway Minter Program ID
const GATEWAY_MINTER_PROGRAM = new PublicKey('GATEmKK2ECL1brEngQZWCgMWPbvrEYqsV6u29dAaHavr');
const USDC_MINT = new PublicKey(SOLANA_GATEWAY_CONTRACTS.USDC_MINT);

// The attestation from our last Arc → Solana transfer
// Transfer ID: 560d0fec-a0a7-4cb3-8de6-3d5313deceea
const ATTESTATION = '0x10cbb1ec0000000100000005e14b32a2fe7625fcbc3987664d11cb746efb325a13af91a3e2d4f7fc6015a40700000000000000000000000000000000000000000000000000000000000000000000000036000000000000000000000000000000000000003b442cb3912157f13a933d0134282d032b5ffecd01a2dbf1b7790608df002ea700000000000000000000000032fe11d9900d63350016374be98ff37c3af758476bba80bc3afbc92c4a19c1cba6f2b1c7bd3d05b46db4fcb6e4acbeca75e6ad6a00000000000000000000000032fe11d9900d63350016374be98ff37c3af7584700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002710df78ed40c8f5bccff90fd7088ac69f26f3f5cc4e8d4b69a3e43b2ded6f73bc9c00f4b071558bf97628737e38918f103c301b5cb7c19fc4cb1fd70e9e2d5bc30816a7e6ca0d8e29f8d99e6a1ef3f80abdc5b1af4dffdd42e5fd06b88234a92f4d01';

async function main() {
  const connection = createSolanaConnection();
  const keypair = loadKeypairFromEnv();

  console.log('Wallet:', keypair.publicKey.toBase58());

  // Check current balance
  const balanceBefore = await getSolanaUsdcBalance(connection, keypair.publicKey);
  console.log('USDC balance before:', balanceBefore.formatted);

  // Get ATA
  const userAta = await getAssociatedTokenAddress(USDC_MINT, keypair.publicKey);
  console.log('User ATA:', userAta.toBase58());

  // Check if we have the attestation (it may have expired)
  if (!ATTESTATION || ATTESTATION === '0x') {
    console.log('No attestation available. Run Arc → Solana transfer first.');
    return;
  }

  // Decode attestation (remove 0x prefix)
  const attestationBytes = Buffer.from(ATTESTATION.slice(2), 'hex');
  console.log('Attestation length:', attestationBytes.length, 'bytes');

  // Based on successful transaction analysis, the instruction format appears to be:
  // [discriminator (variable)] + [attestation data]
  // The discriminator might be 2-4 bytes based on the pattern seen

  // Try instruction discriminator from successful tx: 0x0c00c400000010cb
  // This looks like: [0c 00] [c4 00 00 00] [attestation...]
  // where 0c 00 might be instruction ID and c4 00 00 00 might be some length/offset

  // Looking more carefully at the pattern:
  // Successful tx starts: 0c00c400000010cbb1ec...
  // Our attestation starts:       10cbb1ec...
  // So the prefix is: 0c 00 c4 00 00 00 (6 bytes)

  // Build instruction data: prefix + attestation
  const prefix = Buffer.from([0x0c, 0x00, 0xc4, 0x00, 0x00, 0x00]);
  const instructionData = Buffer.concat([prefix, attestationBytes]);

  console.log('Instruction data length:', instructionData.length, 'bytes');
  console.log('Instruction data start:', instructionData.slice(0, 20).toString('hex'));

  // EXACT account order from successful transaction instruction:
  // 0: Fw1Vu3... - signer (payer)
  // 1: Fw1Vu3... - signer (destination_caller - MUST be signer!)
  // 2: 2xuXUon... - gateway_minter config (size 802)
  // 3: 111111... - System Program
  // 4: Tokenke... - Token Program
  // 5: Ei7dhqk... - null account (some PDA)
  // 6: GATEmKK... - Gateway Minter Program
  // 7: 892zGb9... - Token account (source vault or something)
  // 8: 9TNb6sr... - Token account (recipient ATA)
  // 9: EWBqDfs... - Small state PDA (size 2)

  // Known PDAs from successful transaction
  const gatewayMinterConfig = new PublicKey('2xuXUonVks6zJFXH6D62nnLT5VRt8NLQ96c2xUnwdnKf');
  const gatewaySmallState = new PublicKey('EWBqDfsqTMpHyHpgytCstqhrCuqbs1uRPgNShqr7WbY3');
  const nullAccount = new PublicKey('Ei7dhqkG7VB4mCWG7gXBUPEwcrHDXt3BsPR6F3555NPA');

  // Token accounts from successful tx - these are likely PDAs
  // 892zGb9gTbaswJtMqLzUbzL7f84uBZRzWJZx36D3E9Pi - Token account
  // 9TNb6srdJzoGu3P6UnMPCa6aRAuSsg25TmQRuqmNDwLA - Token account
  // We need to derive these based on our attestation/recipient

  // For now, let's use fixed accounts from successful tx to test the instruction format
  const sourceTokenAccount = new PublicKey('892zGb9gTbaswJtMqLzUbzL7f84uBZRzWJZx36D3E9Pi');
  // For recipient, we use OUR ATA

  console.log('Gateway minter config:', gatewayMinterConfig.toBase58());
  console.log('User ATA:', userAta.toBase58());

  // Build instruction matching successful transaction EXACTLY
  const accounts = [
    { pubkey: keypair.publicKey, isSigner: true, isWritable: true },   // 0: payer (signer)
    { pubkey: keypair.publicKey, isSigner: true, isWritable: true },   // 1: destination_caller (MUST be signer!)
    { pubkey: gatewayMinterConfig, isSigner: false, isWritable: false }, // 2: gateway_minter config
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 3: system
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },   // 4: token program
    { pubkey: nullAccount, isSigner: false, isWritable: false },        // 5: some PDA
    { pubkey: GATEWAY_MINTER_PROGRAM, isSigner: false, isWritable: false }, // 6: program
    { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },  // 7: source token account
    { pubkey: userAta, isSigner: false, isWritable: true },             // 8: recipient ATA
    { pubkey: gatewaySmallState, isSigner: false, isWritable: true },   // 9: small state
  ];

  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: GATEWAY_MINTER_PROGRAM,
    data: instructionData,
  });

  console.log('');
  console.log('Attempting to call Gateway Minter...');

  try {
    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
    console.log('✓ Transaction successful!');
    console.log('Signature:', sig);
    console.log('Explorer: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');

    // Check balance after
    const balanceAfter = await getSolanaUsdcBalance(connection, keypair.publicKey);
    console.log('USDC balance after:', balanceAfter.formatted);
  } catch (e: any) {
    console.log('✗ Transaction failed:', e.message);
    if (e.logs) {
      console.log('Logs:', e.logs.slice(-5));
    }
  }
}

main().catch(console.error);
