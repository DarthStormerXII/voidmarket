import 'dotenv/config';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { loadKeypairFromEnv, SOLANA_GATEWAY_CONTRACTS } from '../services/circle/solana-gateway.js';

async function main() {
  const keypair = loadKeypairFromEnv();
  console.log('Wallet:', keypair.publicKey.toBase58());

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // SOL balance
  const sol = await connection.getBalance(keypair.publicKey);
  console.log('SOL:', (sol / LAMPORTS_PER_SOL).toFixed(4));

  // Token balances
  const tokens = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, { programId: TOKEN_PROGRAM_ID });
  console.log('Token accounts:', tokens.value.length);
  for (const t of tokens.value) {
    const info = t.account.data.parsed.info;
    const isUsdc = info.mint === SOLANA_GATEWAY_CONTRACTS.USDC_MINT;
    console.log('  ', isUsdc ? 'USDC' : info.mint, ':', info.tokenAmount.uiAmountString);
  }
}

main().catch(console.error);
