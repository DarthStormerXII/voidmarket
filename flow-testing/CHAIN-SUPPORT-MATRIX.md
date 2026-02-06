# Chain Support Matrix: Gateway API vs BridgeKit (CCTP)

## Summary

| Protocol | Supported Chains | Arc Bidirectional | Notes |
|----------|------------------|-------------------|-------|
| **BridgeKit (CCTP V2)** | 18 testnets | ✅ All 18 | Recommended for all transfers |
| **Gateway API** | 8 testnets | ✅ EVM only | Solana mint fails (PDA issues) |

---

## BridgeKit (CCTP V2) - RECOMMENDED

All 18 testnet chains support **bidirectional transfers** with Arc:

| Chain | Domain | Arc → Chain | Chain → Arc | Verified |
|-------|--------|-------------|-------------|----------|
| Arbitrum_Sepolia | 3 | ✅ | ✅ | Route ✓ |
| Avalanche_Fuji | 1 | ✅ | ✅ | Route ✓ |
| Base_Sepolia | 6 | ✅ | ✅ | **Transfer ✓** |
| Codex_Testnet | 12 | ✅ | ✅ | Route ✓ |
| Ethereum_Sepolia | 0 | ✅ | ✅ | **Transfer ✓** |
| HyperEVM_Testnet | 19 | ✅ | ✅ | Route ✓ |
| Ink_Testnet | 21 | ✅ | ✅ | Route ✓ |
| Linea_Sepolia | 11 | ✅ | ✅ | Route ✓ |
| Monad_Testnet | 15 | ✅ | ✅ | Route ✓ |
| Optimism_Sepolia | 2 | ✅ | ✅ | Route ✓ |
| Plume_Testnet | 22 | ✅ | ✅ | Route ✓ |
| Polygon_Amoy_Testnet | 7 | ✅ | ✅ | Route ✓ |
| Sei_Testnet | 16 | ✅ | ✅ | Route ✓ |
| **Solana_Devnet** | 5 | ✅ | ✅ | **Transfer ✓** |
| Sonic_Testnet | 13 | ✅ | ✅ | Route ✓ |
| Unichain_Sepolia | 10 | ✅ | ✅ | Route ✓ |
| World_Chain_Sepolia | 14 | ✅ | ✅ | Route ✓ |
| XDC_Apothem | 18 | ✅ | ✅ | Route ✓ |

### Verified Transfers

1. **Arc ↔ Base_Sepolia** (0.001 USDC each way) ✅
2. **Arc ↔ Ethereum_Sepolia** (0.001 USDC each way) ✅
3. **Arc ↔ Solana_Devnet** (0.01 + 0.005 USDC) ✅
4. **Arc ↔ Avalanche_Fuji** (via Gateway API, 0.01 USDC) ✅

---

## Gateway API

Only supports **8 testnet chains** and has Solana mint issues:

| Chain | Domain | Arc → Chain | Chain → Arc | Notes |
|-------|--------|-------------|-------------|-------|
| Ethereum_Sepolia | 0 | ✅ | ✅ | Works |
| Avalanche_Fuji | 1 | ✅ | ✅ | Works |
| Base_Sepolia | 6 | ✅ | ✅ | Works |
| HyperEVM_Testnet | 19 | ✅ | ✅ | Works |
| Sei_Testnet | 16 | ✅ | ✅ | Works |
| Sonic_Testnet | 13 | ✅ | ✅ | Works |
| World_Chain_Sepolia | 14 | ✅ | ✅ | Works |
| **Solana_Devnet** | 5 | ✅ | ❌ | **Mint fails (PDA issues)** |

---

## Recommendation for VoidMarket Demo

### Unified Balance (on Arc)
- **EVM Address**: Single address across all EVM chains
- **Solana**: Not supported as unified balance (different address format)

### Deposit Support (From Other Chains → Arc)
Use **BridgeKit** for all 18 testnet chains:
- All EVM testnets work bidirectionally
- Solana Devnet works bidirectionally

### Implementation

```typescript
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey as createViemAdapter } from '@circle-fin/adapter-viem-v2';
import { createAdapterFromPrivateKey as createSolanaAdapter } from '@circle-fin/adapter-solana';

const kit = new BridgeKit();
const evmAdapter = createViemAdapter({ privateKey: evmKey });
const solanaAdapter = createSolanaAdapter({ privateKey: solanaKey });

// Deposit from any chain to Arc
await kit.bridge({
  from: { adapter: sourceAdapter, chain: sourceChain },
  to: { adapter: evmAdapter, chain: 'Arc_Testnet' },
  amount: '10',
});
```

