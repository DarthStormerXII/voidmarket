export type MarketCategory = "crypto" | "sports" | "politics" | "culture" | "custom"

export type MarketStatus = "active" | "resolved" | "cancelled"

export type BetOutcome = "YES" | "NO"

export type BetStatus = "in_void" | "won" | "lost" | "claimable"

// Star types (user profile avatars)
export type StarType = "red-giant" | "blue-supergiant" | "white-dwarf" | "yellow-sun" | "neutron" | "binary"

// Nova status (cluster vs cluster competition)
export type NovaStatus = "pending" | "active" | "completed"

// Match status
export type MatchStatus = "pending" | "active" | "completed"

export interface Market {
  id: string
  title: string
  description?: string
  category: MarketCategory
  creatorAddress: string
  creatorName?: string
  endDate: Date
  resolutionDate?: Date
  outcome?: BetOutcome
  totalBets: number
  totalPool: number
  yesBets?: { count: number; amount: number }
  noBets?: { count: number; amount: number }
  resolutionCriteria: string
  oracleType: "stork" | "manual"
  oracleSource?: string
  status: MarketStatus
  createdAt: Date
}

export interface Bet {
  id: string
  marketId: string
  marketTitle: string
  userAddress: string
  outcome: BetOutcome
  amount: number
  status: BetStatus
  payout?: number
  placedAt: Date
  claimedAt?: Date
  commitmentHash: string
}

export interface User {
  address: string
  ensName?: string
  balance: number
  totalBets: number
  totalWon: number
  totalLost: number
}

export interface Transaction {
  id: string
  type: "deposit" | "withdraw" | "bet" | "winnings"
  amount: number
  status: "pending" | "confirmed" | "failed"
  timestamp: Date
  marketTitle?: string
  txHash?: string
}

// Star (User Profile)
export interface Star {
  id: string
  address: string
  name: string
  starType: StarType
  bio?: string
  telegramId?: string
  clusterId?: string
  totalPhotons: number
  createdAt: Date
}

// Star type configuration
export interface StarTypeConfig {
  id: StarType
  name: string
  description: string
}

// Cluster
export interface Cluster {
  id: string
  name: string
  description?: string
  leaderId: string
  members: ClusterMember[]
  energy: number
  totalNovas: number
  novasWon: number
  currentNovaId?: string
  createdAt: Date
}

// Cluster Member
export interface ClusterMember {
  odId: string
  name: string
  starType: StarType
  photons: number
  novasPlayed: number
  novasWon: number
  joinedAt: Date
}

// Nova (cluster vs cluster competition)
export interface Nova {
  id: string
  cluster1Id: string
  cluster2Id: string
  cluster1Name: string
  cluster2Name: string
  status: NovaStatus
  wagerAmount: number
  matches: NovaMatch[]
  winnerId?: string
  startedAt: Date
  endedAt?: Date
}

// Nova Match (1v1)
export interface NovaMatch {
  id: string
  novaId: string
  star1Id: string
  star2Id: string
  star1Name: string
  star2Name: string
  marketId: string
  marketTitle: string
  star1Bet?: { outcome: BetOutcome; amount: number }
  star2Bet?: { outcome: BetOutcome; amount: number }
  winnerId?: string
  photonsAwarded: number
  status: MatchStatus
}

// Chain Balance (Arc Network unified balance)
export interface ChainBalance {
  chainId: number
  chainName: string
  balance: number
  symbol: "USDC"
}

// Forked Market (private market from public)
export interface ForkedMarket {
  id: string
  originalMarketId: string
  originalMarketTitle: string
  creatorStarId: string
  isPrivate: true
  shareCode: string
  participants: string[]
  totalBets: number
  totalPool: number
  createdAt: Date
}

// Category configuration
export const CATEGORY_CONFIG: Record<MarketCategory, { label: string; gradient: string }> = {
  crypto: {
    label: "CRYPTO",
    gradient: "from-gray-800 to-gray-600",
  },
  sports: {
    label: "SPORTS",
    gradient: "from-gray-700 to-gray-500",
  },
  politics: {
    label: "POLITICS",
    gradient: "from-gray-600 to-gray-400",
  },
  culture: {
    label: "CULTURE",
    gradient: "from-gray-500 to-gray-300",
  },
  custom: {
    label: "CUSTOM",
    gradient: "from-gray-400 to-gray-200",
  },
}

// Star type configuration
export const STAR_TYPES: StarTypeConfig[] = [
  {
    id: "red-giant",
    name: "RED GIANT",
    description: "A warm, mature star nearing the end of its life",
  },
  {
    id: "blue-supergiant",
    name: "BLUE SUPERGIANT",
    description: "A hot, powerful star burning bright",
  },
  {
    id: "white-dwarf",
    name: "WHITE DWARF",
    description: "A compact, dense stellar remnant",
  },
  {
    id: "yellow-sun",
    name: "YELLOW SUN",
    description: "A classic sun-like star in its prime",
  },
  {
    id: "neutron",
    name: "NEUTRON STAR",
    description: "An exotic, incredibly dense remnant",
  },
  {
    id: "binary",
    name: "BINARY STAR",
    description: "A twin star system orbiting together",
  },
]

// Wallet types for Circle integration
export interface PlaceBetParams {
  marketId: string
  outcome: BetOutcome
  amount: number
  contractAddress: string
}

export interface TransactionResult {
  transactionId: string
  txHash?: string
  status: "PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED"
  errorReason?: string
}

export interface WalletInfo {
  walletId: string
  address: string
  isNew: boolean
}

export interface WalletBalanceInfo {
  address: string
  walletId: string
  arcBalance: string
  gatewayBalances: Array<{
    chain: string
    domain: number
    balance: string
    balanceUSDC: number
  }>
  totalBalance: string
}
