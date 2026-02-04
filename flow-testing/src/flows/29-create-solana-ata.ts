/**
 * Create USDC Associated Token Account on Solana
 */

import 'dotenv/config';
import { Connection, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { loadKeypairFromEnv, SOLANA_GATEWAY_CONTRACTS, createSolanaConnection } from '../services/circle/solana-gateway.js';

async function main() {
  const keypair = loadKeypairFromEnv();
  const connection = createSolanaConnection();

  console.log('Wallet:', keypair.publicKey.toBase58());

  const usdcMint = new PublicKey(SOLANA_GATEWAY_CONTRACTS.USDC_MINT);
  console.log('USDC Mint:', usdcMint.toBase58());

  // Get ATA address
  const ata = await getAssociatedTokenAddress(
    usdcMint,
    keypair.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log('Expected ATA:', ata.toBase58());

  // Check if ATA exists
  try {
    const account = await getAccount(connection, ata);
    console.log('ATA already exists with balance:', Number(account.amount) / 1e6);
  } catch (e) {
    console.log('ATA does not exist. Creating...');

    // Create ATA
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        keypair.publicKey, // payer
        ata, // ata address
        keypair.publicKey, // owner
        usdcMint, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
    console.log('ATA created!');
    console.log('Transaction:', sig);
    console.log('Explorer: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');
  }
}

main().catch(console.error);
