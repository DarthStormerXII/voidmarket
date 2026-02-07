/**
 * Minimal read-only ABIs for on-chain data reads from the gateway.
 * Subset of the frontend ABIs — only view functions needed for ENS enrichment.
 */

export const voidMarketCoreAbi = [
  {
    type: "function",
    name: "getMarket",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "question", type: "string" },
          { name: "creator", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "resolutionDeadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "outcome", type: "bool" },
          { name: "totalYesAmount", type: "uint256" },
          { name: "totalNoAmount", type: "uint256" },
          { name: "totalPool", type: "uint256" },
          { name: "isForked", type: "bool" },
          { name: "parentMarketId", type: "uint256" },
          { name: "revealDeadline", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketBets",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const clusterManagerAbi = [
  {
    type: "function",
    name: "getCluster",
    inputs: [{ name: "clusterId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "name", type: "string" },
          { name: "leader", type: "address" },
          { name: "energy", type: "uint256" },
          { name: "novasWon", type: "uint256" },
          { name: "totalNovas", type: "uint256" },
          { name: "isPrivate", type: "bool" },
          { name: "memberCount", type: "uint256" },
          { name: "maxMembers", type: "uint256" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMember",
    inputs: [{ name: "memberAddress", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "memberAddress", type: "address" },
          { name: "clusterId", type: "uint256" },
          { name: "photons", type: "uint256" },
          { name: "joinedAt", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getClusterTotalPhotons",
    inputs: [{ name: "clusterId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "clusterCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
