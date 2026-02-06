export interface ResolvedEntity {
  type: "star" | "market" | "cluster";
  walletAddress?: string;
  textRecords: Record<string, string>;
  contenthash?: string;
}

export interface StarRecord {
  name: string;
  walletAddress: string;
  starType: string;
  description?: string | null;
  clusterId?: string | null;
  totalPhotons: number;
  betsWon: number;
  betsLost: number;
  createdAt: Date;
}

export interface MarketRecord {
  name: string;
  onChainId: number;
  category: string;
  oracleType: string;
  oracleSource?: string | null;
  creatorName?: string | null;
  createdAt: Date;
}

export interface ClusterRecord {
  name: string;
  onChainId: number;
  description?: string | null;
  avatarUrl?: string | null;
  createdAt: Date;
}
