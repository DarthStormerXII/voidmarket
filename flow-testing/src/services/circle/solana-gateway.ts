/**
 * Solana Gateway API Transfer Service
 *
 * Provides cross-chain USDC transfers between Solana Devnet and other chains via Gateway API.
 * Uses Ed25519 signing with magic prefix (different from EVM's EIP-712).
 *
 * Key Differences from EVM:
 * - Ed25519 signing (not ECDSA/EIP-712)
 * - Magic prefix: 0xff + 15 zero bytes
 * - Binary encoding of burn intent (not JSON)
 * - Base58 addresses converted to bytes32
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import * as nacl from 'tweetnacl';
import {
  GATEWAY_DOMAINS,
  TransferSpec,
  BurnIntent,
  TransferResult,
  getGatewayInfo,
  submitTransfer,
  generateSalt,
} from './gateway-transfer.js';

// Solana Devnet Configuration
export const SOLANA_CONFIG = {
  rpc: 'https://api.devnet.solana.com',
  domain: 5,
  displayName: 'Solana Devnet',
  decimals: 6,
  explorerUrl: 'https://explorer.solana.com',
} as const;

// Solana Gateway Contract Addresses (Devnet)
export const SOLANA_GATEWAY_CONTRACTS = {
  // Gateway Wallet - where to deposit USDC
  WALLET: 'GATEwdfmYNELfp5wDmmR6noSr2vHnAfBPMm2PvCzX5vu',
  // Gateway Minter - for receiving from other chains
  MINTER: 'GATEmKK2ECL1brEngQZWCgMWPbvrEYqsV6u29dAaHavr',
  // USDC Mint on Devnet
  USDC_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  // Solana Zero Address (system program)
  ZERO_ADDRESS: '11111111111111111111111111111111',
} as const;

// EVM Gateway contracts (for cross-chain reference)
const EVM_GATEWAY_CONTRACTS = {
  WALLET: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
  MINTER: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
} as const;

/**
 * Convert Solana public key (Base58) to bytes32 hex format
 */
export function solanaAddressToBytes32(pubkey: PublicKey | string): `0x${string}` {
  const pk = typeof pubkey === 'string' ? new PublicKey(pubkey) : pubkey;
  const bytes = pk.toBytes();
  return `0x${Buffer.from(bytes).toString('hex')}` as `0x${string}`;
}

/**
 * Convert bytes32 hex to Solana public key
 */
export function bytes32ToSolanaAddress(bytes32: `0x${string}`): PublicKey {
  const hex = bytes32.slice(2); // Remove 0x prefix
  const bytes = Buffer.from(hex, 'hex');
  return new PublicKey(bytes);
}

/**
 * Pad EVM address to bytes32 format
 */
export function evmAddressToBytes32(address: string): `0x${string}` {
  const clean = address.toLowerCase().replace('0x', '');
  return `0x${'0'.repeat(24)}${clean}` as `0x${string}`;
}

/**
 * Magic prefix for Solana burn intent signing
 * 0xff followed by 15 zero bytes (16 bytes total)
 */
