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
│  │ 0.5 USDC | IN THE VOID │  │
│  └────────────────────────┘  │
│  ...more bets...             │
└──────────────────────────────┘
```

### 8. Clusters Page (`/clusters`)

**If in a cluster:**
```
┌──────────────────────────────┐
│  ←      MY CLUSTER           │
├──────────────────────────────┤
│        VOID SEEKERS          │
│   We seek truth in darkness  │
│                              │
│  ⚡ 3,450    ⚔️ 10/15 WINS   │
│    ENERGY                    │
├──────────────────────────────┤
│  ACTIVE NOVA                 │
│  ┌────────────────────────┐  │
│  │ VOID SEEKERS vs COSMIC │  │
│  │    0 ✨  VS  ✨ 0      │  │
│  │   2/3 MATCHES   [LIVE] │  │
│  └────────────────────────┘  │
│                              │
│       [START NOVA]           │
├──────────────────────────────┤
│  MEMBERS (4)                 │
│  1. COSMIC VOYAGER 👑 450✨  │
│  2. NOVA HUNTER      380✨   │
│  3. STELLAR DRIFT    290✨   │
│  4. DARK MATTER      130✨   │
├──────────────────────────────┤
│      [LEAVE CLUSTER]         │
└──────────────────────────────┘
```

**If not in a cluster:**
```
┌──────────────────────────────┐
│  ←       CLUSTERS            │
├──────────────────────────────┤
│        [VOID LOGO]           │
│                              │
│     JOIN A CLUSTER           │
│  Clusters are teams of stars │
│  that compete in novas       │
│                              │
│    [CREATE CLUSTER]          │
│                              │
│  Or join via invite link     │
├──────────────────────────────┤
│  TOP CLUSTERS                │
│  1. DARK PROPHETS   5800 ⚡  │
│  2. COSMIC RAIDERS  4200 ⚡  │
│  3. VOID SEEKERS    3450 ⚡  │
└──────────────────────────────┘
```

### 9. Create Cluster (`/clusters/create`)

```
┌──────────────────────────────┐
│  ←    CREATE CLUSTER         │
├──────────────────────────────┤
│  CLUSTER NAME                │
│  [ENTER CLUSTER NAME]        │
│                              │
│  DESCRIPTION (OPTIONAL)      │
│  [What is your cluster about]│
├──────────────────────────────┤
│  INVITE MEMBERS              │
│  Add Telegram usernames      │
│                              │
│  @ [telegram_username]  [+]  │
│                              │
│  ┌─@cosmicvoyager  ✕─┐       │
│  └────────────────────┘      │
├──────────────────────────────┤
│     [CREATE CLUSTER]         │
└──────────────────────────────┘
```

### 10. Nova View (`/clusters/nova/[id]`)

```
┌──────────────────────────────┐
│  ←        NOVA        [LIVE] │
├──────────────────────────────┤
│                              │
│  VOID SEEKERS   COSMIC RAIDERS
│       0 ✨    ⚔️    ✨ 0     │
│    YOUR TEAM                 │
│                              │
│  WAGER: 50 USDC PER CLUSTER  │
├──────────────────────────────┤
│  YOUR MATCH                  │
│  ┌────────────────────────┐  │
│  │ COSMIC VOYAGER vs      │  │
│  │         GALACTIC KING  │  │
│  │                        │  │
│  │ WILL ETH HIT $5K...    │  │
│  │ 100 PHOTONS AT STAKE   │  │
│  │                        │  │
│  │ PLACE YOUR BET ($10)   │  │
│  │  [YES]      [NO]       │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  ALL MATCHES (2/3)           │
│  COSMIC vs GALACTIC   [LIVE] │
│  NOVA vs NEBULA       [LIVE] │
│  STELLAR vs PHOTON    ⏱️     │
├──────────────────────────────┤
│       [CONFIRM BET]          │
└──────────────────────────────┘
```

---

## UI Components

### Core Components

| Component | Description | Variants |
|-----------|-------------|----------|
| **VoidLogo** | Animated void logo | sm, md, lg, xl |
| **VoidBlackHole** | Background animation | Full screen, slow particles |
| **StarAvatar** | User star profile picture | 6 star types, with/without glow |
| **MarketCard** | Market summary | Compact, Full |
| **BetCard** | User bet display | In Void, Won, Lost, Claimable |
| **ClusterCard** | Cluster display | With/without nova status |
| **ClusterMemberCard** | Member in cluster | With rank, leader badge |
| **NovaCard** | Nova overview | Active, Completed |
| **CountdownTimer** | Time until close/resolution | Days, hours, minutes |
| **PoolDisplay** | Total pool value | Hidden (void), Revealed |
| **TopClustersSection** | Leaderboard | Top 3-5 clusters |

### Status Indicators

| State | Visual |
|-------|--------|
| **Active/Open** | White text, subtle glow |
| **In The Void** | "IN THE VOID" badge |
| **Claimable** | White border with glow |
| **Won** | "WON" badge |
| **Lost** | "LOST" badge, dimmed |
| **Live Nova** | Pulsing "LIVE" badge |

### Forms & Inputs

| Component | Usage |
|-----------|-------|
| **SideSelector** | YES / NO toggle (white/gray) |
| **AmountInput** | Bet amount with USDC |
| **MarketSearch** | Search markets by title |
| **StarSelector** | 6 star type grid for onboarding |
| **ChainSelector** | Select source chain for deposit |

---

## User Flows

### 1. First-Time User (Onboarding)

```
User opens Mini App
      │
      ▼
