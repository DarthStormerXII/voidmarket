/**
 * Derive Solana wallet from mnemonic
 * Target: 8PPXXkCwyANQK82eLoNG6bHdGJmoarVHbgkCfEPWvG89
 */

import 'dotenv/config';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import bs58 from 'bs58';

const TARGET_ADDRESS = '8PPXXkCwyANQK82eLoNG6bHdGJmoarVHbgkCfEPWvG89';

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error('MNEMONIC not found in environment');
    process.exit(1);
  }

  console.log('Deriving Solana wallets from mnemonic...');
  console.log('Target:', TARGET_ADDRESS);
  console.log('');

  // Convert mnemonic to seed
  const seed = await bip39.mnemonicToSeed(mnemonic);

  // Try different derivation paths
  const paths = [
    // Standard Solana paths
    "m/44'/501'/0'/0'",    // Phantom, Solflare default
    "m/44'/501'/0'",       // Some wallets
    "m/44'/501'",          // Minimal
    // Try multiple accounts
    "m/44'/501'/1'/0'",
    "m/44'/501'/2'/0'",
    "m/44'/501'/3'/0'",
    "m/44'/501'/4'/0'",
    "m/44'/501'/5'/0'",
    // Ledger style
    "m/44'/501'/0'/0'/0'",
    "m/44'/501'/0'/0'/1'",
  ];

  for (const path of paths) {
    try {
      const derived = derivePath(path, seed.toString('hex'));
      const keypair = Keypair.fromSeed(derived.key);
      const address = keypair.publicKey.toBase58();

      console.log(`${path} => ${address}`);

      if (address === TARGET_ADDRESS) {
        console.log('');
        console.log('✓ FOUND TARGET WALLET!');
        console.log('Path:', path);
        console.log('Address:', address);
        console.log('Private key (base58):', bs58.encode(keypair.secretKey));
        return keypair;
      }
    } catch (e) {
      console.log(`${path} => error: ${e}`);
    }
  }

  // Try more account indices
  console.log('');
  console.log('Trying more account indices...');
  for (let i = 0; i < 20; i++) {
    const path = `m/44'/501'/${i}'/0'`;
    try {
      const derived = derivePath(path, seed.toString('hex'));
      const keypair = Keypair.fromSeed(derived.key);
      const address = keypair.publicKey.toBase58();

      if (address === TARGET_ADDRESS) {
        console.log('');
        console.log('✓ FOUND TARGET WALLET!');
        console.log('Path:', path);
        console.log('Address:', address);
        console.log('Private key (base58):', bs58.encode(keypair.secretKey));
        return keypair;
      }
    } catch (e) {
      // skip
    }
  }

  console.log('');
  console.log('Target wallet not found in common derivation paths');
}

main().catch(console.error);