const MAGIC_PREFIX = Buffer.from([
  0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

/**
 * Encode burn intent as binary buffer for Solana signing
 * Layout matches Circle Gateway specification
 */
export function encodeBurnIntent(burnIntent: BurnIntent): Buffer {
  const spec = burnIntent.spec;

  // Create buffer for encoding
  // Total size: 8 + 8 + (4 + 4 + 4 + 32*10 + 32 + 32 + variable hookData)
  const fixedSize = 8 + 8 + 4 + 4 + 4 + 32 * 10 + 32 + 32;
  const hookDataLen = spec.hookData === '0x' ? 0 : (spec.hookData.length - 2) / 2;
  const totalSize = fixedSize + 4 + hookDataLen; // 4 bytes for hookData length

  const buffer = Buffer.alloc(totalSize);
  let offset = 0;

  // maxBlockHeight: uint64 (little-endian)
  buffer.writeBigUInt64LE(burnIntent.maxBlockHeight, offset);
  offset += 8;

  // maxFee: uint64 (little-endian)
  buffer.writeBigUInt64LE(burnIntent.maxFee, offset);
  offset += 8;

  // spec.version: uint32 (little-endian)
  buffer.writeUInt32LE(spec.version, offset);
  offset += 4;

  // spec.sourceDomain: uint32 (little-endian)
  buffer.writeUInt32LE(spec.sourceDomain, offset);
  offset += 4;

  // spec.destinationDomain: uint32 (little-endian)
  buffer.writeUInt32LE(spec.destinationDomain, offset);
  offset += 4;

  // bytes32 fields (32 bytes each)
  const bytes32Fields = [
    spec.sourceContract,
    spec.destinationContract,
    spec.sourceToken,
    spec.destinationToken,
    spec.sourceDepositor,
    spec.destinationRecipient,
    spec.sourceSigner,
    spec.destinationCaller,
  ];

  for (const field of bytes32Fields) {
    const bytes = Buffer.from(field.slice(2), 'hex');
    bytes.copy(buffer, offset);
    offset += 32;
  }

  // value: uint256 (32 bytes, little-endian)
  const valueBytes = Buffer.alloc(32);
  let val = spec.value;
  for (let i = 0; i < 32 && val > 0n; i++) {
    valueBytes[i] = Number(val & 0xffn);
    val >>= 8n;
  }
  valueBytes.copy(buffer, offset);
  offset += 32;

  // salt: bytes32
  const saltBytes = Buffer.from(spec.salt.slice(2), 'hex');
  saltBytes.copy(buffer, offset);
  offset += 32;

  // hookData length: uint32 (little-endian)
  buffer.writeUInt32LE(hookDataLen, offset);
  offset += 4;

  // hookData bytes
  if (hookDataLen > 0) {
    const hookDataBytes = Buffer.from(spec.hookData.slice(2), 'hex');
    hookDataBytes.copy(buffer, offset);
  }

  return buffer;
}

/**
 * Sign burn intent using Ed25519 with magic prefix
 */
export function signBurnIntentSolana(
  burnIntent: BurnIntent,
  keypair: Keypair
): `0x${string}` {
  // Encode burn intent to binary
  const encoded = encodeBurnIntent(burnIntent);

  // Prepend magic prefix
  const prefixed = Buffer.concat([MAGIC_PREFIX, encoded]);

  // Sign with Ed25519 using tweetnacl
  const signature = nacl.sign.detached(prefixed, keypair.secretKey);

  return `0x${Buffer.from(signature).toString('hex')}` as `0x${string}`;
}

/**
 * Create burn intent for Solana source chain
 */
export async function createSolanaBurnIntent(params: {
  amount: string;
  toChain: 'ARC-TESTNET' | 'ETH-SEPOLIA' | 'BASE-SEPOLIA' | 'AVALANCHE-FUJI' | 'SONIC-TESTNET' | 'WORLD-CHAIN-SEPOLIA' | 'SEI-ATLANTIC' | 'HYPEREVM-TESTNET';
  depositor: PublicKey;
  recipient: `0x${string}`; // EVM recipient address
  maxFee?: string; // In USDC, defaults to 0.03
}): Promise<BurnIntent> {
  const { amount, toChain, depositor, recipient, maxFee = '0.03' } = params;

  // Get destination USDC address based on chain
  const destUsdcAddresses: Record<string, `0x${string}`> = {
    'ARC-TESTNET': '0x3600000000000000000000000000000000000000',
    'ETH-SEPOLIA': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    'BASE-SEPOLIA': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    'AVALANCHE-FUJI': '0x5425890298aed601595a70AB815c96711a31Bc65',
    'SONIC-TESTNET': '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51',
    'WORLD-CHAIN-SEPOLIA': '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    'SEI-ATLANTIC': '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    'HYPEREVM-TESTNET': '0x2B3370eE501B4a559b57D449569354196457D8Ab',
  };

  // Get Gateway info for max block height
  const gatewayInfo = await getGatewayInfo();
  const sourceInfo = gatewayInfo.domains.find((d) => d.domain === SOLANA_CONFIG.domain);

  if (!sourceInfo) {
    throw new Error('Solana Devnet not found in Gateway info');
  }

  // Max block height with buffer (Solana slots are much higher)
  const maxBlockHeight = BigInt(sourceInfo.burnIntentExpirationHeight) + 10000n;

  // Parse amount to smallest unit (6 decimals)
  const value = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
  const maxFeeValue = BigInt(Math.floor(parseFloat(maxFee) * 1_000_000));

  const spec: TransferSpec = {
    version: 1,
    sourceDomain: SOLANA_CONFIG.domain,
    destinationDomain: GATEWAY_DOMAINS[toChain],
    sourceContract: solanaAddressToBytes32(SOLANA_GATEWAY_CONTRACTS.WALLET),
    destinationContract: evmAddressToBytes32(EVM_GATEWAY_CONTRACTS.MINTER),
    sourceToken: solanaAddressToBytes32(SOLANA_GATEWAY_CONTRACTS.USDC_MINT),
    destinationToken: evmAddressToBytes32(destUsdcAddresses[toChain]),
    sourceDepositor: solanaAddressToBytes32(depositor),
    destinationRecipient: recipient.length === 42 ? evmAddressToBytes32(recipient) : recipient,
    sourceSigner: solanaAddressToBytes32(depositor),
    destinationCaller: evmAddressToBytes32('0x0000000000000000000000000000000000000000'),
    value,
    salt: generateSalt(),
    hookData: '0x' as `0x${string}`,
  };

  return {
    maxBlockHeight,
    maxFee: maxFeeValue,
    spec,
  };
}

/**
 * Create burn intent for EVM source to Solana destination
 */
export function createEvmToSolanaBurnIntent(params: {
  amount: string;
  fromChain: 'ARC-TESTNET' | 'ETH-SEPOLIA' | 'BASE-SEPOLIA' | 'AVALANCHE-FUJI' | 'SONIC-TESTNET' | 'WORLD-CHAIN-SEPOLIA' | 'SEI-ATLANTIC' | 'HYPEREVM-TESTNET';
  depositor: `0x${string}`; // EVM depositor
  recipient: PublicKey; // Solana recipient
}): { destinationRecipient: `0x${string}`; destinationToken: `0x${string}` } {
  const { recipient } = params;
  // Return the bytes32-encoded Solana addresses for use in EVM burn intent
  return {
    destinationRecipient: solanaAddressToBytes32(recipient),
    destinationToken: solanaAddressToBytes32(SOLANA_GATEWAY_CONTRACTS.USDC_MINT),
  };
}

/**
 * Get USDC balance on Solana
 */
export async function getSolanaUsdcBalance(
  connection: Connection,
  owner: PublicKey
): Promise<{ balance: bigint; formatted: string }> {
  try {
    const usdcMint = new PublicKey(SOLANA_GATEWAY_CONTRACTS.USDC_MINT);
    const ata = await getAssociatedTokenAddress(usdcMint, owner);
    const account = await getAccount(connection, ata);
    const balance = account.amount;
    const formatted = (Number(balance) / 1_000_000).toFixed(6);
    return { balance, formatted };
  } catch (error) {
    // Account doesn't exist or has no balance
    return { balance: 0n, formatted: '0.000000' };
  }
}

/**
 * Get SOL balance
 */
export async function getSolBalance(
  connection: Connection,
  pubkey: PublicKey
): Promise<{ balance: number; formatted: string }> {
  const balance = await connection.getBalance(pubkey);
  const formatted = (balance / LAMPORTS_PER_SOL).toFixed(9);
  return { balance, formatted };
}

/**
 * Transfer USDC to Gateway Wallet on Solana
 */
export async function depositToSolanaGateway(
  connection: Connection,
  keypair: Keypair,
  amount: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const usdcMint = new PublicKey(SOLANA_GATEWAY_CONTRACTS.USDC_MINT);
    const gatewayWallet = new PublicKey(SOLANA_GATEWAY_CONTRACTS.WALLET);

    // Get sender's ATA
    const senderAta = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);

    // Get gateway's ATA
    const gatewayAta = await getAssociatedTokenAddress(usdcMint, gatewayWallet);

    // Parse amount
    const amountInSmallest = BigInt(Math.floor(parseFloat(amount) * 1_000_000));

    // Create transfer instruction
    const transferIx = createTransferInstruction(
      senderAta,
      gatewayAta,
      keypair.publicKey,
      amountInSmallest
    );

    // Create and send transaction
    const transaction = new Transaction().add(transferIx);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    // Sign and send
    transaction.sign(keypair);
    const signature = await connection.sendRawTransaction(transaction.serialize());

    // Confirm
    await connection.confirmTransaction(signature);

    return { success: true, signature };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute Solana → EVM transfer via Gateway
 */
export async function executeSolanaToEvmTransfer(params: {
  amount: string;
  toChain: 'ARC-TESTNET' | 'ETH-SEPOLIA' | 'BASE-SEPOLIA' | 'AVALANCHE-FUJI' | 'SONIC-TESTNET' | 'WORLD-CHAIN-SEPOLIA' | 'SEI-ATLANTIC' | 'HYPEREVM-TESTNET';
  keypair: Keypair;
  recipient: `0x${string}`;
  maxFee?: string;
}): Promise<TransferResult> {
  const { amount, toChain, keypair, recipient, maxFee } = params;

  try {
    // Create burn intent
    const burnIntent = await createSolanaBurnIntent({
      amount,
      toChain,
      depositor: keypair.publicKey,
      recipient,
      maxFee,
    });

    // Sign with Ed25519
    const signature = signBurnIntentSolana(burnIntent, keypair);

    // Submit to Gateway API
    return await submitTransfer([
      {
        burnIntent,
        signature,
      },
    ]);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load Keypair from environment variable
 */
export function loadKeypairFromEnv(envVar: string = 'SOLANA_PRIVATE_KEY'): Keypair {
  const privateKey = process.env[envVar];
  if (!privateKey) {
    throw new Error(`${envVar} environment variable not set`);
  }

  // Try to parse as base58 first
  try {
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
  } catch {
    // Try as JSON array
    try {
      const bytes = JSON.parse(privateKey);
      return Keypair.fromSecretKey(Uint8Array.from(bytes));
    } catch {
      throw new Error('Invalid private key format. Use base58 or JSON array.');
    }
  }
}

/**
 * Create a new random keypair and return the base58 secret key
 */
export function createNewKeypair(): { publicKey: string; secretKey: string } {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

/**
 * Get Solana explorer URL for a transaction
 */
export function getSolanaExplorerUrl(signature: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return `${SOLANA_CONFIG.explorerUrl}/tx/${signature}?cluster=${cluster}`;
}

/**
 * Connect to Solana Devnet
 */
export function createSolanaConnection(): Connection {
  return new Connection(SOLANA_CONFIG.rpc, 'confirmed');
}
