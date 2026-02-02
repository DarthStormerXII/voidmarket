/**
 * Contract Addresses Configuration
 *
 * Addresses are populated after deploying contracts to Arc Testnet
 *
 * Deployment Instructions:
 * 1. cd contracts
 * 2. cp .env.example .env && edit with your private key
 * 3. forge script script/Deploy.s.sol --rpc-url $ARC_TESTNET_RPC_URL --broadcast
 * 4. Copy the output addresses to flow-testing/.env
 */

import 'dotenv/config';
import type { Address } from 'viem';

// Contract addresses (populated after deployment)
export const CONTRACT_ADDRESSES = {
  VOID_MARKET_CORE: (process.env.VOIDMARKET_CORE_ADDRESS || '') as Address,
  CLUSTER_MANAGER: (process.env.CLUSTER_MANAGER_ADDRESS || '') as Address,
  NOVA_MANAGER: (process.env.NOVA_MANAGER_ADDRESS || '') as Address,
  VOID_MARKET_RESOLVER: (process.env.VOIDMARKET_RESOLVER_ADDRESS || '') as Address,
} as const;

// Helper to check if an address is configured
export function isAddressConfigured(address: string): address is Address {
  return Boolean(address && address.startsWith('0x') && address.length === 42);
}

// Check if contracts are deployed
export function areContractsDeployed(): boolean {
  return Boolean(
    CONTRACT_ADDRESSES.VOID_MARKET_CORE &&
      CONTRACT_ADDRESSES.CLUSTER_MANAGER &&
      CONTRACT_ADDRESSES.NOVA_MANAGER
  );
}

// Contract ABIs (will be generated from Foundry compilation)
// For now, define minimal interfaces

export const VOID_MARKET_CORE_ABI = [
  // Market creation
  'function createMarket(string question, uint256 deadline, uint256 resolutionDeadline) returns (uint256)',
  'function createForkedMarket(uint256 parentMarketId, string customQuestion, uint256 deadline, uint256 resolutionDeadline) returns (uint256)',

  // Betting
  'function placeBet(uint256 marketId, bytes32 commitmentHash) payable returns (uint256)',
  'function revealBet(uint256 betId, bool direction, bytes32 salt)',
  'function claimWinnings(uint256 betId)',

  // Resolution
  'function resolveMarket(uint256 marketId, bool outcome)',
  'function cancelMarket(uint256 marketId)',

  // View functions
  'function getMarket(uint256 marketId) view returns (tuple(uint256 id, string question, address creator, uint256 deadline, uint256 resolutionDeadline, uint8 status, bool outcome, uint256 totalYesAmount, uint256 totalNoAmount, uint256 totalPool, bool isForked, uint256 parentMarketId, uint256 revealDeadline))',
  'function getBet(uint256 betId) view returns (tuple(address bettor, uint256 marketId, uint256 amount, bytes32 commitmentHash, bool revealed, bool direction, uint256 timestamp, bool claimed))',
  'function getUserBets(uint256 marketId, address user) view returns (uint256[])',
  'function generateCommitment(bool direction, bytes32 salt) pure returns (bytes32)',

  // Events
  'event MarketCreated(uint256 indexed marketId, address indexed creator, string question, uint256 deadline, uint256 resolutionDeadline, bool isForked, uint256 parentMarketId)',
  'event BetPlaced(uint256 indexed betId, uint256 indexed marketId, address indexed bettor, uint256 amount, bytes32 commitmentHash)',
  'event BetRevealed(uint256 indexed betId, uint256 indexed marketId, address indexed bettor, bool direction)',
  'event MarketResolved(uint256 indexed marketId, bool outcome, uint256 totalYesAmount, uint256 totalNoAmount)',
  'event WinningsClaimed(uint256 indexed betId, uint256 indexed marketId, address indexed claimer, uint256 amount)',
] as const;

