/**
 * Flow 23: Solana Devnet ↔ Arc Gateway Transfer Test
 *
 * Tests cross-chain USDC transfers between Solana Devnet (Domain 5) and EVM chains.
 *
 * Test Cases:
 * 1. Connect to Solana Devnet
 * 2. Check USDC balance on Solana
 * 3. Deposit USDC to Solana Gateway Wallet
 * 4. Solana Devnet → Arc (0.001 USDC)
 * 5. Arc → Solana Devnet (0.001 USDC)
 *
 * Prerequisites:
 * - SOLANA_PRIVATE_KEY env var set (base58 or JSON array format)
 * - USDC on Solana Devnet (use Circle faucet)
 * - PRIVATE_KEY env var set for EVM wallet
 */

import 'dotenv/config';
import { PublicKey, Keypair } from '@solana/web3.js';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, formatUnits, parseUnits } from 'viem';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  createSolanaConnection,
  loadKeypairFromEnv,
  getSolanaUsdcBalance,
  getSolBalance,
  depositToSolanaGateway,
  executeSolanaToEvmTransfer,
  getSolanaExplorerUrl,
  SOLANA_CONFIG,
  SOLANA_GATEWAY_CONTRACTS,
  solanaAddressToBytes32,
} from '../services/circle/solana-gateway.js';

import {
  executeGatewayTransfer,
  depositToGateway,
  getGatewayInfo,
  CHAIN_CONFIG,
  GATEWAY_DOMAINS,
  type EVMGatewayChainId,
} from '../services/circle/gateway-transfer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log file for transfer IDs
const LOG_FILE = path.join(__dirname, 'solana-gateway-log.json');

interface TransferLog {
  timestamp: string;
  direction: 'SOLANA_TO_EVM' | 'EVM_TO_SOLANA';
  sourceChain: string;
  destChain: string;
  amount: string;
  transferId?: string;
  signature?: string;
  error?: string;
}

