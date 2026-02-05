# Voidmarket UX Discussion Document

> Create wagers in Telegram. Hidden bets until resolution. Your position goes into the void.

---

## Project Summary

Voidmarket is a **ZK private wagering bot** that works on Telegram. Users can:
1. Fork public markets to create private markets with friends
2. Deposit from any chain (BTC, SOL, SUI, EVM) via LI.FI
3. Place private bets (hidden until resolution)
4. Get automatic resolution via Stork oracle
5. Settle payouts in USDC on Arc

The core innovation: **Nobody knows your bet direction until the market resolves.**

---

## Client to Build

### Telegram Bot + Mini App

| Component | Purpose |
|-----------|---------|
| **Bot Commands** | `/bet`, `/create`, `/reveal`, `/balance`, `/deposit` |
| **Mini App** | Full betting interface (opens in Telegram) |
| **Deposit Flow** | LI.FI-powered cross-chain deposits |
| **DM Notifications** | Market resolution, payout alerts |

---

## Design Theme & Style

### Brand Identity - FINALIZED

| Element | Value | Notes |
|---------|-------|-------|
| **Primary Color** | Pure White (#FFFFFF) | Text, accents, glows |
| **Background** | Void Black (#050505) | Deep black background |
| **Surface Colors** | Gray scale (5%-14% lightness) | Cards, inputs, surfaces |
| **Typography** | Space Grotesk (display), Outfit (body) | All uppercase for headers |
| **Mascot** | Black hole animation | Slow-moving particles like stars drifting in space |

### Design Mood - FINALIZED

- [x] **Mysterious & Dark (void theme)** - Pure black and white, no other colors
- [ ] ~~Gaming/Casino vibes~~
- [ ] ~~Clean & Professional~~
- [ ] ~~Meme-friendly & Playful~~

**Decision:** Black and white only. No emojis. Galaxy/space theme with Stars, Clusters, Novas.

### Visual Motifs - FINALIZED

| Element | Implementation |
|---------|----------------|
| **The Void** | Animated black hole with accretion disks, orbiting particles, spiral consumption |
| **Hidden/Revealed** | "IN THE VOID" status, "HIDDEN" text |
| **Stars** | 6 star types for user avatars (Red Giant, Blue Supergiant, White Dwarf, Yellow Sun, Neutron, Binary) |
| **Clusters** | Teams of stars with Energy scores |
| **Success** | White glow effects, subtle animations |

---

## Galaxy Theme Terminology

| Old Term | New Term | Description |
|----------|----------|-------------|
| User | **Star** | User profile/account |
| Clan/Team | **Cluster** | Group of users |
| Points/Trophies | **Energy** | Cluster score |
| Nova Points | **Photons** | Points earned in 1v1 matches |
| Competition | **Nova** | Cluster vs cluster |
| Private Market | **Forked Market** | Market created from public market |

---

## Navigation Structure - FINALIZED

### Bottom Navigation (5 items)

| Position | Icon | Label | Route |
|----------|------|-------|-------|
| 1 | Home | HOME | `/` |
| 2 | TrendingUp | MARKETS | `/markets` |
| 3 (center) | PlusCircle | CREATE | `/create` |
| 4 | Users | CLUSTERS | `/clusters` |
| 5 | Star | STAR | `/star` |

**Note:** CREATE remains in center with accent styling. BETS and WALLET merged into STAR page.

---

## Pages & Screens

### 1. Onboarding Flow (`/onboarding`)

```
STEP 1: WELCOME SCREEN
┌──────────────────────────────┐
│                              │
│         [VOID LOGO]          │
│                              │
│      WELCOME TO              │
│       THE VOID               │
│                              │
│  Prediction markets powered  │
│  by conviction.              │
│                              │
│   [BEGIN YOUR JOURNEY]       │
│                              │
└──────────────────────────────┘

STEP 2-4: STORY SLIDES (3 slides)
- THE VOID AWAITS
- BECOME A STAR
- SHAPE THE COSMOS
[CONTINUE] [SKIP INTRO]

STEP 5: STAR SELECTION
┌──────────────────────────────┐
│      CHOOSE YOUR STAR        │
│                              │
│  ┌────────┐  ┌────────┐     │
│  │RED     │  │BLUE    │     │
│  │GIANT   │  │SUPER   │     │
│  └────────┘  └────────┘     │
│  ┌────────┐  ┌────────┐     │
│  │WHITE   │  │YELLOW  │     │
│  │DWARF   │  │SUN     │     │
│  └────────┘  └────────┘     │
│  ┌────────┐  ┌────────┐     │
│  │NEUTRON │  │BINARY  │     │
│  │STAR    │  │STAR    │     │
│  └────────┘  └────────┘     │
│                              │
│       [CONTINUE]             │
└──────────────────────────────┘

STEP 6: PROFILE SETUP
- Name input (uppercase)
- Bio (optional)

STEP 7: DEPOSIT USDC
- Show 0.00 USDC balance
- [CONNECT WALLET] button
- [SKIP FOR NOW] option

STEP 8: COMPLETE
- Star avatar with glow
- "YOU ARE READY"
- [ENTER THE VOID]
```

### 2. Home Page (`/`)

```
┌──────────────────────────────┐
│         [VOID LOGO]          │
│        VOIDMARKET            │
│  BETS GO IN. ONLY TRUTH      │
│        COMES OUT.            │
├──────────────────────────────┤
│  [HOT] [LATEST] [ENDING SOON]│
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ WILL ETH HIT $5K...    │  │
│  │ 847 BETS | 12.5 USDC   │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ TRUMP WINS 2024...     │  │
│  │ 2147 BETS | 156.7 USDC │  │
│  └────────────────────────┘  │
│     [VIEW ALL MARKETS]       │
├──────────────────────────────┤
│  TOP CLUSTERS                │
│  1. DARK PROPHETS   5800 ⚡  │
│  2. COSMIC RAIDERS  4200 ⚡  │
│  3. VOID SEEKERS    3450 ⚡  │
│           [VIEW ALL]         │
└──────────────────────────────┘
```

### 3. Markets Page (`/markets`)

```
┌──────────────────────────────┐
│  ←  MARKETS           🔍     │
├──────────────────────────────┤
│  [ALL] [CRYPTO] [SPORTS]     │
│  [POLITICS] [CULTURE]        │
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ CRYPTO                 │  │
│  │ WILL ETH HIT $5K...    │  │
│  │ Pool: 12.5 USDC        │  │
│  │ Ends: 45 DAYS          │  │
│  └────────────────────────┘  │
│  ...more markets...          │
└──────────────────────────────┘
```

### 4. Market Detail (`/markets/[id]`)

```
┌──────────────────────────────┐
│  ←  MARKET         📤  ⋮    │
├──────────────────────────────┤
│         [CRYPTO]             │
│                              │
│   WILL ETH HIT $5K BY        │
│       Q1 2025?               │
│                              │
│  PROPHET.VOID | Nov 1, 2024  │
├──────────────────────────────┤
│  ┌─────────┐  ┌─────────┐   │
│  │  847    │  │  12.5   │   │
│  │  BETS   │  │  USDC   │   │
│  └─────────┘  └─────────┘   │
├──────────────────────────────┤
│    45 DAYS : 12 HRS : 30 MIN │
├──────────────────────────────┤
│  RESOLUTION CRITERIA         │
│  "Ethereum spot price on     │
│   CoinGecko exceeds $5,000"  │
│  ORACLE: STORK PRICE FEED    │
├──────────────────────────────┤
│  YOUR POSITION (if exists)   │
│  BET: YES | AMOUNT: 0.5 USDC │
│  STATUS: IN THE VOID         │
├──────────────────────────────┤
│     [PLACE YOUR BET]         │
└──────────────────────────────┘
```

### 5. Create Page (`/create`)

```
┌──────────────────────────────┐
│  ←     CREATE MARKET         │
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ 🔀 FORK EXISTING       │  │
│  │    MARKET              │  │
│  │ Create a private market│  │
│  │ from any public market │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ ➕ CREATE NEW MARKET   │  │
│  │    [COMING SOON]   🔒  │  │
│  │ Create original public │  │
│  │ markets                │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  SELECT A MARKET TO FORK     │
│  🔍 [SEARCH MARKETS...]      │
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ CRYPTO                 │  │
│  │ WILL ETH HIT $5K...  🔀│  │
│  │ 847 BETS | 12.5 USDC   │  │
│  └────────────────────────┘  │
│  ...more markets...          │
└──────────────────────────────┘
```

### 6. Fork Confirmation (`/create/fork/[marketId]`)

```
┌──────────────────────────────┐
│  ←     FORK MARKET           │
├──────────────────────────────┤
│  FORKING FROM                │
│  ┌────────────────────────┐  │
│  │ CRYPTO                 │  │
│  │ WILL ETH HIT $5K...    │  │
│  │ 847 BETS | Ends Jun 1  │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  YOUR FORKED MARKET          │
│  ┌────────────────────────┐  │
│  │ 🔒 PRIVATE MARKET      │  │
│  │ Only invited can join  │  │
│  │                        │  │
│  │ 🤖 AUTO-RESOLUTION     │  │
│  │ Resolved by Stork      │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  [FORK THIS MARKET]          │
└──────────────────────────────┘

AFTER CREATION:
┌──────────────────────────────┐
│       ✓ MARKET FORKED        │
│                              │
│  SHARE CODE                  │
│  ┌────────────────────────┐  │
│  │   VOID-AB3XK9      📋  │  │
│  └────────────────────────┘  │
│                              │
│  [SHARE]  [VIEW MARKETS]     │
└──────────────────────────────┘
```

### 7. Star Page (`/star`) - Combined Profile/Wallet/Bets

```
┌──────────────────────────────┐
│           MY STAR         ⚙️ │
├──────────────────────────────┤
│                              │
│       [STAR AVATAR]          │
│       COSMIC VOYAGER         │
│       BLUE SUPERGIANT        │
│                              │
│    0x7A3B...F92D  📋 🔗     │
│       ✨ 1,250 PHOTONS       │
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ ⚡ VOID SEEKERS     →  │  │
│  │ 3,450 ENERGY | 4 MEMBERS│ │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  UNIFIED BALANCE             │
│       245.50 USDC            │
│      ACROSS ALL CHAINS       │
│                              │
│  Ethereum      100.00 USDC   │
│  Arbitrum       85.50 USDC   │
│  Base           60.00 USDC   │
│                              │
│   [DEPOSIT]    [WITHDRAW]    │
├──────────────────────────────┤
│  MY BETS              🏆 3   │
│  [ALL] [ACTIVE] [WON] [LOST] │
│                              │
│  ┌────────────────────────┐  │
│  │ ETH $5K... | YES       │  │
