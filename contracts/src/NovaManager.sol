// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

interface IClusterManager {
    function updatePhotons(uint256 clusterId, address member, int256 delta) external;
    function updateEnergy(uint256 clusterId, int256 delta) external;
    function recordNovaResult(uint256 clusterId, bool won) external;
    function isMemberOf(address member, uint256 clusterId) external view returns (bool);
    function getClusterMembers(uint256 clusterId) external view returns (address[] memory);
}

interface IVoidMarketCore {
    function createMarket(
        string calldata question,
        uint256 deadline,
        uint256 resolutionDeadline
    ) external returns (uint256 marketId);

    function resolveMarket(uint256 marketId, bool outcome) external;
}

/**
 * @title NovaManager
 * @notice Manages Nova battles (cluster vs cluster competitions)
 * @dev Coordinates 1v1 matches between cluster members with betting markets
 *
 * Key Features:
 * - Cluster vs cluster battles
 * - Multi-round format with 1v1 matches
 * - Each match linked to a prediction market
 * - Winner determination by photon accumulation
 * - USDC rewards distribution
 */
contract NovaManager is ReentrancyGuard {
    // ============ Enums ============

    enum NovaStatus {
        PENDING,        // Waiting for both clusters to confirm
        ACTIVE,         // Nova in progress
        COMPLETED,      // Nova finished
        CANCELLED       // Nova cancelled
    }

    enum MatchStatus {
        PENDING,        // Match not started
        BETTING,        // Betting phase
        RESOLVED,       // Match resolved
        CANCELLED       // Match cancelled
    }

    // ============ Structs ============

    struct Nova {
        uint256 id;
        uint256 cluster1Id;
        uint256 cluster2Id;
        uint256 totalRounds;
        uint256 currentRound;
        NovaStatus status;
        uint256 prizePool;
        uint256 winningClusterId;
        uint256 cluster1TotalPhotons;
        uint256 cluster2TotalPhotons;
        uint256 startedAt;
        uint256 bettingDuration;      // Duration for each match betting
        uint256 matchesPerRound;
    }

    struct Match {
        uint256 id;
        uint256 novaId;
        uint256 round;
        address star1;               // From cluster 1
        address star2;               // From cluster 2
        uint256 marketId;            // Linked prediction market
        MatchStatus status;
        address winner;
        uint256 star1Photons;        // Photons earned
        uint256 star2Photons;
        uint256 bettingDeadline;
    }

    struct NovaReward {
        address starAddress;
        uint256 photonsEarned;
        uint256 usdcReward;
        bool claimed;
    }

    // ============ State Variables ============

    address public admin;
    IClusterManager public clusterManager;
    IVoidMarketCore public marketCore;

    uint256 public novaCount;
    uint256 public matchCount;

    uint256 public constant BASE_PHOTONS_WIN = 100;
    uint256 public constant BASE_PHOTONS_LOSE = 25;
    uint256 public constant ENERGY_BONUS_WIN = 500;
    uint256 public constant DEFAULT_BETTING_DURATION = 1 hours;
    uint256 public constant DEFAULT_MATCHES_PER_ROUND = 3;

    // Nova ID => Nova
    mapping(uint256 => Nova) public novas;

    // Match ID => Match
    mapping(uint256 => Match) public matches;

    // Nova ID => Round => Array of match IDs
    mapping(uint256 => mapping(uint256 => uint256[])) public roundMatches;

    // Nova ID => Array of all match IDs
    mapping(uint256 => uint256[]) public novaMatches;

    // Nova ID => Star address => NovaReward
    mapping(uint256 => mapping(address => NovaReward)) public novaRewards;

    // Nova ID => Array of star addresses with rewards
    mapping(uint256 => address[]) public novaParticipants;

    // ============ Events ============

    event NovaCreated(
        uint256 indexed novaId,
        uint256 indexed cluster1Id,
        uint256 indexed cluster2Id,
        uint256 totalRounds,
        uint256 prizePool
    );

    event NovaStarted(uint256 indexed novaId, uint256 startedAt);

    event MatchCreated(
        uint256 indexed matchId,
        uint256 indexed novaId,
        uint256 round,
        address star1,
        address star2,
        uint256 marketId
    );

    event MatchResolved(
        uint256 indexed matchId,
        uint256 indexed novaId,
        address winner,
        uint256 star1Photons,
        uint256 star2Photons
    );

    event RoundCompleted(
        uint256 indexed novaId,
        uint256 round,
        uint256 cluster1RoundPhotons,
        uint256 cluster2RoundPhotons
    );

    event NovaCompleted(
        uint256 indexed novaId,
        uint256 winningClusterId,
        uint256 cluster1TotalPhotons,
        uint256 cluster2TotalPhotons
    );

    event NovaCancelled(uint256 indexed novaId);

    event RewardClaimed(
        uint256 indexed novaId,
        address indexed star,
        uint256 photonsEarned,
        uint256 usdcReward
    );

    // ============ Errors ============

    error OnlyAdmin();
    error InvalidCluster();
    error SameCluster();
    error NovaNotFound();
    error NovaNotPending();
    error NovaNotActive();
    error NovaNotCompleted();
    error MatchNotFound();
    error MatchNotBetting();
    error MatchNotPending();
    error NotParticipant();
    error AlreadyClaimed();
    error NotWinningCluster();
    error InsufficientPrizePool();
    error TransferFailed();
    error RoundNotComplete();
    error InvalidAddress();

    // ============ Modifiers ============

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    // ============ Constructor ============

    constructor(address _clusterManager, address _marketCore) {
        admin = msg.sender;
        clusterManager = IClusterManager(_clusterManager);
        marketCore = IVoidMarketCore(_marketCore);
    }

    // ============ Admin Functions ============

    function setClusterManager(address _clusterManager) external onlyAdmin {
        if (_clusterManager == address(0)) revert InvalidAddress();
        clusterManager = IClusterManager(_clusterManager);
    }

    function setMarketCore(address _marketCore) external onlyAdmin {
        if (_marketCore == address(0)) revert InvalidAddress();
        marketCore = IVoidMarketCore(_marketCore);
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert InvalidAddress();
        admin = newAdmin;
    }

    // ============ Nova Functions ============

    /**
     * @notice Start a nova battle between two clusters
     * @param cluster1Id First cluster ID
     * @param cluster2Id Second cluster ID
     * @param totalRounds Number of rounds
     * @return novaId The ID of the created nova
     */
    function startNova(
        uint256 cluster1Id,
        uint256 cluster2Id,
        uint256 totalRounds
    ) external payable returns (uint256 novaId) {
        if (cluster1Id == cluster2Id) revert SameCluster();

        // Verify clusters exist by checking member count
        address[] memory members1 = clusterManager.getClusterMembers(cluster1Id);
        address[] memory members2 = clusterManager.getClusterMembers(cluster2Id);
        if (members1.length == 0) revert InvalidCluster();
        if (members2.length == 0) revert InvalidCluster();

        novaId = ++novaCount;

        novas[novaId] = Nova({
            id: novaId,
            cluster1Id: cluster1Id,
            cluster2Id: cluster2Id,
            totalRounds: totalRounds,
            currentRound: 0,
            status: NovaStatus.ACTIVE,
            prizePool: msg.value,
            winningClusterId: 0,
            cluster1TotalPhotons: 0,
            cluster2TotalPhotons: 0,
            startedAt: block.timestamp,
            bettingDuration: DEFAULT_BETTING_DURATION,
            matchesPerRound: DEFAULT_MATCHES_PER_ROUND
        });

        emit NovaCreated(novaId, cluster1Id, cluster2Id, totalRounds, msg.value);
        emit NovaStarted(novaId, block.timestamp);

        // Create matches for first round
        _createRoundMatches(novaId, 1, members1, members2);
    }

    /**
     * @notice Create a match for a nova round
     * @param novaId The nova ID
     * @param star1 Star from cluster 1
     * @param star2 Star from cluster 2
     * @return matchId The ID of the created match
     */
    function createMatch(
        uint256 novaId,
        address star1,
        address star2
    ) external onlyAdmin returns (uint256 matchId) {
        Nova storage nova = novas[novaId];
        if (nova.id == 0) revert NovaNotFound();
        if (nova.status != NovaStatus.ACTIVE) revert NovaNotActive();

        // Verify stars are in correct clusters
        if (!clusterManager.isMemberOf(star1, nova.cluster1Id)) revert NotParticipant();
        if (!clusterManager.isMemberOf(star2, nova.cluster2Id)) revert NotParticipant();

        matchId = _createMatch(novaId, nova.currentRound + 1, star1, star2);
    }

    /**
     * @notice Resolve a match with the outcome
     * @param matchId The match to resolve
     * @param outcome true = star1 wins, false = star2 wins
     */
    function resolveMatch(
        uint256 matchId,
        bool outcome
    ) external onlyAdmin {
        Match storage m = matches[matchId];
        if (m.id == 0) revert MatchNotFound();
        if (m.status != MatchStatus.BETTING) revert MatchNotBetting();

        Nova storage nova = novas[m.novaId];

        m.status = MatchStatus.RESOLVED;
        m.winner = outcome ? m.star1 : m.star2;

        // Calculate photons
        m.star1Photons = outcome ? BASE_PHOTONS_WIN : BASE_PHOTONS_LOSE;
        m.star2Photons = outcome ? BASE_PHOTONS_LOSE : BASE_PHOTONS_WIN;

        // Update cluster totals
        nova.cluster1TotalPhotons += m.star1Photons;
        nova.cluster2TotalPhotons += m.star2Photons;

        // Update individual photons via ClusterManager
        clusterManager.updatePhotons(nova.cluster1Id, m.star1, int256(m.star1Photons));
        clusterManager.updatePhotons(nova.cluster2Id, m.star2, int256(m.star2Photons));

        // Track rewards
        _trackReward(m.novaId, m.star1, m.star1Photons);
        _trackReward(m.novaId, m.star2, m.star2Photons);

        // Resolve linked market
        if (m.marketId > 0) {
            marketCore.resolveMarket(m.marketId, outcome);
        }

        emit MatchResolved(matchId, m.novaId, m.winner, m.star1Photons, m.star2Photons);
    }

    /**
     * @notice Advance to the next round
     * @param novaId The nova ID
     */
    function advanceRound(uint256 novaId) external onlyAdmin {
        Nova storage nova = novas[novaId];
        if (nova.id == 0) revert NovaNotFound();
        if (nova.status != NovaStatus.ACTIVE) revert NovaNotActive();

        // Check all matches in current round are resolved
        uint256[] storage currentMatches = roundMatches[novaId][nova.currentRound];
        for (uint256 i = 0; i < currentMatches.length; i++) {
            if (matches[currentMatches[i]].status != MatchStatus.RESOLVED) {
                revert RoundNotComplete();
            }
        }

        uint256 cluster1RoundPhotons = 0;
        uint256 cluster2RoundPhotons = 0;
        for (uint256 i = 0; i < currentMatches.length; i++) {
            Match storage m = matches[currentMatches[i]];
            cluster1RoundPhotons += m.star1Photons;
            cluster2RoundPhotons += m.star2Photons;
        }

        emit RoundCompleted(novaId, nova.currentRound, cluster1RoundPhotons, cluster2RoundPhotons);

        nova.currentRound++;

        // Check if nova is complete
        if (nova.currentRound >= nova.totalRounds) {
            _completeNova(novaId);
        } else {
            // Create matches for next round
            address[] memory members1 = clusterManager.getClusterMembers(nova.cluster1Id);
            address[] memory members2 = clusterManager.getClusterMembers(nova.cluster2Id);
            _createRoundMatches(novaId, nova.currentRound + 1, members1, members2);
        }
    }

    /**
     * @notice Claim nova rewards
     * @param novaId The nova ID
     */
    function claimReward(uint256 novaId) external nonReentrant {
        Nova storage nova = novas[novaId];
        if (nova.id == 0) revert NovaNotFound();
        if (nova.status != NovaStatus.COMPLETED) revert NovaNotCompleted();

        NovaReward storage reward = novaRewards[novaId][msg.sender];
        if (reward.photonsEarned == 0) revert NotParticipant();
        if (reward.claimed) revert AlreadyClaimed();

        // Only winning cluster members get USDC rewards
        bool isWinningCluster = clusterManager.isMemberOf(msg.sender, nova.winningClusterId);
        if (!isWinningCluster) revert NotWinningCluster();

        reward.claimed = true;

        // Calculate proportional reward
        uint256 winningPhotons = nova.winningClusterId == nova.cluster1Id
            ? nova.cluster1TotalPhotons
            : nova.cluster2TotalPhotons;

        if (winningPhotons > 0 && nova.prizePool > 0) {
            reward.usdcReward = (reward.photonsEarned * nova.prizePool) / winningPhotons;

            (bool success, ) = msg.sender.call{value: reward.usdcReward}("");
            if (!success) revert TransferFailed();
        }

        emit RewardClaimed(novaId, msg.sender, reward.photonsEarned, reward.usdcReward);
    }

    /**
     * @notice Cancel a nova (admin only, refunds prize pool)
     * @param novaId The nova ID
     */
    function cancelNova(uint256 novaId) external onlyAdmin nonReentrant {
        Nova storage nova = novas[novaId];
        if (nova.id == 0) revert NovaNotFound();
        if (nova.status == NovaStatus.COMPLETED || nova.status == NovaStatus.CANCELLED) {
            revert NovaNotActive();
        }

        nova.status = NovaStatus.CANCELLED;

        // Cancel all pending matches
        uint256[] storage allMatches = novaMatches[novaId];
        for (uint256 i = 0; i < allMatches.length; i++) {
            Match storage m = matches[allMatches[i]];
            if (m.status == MatchStatus.PENDING || m.status == MatchStatus.BETTING) {
                m.status = MatchStatus.CANCELLED;
            }
        }

        // Refund prize pool to admin (or could split between clusters)
        if (nova.prizePool > 0) {
            (bool success, ) = admin.call{value: nova.prizePool}("");
            if (!success) revert TransferFailed();
        }

        emit NovaCancelled(novaId);
    }

    // ============ Internal Functions ============

    function _createRoundMatches(
        uint256 novaId,
        uint256 round,
        address[] memory members1,
        address[] memory members2
    ) internal {
        Nova storage nova = novas[novaId];
        uint256 matchesToCreate = nova.matchesPerRound;

        // Simple matching: pair members by index (with wraparound)
        for (uint256 i = 0; i < matchesToCreate; i++) {
            address star1 = members1[i % members1.length];
            address star2 = members2[i % members2.length];
            _createMatch(novaId, round, star1, star2);
        }
    }

    function _createMatch(
        uint256 novaId,
        uint256 round,
        address star1,
        address star2
    ) internal returns (uint256 matchId) {
        Nova storage nova = novas[novaId];

        matchId = ++matchCount;

        // Create linked prediction market
        string memory question = string(abi.encodePacked(
            "Nova #", _uint2str(novaId), " Round ", _uint2str(round),
            ": Will Star 1 win?"
        ));

        uint256 marketId = marketCore.createMarket(
            question,
            block.timestamp + nova.bettingDuration,
            block.timestamp + nova.bettingDuration + 1 hours
        );

        matches[matchId] = Match({
            id: matchId,
            novaId: novaId,
            round: round,
            star1: star1,
            star2: star2,
            marketId: marketId,
            status: MatchStatus.BETTING,
            winner: address(0),
            star1Photons: 0,
            star2Photons: 0,
            bettingDeadline: block.timestamp + nova.bettingDuration
        });

        roundMatches[novaId][round].push(matchId);
        novaMatches[novaId].push(matchId);

        emit MatchCreated(matchId, novaId, round, star1, star2, marketId);
    }

    function _completeNova(uint256 novaId) internal {
        Nova storage nova = novas[novaId];

        nova.status = NovaStatus.COMPLETED;

        // Determine winner
        if (nova.cluster1TotalPhotons > nova.cluster2TotalPhotons) {
            nova.winningClusterId = nova.cluster1Id;
        } else if (nova.cluster2TotalPhotons > nova.cluster1TotalPhotons) {
            nova.winningClusterId = nova.cluster2Id;
        } else {
            // Tie: cluster1 wins (could implement tiebreaker)
            nova.winningClusterId = nova.cluster1Id;
        }

        // Update cluster stats
        clusterManager.recordNovaResult(nova.cluster1Id, nova.winningClusterId == nova.cluster1Id);
        clusterManager.recordNovaResult(nova.cluster2Id, nova.winningClusterId == nova.cluster2Id);

        // Award energy bonus to winner
        clusterManager.updateEnergy(nova.winningClusterId, int256(ENERGY_BONUS_WIN));

        emit NovaCompleted(
            novaId,
            nova.winningClusterId,
            nova.cluster1TotalPhotons,
            nova.cluster2TotalPhotons
        );
    }

    function _trackReward(uint256 novaId, address star, uint256 photons) internal {
        NovaReward storage reward = novaRewards[novaId][star];

        if (reward.photonsEarned == 0) {
            novaParticipants[novaId].push(star);
            reward.starAddress = star;
        }

        reward.photonsEarned += photons;
    }

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    // ============ View Functions ============

    function getNova(uint256 novaId) external view returns (Nova memory) {
        return novas[novaId];
    }

    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    function getRoundMatches(uint256 novaId, uint256 round) external view returns (uint256[] memory) {
        return roundMatches[novaId][round];
    }

    function getNovaMatches(uint256 novaId) external view returns (uint256[] memory) {
        return novaMatches[novaId];
    }

    function getNovaParticipants(uint256 novaId) external view returns (address[] memory) {
        return novaParticipants[novaId];
    }

    function getReward(uint256 novaId, address star) external view returns (NovaReward memory) {
        return novaRewards[novaId][star];
    }

    // ============ Receive ============

    receive() external payable {}
}