function loadLog(): TransferLog[] {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLog(logs: TransferLog[]): void {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

function appendLog(log: TransferLog): void {
  const logs = loadLog();
  logs.push(log);
  saveLog(logs);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Flow 23: Solana Devnet ↔ Arc Gateway Transfer Test');
  console.log('='.repeat(60));
  console.log();

  // ============================================================================
  // Step 1: Load credentials and connect
  // ============================================================================
  console.log('[1/6] Loading credentials...');

  // Load Solana keypair
  let solanaKeypair: Keypair;
  try {
    solanaKeypair = loadKeypairFromEnv('SOLANA_PRIVATE_KEY');
    console.log(`  ✓ Solana wallet: ${solanaKeypair.publicKey.toBase58()}`);
  } catch (error) {
    console.error('  ✗ Failed to load Solana keypair:', error);
    console.log('');
    console.log('Please set SOLANA_PRIVATE_KEY environment variable.');
    console.log('Format: Base58 encoded secret key or JSON array of bytes');
    console.log('');
    console.log('To generate a new keypair, run:');
    console.log("  import { createNewKeypair } from './services/circle/solana-gateway';");
    console.log('  const kp = createNewKeypair();');
    console.log('  console.log(kp.secretKey); // Add to .env');
    process.exit(1);
  }

  // Load EVM private key (try PRIVATE_KEY first, then DEPLOYER_PRIVATE_KEY)
  const evmPrivateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('  ✗ PRIVATE_KEY or DEPLOYER_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }

  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log(`  ✓ EVM wallet: ${evmAccount.address}`);

  // Connect to Solana
  const connection = createSolanaConnection();
  console.log(`  ✓ Connected to Solana Devnet`);
  console.log();

  // ============================================================================
  // Step 2: Check balances
  // ============================================================================
  console.log('[2/6] Checking balances...');

  // Solana balances
  const solBalance = await getSolBalance(connection, solanaKeypair.publicKey);
  console.log(`  Solana SOL: ${solBalance.formatted}`);

  const solanaUsdcBalance = await getSolanaUsdcBalance(connection, solanaKeypair.publicKey);
  console.log(`  Solana USDC: ${solanaUsdcBalance.formatted}`);

  // Arc balance (EVM)
  const arcConfig = CHAIN_CONFIG['ARC-TESTNET'];
  const arcClient = createWalletClient({
    account: evmAccount,
    transport: http(arcConfig.rpc),
  });

  // Get Arc USDC balance via RPC
  const { createPublicClient, erc20Abi } = await import('viem');
  const arcPublicClient = createPublicClient({ transport: http(arcConfig.rpc) });
  const arcUsdcBalance = await arcPublicClient.readContract({
    address: arcConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });
  console.log(`  Arc USDC: ${formatUnits(arcUsdcBalance, 6)}`);
  console.log();

  // Check Gateway info
  console.log('[3/6] Checking Gateway status...');
  const gatewayInfo = await getGatewayInfo();
  const solanaInfo = gatewayInfo.domains.find((d) => d.domain === 5);
  const arcInfo = gatewayInfo.domains.find((d) => d.domain === 26);

  if (solanaInfo) {
    console.log(`  Solana Devnet (Domain 5):`);
    console.log(`    - Processed height: ${solanaInfo.processedHeight}`);
    console.log(`    - Burn intent expiration: ${solanaInfo.burnIntentExpirationHeight}`);
  } else {
    console.log('  ⚠ Solana Devnet not found in Gateway info');
  }

  if (arcInfo) {
    console.log(`  Arc Testnet (Domain 26):`);
    console.log(`    - Processed height: ${arcInfo.processedHeight}`);
    console.log(`    - Burn intent expiration: ${arcInfo.burnIntentExpirationHeight}`);
  }
  console.log();

  // ============================================================================
  // Step 4: Deposit to Solana Gateway (if needed)
  // ============================================================================
  console.log('[4/6] Checking Gateway deposit...');

  // For testing, we need USDC in the Gateway wallet
  // The Gateway wallet ATA should already exist from Circle's setup
  const minDepositAmount = '0.05'; // Deposit a bit more for testing

  if (parseFloat(solanaUsdcBalance.formatted) < 0.01) {
    console.log('  ⚠ Insufficient Solana USDC balance for testing');
    console.log('  Please get testnet USDC from Circle faucet:');
    console.log('    https://faucet.circle.com/');
    console.log(`  Send to: ${solanaKeypair.publicKey.toBase58()}`);
    process.exit(1);
  }

  console.log(`  ✓ Solana USDC balance sufficient for testing`);
  console.log();

  // ============================================================================
  // Step 5: Test Solana → Arc transfer
  // ============================================================================
  console.log('[5/6] Testing Solana → Arc transfer...');
  const testAmount = '0.001';

  console.log(`  Transferring ${testAmount} USDC from Solana Devnet to Arc...`);
  console.log(`  From: ${solanaKeypair.publicKey.toBase58()}`);
  console.log(`  To: ${evmAccount.address}`);

  const solanaToArcResult = await executeSolanaToEvmTransfer({
    amount: testAmount,
    toChain: 'ARC-TESTNET',
    keypair: solanaKeypair,
    recipient: evmAccount.address,
    maxFee: '0.03',
  });

  if (solanaToArcResult.success) {
    console.log(`  ✓ Transfer submitted!`);
    console.log(`    Transfer ID: ${solanaToArcResult.transferId}`);
    if (solanaToArcResult.fees) {
      console.log(`    Fee: ${solanaToArcResult.fees.total} ${solanaToArcResult.fees.token}`);
    }

    appendLog({
      timestamp: new Date().toISOString(),
      direction: 'SOLANA_TO_EVM',
      sourceChain: 'SOLANA-DEVNET',
      destChain: 'ARC-TESTNET',
      amount: testAmount,
      transferId: solanaToArcResult.transferId,
    });
  } else {
    console.log(`  ✗ Transfer failed: ${solanaToArcResult.error}`);

    appendLog({
      timestamp: new Date().toISOString(),
      direction: 'SOLANA_TO_EVM',
      sourceChain: 'SOLANA-DEVNET',
      destChain: 'ARC-TESTNET',
      amount: testAmount,
      error: solanaToArcResult.error,
    });
  }
  console.log();

  // ============================================================================
  // Step 6: Test Arc → Solana transfer
  // ============================================================================
  console.log('[6/6] Testing Arc → Solana transfer...');

  // First, ensure deposit to Arc Gateway
  console.log(`  Depositing ${testAmount} USDC to Arc Gateway...`);

  const depositResult = await depositToGateway({
    amount: testAmount,
    chain: 'ARC-TESTNET',
    walletClient: arcClient as any,
    address: evmAccount.address,
  });

  if (!depositResult.success) {
    console.log(`  ✗ Deposit failed: ${depositResult.error}`);
  } else {
    console.log(`  ✓ Deposit successful: ${arcConfig.explorerUrl}/tx/${depositResult.txHash}`);
  }

  // Wait a bit for indexing
  console.log('  Waiting for Gateway to index deposit...');
  await new Promise((r) => setTimeout(r, 5000));

  // Execute Arc → Solana transfer
  // NOTE: For EVM → Solana, we need to use the EVM signing but with Solana destination
  // This requires modifying the destination addresses to Solana format

  console.log(`  Transferring ${testAmount} USDC from Arc to Solana...`);
  console.log(`  From: ${evmAccount.address}`);
  console.log(`  To: ${solanaKeypair.publicKey.toBase58()}`);

  // For Arc → Solana, we need to create a custom burn intent with Solana destination
  // The Gateway API should handle the domain routing
  const solanaRecipientBytes32 = solanaAddressToBytes32(solanaKeypair.publicKey);
  console.log(`  Solana recipient (bytes32): ${solanaRecipientBytes32}`);

  // NOTE: This direction requires the Gateway to support Solana as destination
  // which may have different API requirements. For now, we'll log and verify manually.
  console.log('  ⚠ Arc → Solana direction requires custom implementation');
  console.log('    The EVM burn intent needs Solana-formatted destination addresses');
  console.log('    This test will be completed in a follow-up implementation');

  console.log();

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log();
  console.log('Results:');
  console.log(`  Solana → Arc: ${solanaToArcResult.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  console.log(`  Arc → Solana: ⚠ Requires custom implementation`);
  console.log();
  console.log('Addresses:');
  console.log(`  Solana: ${solanaKeypair.publicKey.toBase58()}`);
  console.log(`  EVM: ${evmAccount.address}`);
  console.log();
  console.log('Gateway Contracts (Solana Devnet):');
  console.log(`  Wallet: ${SOLANA_GATEWAY_CONTRACTS.WALLET}`);
  console.log(`  Minter: ${SOLANA_GATEWAY_CONTRACTS.MINTER}`);
  console.log(`  USDC: ${SOLANA_GATEWAY_CONTRACTS.USDC_MINT}`);
  console.log();
  console.log(`Log file: ${LOG_FILE}`);
  console.log();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