---

## Chain Type Summary

### Type 1: BridgeKit Only (10 chains)
No Gateway API support, must use BridgeKit:
- Arbitrum_Sepolia
- Codex_Testnet
- Ink_Testnet
- Linea_Sepolia
- Monad_Testnet
- Optimism_Sepolia
- Plume_Testnet
- Polygon_Amoy_Testnet
- Unichain_Sepolia
- XDC_Apothem

### Type 2: Both BridgeKit + Gateway (7 chains)
Both protocols work (EVM):
- Avalanche_Fuji
- Base_Sepolia
- Ethereum_Sepolia
- HyperEVM_Testnet
- Sei_Testnet
- Sonic_Testnet
- World_Chain_Sepolia

### Type 3: Solana (1 chain)
BridgeKit works, Gateway API has issues:
- Solana_Devnet (BridgeKit ✅, Gateway mint ❌)

---

## Transaction Examples

### Arc → Base_Sepolia
- Approve: https://testnet.arcscan.app/tx/0x1be1c660c726eb3ddfd556622f877cd7507f65145db100dd2bbf15d25d866a30
- Burn: https://testnet.arcscan.app/tx/0x317a515a46d1084cc0719dc3f44360645872551c46ce4420c5d6de81fecf5175
- Mint: https://sepolia.basescan.org/tx/0x021d985b223677cdd8f039dc5ce7a8e6b5ab4412e924feab5a0b4355a1ff4d3d

### Base_Sepolia → Arc
- Approve: https://sepolia.basescan.org/tx/0x493cf4109bccf5e3b61377aacf1be7c15d6b95e8857c3215d6b6a2de32392782
- Burn: https://sepolia.basescan.org/tx/0x68124c1cb2e16053b29e1980fd260b3b3c5b1c48dfe19d45f1c257c78ceb3159
- Mint: https://testnet.arcscan.app/tx/0x65b67a9c8b1913d0804dba3354c4a7dbb33062fb7d72b9b9b5f4c85adeb7c375

### Arc → Ethereum_Sepolia
- Approve: https://testnet.arcscan.app/tx/0x644f05d709795f5c57fc7e9d4b9cba044f5b4c5a69d85084a98aebea1aad19ff
- Burn: https://testnet.arcscan.app/tx/0xc6164c14bf8c159502662e23d4e5c43ae2be4254330f9f9c98144e3e2dc4a1e9

### Ethereum_Sepolia → Arc
- Approve: https://sepolia.etherscan.io/tx/0xaa4a871122aa1bbb1aa83c00b9943fc17a2878e1569de5d230e179fe70856595
- Burn: https://sepolia.etherscan.io/tx/0xf448ecbf0f1a63e4bdd7bbcd7376ff3f6b94bc8552d4de42260dfa685dab331e
- Mint: https://testnet.arcscan.app/tx/0x1de50f7d46ab438555f3efad3a5e5de11239b624770acee32e81f8a9ee5000ab

### Arc → Solana_Devnet
- Approve: https://testnet.arcscan.app/tx/0x81df53ea0cff1e7191cea7c6503843d3508b3ab7c3bfc9a1d4c00eed34c47ed0
- Burn: https://testnet.arcscan.app/tx/0x8b6a1ea5e8a164b3cf0538d8105062c7291635d9f8c83533c1626a0df38a1b52
- Mint: https://solscan.io/tx/cDBu4SNMW2suAb9TXdGRxUMMVxyXcnL2UjHCd5KJx1x989MxKwMQMNKndUpLhcmNWn1TSiH2F8JVGXKZfbUXNkr?cluster=devnet

### Solana_Devnet → Arc
- Burn: https://solscan.io/tx/yQW2emcayQogyCqjsS5Kx4UzvLUYxwGqVaQJYywuU5Y6KzA3EodufRs2AKMaZPfwwTpsLrzY2uZCJbUyS7PcDxJ?cluster=devnet
- Mint: https://testnet.arcscan.app/tx/0x211a15967af316f6b21ee1f4b6f32c5155c4c0ec32c4bab24667fadfb675991e
