/**
 * Contract ABIs — Minimal view-function ABIs extracted from compiled contracts.
 */

export const voidMarketCoreAbi = [
  {
    type: 'function',
    name: 'getMarket',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'question', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'resolutionDeadline', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'outcome', type: 'bool' },
          { name: 'totalYesAmount', type: 'uint256' },
          { name: 'totalNoAmount', type: 'uint256' },
          { name: 'totalPool', type: 'uint256' },
          { name: 'isForked', type: 'bool' },
          { name: 'parentMarketId', type: 'uint256' },
          { name: 'revealDeadline', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBet',
    inputs: [{ name: 'betId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'bettor', type: 'address' },
          { name: 'marketId', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'commitmentHash', type: 'bytes32' },
          { name: 'revealed', type: 'bool' },
          { name: 'direction', type: 'bool' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'claimed', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserBets',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMarketBets',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getForkedMarkets',
    inputs: [{ name: 'parentMarketId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'generateCommitment',
    inputs: [
      { name: 'direction', type: 'bool' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'calculatePotentialPayout',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'direction', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'marketCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'betCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const clusterManagerAbi = [
  {
    type: 'function',
    name: 'getCluster',
    inputs: [{ name: 'clusterId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'leader', type: 'address' },
          { name: 'energy', type: 'uint256' },
          { name: 'novasWon', type: 'uint256' },
          { name: 'totalNovas', type: 'uint256' },
          { name: 'isPrivate', type: 'bool' },
          { name: 'memberCount', type: 'uint256' },
          { name: 'maxMembers', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMember',
    inputs: [{ name: 'memberAddress', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'memberAddress', type: 'address' },
          { name: 'clusterId', type: 'uint256' },
          { name: 'photons', type: 'uint256' },
          { name: 'joinedAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClusterMembers',
    inputs: [{ name: 'clusterId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClusterMemberDetails',
    inputs: [{ name: 'clusterId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'memberAddress', type: 'address' },
          { name: 'clusterId', type: 'uint256' },
          { name: 'photons', type: 'uint256' },
          { name: 'joinedAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClusterTotalPhotons',
    inputs: [{ name: 'clusterId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'clusterCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const novaManagerAbi = [
  {
    type: 'function',
    name: 'getNova',
    inputs: [{ name: 'novaId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'cluster1Id', type: 'uint256' },
          { name: 'cluster2Id', type: 'uint256' },
          { name: 'totalRounds', type: 'uint256' },
          { name: 'currentRound', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'prizePool', type: 'uint256' },
          { name: 'winningClusterId', type: 'uint256' },
          { name: 'cluster1TotalPhotons', type: 'uint256' },
          { name: 'cluster2TotalPhotons', type: 'uint256' },
          { name: 'startedAt', type: 'uint256' },
          { name: 'bettingDuration', type: 'uint256' },
          { name: 'matchesPerRound', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMatch',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'novaId', type: 'uint256' },
          { name: 'round', type: 'uint256' },
          { name: 'star1', type: 'address' },
          { name: 'star2', type: 'address' },
          { name: 'marketId', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'winner', type: 'address' },
          { name: 'star1Photons', type: 'uint256' },
          { name: 'star2Photons', type: 'uint256' },
          { name: 'bettingDeadline', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNovaMatches',
    inputs: [{ name: 'novaId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRoundMatches',
    inputs: [
      { name: 'novaId', type: 'uint256' },
      { name: 'round', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'novaCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'matchCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
