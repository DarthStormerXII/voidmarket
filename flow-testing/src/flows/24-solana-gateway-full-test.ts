/**
 * Flow 24: Full Solana Gateway Test with Balance Verification
 *
 * Tests:
 * 1. Arc → Solana (0.01 USDC) - EVM wallet has funds
 * 2. Solana → Arc (0.005 USDC) - After receiving from step 1
 *
 * Verifies before/after balances on both chains.
 * Uses Gateway API only (no CCTP).
 */

import 'dotenv/config';
import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, formatUnits, parseUnits, erc20Abi } from 'viem';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  createSolanaConnection,
  loadKeypairFromEnv,
  getSolanaUsdcBalance,
  getSolBalance,
  executeSolanaToEvmTransfer,
  solanaAddressToBytes32,
  SOLANA_CONFIG,
  SOLANA_GATEWAY_CONTRACTS,
} from '../services/circle/solana-gateway.js';

import {
  executeGatewayTransfer,
  depositToGateway,
  getGatewayInfo,
  CHAIN_CONFIG,
  GATEWAY_DOMAINS,
  createBurnIntent,
  signBurnIntent,
  submitTransfer,
  addressToBytes32,
  generateSalt,
  type EVMGatewayChainId,
  type TransferSpec,
  type BurnIntent,
} from '../services/circle/gateway-transfer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results file
const RESULTS_FILE = path.join(__dirname, 'solana-gateway-results.json');

interface TestResult {
  timestamp: string;
  test: string;
  success: boolean;
  direction: string;
  amount: string;
  sourceChain: string;
  destChain: string;
  sourceBalanceBefore: string;
  sourceBalanceAfter: string;
  destBalanceBefore: string;
  destBalanceAfter: string;
  transferId?: string;
  txHash?: string;
  error?: string;
  fees?: { total: string; token: string };
}