export const CLUSTER_MANAGER_ABI = [
  // Cluster management
  'function createCluster(string name, bool isPrivate) returns (uint256)',
  'function inviteToCluster(uint256 clusterId, address invitee) returns (bytes32)',
  'function joinCluster(uint256 clusterId, bytes32 inviteCode)',
  'function leaveCluster()',
  'function transferLeadership(uint256 clusterId, address newLeader)',

  // View functions
  'function getCluster(uint256 clusterId) view returns (tuple(uint256 id, string name, address leader, uint256 energy, uint256 novasWon, uint256 totalNovas, bool isPrivate, uint256 memberCount, uint256 maxMembers, uint256 createdAt))',
  'function getMember(address memberAddress) view returns (tuple(address memberAddress, uint256 clusterId, uint256 photons, uint256 joinedAt, bool isActive))',
  'function getClusterMembers(uint256 clusterId) view returns (address[])',
  'function isMemberOf(address memberAddress, uint256 clusterId) view returns (bool)',
  'function getClusterTotalPhotons(uint256 clusterId) view returns (uint256)',

  // Events
  'event ClusterCreated(uint256 indexed clusterId, address indexed leader, string name, bool isPrivate)',
  'event MemberJoined(uint256 indexed clusterId, address indexed member, bytes32 inviteCode)',
  'event MemberLeft(uint256 indexed clusterId, address indexed member)',
  'event PhotonsUpdated(uint256 indexed clusterId, address indexed member, int256 delta, uint256 newTotal)',
  'event EnergyUpdated(uint256 indexed clusterId, int256 delta, uint256 newTotal)',
] as const;

export const NOVA_MANAGER_ABI = [
  // Nova management
  'function startNova(uint256 cluster1Id, uint256 cluster2Id, uint256 totalRounds) payable returns (uint256)',
  'function createMatch(uint256 novaId, address star1, address star2) returns (uint256)',
  'function resolveMatch(uint256 matchId, bool outcome)',
  'function advanceRound(uint256 novaId)',
  'function claimReward(uint256 novaId)',
  'function cancelNova(uint256 novaId)',

  // View functions
  'function getNova(uint256 novaId) view returns (tuple(uint256 id, uint256 cluster1Id, uint256 cluster2Id, uint256 totalRounds, uint256 currentRound, uint8 status, uint256 prizePool, uint256 winningClusterId, uint256 cluster1TotalPhotons, uint256 cluster2TotalPhotons, uint256 startedAt, uint256 bettingDuration, uint256 matchesPerRound))',
  'function getMatch(uint256 matchId) view returns (tuple(uint256 id, uint256 novaId, uint256 round, address star1, address star2, uint256 marketId, uint8 status, address winner, uint256 star1Photons, uint256 star2Photons, uint256 bettingDeadline))',
  'function getNovaMatches(uint256 novaId) view returns (uint256[])',
  'function getReward(uint256 novaId, address star) view returns (tuple(address starAddress, uint256 photonsEarned, uint256 usdcReward, bool claimed))',

  // Events
  'event NovaCreated(uint256 indexed novaId, uint256 indexed cluster1Id, uint256 indexed cluster2Id, uint256 totalRounds, uint256 prizePool)',
  'event NovaStarted(uint256 indexed novaId, uint256 startedAt)',
  'event MatchCreated(uint256 indexed matchId, uint256 indexed novaId, uint256 round, address star1, address star2, uint256 marketId)',
  'event MatchResolved(uint256 indexed matchId, uint256 indexed novaId, address winner, uint256 star1Photons, uint256 star2Photons)',
  'event NovaCompleted(uint256 indexed novaId, uint256 winningClusterId, uint256 cluster1TotalPhotons, uint256 cluster2TotalPhotons)',
  'event RewardClaimed(uint256 indexed novaId, address indexed star, uint256 photonsEarned, uint256 usdcReward)',
] as const;

// ===================
// Deployment Helpers
// ===================

/**
 * Get detailed deployment status
 */
