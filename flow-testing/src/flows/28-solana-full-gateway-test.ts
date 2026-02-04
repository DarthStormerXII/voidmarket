/**
 * Complete Solana Gateway Test
 *
 * Tests both directions:
 * 1. Arc → Solana (with mint on Solana)
 * 2. Solana → Arc (with mint on Arc)
 *
 * Uses Gateway API burn intents (NOT CCTP)
 */

import 'dotenv/config';
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, formatUnits, parseUnits, erc20Abi } from 'viem';

import {
  createSolanaConnection,
  loadKeypairFromEnv,
  getSolanaUsdcBalance,
  solanaAddressToBytes32,
  executeSolanaToEvmTransfer,
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
  mintOnDestination,
  CHAIN_CONFIG,
  GATEWAY_DOMAINS,
  GATEWAY_CONTRACTS,
  type TransferSpec,
  type BurnIntent,
} from '../services/circle/gateway-transfer.js';

async function main() {
  console.log('='.repeat(70));
  console.log('Solana ↔ Arc Complete Gateway Test');
  console.log('Using Gateway API burn intents (NOT CCTP)');
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
  const solBalance = await solanaConnection.getBalance(solanaKeypair.publicKey);
  console.log('Solana SOL:', (solBalance / LAMPORTS_PER_SOL).toFixed(4));

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

  // ========================================================================
  // TEST 1: Arc → Solana
  // ========================================================================
  console.log('='.repeat(70));
  console.log('TEST 1: Arc → Solana (0.01 USDC)');
  console.log('='.repeat(70));
  console.log('');

  const test1Amount = '0.01';

  // Step 1: Deposit to Arc Gateway
  console.log('[1.1] Depositing to Arc Gateway...');
  const depositResult = await depositToGateway({
    amount: test1Amount,
    chain: 'ARC-TESTNET',
    walletClient: arcWalletClient as any,
    address: evmAccount.address,
  });

  if (!depositResult.success) {
    console.error('Deposit failed:', depositResult.error);
    process.exit(1);
  }
  console.log('Deposit tx:', depositResult.txHash);

  console.log('Waiting 5s for indexing...');
  await new Promise(r => setTimeout(r, 5000));

  // Step 2: Create burn intent for Solana destination
  console.log('[1.2] Creating burn intent...');
  const gatewayInfo = await getGatewayInfo();
  const arcInfo = gatewayInfo.domains.find(d => d.domain === 26);
  if (!arcInfo) throw new Error('Arc not in gateway');

  const maxBlockHeight = BigInt(arcInfo.burnIntentExpirationHeight) + 10000n;
  const value = parseUnits(test1Amount, 6);
  const maxFee = parseUnits('0.03', 6);

  const spec1: TransferSpec = {
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

  const burnIntent1: BurnIntent = { maxBlockHeight, maxFee, spec: spec1 };

  // Step 3: Sign and submit
  console.log('[1.3] Signing with EIP-712...');
  const signed1 = await signBurnIntent(burnIntent1, evmAccount);

  console.log('[1.4] Submitting to Gateway API...');
  const result1 = await submitTransfer([signed1]);

  if (!result1.success) {
    console.error('Transfer failed:', result1.error);
  } else {
    console.log('✓ Transfer submitted!');
    console.log('  Transfer ID:', result1.transferId);
    console.log('  Fee:', result1.fees?.total, result1.fees?.token);
    console.log('  Attestation:', result1.attestation?.slice(0, 50) + '...');

    // For Solana destination, we may need to create ATA and call mint
    // The Gateway should handle this automatically with relayers
    console.log('');
    console.log('[1.5] Note: Solana mint is handled by Gateway relayers');
    console.log('  Waiting 30s for settlement...');
    await new Promise(r => setTimeout(r, 30000));
  }

  // Check Solana balance
  const solanaUsdcAfter1 = await getSolanaUsdcBalance(solanaConnection, solanaKeypair.publicKey);
  console.log('');
  console.log('Solana USDC after:', solanaUsdcAfter1.formatted);
  console.log('Change:', (parseFloat(solanaUsdcAfter1.formatted) - parseFloat(solanaUsdc.formatted)).toFixed(6));

  // ========================================================================
  // TEST 2: Solana → Arc (if we have USDC on Solana)
  // ========================================================================
  console.log('');
  console.log('='.repeat(70));
  console.log('TEST 2: Solana → Arc (0.005 USDC)');
  console.log('='.repeat(70));
  console.log('');

  const test2Amount = '0.005';
  const solanaUsdcNow = await getSolanaUsdcBalance(solanaConnection, solanaKeypair.publicKey);

  if (parseFloat(solanaUsdcNow.formatted) < parseFloat(test2Amount) + 0.03) {
    console.log('Insufficient Solana USDC for test');
    console.log('Have:', solanaUsdcNow.formatted);
    console.log('Need:', (parseFloat(test2Amount) + 0.03).toFixed(6));
    console.log('');
    console.log('Skipping Solana → Arc test.');
  } else {
    console.log('Solana USDC balance:', solanaUsdcNow.formatted);

    // First deposit to Solana Gateway Wallet
    console.log('[2.1] Note: For Solana → EVM, user deposits to Solana Gateway Wallet');
    console.log('  This requires a Solana token transfer transaction');

    // Execute transfer
    console.log('[2.2] Executing Solana → Arc transfer...');
    const result2 = await executeSolanaToEvmTransfer({
      amount: test2Amount,
      toChain: 'ARC-TESTNET',
      keypair: solanaKeypair,
      recipient: evmAccount.address,
      maxFee: '0.03',
    });

    if (result2.success) {
      console.log('✓ Transfer submitted!');
      console.log('  Transfer ID:', result2.transferId);
      console.log('  Fee:', result2.fees?.total, result2.fees?.token);

      // Mint on Arc
      if (result2.attestation && result2.operatorSignature) {
        console.log('[2.3] Minting on Arc...');
        const mintResult = await mintOnDestination({
          attestation: result2.attestation,
          operatorSignature: result2.operatorSignature,
          destinationChain: 'ARC-TESTNET',
          walletClient: arcWalletClient as any,
        });

        if (mintResult.success) {
          console.log('✓ Mint tx:', mintResult.txHash);
        } else {
          console.log('✗ Mint failed:', mintResult.error);
        }
      }

      // Check final balances
      await new Promise(r => setTimeout(r, 5000));
      const arcUsdcAfter = await arcPublicClient.readContract({
        address: arcConfig.usdc,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [evmAccount.address],
      });
      console.log('');
      console.log('Arc USDC after:', formatUnits(arcUsdcAfter, 6));
    } else {
      console.log('✗ Transfer failed:', result2.error);
    }
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('');
  console.log('='.repeat(70));
  console.log('FINAL BALANCES');
  console.log('='.repeat(70));

  const finalSolanaUsdc = await getSolanaUsdcBalance(solanaConnection, solanaKeypair.publicKey);
  const finalArcUsdc = await arcPublicClient.readContract({
    address: arcConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [evmAccount.address],
  });

  console.log('Solana USDC:', solanaUsdc.formatted, '→', finalSolanaUsdc.formatted);
  console.log('Arc USDC:', formatUnits(arcUsdcBefore, 6), '→', formatUnits(finalArcUsdc, 6));
  console.log('');
}

main().catch(console.error);
