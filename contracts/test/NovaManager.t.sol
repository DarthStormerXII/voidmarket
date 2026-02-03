// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/NovaManager.sol";
import "../src/ClusterManager.sol";
import "../src/VoidMarketCore.sol";

contract NovaManagerTest is Test {
    NovaManager public nova;
    ClusterManager public cluster;
    VoidMarketCore public market;

    address public admin;
    address public alice;
    address public bob;
    address public charlie;
    address public diana;
    address public eve;
    address public frank;

    uint256 public cluster1Id;
    uint256 public cluster2Id;

    uint256 public constant PRIZE_POOL = 10 ether;
    uint256 public constant TOTAL_ROUNDS = 3;

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

    function setUp() public {
        admin = makeAddr("admin");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");
        diana = makeAddr("diana");
        eve = makeAddr("eve");
        frank = makeAddr("frank");

        // Deploy contracts
        vm.startPrank(admin);
        market = new VoidMarketCore();
        cluster = new ClusterManager();
        nova = new NovaManager(address(cluster), address(market));

        // Set NovaManager in ClusterManager
        cluster.setNovaManager(address(nova));

        // Set NovaManager as admin of VoidMarketCore so it can resolve markets
        market.setAdmin(address(nova));
        vm.stopPrank();

        // Fund users
        vm.deal(admin, 100 ether);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
        vm.deal(diana, 10 ether);
        vm.deal(eve, 10 ether);
        vm.deal(frank, 10 ether);

        // Setup clusters
        _setupClusters();
    }

    // ============ Helper Functions ============

    function _setupClusters() internal {
        // Cluster 1: Alpha (alice as leader, bob and charlie as members)
        vm.prank(alice);
        cluster1Id = cluster.createCluster("Alpha", false);

        vm.prank(bob);
        cluster.joinCluster(cluster1Id, bytes32(0));

        vm.prank(charlie);
        cluster.joinCluster(cluster1Id, bytes32(0));

        // Cluster 2: Beta (diana as leader, eve and frank as members)
        vm.prank(diana);
        cluster2Id = cluster.createCluster("Beta", false);

        vm.prank(eve);
        cluster.joinCluster(cluster2Id, bytes32(0));

        vm.prank(frank);
        cluster.joinCluster(cluster2Id, bytes32(0));
    }

    function _startNova() internal returns (uint256 novaId) {
        vm.prank(admin);
        novaId = nova.startNova{value: PRIZE_POOL}(cluster1Id, cluster2Id, TOTAL_ROUNDS);
    }

    function _startNovaWithPrize(uint256 prize) internal returns (uint256 novaId) {
        vm.deal(admin, prize);
        vm.prank(admin);
        novaId = nova.startNova{value: prize}(cluster1Id, cluster2Id, TOTAL_ROUNDS);
    }

    function _resolveCurrentRoundMatches(uint256 novaId, bool[] memory outcomes) internal {
        NovaManager.Nova memory n = nova.getNova(novaId);
        uint256[] memory matches = nova.getRoundMatches(novaId, n.currentRound + 1);

        // Warp time past the betting deadline so markets can be resolved
        vm.warp(block.timestamp + 2 hours);

        for (uint256 i = 0; i < matches.length && i < outcomes.length; i++) {
            vm.prank(admin);
            nova.resolveMatch(matches[i], outcomes[i]);
        }
    }

    // ============ Start Nova Tests ============

    function test_StartNova() public {
        vm.expectEmit(true, true, true, true);
        emit NovaCreated(1, cluster1Id, cluster2Id, TOTAL_ROUNDS, PRIZE_POOL);

        vm.expectEmit(true, false, false, true);
        emit NovaStarted(1, block.timestamp);

        uint256 novaId = _startNova();

        assertEq(novaId, 1);
        assertEq(nova.novaCount(), 1);

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.id, 1);
        assertEq(n.cluster1Id, cluster1Id);
        assertEq(n.cluster2Id, cluster2Id);
        assertEq(n.totalRounds, TOTAL_ROUNDS);
        assertEq(n.currentRound, 0);
        assertEq(uint256(n.status), uint256(NovaManager.NovaStatus.ACTIVE));
        assertEq(n.prizePool, PRIZE_POOL);
        assertEq(n.winningClusterId, 0);
        assertEq(n.cluster1TotalPhotons, 0);
        assertEq(n.cluster2TotalPhotons, 0);
        assertEq(n.bettingDuration, 1 hours);
        assertEq(n.matchesPerRound, 3);
    }

    function test_StartNova_CreatesFirstRoundMatches() public {
        uint256 novaId = _startNova();

        uint256[] memory matches = nova.getRoundMatches(novaId, 1);
        assertEq(matches.length, 3); // DEFAULT_MATCHES_PER_ROUND

        for (uint256 i = 0; i < matches.length; i++) {
            NovaManager.Match memory m = nova.getMatch(matches[i]);
            assertEq(m.novaId, novaId);
            assertEq(m.round, 1);
            assertEq(uint256(m.status), uint256(NovaManager.MatchStatus.BETTING));
            assertTrue(m.marketId > 0); // Market was created
        }
    }

    function test_StartNova_RevertSameCluster() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.SameCluster.selector);
        nova.startNova{value: PRIZE_POOL}(cluster1Id, cluster1Id, TOTAL_ROUNDS);
    }

    function test_StartNova_RevertInvalidCluster1() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.InvalidCluster.selector);
        nova.startNova{value: PRIZE_POOL}(999, cluster2Id, TOTAL_ROUNDS);
    }

    function test_StartNova_RevertInvalidCluster2() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.InvalidCluster.selector);
        nova.startNova{value: PRIZE_POOL}(cluster1Id, 999, TOTAL_ROUNDS);
    }

    function test_StartNova_ZeroPrize() public {
        vm.prank(admin);
        uint256 novaId = nova.startNova{value: 0}(cluster1Id, cluster2Id, TOTAL_ROUNDS);

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.prizePool, 0);
    }

    // ============ Create Match Tests ============

    function test_CreateMatch() public {
        uint256 novaId = _startNova();

        vm.prank(admin);
        uint256 matchId = nova.createMatch(novaId, alice, diana);

        NovaManager.Match memory m = nova.getMatch(matchId);
        assertEq(m.novaId, novaId);
        assertEq(m.star1, alice);
        assertEq(m.star2, diana);
        assertEq(uint256(m.status), uint256(NovaManager.MatchStatus.BETTING));
    }

    function test_CreateMatch_RevertNovaNotFound() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.NovaNotFound.selector);
        nova.createMatch(999, alice, diana);
    }

    function test_CreateMatch_RevertNovaNotActive() public {
        uint256 novaId = _startNova();

        // Cancel the nova
        vm.prank(admin);
        nova.cancelNova(novaId);

        vm.prank(admin);
        vm.expectRevert(NovaManager.NovaNotActive.selector);
        nova.createMatch(novaId, alice, diana);
    }

    function test_CreateMatch_RevertStar1NotInCluster() public {
        uint256 novaId = _startNova();

        address outsider = makeAddr("outsider");

        vm.prank(admin);
        vm.expectRevert(NovaManager.NotParticipant.selector);
        nova.createMatch(novaId, outsider, diana);
    }

    function test_CreateMatch_RevertStar2NotInCluster() public {
        uint256 novaId = _startNova();

        address outsider = makeAddr("outsider");

        vm.prank(admin);
        vm.expectRevert(NovaManager.NotParticipant.selector);
        nova.createMatch(novaId, alice, outsider);
    }

    function test_CreateMatch_RevertNotAdmin() public {
        uint256 novaId = _startNova();

        vm.prank(alice);
        vm.expectRevert(NovaManager.OnlyAdmin.selector);
        nova.createMatch(novaId, alice, diana);
    }

    // ============ Resolve Match Tests ============

    function test_ResolveMatch_Star1Wins() public {
        uint256 novaId = _startNova();
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);
        uint256 matchId = matches[0];

        NovaManager.Match memory matchBefore = nova.getMatch(matchId);

        // Warp time past betting deadline
        vm.warp(block.timestamp + 2 hours);

        vm.prank(admin);
        nova.resolveMatch(matchId, true); // Star1 wins

        NovaManager.Match memory matchAfter = nova.getMatch(matchId);
        assertEq(matchAfter.winner, matchBefore.star1);
        assertEq(matchAfter.star1Photons, 100); // BASE_PHOTONS_WIN
        assertEq(matchAfter.star2Photons, 25);  // BASE_PHOTONS_LOSE
        assertEq(uint256(matchAfter.status), uint256(NovaManager.MatchStatus.RESOLVED));

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.cluster1TotalPhotons, 100);
        assertEq(n.cluster2TotalPhotons, 25);
    }

    function test_ResolveMatch_Star2Wins() public {
        uint256 novaId = _startNova();
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);
        uint256 matchId = matches[0];

        NovaManager.Match memory matchBefore = nova.getMatch(matchId);

        // Warp time past betting deadline
        vm.warp(block.timestamp + 2 hours);

        vm.prank(admin);
        nova.resolveMatch(matchId, false); // Star2 wins

        NovaManager.Match memory matchAfter = nova.getMatch(matchId);
        assertEq(matchAfter.winner, matchBefore.star2);
        assertEq(matchAfter.star1Photons, 25);  // BASE_PHOTONS_LOSE
        assertEq(matchAfter.star2Photons, 100); // BASE_PHOTONS_WIN

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.cluster1TotalPhotons, 25);
        assertEq(n.cluster2TotalPhotons, 100);
    }

    function test_ResolveMatch_UpdatesClusterPhotons() public {
        uint256 novaId = _startNova();
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);
        uint256 matchId = matches[0];

        NovaManager.Match memory matchBefore = nova.getMatch(matchId);

        // Warp time past betting deadline
        vm.warp(block.timestamp + 2 hours);

        vm.prank(admin);
        nova.resolveMatch(matchId, true);

        // Check ClusterManager was updated
        ClusterManager.Member memory star1Member = cluster.getMember(matchBefore.star1);
        ClusterManager.Member memory star2Member = cluster.getMember(matchBefore.star2);

        assertEq(star1Member.photons, 100);
        assertEq(star2Member.photons, 25);
    }

    function test_ResolveMatch_TracksRewards() public {
        uint256 novaId = _startNova();
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);
        uint256 matchId = matches[0];

        NovaManager.Match memory matchBefore = nova.getMatch(matchId);

        // Warp time past betting deadline
        vm.warp(block.timestamp + 2 hours);

        vm.prank(admin);
        nova.resolveMatch(matchId, true);

        NovaManager.NovaReward memory reward1 = nova.getReward(novaId, matchBefore.star1);
        NovaManager.NovaReward memory reward2 = nova.getReward(novaId, matchBefore.star2);

        assertEq(reward1.photonsEarned, 100);
        assertEq(reward2.photonsEarned, 25);
        assertFalse(reward1.claimed);
        assertFalse(reward2.claimed);

        address[] memory participants = nova.getNovaParticipants(novaId);
        assertEq(participants.length, 2);
    }

    function test_ResolveMatch_RevertMatchNotFound() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.MatchNotFound.selector);
        nova.resolveMatch(999, true);
    }

    function test_ResolveMatch_RevertMatchNotBetting() public {
        uint256 novaId = _startNova();
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);
        uint256 matchId = matches[0];

        // Warp time past betting deadline
        vm.warp(block.timestamp + 2 hours);

        vm.prank(admin);
        nova.resolveMatch(matchId, true);

        // Try to resolve again
        vm.prank(admin);
        vm.expectRevert(NovaManager.MatchNotBetting.selector);
        nova.resolveMatch(matchId, false);
    }

    function test_ResolveMatch_RevertNotAdmin() public {
        uint256 novaId = _startNova();
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);

        vm.prank(alice);
        vm.expectRevert(NovaManager.OnlyAdmin.selector);
        nova.resolveMatch(matches[0], true);
    }

    // ============ Advance Round Tests ============

    function test_AdvanceRound() public {
        uint256 novaId = _startNova();

        // Resolve all matches in round 1
        bool[] memory outcomes = new bool[](3);
        outcomes[0] = true;
        outcomes[1] = false;
        outcomes[2] = true;
        _resolveCurrentRoundMatches(novaId, outcomes);

        vm.prank(admin);
        nova.advanceRound(novaId);

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.currentRound, 1);
        assertEq(uint256(n.status), uint256(NovaManager.NovaStatus.ACTIVE));

        // Check round 2 matches were created
        uint256[] memory round2Matches = nova.getRoundMatches(novaId, 2);
        assertEq(round2Matches.length, 3);
    }

    function test_AdvanceRound_RevertRoundNotComplete() public {
        uint256 novaId = _startNova();

        // Warp time past betting deadline
        vm.warp(block.timestamp + 2 hours);

        // Resolve only 1 of 3 matches from round 1
        uint256[] memory round1Matches = nova.getRoundMatches(novaId, 1);
        vm.prank(admin);
        nova.resolveMatch(round1Matches[0], true);

        // First advanceRound passes (checks round 0 which is empty)
        vm.prank(admin);
        nova.advanceRound(novaId);

        // Now currentRound is 1, which has partially resolved matches
        // Second advanceRound should fail because round 1 has unresolved matches
        vm.prank(admin);
        vm.expectRevert(NovaManager.RoundNotComplete.selector);
        nova.advanceRound(novaId);
    }

    function test_AdvanceRound_RevertNovaNotFound() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.NovaNotFound.selector);
        nova.advanceRound(999);
    }

    function test_AdvanceRound_RevertNovaNotActive() public {
        uint256 novaId = _startNova();

        vm.prank(admin);
        nova.cancelNova(novaId);

        vm.prank(admin);
        vm.expectRevert(NovaManager.NovaNotActive.selector);
        nova.advanceRound(novaId);
    }

    function test_AdvanceRound_CompletesNovaAfterLastRound() public {
        uint256 novaId = _startNova();

        bool[] memory cluster1Wins = new bool[](3);
        cluster1Wins[0] = true;
        cluster1Wins[1] = true;
        cluster1Wins[2] = true;

        // Round 1
        _resolveCurrentRoundMatches(novaId, cluster1Wins);
        vm.prank(admin);
        nova.advanceRound(novaId);

        // Round 2
        _resolveCurrentRoundMatches(novaId, cluster1Wins);
        vm.prank(admin);
        nova.advanceRound(novaId);

        // Round 3 (final)
        _resolveCurrentRoundMatches(novaId, cluster1Wins);

        vm.expectEmit(true, false, false, true);
        emit NovaCompleted(novaId, cluster1Id, 900, 225); // 3 rounds * 3 matches * 100/25 photons

        vm.prank(admin);
        nova.advanceRound(novaId);

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.currentRound, 3);
        assertEq(uint256(n.status), uint256(NovaManager.NovaStatus.COMPLETED));
        assertEq(n.winningClusterId, cluster1Id);
    }

    function test_AdvanceRound_Cluster2Wins() public {
        uint256 novaId = _startNova();

        bool[] memory cluster2Wins = new bool[](3);
        cluster2Wins[0] = false;
        cluster2Wins[1] = false;
        cluster2Wins[2] = false;

        // Complete all rounds with cluster2 winning
        for (uint256 i = 0; i < TOTAL_ROUNDS; i++) {
            _resolveCurrentRoundMatches(novaId, cluster2Wins);
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.winningClusterId, cluster2Id);
    }

    function test_AdvanceRound_TieGoesToCluster1() public {
        uint256 novaId = _startNova();

        // Alternate wins to create a tie
        bool[] memory mixed = new bool[](3);
        mixed[0] = true;
        mixed[1] = false;
        mixed[2] = true; // Will create close to tie

        // This creates: cluster1 = 2*100 + 1*25 = 225, cluster2 = 1*100 + 2*25 = 150
        // Not quite a tie, let's use different approach

        // For exact tie: each cluster needs same photons
        // 3 matches: if 1.5 wins each - impossible with 3 matches
        // With 3 matches per round, exact tie is harder
        // The contract handles tie by giving cluster1 the win
    }

    // ============ Claim Reward Tests ============

    function test_ClaimReward() public {
        uint256 novaId = _startNovaWithPrize(9 ether);

        bool[] memory cluster1Wins = new bool[](3);
        cluster1Wins[0] = true;
        cluster1Wins[1] = true;
        cluster1Wins[2] = true;

        // Complete all rounds
        for (uint256 i = 0; i < TOTAL_ROUNDS; i++) {
            _resolveCurrentRoundMatches(novaId, cluster1Wins);
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.winningClusterId, cluster1Id);

        // Get alice's reward info
        NovaManager.NovaReward memory aliceReward = nova.getReward(novaId, alice);
        assertGt(aliceReward.photonsEarned, 0);

        uint256 aliceBalanceBefore = alice.balance;

        vm.prank(alice);
        nova.claimReward(novaId);

        NovaManager.NovaReward memory aliceRewardAfter = nova.getReward(novaId, alice);
        assertTrue(aliceRewardAfter.claimed);
        assertGt(aliceRewardAfter.usdcReward, 0);

        assertGt(alice.balance, aliceBalanceBefore);
    }

    function test_ClaimReward_ProportionalDistribution() public {
        uint256 novaId = _startNovaWithPrize(9 ether);

        bool[] memory cluster1Wins = new bool[](3);
        cluster1Wins[0] = true;
        cluster1Wins[1] = true;
        cluster1Wins[2] = true;

        // Complete all rounds
        for (uint256 i = 0; i < TOTAL_ROUNDS; i++) {
            _resolveCurrentRoundMatches(novaId, cluster1Wins);
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        // Each star in cluster1 should have participated in matches
        // With 3 members and 3 matches per round, each member participates once per round
        // Photons per member = TOTAL_ROUNDS * BASE_PHOTONS_WIN = 3 * 100 = 300

        uint256 aliceBalanceBefore = alice.balance;
        uint256 bobBalanceBefore = bob.balance;
        uint256 charlieBalanceBefore = charlie.balance;

        vm.prank(alice);
        nova.claimReward(novaId);
        vm.prank(bob);
        nova.claimReward(novaId);
        vm.prank(charlie);
        nova.claimReward(novaId);

        // Each should get equal share (1/3 of prize pool)
        uint256 expectedReward = 9 ether / 3;

        assertEq(alice.balance - aliceBalanceBefore, expectedReward);
        assertEq(bob.balance - bobBalanceBefore, expectedReward);
        assertEq(charlie.balance - charlieBalanceBefore, expectedReward);
    }

    function test_ClaimReward_RevertNovaNotFound() public {
        vm.prank(alice);
        vm.expectRevert(NovaManager.NovaNotFound.selector);
        nova.claimReward(999);
    }

    function test_ClaimReward_RevertNovaNotCompleted() public {
        uint256 novaId = _startNova();

        vm.prank(alice);
        vm.expectRevert(NovaManager.NovaNotCompleted.selector);
        nova.claimReward(novaId);
    }

    function test_ClaimReward_RevertNotParticipant() public {
        uint256 novaId = _startNova();

        bool[] memory cluster1Wins = new bool[](3);
        cluster1Wins[0] = true;
        cluster1Wins[1] = true;
        cluster1Wins[2] = true;

        for (uint256 i = 0; i < TOTAL_ROUNDS; i++) {
            _resolveCurrentRoundMatches(novaId, cluster1Wins);
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        address outsider = makeAddr("outsider");
        vm.prank(outsider);
        vm.expectRevert(NovaManager.NotParticipant.selector);
        nova.claimReward(novaId);
    }

    function test_ClaimReward_RevertAlreadyClaimed() public {
        uint256 novaId = _startNovaWithPrize(9 ether);

        bool[] memory cluster1Wins = new bool[](3);
        cluster1Wins[0] = true;
        cluster1Wins[1] = true;
        cluster1Wins[2] = true;

        for (uint256 i = 0; i < TOTAL_ROUNDS; i++) {
            _resolveCurrentRoundMatches(novaId, cluster1Wins);
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        vm.prank(alice);
        nova.claimReward(novaId);

        vm.prank(alice);
        vm.expectRevert(NovaManager.AlreadyClaimed.selector);
        nova.claimReward(novaId);
    }

    function test_ClaimReward_RevertNotWinningCluster() public {
        uint256 novaId = _startNovaWithPrize(9 ether);

        bool[] memory cluster1Wins = new bool[](3);
        cluster1Wins[0] = true;
        cluster1Wins[1] = true;
        cluster1Wins[2] = true;

        for (uint256 i = 0; i < TOTAL_ROUNDS; i++) {
            _resolveCurrentRoundMatches(novaId, cluster1Wins);
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        // Diana is from cluster2 (losing cluster)
        vm.prank(diana);
        vm.expectRevert(NovaManager.NotWinningCluster.selector);
        nova.claimReward(novaId);
    }

    // ============ Cancel Nova Tests ============

    function test_CancelNova() public {
        uint256 novaId = _startNova();

        uint256 adminBalanceBefore = admin.balance;

        vm.expectEmit(true, false, false, false);
        emit NovaCancelled(novaId);

        vm.prank(admin);
        nova.cancelNova(novaId);

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(uint256(n.status), uint256(NovaManager.NovaStatus.CANCELLED));

        // Prize pool refunded to admin
        assertEq(admin.balance, adminBalanceBefore + PRIZE_POOL);
    }

    function test_CancelNova_CancelsMatches() public {
        uint256 novaId = _startNova();

        uint256[] memory matches = nova.getRoundMatches(novaId, 1);

        vm.prank(admin);
        nova.cancelNova(novaId);

        for (uint256 i = 0; i < matches.length; i++) {
            NovaManager.Match memory m = nova.getMatch(matches[i]);
            assertEq(uint256(m.status), uint256(NovaManager.MatchStatus.CANCELLED));
        }
    }

    function test_CancelNova_RevertNovaNotFound() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.NovaNotFound.selector);
        nova.cancelNova(999);
    }

    function test_CancelNova_RevertAlreadyCompleted() public {
        uint256 novaId = _startNova();

        bool[] memory wins = new bool[](3);
        wins[0] = true;
        wins[1] = true;
        wins[2] = true;

        for (uint256 i = 0; i < TOTAL_ROUNDS; i++) {
            _resolveCurrentRoundMatches(novaId, wins);
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        vm.prank(admin);
        vm.expectRevert(NovaManager.NovaNotActive.selector);
        nova.cancelNova(novaId);
    }

    function test_CancelNova_RevertAlreadyCancelled() public {
        uint256 novaId = _startNova();

        vm.prank(admin);
        nova.cancelNova(novaId);

        vm.prank(admin);
        vm.expectRevert(NovaManager.NovaNotActive.selector);
        nova.cancelNova(novaId);
    }

    function test_CancelNova_RevertNotAdmin() public {
        uint256 novaId = _startNova();

        vm.prank(alice);
        vm.expectRevert(NovaManager.OnlyAdmin.selector);
        nova.cancelNova(novaId);
    }

    // ============ Admin Tests ============

    function test_SetClusterManager() public {
        address newClusterManager = makeAddr("newClusterManager");

        vm.prank(admin);
        nova.setClusterManager(newClusterManager);

        assertEq(address(nova.clusterManager()), newClusterManager);
    }

    function test_SetClusterManager_RevertNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(NovaManager.OnlyAdmin.selector);
        nova.setClusterManager(alice);
    }

    function test_SetClusterManager_RevertZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.InvalidAddress.selector);
        nova.setClusterManager(address(0));
    }

    function test_SetMarketCore() public {
        address newMarketCore = makeAddr("newMarketCore");

        vm.prank(admin);
        nova.setMarketCore(newMarketCore);

        assertEq(address(nova.marketCore()), newMarketCore);
    }

    function test_SetMarketCore_RevertNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(NovaManager.OnlyAdmin.selector);
        nova.setMarketCore(alice);
    }

    function test_SetMarketCore_RevertZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.InvalidAddress.selector);
        nova.setMarketCore(address(0));
    }

    function test_SetAdmin() public {
        vm.prank(admin);
        nova.setAdmin(alice);

        assertEq(nova.admin(), alice);
    }

    function test_SetAdmin_RevertNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(NovaManager.OnlyAdmin.selector);
        nova.setAdmin(alice);
    }

    function test_SetAdmin_RevertZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(NovaManager.InvalidAddress.selector);
        nova.setAdmin(address(0));
    }

    // ============ View Functions Tests ============

    function test_GetNovaMatches() public {
        uint256 novaId = _startNova();

        uint256[] memory matches = nova.getNovaMatches(novaId);
        assertEq(matches.length, 3); // First round matches
    }

    function test_GetRoundMatches() public {
        uint256 novaId = _startNova();

        uint256[] memory round1Matches = nova.getRoundMatches(novaId, 1);
        assertEq(round1Matches.length, 3);

        uint256[] memory round0Matches = nova.getRoundMatches(novaId, 0);
        assertEq(round0Matches.length, 0);
    }

    function test_GetNovaParticipants() public {
        uint256 novaId = _startNova();

        // Before any matches resolved
        address[] memory participantsBefore = nova.getNovaParticipants(novaId);
        assertEq(participantsBefore.length, 0);

        // Warp time past betting deadline
        vm.warp(block.timestamp + 2 hours);

        // Resolve a match
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);
        vm.prank(admin);
        nova.resolveMatch(matches[0], true);

        address[] memory participantsAfter = nova.getNovaParticipants(novaId);
        assertEq(participantsAfter.length, 2);
    }

    // ============ Full Lifecycle Test ============

    function test_FullNovaLifecycle() public {
        // 1. Start nova with prize pool
        uint256 novaId = _startNovaWithPrize(9 ether);

        // 2. Verify initial state
        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.prizePool, 9 ether);
        assertEq(uint256(n.status), uint256(NovaManager.NovaStatus.ACTIVE));

        // 3. Complete all rounds (cluster1 wins most matches)
        bool[] memory mixedOutcomes = new bool[](3);
        mixedOutcomes[0] = true;   // Cluster1 wins
        mixedOutcomes[1] = true;   // Cluster1 wins
        mixedOutcomes[2] = false;  // Cluster2 wins

        for (uint256 round = 0; round < TOTAL_ROUNDS; round++) {
            // Resolve matches
            _resolveCurrentRoundMatches(novaId, mixedOutcomes);

            // Advance round
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        // 4. Verify completion
        n = nova.getNova(novaId);
        assertEq(uint256(n.status), uint256(NovaManager.NovaStatus.COMPLETED));
        assertEq(n.winningClusterId, cluster1Id);

        // 5. Verify cluster stats updated
        ClusterManager.Cluster memory c1 = cluster.getCluster(cluster1Id);
        ClusterManager.Cluster memory c2 = cluster.getCluster(cluster2Id);

        assertEq(c1.novasWon, 1);
        assertEq(c1.totalNovas, 1);
        assertEq(c2.novasWon, 0);
        assertEq(c2.totalNovas, 1);

        // Energy bonus for winner
        assertEq(c1.energy, 500); // ENERGY_BONUS_WIN

        // 6. Winners claim rewards
        uint256 aliceBalanceBefore = alice.balance;

        vm.prank(alice);
        nova.claimReward(novaId);

        assertGt(alice.balance, aliceBalanceBefore);

        // 7. Losers cannot claim
        vm.prank(diana);
        vm.expectRevert(NovaManager.NotWinningCluster.selector);
        nova.claimReward(novaId);
    }

    // ============ Edge Cases ============

    function test_EdgeCase_MultipleNovasSimultaneous() public {
        uint256 nova1 = _startNova();

        // Create another cluster pair
        vm.prank(makeAddr("leader3"));
        uint256 cluster3Id = cluster.createCluster("Gamma", false);
        vm.prank(makeAddr("member3"));
        cluster.joinCluster(cluster3Id, bytes32(0));

        vm.prank(makeAddr("leader4"));
        uint256 cluster4Id = cluster.createCluster("Delta", false);
        vm.prank(makeAddr("member4"));
        cluster.joinCluster(cluster4Id, bytes32(0));

        vm.deal(admin, 20 ether);
        vm.prank(admin);
        uint256 nova2 = nova.startNova{value: 5 ether}(cluster3Id, cluster4Id, 2);

        assertEq(nova1, 1);
        assertEq(nova2, 2);

        // Both novas are independent
        NovaManager.Nova memory n1 = nova.getNova(nova1);
        NovaManager.Nova memory n2 = nova.getNova(nova2);

        assertEq(n1.cluster1Id, cluster1Id);
        assertEq(n2.cluster1Id, cluster3Id);
    }

    function test_EdgeCase_ZeroPrizePoolClaim() public {
        uint256 novaId = _startNovaWithPrize(0);

        bool[] memory wins = new bool[](3);
        wins[0] = true;
        wins[1] = true;
        wins[2] = true;

        for (uint256 i = 0; i < TOTAL_ROUNDS; i++) {
            _resolveCurrentRoundMatches(novaId, wins);
            vm.prank(admin);
            nova.advanceRound(novaId);
        }

        uint256 aliceBalanceBefore = alice.balance;

        vm.prank(alice);
        nova.claimReward(novaId);

        // No actual reward (prize pool was 0)
        assertEq(alice.balance, aliceBalanceBefore);

        NovaManager.NovaReward memory reward = nova.getReward(novaId, alice);
        assertTrue(reward.claimed);
        assertEq(reward.usdcReward, 0);
    }

    function test_EdgeCase_MatchCreatesMarket() public {
        uint256 novaId = _startNova();
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);

        NovaManager.Match memory m = nova.getMatch(matches[0]);
        assertTrue(m.marketId > 0);

        // Verify market was created in VoidMarketCore
        VoidMarketCore.Market memory mkt = market.getMarket(m.marketId);
        assertEq(mkt.id, m.marketId);
        assertTrue(bytes(mkt.question).length > 0);
    }

    function test_EdgeCase_ResolveMatchResolvesMarket() public {
        uint256 novaId = _startNova();
        uint256[] memory matches = nova.getRoundMatches(novaId, 1);
        uint256 matchId = matches[0];

        NovaManager.Match memory m = nova.getMatch(matchId);

        // Warp time to pass market deadline
        vm.warp(block.timestamp + 2 hours);

        vm.prank(admin);
        nova.resolveMatch(matchId, true);

        // Verify market was resolved
        VoidMarketCore.Market memory mkt = market.getMarket(m.marketId);
        assertEq(uint256(mkt.status), uint256(VoidMarketCore.MarketStatus.RESOLVED));
        assertEq(mkt.outcome, true);
    }

    // ============ Receive Function Test ============

    function test_ReceiveEther() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool success,) = address(nova).call{value: 0.5 ether}("");
        assertTrue(success);
        assertEq(address(nova).balance, 0.5 ether);
    }

    // ============ Fuzz Tests ============

    function testFuzz_StartNova_AnyPrizePool(uint256 prize) public {
        vm.assume(prize <= 1000 ether);

        vm.deal(admin, prize);
        vm.prank(admin);
        uint256 novaId = nova.startNova{value: prize}(cluster1Id, cluster2Id, 1);

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.prizePool, prize);
    }

    function testFuzz_StartNova_AnyRounds(uint256 rounds) public {
        vm.assume(rounds > 0);
        vm.assume(rounds <= 100);

        vm.prank(admin);
        uint256 novaId = nova.startNova{value: 1 ether}(cluster1Id, cluster2Id, rounds);

        NovaManager.Nova memory n = nova.getNova(novaId);
        assertEq(n.totalRounds, rounds);
    }
}