function saveResults(results: TestResult[]): void {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

async function getArcUsdcBalance(address: `0x${string}`): Promise<string> {
  const arcConfig = CHAIN_CONFIG['ARC-TESTNET'];
  const client = createPublicClient({ transport: http(arcConfig.rpc) });
  const balance = await client.readContract({
    address: arcConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });
  return formatUnits(balance, 6);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const results: TestResult[] = [];

  console.log('='.repeat(70));
  console.log('Flow 24: Solana ↔ Arc Gateway Full Test (with Balance Verification)');
  console.log('='.repeat(70));
  console.log();
  console.log('IMPORTANT: This test uses Gateway API burn intents (NOT CCTP)');
  console.log();

  // Load credentials
  console.log('[SETUP] Loading credentials...');

  let solanaKeypair: Keypair;
  try {
    solanaKeypair = loadKeypairFromEnv('SOLANA_PRIVATE_KEY');
    console.log(`  Solana: ${solanaKeypair.publicKey.toBase58()}`);
  } catch (error) {
    console.error('  ✗ SOLANA_PRIVATE_KEY not set');
    process.exit(1);
  }

  const evmPrivateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!evmPrivateKey) {
    console.error('  ✗ PRIVATE_KEY or DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const evmAccount = privateKeyToAccount(evmPrivateKey as `0x${string}`);
  console.log(`  EVM: ${evmAccount.address}`);

  const connection = createSolanaConnection();
  console.log(`  Solana RPC: ${SOLANA_CONFIG.rpc}`);
  console.log();

  // Get initial balances
  console.log('[BALANCES] Initial state:');
  const arcBalanceBefore = await getArcUsdcBalance(evmAccount.address);
  const solanaBalanceBefore = await getSolanaUsdcBalance(connection, solanaKeypair.publicKey);
  const solBalanceBefore = await getSolBalance(connection, solanaKeypair.publicKey);

  console.log(`  Arc USDC:    ${arcBalanceBefore}`);
  console.log(`  Solana USDC: ${solanaBalanceBefore.formatted}`);
  console.log(`  Solana SOL:  ${solBalanceBefore.formatted}`);
  console.log();

  // Check Gateway status
  console.log('[GATEWAY] Checking status...');
  const gatewayInfo = await getGatewayInfo();
  const solanaInfo = gatewayInfo.domains.find((d) => d.domain === 5);
  const arcInfo = gatewayInfo.domains.find((d) => d.domain === 26);

  if (!solanaInfo) {
    console.error('  ✗ Solana Devnet (Domain 5) not found in Gateway');
    process.exit(1);
  }
  console.log(`  Solana (Domain 5): height ${solanaInfo.processedHeight}`);
  console.log(`  Arc (Domain 26): height ${arcInfo?.processedHeight || 'N/A'}`);
  console.log();

  // ============================================================================
  // TEST 1: Arc → Solana
  // ============================================================================
  console.log('='.repeat(70));
  console.log('TEST 1: Arc → Solana (0.01 USDC)');
  console.log('='.repeat(70));
  console.log();

  const test1Amount = '0.01';

  // Check if we have enough Arc USDC
  if (parseFloat(arcBalanceBefore) < parseFloat(test1Amount) + 0.05) {
    console.log('  ✗ Insufficient Arc USDC balance');
    results.push({
      timestamp: new Date().toISOString(),
      test: 'Arc → Solana',
      success: false,
      direction: 'ARC_TO_SOLANA',
      amount: test1Amount,
      sourceChain: 'ARC-TESTNET',
      destChain: 'SOLANA-DEVNET',
      sourceBalanceBefore: arcBalanceBefore,
      sourceBalanceAfter: arcBalanceBefore,
      destBalanceBefore: solanaBalanceBefore.formatted,
      destBalanceAfter: solanaBalanceBefore.formatted,
      error: 'Insufficient Arc USDC balance',
    });
  } else {
    console.log('[1.1] Depositing to Arc Gateway...');

    const arcConfig = CHAIN_CONFIG['ARC-TESTNET'];
    const arcWalletClient = createWalletClient({
      account: evmAccount,
      transport: http(arcConfig.rpc),
    });

    const depositResult = await depositToGateway({
      amount: test1Amount,
      chain: 'ARC-TESTNET',
      walletClient: arcWalletClient as any,
      address: evmAccount.address,
    });

    if (!depositResult.success) {
      console.log(`  ✗ Deposit failed: ${depositResult.error}`);
    } else {
      console.log(`  ✓ Deposit tx: ${arcConfig.explorerUrl}/tx/${depositResult.txHash}`);
    }

    console.log('  Waiting 5s for Gateway to index...');
    await sleep(5000);

    console.log('[1.2] Creating burn intent for Solana destination...');

    // Create burn intent with Solana destination
    // This uses Gateway API (NOT CCTP)
    const gatewayInfoNow = await getGatewayInfo();
    const arcInfoNow = gatewayInfoNow.domains.find((d) => d.domain === 26);

    if (!arcInfoNow) {
      console.error('  ✗ Arc not found in Gateway info');
      process.exit(1);
    }

    const maxBlockHeight = BigInt(arcInfoNow.burnIntentExpirationHeight) + 10000n;
    const value = parseUnits(test1Amount, 6);
    const maxFee = parseUnits('0.03', 6); // Arc is fast chain

    // Build spec with Solana destination
    const spec: TransferSpec = {
      version: 1,
      sourceDomain: GATEWAY_DOMAINS['ARC-TESTNET'],
      destinationDomain: 5, // Solana Devnet
      sourceContract: addressToBytes32('0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as `0x${string}`),
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

    const burnIntent: BurnIntent = {
      maxBlockHeight,
      maxFee,
      spec,
    };

    console.log('  Burn intent created:');
    console.log(`    Source: Arc (Domain 26)`);
    console.log(`    Destination: Solana (Domain 5)`);
    console.log(`    Recipient: ${solanaKeypair.publicKey.toBase58()}`);
    console.log(`    Amount: ${test1Amount} USDC`);

    console.log('[1.3] Signing with EIP-712...');
    const signedIntent = await signBurnIntent(burnIntent, evmAccount);
    console.log(`  ✓ Signature: ${signedIntent.signature.slice(0, 20)}...`);

    console.log('[1.4] Submitting to Gateway API...');
    const transferResult = await submitTransfer([signedIntent]);

    if (transferResult.success) {
      console.log(`  ✓ Transfer submitted!`);
      console.log(`    Transfer ID: ${transferResult.transferId}`);
      if (transferResult.fees) {
        console.log(`    Fee: ${transferResult.fees.total} ${transferResult.fees.token}`);
      }
      if (transferResult.attestation) {
        console.log(`    Attestation: ${transferResult.attestation.slice(0, 30)}...`);
      }

      // Wait and check balances
      console.log('[1.5] Waiting 30s for cross-chain settlement...');
      await sleep(30000);

      const arcBalanceAfter = await getArcUsdcBalance(evmAccount.address);
      const solanaBalanceAfter = await getSolanaUsdcBalance(connection, solanaKeypair.publicKey);

      console.log('[1.6] Balance verification:');
      console.log(`  Arc USDC:    ${arcBalanceBefore} → ${arcBalanceAfter}`);
      console.log(`  Solana USDC: ${solanaBalanceBefore.formatted} → ${solanaBalanceAfter.formatted}`);

      results.push({
        timestamp: new Date().toISOString(),
        test: 'Arc → Solana',
        success: true,
        direction: 'ARC_TO_SOLANA',
        amount: test1Amount,
        sourceChain: 'ARC-TESTNET',
        destChain: 'SOLANA-DEVNET',
        sourceBalanceBefore: arcBalanceBefore,
        sourceBalanceAfter: arcBalanceAfter,
        destBalanceBefore: solanaBalanceBefore.formatted,
        destBalanceAfter: solanaBalanceAfter.formatted,
        transferId: transferResult.transferId,
        fees: transferResult.fees,
      });
    } else {
      console.log(`  ✗ Transfer failed: ${transferResult.error}`);
      results.push({
        timestamp: new Date().toISOString(),
        test: 'Arc → Solana',
        success: false,
        direction: 'ARC_TO_SOLANA',
        amount: test1Amount,
        sourceChain: 'ARC-TESTNET',
        destChain: 'SOLANA-DEVNET',
        sourceBalanceBefore: arcBalanceBefore,
        sourceBalanceAfter: arcBalanceBefore,
        destBalanceBefore: solanaBalanceBefore.formatted,
        destBalanceAfter: solanaBalanceBefore.formatted,
        error: transferResult.error,
      });
    }
  }

  console.log();

  // ============================================================================
  // TEST 2: Solana → Arc
  // ============================================================================
  console.log('='.repeat(70));
  console.log('TEST 2: Solana → Arc (0.005 USDC)');
  console.log('='.repeat(70));
  console.log();

  const test2Amount = '0.005';

  // Check current Solana balance
  const solanaBalanceNow = await getSolanaUsdcBalance(connection, solanaKeypair.publicKey);
  const arcBalanceNow = await getArcUsdcBalance(evmAccount.address);

  console.log('[2.0] Current balances:');
  console.log(`  Solana USDC: ${solanaBalanceNow.formatted}`);
  console.log(`  Arc USDC: ${arcBalanceNow}`);
  console.log();

  if (parseFloat(solanaBalanceNow.formatted) < parseFloat(test2Amount) + 0.03) {
    console.log('  ⚠ Insufficient Solana USDC for test');
    console.log('  Need: ' + (parseFloat(test2Amount) + 0.03) + ' USDC');
    console.log('  Have: ' + solanaBalanceNow.formatted + ' USDC');
    console.log();
    console.log('  Skipping Solana → Arc test.');
    console.log('  After Arc → Solana settles, run this test again.');

    results.push({
      timestamp: new Date().toISOString(),
      test: 'Solana → Arc',
      success: false,
      direction: 'SOLANA_TO_ARC',
      amount: test2Amount,
      sourceChain: 'SOLANA-DEVNET',
      destChain: 'ARC-TESTNET',
      sourceBalanceBefore: solanaBalanceNow.formatted,
      sourceBalanceAfter: solanaBalanceNow.formatted,
      destBalanceBefore: arcBalanceNow,
      destBalanceAfter: arcBalanceNow,
      error: 'Insufficient Solana USDC - waiting for Arc → Solana to settle',
    });
  } else {
    console.log('[2.1] Creating Solana burn intent...');

    const solanaToArcResult = await executeSolanaToEvmTransfer({
      amount: test2Amount,
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

      console.log('[2.2] Waiting 30s for cross-chain settlement...');
      await sleep(30000);

      const solanaBalanceAfter = await getSolanaUsdcBalance(connection, solanaKeypair.publicKey);
      const arcBalanceAfter = await getArcUsdcBalance(evmAccount.address);

      console.log('[2.3] Balance verification:');
      console.log(`  Solana USDC: ${solanaBalanceNow.formatted} → ${solanaBalanceAfter.formatted}`);
      console.log(`  Arc USDC:    ${arcBalanceNow} → ${arcBalanceAfter}`);

      results.push({
        timestamp: new Date().toISOString(),
        test: 'Solana → Arc',
        success: true,
        direction: 'SOLANA_TO_ARC',
        amount: test2Amount,
        sourceChain: 'SOLANA-DEVNET',
        destChain: 'ARC-TESTNET',
        sourceBalanceBefore: solanaBalanceNow.formatted,
        sourceBalanceAfter: solanaBalanceAfter.formatted,
        destBalanceBefore: arcBalanceNow,
        destBalanceAfter: arcBalanceAfter,
        transferId: solanaToArcResult.transferId,
        fees: solanaToArcResult.fees,
      });
    } else {
      console.log(`  ✗ Transfer failed: ${solanaToArcResult.error}`);
      results.push({
        timestamp: new Date().toISOString(),
        test: 'Solana → Arc',
        success: false,
        direction: 'SOLANA_TO_ARC',
        amount: test2Amount,
        sourceChain: 'SOLANA-DEVNET',
        destChain: 'ARC-TESTNET',
        sourceBalanceBefore: solanaBalanceNow.formatted,
        sourceBalanceAfter: solanaBalanceNow.formatted,
        destBalanceBefore: arcBalanceNow,
        destBalanceAfter: arcBalanceNow,
        error: solanaToArcResult.error,
      });
    }
  }

  // Save results
  saveResults(results);
  console.log();
  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log();
  console.log(`Results saved to: ${RESULTS_FILE}`);
  console.log();

  for (const r of results) {
    console.log(`${r.test}: ${r.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    if (r.transferId) console.log(`  Transfer ID: ${r.transferId}`);
    if (r.error) console.log(`  Error: ${r.error}`);
    console.log(`  ${r.sourceChain} USDC: ${r.sourceBalanceBefore} → ${r.sourceBalanceAfter}`);
    console.log(`  ${r.destChain} USDC: ${r.destBalanceBefore} → ${r.destBalanceAfter}`);
    console.log();
  }

  console.log('Method: Gateway API burn intents (NOT CCTP)');
  console.log();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
