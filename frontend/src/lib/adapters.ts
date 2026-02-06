/**
 * Data Adapters
 *
 * Convert API response types to the component-compatible types
 * used by MarketCard, BetCard, etc.
 */

import type {
  Market,
  Bet,
  Cluster,
  ClusterMember,
  Nova,
  NovaMatch,
  ApiMarket,
  ApiBet,
  ApiCluster,
  ApiMember,
  ApiNova,
  ApiMatch,
  StarType,
  MarketCategory,
} from '@/types';

/**
 * Convert ApiMarket → Market (for MarketCard component)
 */
export function toMarket(api: ApiMarket): Market {
  return {
    id: String(api.id),
    title: api.question,
    description: api.question,
    category: api.category as MarketCategory,
    creatorAddress: api.creator,
    creatorName: api.creatorName,
    endDate: new Date(api.deadline),
    resolutionDate: api.resolutionDeadline ? new Date(api.resolutionDeadline) : undefined,
    outcome: api.outcome === true ? 'YES' : api.outcome === false ? 'NO' : undefined,
    totalBets: api.totalBets,
    totalPool: parseFloat(api.totalPool),
    resolutionCriteria: api.question, // On-chain only has question
    oracleType: api.oracleType as 'stork' | 'manual',
    oracleSource: api.oracleSource,
    status: api.status,
    createdAt: new Date(), // Not available on-chain
  };
}

/**
 * Convert ApiBet → Bet (for BetCard component)
 */
export function toBet(api: ApiBet, marketStatus?: string): Bet {
  // Determine bet status from on-chain data
  let status: Bet['status'] = 'in_void';
  if (api.claimed) {
    status = 'won';
  } else if (api.revealed && marketStatus === 'resolved') {
    status = 'claimable';
  } else if (marketStatus === 'resolved') {
    status = 'lost'; // Simplified — actual logic depends on direction vs outcome
  }

  return {
    id: String(api.id),
    marketId: String(api.marketId),
    marketTitle: api.marketQuestion || `Market #${api.marketId}`,
    userAddress: api.bettor,
    outcome: api.direction === true ? 'YES' : api.direction === false ? 'NO' : 'YES',
    amount: parseFloat(api.amount),
    status,
    placedAt: new Date(api.timestamp),
    commitmentHash: api.commitmentHash,
  };
}

/**
 * Convert ApiCluster → Cluster (for cluster components)
 */
export function toCluster(api: ApiCluster, members?: ApiMember[]): Cluster {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description,
    leaderId: api.leader,
    members: members ? members.map(toClusterMember) : [],
    energy: api.energy,
    totalNovas: api.totalNovas,
    novasWon: api.novasWon,
    createdAt: new Date(),
  };
}

/**
 * Convert ApiMember → ClusterMember
 */
export function toClusterMember(api: ApiMember): ClusterMember {
  return {
    odId: api.address,
    name: `${api.address.slice(0, 6)}...${api.address.slice(-4)}`,
    starType: getStarTypeFromAddress(api.address),
    photons: api.photons,
    novasPlayed: 0, // Not tracked in this view
    novasWon: 0,
    joinedAt: new Date(api.joinedAt),
  };
}

/**
 * Convert ApiNova → Nova (for nova components)
 */
export function toNova(
  api: ApiNova,
  matches: ApiMatch[],
  cluster1Name: string,
  cluster2Name: string
): Nova {
  return {
    id: String(api.id),
    cluster1Id: String(api.cluster1Id),
    cluster2Id: String(api.cluster2Id),
    cluster1Name,
    cluster2Name,
    status: api.status as Nova['status'],
    wagerAmount: parseFloat(api.prizePool),
    matches: matches.map((m) => toNovaMatch(m)),
    winnerId: api.winningClusterId ? String(api.winningClusterId) : undefined,
    startedAt: new Date(api.startedAt),
  };
}

/**
 * Convert ApiMatch → NovaMatch
 */
export function toNovaMatch(api: ApiMatch): NovaMatch {
  return {
    id: String(api.id),
    novaId: String(api.novaId),
    star1Id: api.star1,
    star2Id: api.star2,
    star1Name: `${api.star1.slice(0, 6)}...${api.star1.slice(-4)}`,
    star2Name: `${api.star2.slice(0, 6)}...${api.star2.slice(-4)}`,
    marketId: String(api.marketId),
    marketTitle: `Market #${api.marketId}`,
    photonsAwarded: api.star1Photons + api.star2Photons,
    status: api.status as NovaMatch['status'],
    winnerId: api.winner,
  };
}

/**
 * Deterministic star type from address hash
 */
export function getStarTypeFromAddress(address: string): StarType {
  const types: StarType[] = [
    'red-giant',
    'blue-supergiant',
    'white-dwarf',
    'yellow-sun',
    'neutron',
    'binary',
  ];
  // Simple hash: sum of char codes mod 6
  const hash = address
    .toLowerCase()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return types[hash % types.length];
}
