# VOIDMARKET

> Create wagers in Telegram. Hidden bets until resolution. Your position goes into the void.

A ZK private wagering platform built as a Telegram mini app with cross-chain deposits and ENS identity — built for HackMoney 2026.

---

## Overview

Voidmarket is a Telegram-native prediction market where:

- **Bets are private** — Commitment-reveal scheme hides positions until resolution
- **Deposit from anywhere** — Any supported EVM chain (Ethereum, Base, Arbitrum, etc.) via Circle CCTP
- **Gasless UX** — Circle developer wallets on Arc chain handle gas
- **Identity via ENS** — Users get `star.voidmarket.eth` subdomains via CCIP-Read
- **Social wagering** — Fork markets, create clusters, challenge with novas

---

## Tech Stack

### Core Infrastructure
| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 15 (Telegram Mini App) |
| **Smart Contracts** | Solidity on Arc Chain |
| **Cross-chain Deposits** | Circle Bridge Kit (CCTP) |
| **Wallets** | Circle Programmable Wallets |
| **Identity** | ENS with CCIP-Read resolver |
| **Oracle** | Stork (market resolution) |
| **Database** | PostgreSQL |

### Contracts
- `VoidMarketCore.sol` — Market creation, betting, resolution
- `ClusterManager.sol` — Group/team management
- `NovaManager.sol` — 1v1 challenge matches
- `VoidMarketResolver.sol` — ENS CCIP-Read resolver

---

## How It Works

1. **Onboard** — Open Telegram bot, Circle creates a gasless wallet on Arc
2. **Deposit** — Send USDC from any supported EVM chain — Circle CCTP bridges to USDC on Arc
3. **Browse Markets** — View trending markets or fork one for your group
4. **Place Bet** — Submit commitment hash (hidden position)
5. **Resolution** — Oracle resolves market, bets are revealed
6. **Payout** — Winners receive funds to their Circle wallet

---

## Project Structure

```
voidmarket/
├── frontend/               # Next.js Telegram Mini App
│   └── src/
│       ├── app/            # Pages (markets, clusters, novas, wallet)
│       ├── components/     # UI + void-themed components
│       └── lib/            # Utils, types, providers
├── contracts/              # Solidity smart contracts
│   ├── src/                # Core contracts
│   ├── script/             # Deploy and setup scripts
│   └── test/               # Foundry tests
├── flow-testing/           # Integration test suite
│   └── src/
│       ├── services/       # Circle, ENS, Telegram, DB services
│       ├── tests/          # Numbered test suites
│       └── flows/          # End-to-end flow scripts
├── IDEA.md                 # Detailed concept
├── ENS_ARCHITECTURE.md     # ENS integration deep-dive
├── IMPLEMENTATION_PLAN.md  # Technical plan
└── README.md               # This file
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Foundry (for contracts)

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Contracts
```bash
cd contracts
forge build
forge test
```

### Flow Testing
```bash
cd flow-testing
cp .env.example .env  # Fill in values
npm install
npm test
```

---

## Documentation

- [IDEA.md](./IDEA.md) — Full concept and architecture
- [ENS_ARCHITECTURE.md](./ENS_ARCHITECTURE.md) — ENS subdomain system design
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — Technical implementation plan

---

## License

MIT