Check localStorage: voidmarket_onboarded
      │
      ▼ (not onboarded)
Redirect to /onboarding
      │
      ▼
WELCOME → STORY (3 slides) → STAR SELECTION → NAME → DEPOSIT → COMPLETE
      │
      ▼
Set localStorage: voidmarket_onboarded = true
      │
      ▼
Redirect to Home (/)
```

### 2. Fork Market Flow

```
User on /create page
      │
      ▼
Browse/search public markets
      │
      ▼
Select market to fork → /create/fork/[marketId]
      │
      ▼
Review original market details
      │
      ▼
See: "PRIVATE MARKET" + "AUTO-RESOLUTION"
      │
      ▼
[FORK THIS MARKET]
      │
      ▼
Generate share code: VOID-XXXXXX
      │
      ▼
Share with friends via code or link
```

### 3. Private Betting Flow

```
User receives share code
      │
      ▼
Joins forked market via link
      │
      ▼
Opens place bet drawer
      │
      ▼
Selects YES/NO, enters amount
      │
      ▼
Client generates:
- secret = random()
- commitment = hash(market, YES, $100, secret)
      │
      ▼
Secret stored in Telegram Cloud Storage
      │
      ▼
Commitment sent to server (NOT direction)
      │
      ▼
"BET ENTERED THE VOID"
Position: HIDDEN
```

### 4. Cluster Nova Flow

```
Cluster leader starts nova
      │
      ▼
System matches with opponent cluster
      │
      ▼
1v1 matches created (min 3)
      │
      ▼
Each member sees their match
      │
      ▼
Members place bets ($10 fake USDC)
      │
      ▼
Both sides must bet
      │
      ▼
Market resolves via oracle
      │
      ▼
Winner gets 100 Photons
      │
      ▼
Cluster with most Photons wins
      │
      ▼
Energy awarded to winning cluster
```

---

## Technical Decisions - FINALIZED

| Decision | Choice | Notes |
|----------|--------|-------|
| **Framework** | Next.js 15 + React 19 | App router, RSC |
| **Styling** | Tailwind CSS 4 | Pure black/white theme |
| **Components** | shadcn/ui | Customized for void theme |
| **Secret Storage** | Telegram Cloud Storage API | Cross-device sync |
| **Wallet** | Circle embedded (Arc) | Email/Google/Apple auth |
| **Currency** | USDC only | Even gas is USDC (Arc) |
| **Navigation** | 5 items | HOME, MARKETS, CREATE, CLUSTERS, STAR |

---

## Telegram-Specific Features

| Feature | Implementation |
|---------|----------------|
| **Cloud Storage** | Store bet secrets for cross-device |
| **Web App Data** | Pass market context to Mini App |
| **Inline Mode** | Share markets in any chat |
| **Notifications** | Bot DMs for updates |
| **Haptic Feedback** | Tactile response on actions |
| **Main Button** | Primary CTA in Mini App |
| **Back Button** | Navigation within Mini App |

---

## LI.FI Integration Details

| Feature | Implementation |
|---------|----------------|
| **Supported Chains** | BTC, SOL, SUI, ETH, ARB, OP, BASE, POLYGON, +50 more |
| **Quote API** | Get best route and price |
| **Execute API** | Trigger cross-chain transfer |
| **Status Tracking** | Monitor transaction progress |
| **Slippage Handling** | User-configurable tolerance |
| **Error Recovery** | Handle failed bridges gracefully |

---

## Implementation Status

### Completed
- [x] Pure black/white theme
- [x] Black hole background animation
- [x] Star avatar component (6 types)
- [x] Onboarding flow
- [x] Updated navigation (5 items)
- [x] Star page (profile + wallet + bets)
- [x] Create/Fork market flow
- [x] Home page with market tabs + top clusters
- [x] Cluster components (card, member, nova)
- [x] Clusters page (in-cluster + no-cluster views)
- [x] Nova view page
- [x] All ETH → USDC replacement

### Pending (Backend/Integration)
- [ ] Circle wallet integration
- [ ] LI.FI deposit flow
- [ ] ENS market registration
- [ ] Commitment/reveal cryptography
- [ ] Stork oracle integration
- [ ] Telegram bot commands
- [ ] Real database + API
