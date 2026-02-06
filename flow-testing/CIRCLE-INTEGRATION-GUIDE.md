# Circle Integration Guide for VoidMarket

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Mini App                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Modular Wallets SDK)                             │
│  - User authentication (social login)                        │
│  - Wallet creation                                           │
│  - Transaction signing                                       │
│  - Shows in Circle Console ✓                                │
├─────────────────────────────────────────────────────────────┤
│  Gateway API (Permissionless)                               │
│  - Cross-chain USDC transfers                               │
│  - Unified balance queries                                  │
│  - No auth required                                         │
│  - On-chain activity only                                   │
└─────────────────────────────────────────────────────────────┘
```

## Current Status

### ✅ Gateway API - Working

| Feature | Status | Notes |
|---------|--------|-------|
| Info endpoint | ✅ | 9 chains supported |
| Balance queries | ✅ | Returns unified balance |
| Transfer submission | ✅ | Burn intents work |
| EVM ↔ EVM transfers | ✅ | All 8 EVM chains verified |
| Solana transfers | ⚠️ | Mint has PDA issues |

**Your current Gateway balances:**
- Ethereum Sepolia: 0.05 USDC
- Avalanche Fuji: 0.075 USDC
- Base Sepolia: 0.05 USDC
- Arc Testnet: 0.286 USDC

### ⚠️ Modular Wallets - Needs Configuration

```env
# Required in .env
CIRCLE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl  ✅ Set
CIRCLE_CLIENT_KEY=<your-client-key>  ❌ EMPTY - Need to set this!
```

Get your CLIENT_KEY from: https://console.circle.com/

## What Shows in Circle Console

| Action | Shows in Console |
|--------|------------------|
| Modular Wallet creation | ✅ Yes |
| Modular Wallet transactions | ✅ Yes |
| Gateway API calls | ❌ No (permissionless) |
| On-chain transfers | ❌ No (blockchain only) |

**Key insight**: Gateway transfers won't show in Console because they're permissionless on-chain operations. But if users use **Modular Wallets** to sign transactions, those wallet activities WILL show in Console.

## Integration for Telegram Mini App

### Step 1: Frontend Setup (Modular Wallets)

```typescript
// Install SDK
npm install @anthropics/web3-wallets-sdk  // Or Circle's modular SDK

// Initialize with your credentials
const walletClient = createModularWalletClient({
  clientUrl: process.env.CIRCLE_CLIENT_URL,
  clientKey: process.env.CIRCLE_CLIENT_KEY,
});

// Create wallet for Telegram user
const wallet = await walletClient.createWallet({
  userId: telegramUser.id,
  chains: ['ARC-TESTNET', 'ETH-SEPOLIA', 'BASE-SEPOLIA'],
});
```

### Step 2: Deposit Flow (User → Gateway)

```typescript
import { depositToGateway } from './services/circle/gateway-transfer';

// User deposits USDC from any chain to Gateway
const deposit = await depositToGateway({
  amount: '10',
  chain: 'AVALANCHE-FUJI',  // Fast chain, low fees
  walletClient,             // From Modular Wallet
  address: userWallet.address,
});
```

### Step 3: Cross-Chain Transfer (Gateway API)

```typescript
import { executeGatewayTransfer } from './services/circle/gateway-transfer';

// Transfer from Avalanche → Arc (unified balance)
const transfer = await executeGatewayTransfer({
  amount: '10',
  fromChain: 'AVALANCHE-FUJI',
  toChain: 'ARC-TESTNET',
  account: userWallet,  // Signs with Modular Wallet
});
```

### Step 4: Check Unified Balance

```typescript
import { getUnifiedGatewayBalance } from './services/circle/modular-gateway';

const { total, balances } = await getUnifiedGatewayBalance(userWallet.address);
console.log('Unified USDC:', total);  // Sum across all chains
```

## Supported Chains

| Chain | Domain | Transfer Fee | Time |
|-------|--------|--------------|------|
| Arc Testnet | 26 | ~0.03 USDC | < 1 min |
| Avalanche Fuji | 1 | ~0.03 USDC | < 1 min |
| Sonic Testnet | 13 | ~0.03 USDC | < 1 min |
| Sei Atlantic | 16 | ~0.03 USDC | < 1 min |
| HyperEVM Testnet | 19 | ~0.03 USDC | < 1 min |
| Ethereum Sepolia | 0 | ~2.5 USDC | 13-19 min |
| Base Sepolia | 6 | ~2.5 USDC | 13-19 min |
| World Chain Sepolia | 14 | ~2.5 USDC | 13-19 min |

**Recommendation**: Use fast chains (Arc, Avalanche, Sonic, Sei, HyperEVM) for deposits to minimize fees and wait time.

## Files Reference

| File | Purpose |
|------|---------|
| `services/circle/client.ts` | Circle SDK initialization |
| `services/circle/gateway-transfer.ts` | Gateway API transfers (EIP-712) |
| `services/circle/modular-gateway.ts` | Modular + Gateway integration |
| `services/circle/solana-gateway.ts` | Solana Gateway (Ed25519) |

## Next Steps

1. **Set CIRCLE_CLIENT_KEY** in your .env file
2. **Test Modular Wallet creation** via Circle Console
3. **Integrate with Telegram auth** for user identification
4. **Build deposit UI** showing supported chains + fees
5. **Build unified balance display** on Arc

## Questions?

- Gateway API docs: https://developers.circle.com/gateway
- Modular Wallets docs: https://developers.circle.com/wallets/modular
- USDC addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses
