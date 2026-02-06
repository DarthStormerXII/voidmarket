# VoidMarket Telegram Mini App Integration Plan

## Overview

This plan integrates Circle Developer-Controlled Wallets and Gateway API into the existing VoidMarket Telegram Mini App frontend.

**Architecture:** Next.js API routes serve as the backend (no external backend needed).

---

## Current State

### What's Already Built
- Full Telegram Mini App UI with 13 pages
- Market listing, betting drawer, wallet display
- Cluster/Nova system UI
- Onboarding flow with star selection
- Haptic feedback integration
- All components use mock data

### What Needs Integration
1. Circle Developer-Controlled Wallets (wallet management)
2. Gateway API (cross-chain USDC deposits)
3. Smart contract interaction (betting)
4. Replace mock data with real API calls

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Telegram Mini App (Frontend)                      │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Markets   │  │   Wallet    │  │   MyBets    │  │   Clusters  │   │
│  │   Page      │  │   Page      │  │   Page      │  │   Page      │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │           │
│         └────────────────┴────────────────┴────────────────┘           │
│                                   │                                     │
│                           ┌───────┴───────┐                            │
│                           │  API Client   │                            │
│                           │  (fetch/SWR)  │                            │
│                           └───────┬───────┘                            │
├───────────────────────────────────┼─────────────────────────────────────┤
│                        Next.js API Routes                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        /api/wallet                               │   │
│  │  POST /create     → Create wallet for Telegram user              │   │
│  │  GET  /balance    → Get unified USDC balance (all chains)        │   │
│  │  GET  /address    → Get user's wallet address                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        /api/gateway                              │   │
│  │  GET  /balance    → Get Gateway cross-chain balances             │   │
│  │  POST /deposit    → Initiate cross-chain deposit to Arc          │   │
│  │  GET  /status/:id → Check transfer status                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        /api/bet                                  │   │
│  │  POST /place      → Place bet on market (Circle SDK tx)          │   │
│  │  POST /claim      → Claim winnings                               │   │
│  │  GET  /history    → Get user's bet history                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        /api/market                               │   │
│  │  GET  /list       → List all markets                             │   │
│  │  GET  /:id        → Get market details                           │   │
│  │  POST /create     → Create new market                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                        External Services                                │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ Circle SDK      │  │ Gateway API     │  │ Arc Testnet RPC     │    │
│  │ (Dev Wallets)   │  │ (Cross-chain)   │  │ (Smart Contracts)   │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Environment Setup

### 1.1 Install Dependencies

```bash
cd frontend
npm install @circle-fin/developer-controlled-wallets viem
```

### 1.2 Environment Variables

Create/update `.env.local`:

```env
# Circle Developer-Controlled Wallets (Server-side only)
CIRCLE_API_KEY=TEST_API_KEY:xxx...
CIRCLE_ENTITY_SECRET=xxx...
CIRCLE_WALLET_SET_ID=xxx...

# Gateway API (for cross-chain balance display)
GATEWAY_API_URL=https://gateway-api-testnet.circle.com

# Arc Testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000

# Market Contract (deployed on Arc)
MARKET_CONTRACT_ADDRESS=0x...
```

---

## Phase 2: API Routes Implementation

### 2.1 Wallet API Routes

**File:** `src/app/api/wallet/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const circle = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

export async function POST(req: NextRequest) {
  const { telegramUserId } = await req.json();

  if (!telegramUserId) {
    return NextResponse.json({ error: 'Missing telegramUserId' }, { status: 400 });
  }

  const refId = `tg_${telegramUserId}`;

  // Check if wallet exists
  const existing = await circle.listWallets({ refId });
  if (existing.data?.wallets?.length) {
    const wallet = existing.data.wallets.find(w => w.blockchain === 'ARC-TESTNET');
    return NextResponse.json({
      address: wallet?.address,
      walletId: wallet?.id,
      isNew: false,
    });
  }

  // Create new wallet on Arc
  const result = await circle.createWallets({
    walletSetId: process.env.CIRCLE_WALLET_SET_ID!,
    blockchains: ['ARC-TESTNET'],
    count: 1,
    refId,
  });

  const newWallet = result.data?.wallets?.[0];
  return NextResponse.json({
    address: newWallet?.address,
    walletId: newWallet?.id,
    isNew: true,
  });
}
```

**File:** `src/app/api/wallet/balance/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';

const arcClient = createPublicClient({
  transport: http(process.env.ARC_RPC_URL),
});

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  // Get on-chain USDC balance
  const balance = await arcClient.readContract({
    address: process.env.ARC_USDC_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  return NextResponse.json({
    balance: formatUnits(balance, 6),
    chain: 'ARC-TESTNET',
  });
}
```

### 2.2 Gateway API Routes

**File:** `src/app/api/gateway/balance/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_API = process.env.GATEWAY_API_URL;

// Domain IDs for supported chains
const DOMAINS = {
  'ETH-SEPOLIA': 0,
  'AVAX-FUJI': 1,
  'BASE-SEPOLIA': 6,
  'ARB-SEPOLIA': 3,
  'MATIC-AMOY': 7,
  'ARC-TESTNET': 26,
};

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const response = await fetch(`${GATEWAY_API}/v1/balances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'USDC',
      sources: Object.values(DOMAINS).map(domain => ({
        depositor: address,
        domain,
      })),
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Gateway API error' }, { status: 500 });
  }

  const data = await response.json();

  // Transform to chain names
  const domainToChain = Object.fromEntries(
    Object.entries(DOMAINS).map(([k, v]) => [v, k])
  );

  const balances = (data.balances || []).map((b: any) => ({
    chain: domainToChain[b.domain] || `Domain ${b.domain}`,
    balance: b.balance || '0',
    domain: b.domain,
  }));

  const total = balances.reduce(
    (sum: number, b: any) => sum + parseFloat(b.balance || '0'),
    0
  );

  return NextResponse.json({ balances, total: total.toFixed(6) });
}
```

### 2.3 Betting API Routes

**File:** `src/app/api/bet/place/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { parseUnits } from 'viem';

const circle = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

export async function POST(req: NextRequest) {
  const { telegramUserId, marketId, outcome, amount } = await req.json();

  // Get user's wallet
  const refId = `tg_${telegramUserId}`;
  const wallets = await circle.listWallets({ refId });
  const wallet = wallets.data?.wallets?.find(w => w.blockchain === 'ARC-TESTNET');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  // First approve USDC spending
  const approvalTx = await circle.createContractExecutionTransaction({
    walletId: wallet.id,
    contractAddress: process.env.ARC_USDC_ADDRESS!,
    abiFunctionSignature: 'approve(address,uint256)',
    abiParameters: [
      process.env.MARKET_CONTRACT_ADDRESS!,
      parseUnits(amount.toString(), 6).toString(),
    ],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
  });

  // Wait for approval
  await waitForTransaction(approvalTx.data?.id!);

  // Place the bet
  const betTx = await circle.createContractExecutionTransaction({
    walletId: wallet.id,
    contractAddress: process.env.MARKET_CONTRACT_ADDRESS!,
    abiFunctionSignature: 'placeBet(uint256,bool,uint256)',
    abiParameters: [
      marketId.toString(),
      outcome === 'YES' ? 'true' : 'false',
      parseUnits(amount.toString(), 6).toString(),
    ],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
  });

  return NextResponse.json({
    transactionId: betTx.data?.id,
    status: 'PENDING',
  });
}

async function waitForTransaction(txId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await circle.getTransaction({ id: txId });
    const state = status.data?.transaction?.state;
    if (state === 'COMPLETE' || state === 'CONFIRMED') return;
    if (state === 'FAILED' || state === 'CANCELLED') {
      throw new Error(`Transaction failed: ${state}`);
    }
  }
  throw new Error('Transaction timeout');
}
```

---

## Phase 3: Frontend Integration

### 3.1 API Client

**File:** `src/lib/api.ts`

```typescript
const API_BASE = '/api';

export const walletApi = {
  async create(telegramUserId: string) {
    const res = await fetch(`${API_BASE}/wallet/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramUserId }),
    });
    return res.json();
  },

  async getBalance(address: string) {
    const res = await fetch(`${API_BASE}/wallet/balance?address=${address}`);
    return res.json();
  },
};

export const gatewayApi = {
  async getBalances(address: string) {
    const res = await fetch(`${API_BASE}/gateway/balance?address=${address}`);
    return res.json();
  },
};

export const betApi = {
  async placeBet(params: {
    telegramUserId: string;
    marketId: number;
    outcome: 'YES' | 'NO';
    amount: number;
  }) {
    const res = await fetch(`${API_BASE}/bet/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },
};
```

### 3.2 Wallet Context

**File:** `src/components/providers/wallet-provider.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTelegram } from './telegram-provider';
import { walletApi, gatewayApi } from '@/lib/api';

interface WalletContextType {
  address: string | null;
  balance: string;
  gatewayBalances: Array<{ chain: string; balance: string }>;
  totalBalance: string;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, isInTelegram } = useTelegram();
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');
  const [gatewayBalances, setGatewayBalances] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      initWallet(user.id.toString());
    }
  }, [user?.id]);

  async function initWallet(telegramUserId: string) {
    setIsLoading(true);
    try {
      // Create/get wallet
      const { address: walletAddress } = await walletApi.create(telegramUserId);
      setAddress(walletAddress);

      // Fetch balances
      await refreshBalances(walletAddress);
    } catch (error) {
      console.error('Wallet init error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshBalances(walletAddress: string) {
    const [onChain, gateway] = await Promise.all([
      walletApi.getBalance(walletAddress),
      gatewayApi.getBalances(walletAddress),
    ]);

    setBalance(onChain.balance || '0');
    setGatewayBalances(gateway.balances || []);

    // Total = on-chain + gateway
    const total = parseFloat(onChain.balance || '0') + parseFloat(gateway.total || '0');
    setTotalBalance(total.toFixed(6));
  }

  async function refreshBalance() {
    if (address) {
      await refreshBalances(address);
    }
  }

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        gatewayBalances,
        totalBalance,
        isLoading,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};
```

### 3.3 Update Wallet Page

**File:** `src/app/wallet/page.tsx` (updated)

```typescript
'use client';

import { useWallet } from '@/components/providers/wallet-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function WalletPage() {
  const { address, balance, gatewayBalances, totalBalance, isLoading } = useWallet();

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Main Balance Card */}
      <Card className="p-6 bg-void-surface">
        <div className="text-center">
          <p className="text-text-muted text-sm">Total Balance</p>
          <p className="text-4xl font-display text-text-primary mt-2">
            {totalBalance} <span className="text-xl">USDC</span>
          </p>
        </div>

        <div className="mt-4 p-3 bg-void-mid rounded-lg">
          <p className="text-text-muted text-xs">Wallet Address</p>
          <p className="text-text-secondary font-mono text-sm truncate">
            {address}
          </p>
        </div>
      </Card>

      {/* On-Chain Balance */}
      <Card className="p-4 bg-void-surface">
        <h3 className="text-text-secondary font-medium mb-3">
          Arc Testnet (Betting Funds)
        </h3>
        <p className="text-2xl font-display">{balance} USDC</p>
      </Card>

      {/* Gateway Balances */}
      <Card className="p-4 bg-void-surface">
        <h3 className="text-text-secondary font-medium mb-3">
          Cross-Chain Deposits
        </h3>
        <div className="space-y-2">
          {gatewayBalances.map((b) => (
            <div key={b.chain} className="flex justify-between">
              <span className="text-text-muted">{b.chain}</span>
              <span className="text-text-primary">{b.balance} USDC</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline">Deposit</Button>
        <Button variant="outline">Withdraw</Button>
      </div>
    </div>
  );
}
```

### 3.4 Update Place Bet Drawer

**File:** `src/components/market/place-bet-drawer.tsx` (updated betting logic)

```typescript
'use client';

import { useState } from 'react';
import { useWallet } from '@/components/providers/wallet-provider';
import { useTelegram } from '@/components/providers/telegram-provider';
import { betApi } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

export function PlaceBetDrawer({ marketId, onClose }: Props) {
  const { user } = useTelegram();
  const { balance, refreshBalance } = useWallet();
  const [amount, setAmount] = useState('');
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user?.id || !amount) return;

    const betAmount = parseFloat(amount);
    if (betAmount > parseFloat(balance)) {
      toast.error('Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    haptics.placeBet();

    try {
      const result = await betApi.placeBet({
        telegramUserId: user.id.toString(),
        marketId,
        outcome,
        amount: betAmount,
      });

      if (result.transactionId) {
        haptics.betSuccess();
        toast.success('Bet placed successfully!');
        await refreshBalance();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to place bet');
      }
    } catch (error: any) {
      haptics.betError();
      toast.error(error.message || 'Failed to place bet');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ... rest of drawer UI
}
```

---

## Phase 4: Deposit Flow

### 4.1 Deposit Options

Users can deposit USDC from any supported chain:

1. **Direct Deposit to Arc** - Send USDC directly to wallet address on Arc
2. **Cross-Chain via Gateway** - Deposit to Gateway Wallet on any chain, bridged automatically

### 4.2 Gateway Deposit Flow

**File:** `src/app/api/gateway/deposit-address/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Gateway Wallet addresses per chain (users deposit here)
const GATEWAY_WALLETS: Record<number, string> = {
  0: '0xE0E52927f0a73d1F53e9F95cB6da9e22B1F4268C',  // ETH-SEPOLIA
  1: '0xE0E52927f0a73d1F53e9F95cB6da9e22B1F4268C',  // AVAX-FUJI
  6: '0xE0E52927f0a73d1F53e9F95cB6da9e22B1F4268C',  // BASE-SEPOLIA
  3: '0xE0E52927f0a73d1F53e9F95cB6da9e22B1F4268C',  // ARB-SEPOLIA
  26: '0xE0E52927f0a73d1F53e9F95cB6da9e22B1F4268C', // ARC-TESTNET
};

export async function GET(req: NextRequest) {
  const chain = req.nextUrl.searchParams.get('chain');
  const domain = parseInt(chain || '0');

  return NextResponse.json({
    gatewayWallet: GATEWAY_WALLETS[domain],
    domain,
    instructions: 'Send USDC to this address on the selected chain',
  });
}
```

### 4.3 Deposit UI Component

**File:** `src/components/wallet/deposit-drawer.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useWallet } from '@/components/providers/wallet-provider';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

const CHAINS = [
  { name: 'Ethereum Sepolia', domain: 0, usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
  { name: 'Avalanche Fuji', domain: 1, usdc: '0x5425890298aed601595a70AB815c96711a31Bc65' },
  { name: 'Base Sepolia', domain: 6, usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' },
  { name: 'Arc Testnet', domain: 26, usdc: '0x3600000000000000000000000000000000000000' },
];

export function DepositDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address } = useWallet();
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [copied, setCopied] = useState(false);

  const depositAddress = selectedChain.domain === 26
    ? address  // Direct to wallet on Arc
    : '0xE0E52927f0a73d1F53e9F95cB6da9e22B1F4268C'; // Gateway Wallet

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Deposit USDC</DrawerTitle>
        </DrawerHeader>

        <div className="p-4 space-y-4">
          {/* Chain Selection */}
          <div className="grid grid-cols-2 gap-2">
            {CHAINS.map((chain) => (
              <Button
                key={chain.domain}
                variant={selectedChain.domain === chain.domain ? 'default' : 'outline'}
                onClick={() => setSelectedChain(chain)}
                className="text-sm"
              >
                {chain.name}
              </Button>
            ))}
          </div>

          {/* Deposit Address */}
          <div className="p-4 bg-void-mid rounded-lg">
            <p className="text-text-muted text-xs mb-2">
              {selectedChain.domain === 26
                ? 'Send USDC directly to your wallet'
                : 'Send USDC to Gateway (auto-bridges to Arc)'}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-text-primary truncate">
                {depositAddress}
              </code>
              <Button variant="ghost" size="sm" onClick={copyAddress}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-text-muted text-sm space-y-1">
            <p>1. Copy the address above</p>
            <p>2. Send USDC from your external wallet</p>
            <p>3. Balance updates automatically</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

---

## Phase 5: Provider Setup

### 5.1 Update Root Layout

**File:** `src/app/layout.tsx` (add WalletProvider)

```typescript
import { TelegramProvider } from '@/components/providers/telegram-provider';
import { WalletProvider } from '@/components/providers/wallet-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <TelegramProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}
```

---

## Implementation Order

### Week 1: Core Infrastructure
1. [ ] Install dependencies (Circle SDK, viem)
2. [ ] Create environment variables
3. [ ] Implement wallet API routes (`/api/wallet/*`)
4. [ ] Implement WalletProvider context
5. [ ] Update wallet page with real data

### Week 2: Betting Integration
6. [ ] Implement betting API routes (`/api/bet/*`)
7. [ ] Update PlaceBetDrawer with real transactions
8. [ ] Add transaction status polling
9. [ ] Implement bet history from contract

### Week 3: Gateway & Polish
10. [ ] Implement Gateway API routes (`/api/gateway/*`)
11. [ ] Add deposit drawer UI
12. [ ] Add cross-chain balance display
13. [ ] Error handling & loading states
14. [ ] Testing & bug fixes

---

## API Route Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/wallet/create` | POST | Create/get wallet for Telegram user |
| `/api/wallet/balance` | GET | Get on-chain USDC balance |
| `/api/gateway/balance` | GET | Get cross-chain Gateway balances |
| `/api/gateway/deposit-address` | GET | Get deposit address for chain |
| `/api/bet/place` | POST | Place bet via Circle SDK |
| `/api/bet/claim` | POST | Claim winnings |
| `/api/bet/history` | GET | Get user's bet history |
| `/api/market/list` | GET | List all markets |
| `/api/market/:id` | GET | Get market details |

---

## Security Considerations

1. **Server-Side Only**: Circle SDK credentials never exposed to client
2. **Telegram Auth**: Validate Telegram initData on API routes
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Input Validation**: Validate all inputs with Zod schemas
5. **Error Handling**: Never expose internal errors to client

---

## Testing Checklist

- [ ] Wallet creation for new Telegram user
- [ ] Wallet retrieval for existing user
- [ ] Balance display (on-chain + Gateway)
- [ ] Place bet transaction flow
- [ ] Bet confirmation and balance update
- [ ] Cross-chain deposit detection
- [ ] Error states (insufficient balance, network errors)
- [ ] Loading states throughout

---

## Files to Create/Modify

### New Files
- `src/app/api/wallet/create/route.ts`
- `src/app/api/wallet/balance/route.ts`
- `src/app/api/gateway/balance/route.ts`
- `src/app/api/gateway/deposit-address/route.ts`
- `src/app/api/bet/place/route.ts`
- `src/app/api/bet/claim/route.ts`
- `src/app/api/bet/history/route.ts`
- `src/lib/api.ts`
- `src/components/providers/wallet-provider.tsx`
- `src/components/wallet/deposit-drawer.tsx`

### Files to Modify
- `src/app/layout.tsx` - Add WalletProvider
- `src/app/wallet/page.tsx` - Real data
- `src/components/market/place-bet-drawer.tsx` - Real betting
- `package.json` - New dependencies
