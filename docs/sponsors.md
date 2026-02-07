# Sponsor Submissions

## Arc (Circle)

### Why we're applicable

VoidMarket treats Arc Testnet as a unified USDC liquidity hub where all prediction market activity settles. Circle Developer Wallets provide completely gasless UX — wallets are created deterministically from Telegram user IDs, and the server signs all transactions so users never hold gas tokens. Cross-chain USDC deposits from multiple testnets are supported via Circle CCTP bridging, treating multiple chains as one liquidity surface without fragmenting user experience.

### Code references

- **Circle Developer Wallet creation** (`createWallet` and `getOrCreateWallet` using RefID-based deterministic addressing):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/lib/services/circle/wallet.ts#L106-L159

- **Circle SDK client initialization** (`getCircleClient` with developer-controlled wallets SDK, `CIRCLE_CONFIG` with chain configs):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/lib/services/circle/client.ts#L21-L68

- **Circle CCTP bridge configuration** (chain configs with CCTP domain IDs for ETH-Sepolia, Base-Sepolia, Arc-Testnet):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/lib/services/circle/bridge-kit.ts#L49-L80

- **BridgeKit CCTP bridge execution** (full burn-attestation-mint flow via BridgeKit SDK):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/lib/services/circle/bridge-kit.ts#L153-L278

- **Cross-chain bridge deposit/withdrawal service** (CCTP bridge + post-bridge transfer to user dev wallet):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/lib/services/circle/bridge.ts#L1-L346

- **`getUnifiedBalance` function** (unified USDC balance across all chains via Circle Gateway API):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/lib/services/circle/gateway.ts#L55-L129

- **Arc Testnet chain configuration** (chain ID 5042002, USDC as native currency with 18 decimals):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/lib/services/contracts/client.ts#L9-L29

- **Contract deployment on Arc** (full deployment script: VoidMarketCore, ClusterManager, NovaManager, VoidMarketResolver):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/contracts/script/Deploy.s.sol#L33-L110

- **VoidMarketCore.sol** (prediction markets, commit-reveal betting, forked markets, payout distribution):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/contracts/src/VoidMarketCore.sol#L20-L503

- **Star registration with Circle wallet creation** (onboarding creates Circle wallet via `getOrCreateWallet`):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/app/api/star/route.ts#L96-L108

### Additional feedback

VoidMarket is designed around Arc as the settlement layer — USDC is the native currency, Circle wallets eliminate gas friction, and CCTP enables deposits from any supported chain. The gasless UX means Telegram users can start betting immediately without understanding crypto wallets or gas tokens.

---

## ENS

### Why we're applicable

VoidMarket uses ENS as a comprehensive identity and data layer, not just name resolution. Every entity in the platform has an ENS name: users are `username.voidmarket.eth`, markets are `slug.voidmarket.eth`, and clusters are `name.voidmarket.eth`. The VoidMarketResolver contract implements EIP-3668 CCIP-Read to resolve these names via an off-chain gateway server backed by PostgreSQL, supporting addr(), text(), and contenthash() records. This means market data, user profiles, and team information are all queryable via standard ENS tooling.

### Code references

- **VoidMarketResolver.sol** (CCIP-Read resolver contract with `resolve()`, `resolveWithProof()`, EIP-191 signature verification):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/contracts/src/VoidMarketResolver.sol#L16-L183

- **Gateway server resolve route** (CCIP-Read endpoint handling `addr()`, `text()`, `contenthash()` resolution with signed responses):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/gateway/src/routes/resolve.ts#L29-L143

- **Database service for ENS resolution** (`getStarByName`, `getMarketByName`, `getClusterByName` with on-chain data enrichment):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/gateway/src/services/database.ts#L14-L141

- **ENS name collision check in star registration** (ensures unique ENS subdomains across stars, markets, and clusters):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/frontend/src/app/api/star/route.ts#L87-L94

- **Resolver deployment script for Arc** (deploys VoidMarketResolver with gateway URLs and trusted signer):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/contracts/script/Deploy.s.sol#L82-L91

- **SetResolver script for Sepolia ENS** (sets VoidMarketResolver as resolver for `voidmarket.eth` on Sepolia ENS Registry):
  https://github.com/gabrielantonyxaviour/voidmarket/blob/main/contracts/script/SetResolver.s.sol#L25-L64

### Additional feedback

ENS isn't an afterthought — it's the identity backbone. Every market gets a human-readable ENS name that can be shared, and user profiles are ENS-addressable. The CCIP-Read gateway pattern means this works without storing data on L1, keeping costs minimal while maintaining ENS compatibility.