export function getDeploymentStatus(): {
  deployed: boolean;
  contracts: {
    voidMarketCore: { address: Address | ''; configured: boolean };
    clusterManager: { address: Address | ''; configured: boolean };
    novaManager: { address: Address | ''; configured: boolean };
    voidMarketResolver: { address: Address | ''; configured: boolean };
  };
  missing: string[];
} {
  const status = {
    voidMarketCore: {
      address: CONTRACT_ADDRESSES.VOID_MARKET_CORE,
      configured: isAddressConfigured(CONTRACT_ADDRESSES.VOID_MARKET_CORE),
    },
    clusterManager: {
      address: CONTRACT_ADDRESSES.CLUSTER_MANAGER,
      configured: isAddressConfigured(CONTRACT_ADDRESSES.CLUSTER_MANAGER),
    },
    novaManager: {
      address: CONTRACT_ADDRESSES.NOVA_MANAGER,
      configured: isAddressConfigured(CONTRACT_ADDRESSES.NOVA_MANAGER),
    },
    voidMarketResolver: {
      address: CONTRACT_ADDRESSES.VOID_MARKET_RESOLVER,
      configured: isAddressConfigured(CONTRACT_ADDRESSES.VOID_MARKET_RESOLVER),
    },
  };

  const missing: string[] = [];
  if (!status.voidMarketCore.configured) missing.push('VOIDMARKET_CORE_ADDRESS');
  if (!status.clusterManager.configured) missing.push('CLUSTER_MANAGER_ADDRESS');
  if (!status.novaManager.configured) missing.push('NOVA_MANAGER_ADDRESS');
  if (!status.voidMarketResolver.configured) missing.push('VOIDMARKET_RESOLVER_ADDRESS');

  return {
    deployed: missing.length === 0,
    contracts: status,
    missing,
  };
}

/**
 * Print deployment status to console
 */
export function printDeploymentStatus(): void {
  const status = getDeploymentStatus();

  console.log('\n=== VoidMarket Contract Deployment Status ===\n');

  console.log('VoidMarketCore:');
  console.log(`  Address: ${status.contracts.voidMarketCore.address || '(not configured)'}`);
  console.log(`  Status:  ${status.contracts.voidMarketCore.configured ? '✓ Ready' : '✗ Missing'}`);

  console.log('\nClusterManager:');
  console.log(`  Address: ${status.contracts.clusterManager.address || '(not configured)'}`);
  console.log(`  Status:  ${status.contracts.clusterManager.configured ? '✓ Ready' : '✗ Missing'}`);

  console.log('\nNovaManager:');
  console.log(`  Address: ${status.contracts.novaManager.address || '(not configured)'}`);
  console.log(`  Status:  ${status.contracts.novaManager.configured ? '✓ Ready' : '✗ Missing'}`);

  console.log('\nVoidMarketResolver:');
  console.log(`  Address: ${status.contracts.voidMarketResolver.address || '(not configured)'}`);
  console.log(`  Status:  ${status.contracts.voidMarketResolver.configured ? '✓ Ready' : '✗ Missing'}`);

  console.log('\n');

  if (status.deployed) {
    console.log('✓ All contracts are deployed and configured!');
  } else {
    console.log('✗ Missing contract addresses:', status.missing.join(', '));
    console.log('\nTo deploy contracts:');
    console.log('  1. cd contracts');
    console.log('  2. cp .env.example .env && edit with your private key');
    console.log('  3. forge script script/Deploy.s.sol --rpc-url $ARC_TESTNET_RPC_URL --broadcast');
    console.log('  4. Copy the output addresses to flow-testing/.env');
  }

  console.log('\n');
}

/**
 * Require all contracts to be deployed before proceeding
 * @throws Error if any contract is not deployed
 */
export function requireDeployment(): void {
  const status = getDeploymentStatus();
  if (!status.deployed) {
    throw new Error(
      `Contracts not deployed. Missing: ${status.missing.join(', ')}\n` +
        'Run: cd contracts && forge script script/Deploy.s.sol --rpc-url $ARC_TESTNET_RPC_URL --broadcast'
    );
  }
}

// ===================
// Arc Testnet Info
// ===================

export const ARC_TESTNET = {
  chainId: 5042002,
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorer: 'https://testnet.arcscan.app',
  faucet: 'https://faucet.testnet.arc.network',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
} as const;

/**
 * Get explorer URL for a contract address
 */
export function getContractExplorerUrl(address: Address): string {
  return `${ARC_TESTNET.explorer}/address/${address}`;
}

/**
 * Get explorer URL for a transaction hash
 */
export function getTxExplorerUrl(txHash: string): string {
  return `${ARC_TESTNET.explorer}/tx/${txHash}`;
}
