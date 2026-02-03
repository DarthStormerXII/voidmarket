// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/VoidMarketCore.sol";

contract VoidMarketCoreTest is Test {
    VoidMarketCore public market;

    address public admin;
    address public alice;
    address public bob;
    address public charlie;

    uint256 public constant BET_AMOUNT = 1 ether;
    uint256 public constant DEADLINE_OFFSET = 1 days;
    uint256 public constant RESOLUTION_DEADLINE_OFFSET = 2 days;

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 deadline,
        uint256 resolutionDeadline,
        bool isForked,
        uint256 parentMarketId
    );

    event BetPlaced(
        uint256 indexed betId,
        uint256 indexed marketId,
        address indexed bettor,
        uint256 amount,
        bytes32 commitmentHash
    );

    event BetRevealed(
        uint256 indexed betId,
        uint256 indexed marketId,
        address indexed bettor,
        bool direction
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 totalYesAmount,
        uint256 totalNoAmount
    );

    event WinningsClaimed(
        uint256 indexed betId,
        uint256 indexed marketId,
        address indexed claimer,
        uint256 amount
    );

    event MarketCancelled(uint256 indexed marketId);

    function setUp() public {
        admin = makeAddr("admin");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");

        vm.prank(admin);
        market = new VoidMarketCore();

        // Fund test users with native USDC
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    // ============ Helper Functions ============

    function _createMarket() internal returns (uint256 marketId) {
        vm.prank(alice);
        marketId = market.createMarket(
            "Will ETH hit $10k?",
            block.timestamp + DEADLINE_OFFSET,
            block.timestamp + RESOLUTION_DEADLINE_OFFSET
        );
    }

    function _createMarketWithCustomDeadlines(uint256 deadline, uint256 resolutionDeadline)
        internal
        returns (uint256 marketId)
    {
        vm.prank(alice);
        marketId = market.createMarket("Test market?", deadline, resolutionDeadline);
    }

    function _generateCommitment(bool direction, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(direction, salt));
    }

    function _placeBet(address bettor, uint256 marketId, bool direction, bytes32 salt, uint256 amount)
        internal
        returns (uint256 betId, bytes32 commitment)
    {
        commitment = _generateCommitment(direction, salt);
        vm.prank(bettor);
        betId = market.placeBet{value: amount}(marketId, commitment);
    }

    // ============ Market Creation Tests ============

    function test_CreateMarket() public {
        uint256 deadline = block.timestamp + DEADLINE_OFFSET;
        uint256 resolutionDeadline = block.timestamp + RESOLUTION_DEADLINE_OFFSET;

        vm.expectEmit(true, true, false, true);
        emit MarketCreated(
            1,
            alice,
            "Will ETH hit $10k?",
            deadline,
            resolutionDeadline,
            false,
            0
        );

        vm.prank(alice);
        uint256 marketId = market.createMarket(
            "Will ETH hit $10k?",
            deadline,
            resolutionDeadline
        );

        assertEq(marketId, 1);
        assertEq(market.marketCount(), 1);

        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(m.id, 1);
        assertEq(m.question, "Will ETH hit $10k?");
        assertEq(m.creator, alice);
        assertEq(m.deadline, deadline);
        assertEq(m.resolutionDeadline, resolutionDeadline);
        assertEq(uint256(m.status), uint256(VoidMarketCore.MarketStatus.ACTIVE));
        assertEq(m.isForked, false);
        assertEq(m.parentMarketId, 0);
        assertEq(m.revealDeadline, resolutionDeadline + 1 days);
    }

    function test_CreateMarket_RevertDeadlineInPast() public {
        vm.prank(alice);
        vm.expectRevert("Deadline must be in future");
        market.createMarket(
            "Test?",
            block.timestamp - 1,
            block.timestamp + RESOLUTION_DEADLINE_OFFSET
        );
    }

    function test_CreateMarket_RevertResolutionBeforeDeadline() public {
        vm.prank(alice);
        vm.expectRevert("Resolution must be after deadline");
        market.createMarket(
            "Test?",
            block.timestamp + DEADLINE_OFFSET,
            block.timestamp + DEADLINE_OFFSET - 1
        );
    }

    function test_CreateMultipleMarkets() public {
        uint256 market1 = _createMarket();

        vm.prank(bob);
        uint256 market2 = market.createMarket(
            "Will BTC hit $100k?",
            block.timestamp + DEADLINE_OFFSET,
            block.timestamp + RESOLUTION_DEADLINE_OFFSET
        );

        assertEq(market1, 1);
        assertEq(market2, 2);
        assertEq(market.marketCount(), 2);
    }

    // ============ Forked Market Tests ============

    function test_CreateForkedMarket() public {
        uint256 parentId = _createMarket();

        vm.prank(bob);
        uint256 forkedId = market.createForkedMarket(
            parentId,
            "",
            0,
            0
        );

        assertEq(forkedId, 2);

        VoidMarketCore.Market memory forked = market.getMarket(forkedId);
        assertEq(forked.isForked, true);
        assertEq(forked.parentMarketId, parentId);
        assertEq(forked.question, "Will ETH hit $10k?"); // Inherited

        uint256[] memory forks = market.getForkedMarkets(parentId);
        assertEq(forks.length, 1);
        assertEq(forks[0], forkedId);
    }

    function test_CreateForkedMarket_CustomQuestion() public {
        uint256 parentId = _createMarket();

        vm.prank(bob);
        uint256 forkedId = market.createForkedMarket(
            parentId,
            "My custom question?",
            0,
            0
        );

        VoidMarketCore.Market memory forked = market.getMarket(forkedId);
        assertEq(forked.question, "My custom question?");
    }

    function test_CreateForkedMarket_CustomDeadlines() public {
        uint256 parentId = _createMarket();
        uint256 customDeadline = block.timestamp + 12 hours;
        uint256 customResolution = block.timestamp + 18 hours;

        vm.prank(bob);
        uint256 forkedId = market.createForkedMarket(
            parentId,
            "",
            customDeadline,
            customResolution
        );

        VoidMarketCore.Market memory forked = market.getMarket(forkedId);
        assertEq(forked.deadline, customDeadline);
        assertEq(forked.resolutionDeadline, customResolution);
    }

    function test_CreateForkedMarket_RevertInvalidParent() public {
        vm.prank(alice);
        vm.expectRevert(VoidMarketCore.InvalidParentMarket.selector);
        market.createForkedMarket(999, "", 0, 0);
    }

    function test_CreateForkedMarket_RevertForkOfFork() public {
        uint256 parentId = _createMarket();

        vm.prank(bob);
        uint256 forkedId = market.createForkedMarket(parentId, "", 0, 0);

        vm.prank(charlie);
        vm.expectRevert(VoidMarketCore.InvalidParentMarket.selector);
        market.createForkedMarket(forkedId, "", 0, 0);
    }

    // ============ Place Bet Tests ============

    function test_PlaceBet() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret_salt");
        bytes32 commitment = _generateCommitment(true, salt);

        vm.expectEmit(true, true, true, true);
        emit BetPlaced(1, marketId, bob, BET_AMOUNT, commitment);

        vm.prank(bob);
        uint256 betId = market.placeBet{value: BET_AMOUNT}(marketId, commitment);

        assertEq(betId, 1);
        assertEq(market.betCount(), 1);

        VoidMarketCore.Bet memory bet = market.getBet(betId);
        assertEq(bet.bettor, bob);
        assertEq(bet.marketId, marketId);
        assertEq(bet.amount, BET_AMOUNT);
        assertEq(bet.commitmentHash, commitment);
        assertEq(bet.revealed, false);
        assertEq(bet.claimed, false);

        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(m.totalPool, BET_AMOUNT);

        uint256[] memory userBets = market.getUserBets(marketId, bob);
        assertEq(userBets.length, 1);
        assertEq(userBets[0], betId);
    }

    function test_PlaceBet_MultipleBets() public {
        uint256 marketId = _createMarket();

        bytes32 salt1 = keccak256("salt1");
        bytes32 salt2 = keccak256("salt2");

        (uint256 bet1,) = _placeBet(bob, marketId, true, salt1, BET_AMOUNT);
        (uint256 bet2,) = _placeBet(charlie, marketId, false, salt2, 2 ether);

        assertEq(bet1, 1);
        assertEq(bet2, 2);

        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(m.totalPool, 3 ether);

        uint256[] memory marketBets = market.getMarketBets(marketId);
        assertEq(marketBets.length, 2);
    }

    function test_PlaceBet_SameUserMultipleBets() public {
        uint256 marketId = _createMarket();

        bytes32 salt1 = keccak256("salt1");
        bytes32 salt2 = keccak256("salt2");

        _placeBet(bob, marketId, true, salt1, BET_AMOUNT);
        _placeBet(bob, marketId, false, salt2, BET_AMOUNT);

        uint256[] memory userBets = market.getUserBets(marketId, bob);
        assertEq(userBets.length, 2);
    }

    function test_PlaceBet_RevertInactiveMarket() public {
        uint256 marketId = _createMarket();

        // Fast forward past deadline and resolve
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        bytes32 commitment = _generateCommitment(true, keccak256("salt"));

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.MarketNotActive.selector);
        market.placeBet{value: BET_AMOUNT}(marketId, commitment);
    }

    function test_PlaceBet_RevertDeadlinePassed() public {
        uint256 marketId = _createMarket();

        // Fast forward past deadline
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);

        bytes32 commitment = _generateCommitment(true, keccak256("salt"));

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.BettingDeadlinePassed.selector);
        market.placeBet{value: BET_AMOUNT}(marketId, commitment);
    }

    function test_PlaceBet_RevertZeroAmount() public {
        uint256 marketId = _createMarket();
        bytes32 commitment = _generateCommitment(true, keccak256("salt"));

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.InsufficientAmount.selector);
        market.placeBet{value: 0}(marketId, commitment);
    }

    // ============ Reveal Bet Tests ============

    function test_RevealBet() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");
        bool direction = true;

        (uint256 betId,) = _placeBet(bob, marketId, direction, salt, BET_AMOUNT);

        // Fast forward and resolve market
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.expectEmit(true, true, true, true);
        emit BetRevealed(betId, marketId, bob, direction);

        vm.prank(bob);
        market.revealBet(betId, direction, salt);

        VoidMarketCore.Bet memory bet = market.getBet(betId);
        assertEq(bet.revealed, true);
        assertEq(bet.direction, direction);

        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(m.totalYesAmount, BET_AMOUNT);
        assertEq(m.totalNoAmount, 0);
    }

    function test_RevealBet_NoDirection() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");
        bool direction = false;

        (uint256 betId,) = _placeBet(bob, marketId, direction, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, false);

        vm.prank(bob);
        market.revealBet(betId, direction, salt);

        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(m.totalYesAmount, 0);
        assertEq(m.totalNoAmount, BET_AMOUNT);
    }

    function test_RevealBet_RevertMarketNotResolved() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.MarketNotResolved.selector);
        market.revealBet(betId, true, salt);
    }

    function test_RevealBet_RevertRevealDeadlinePassed() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        // Fast forward past reveal deadline (resolutionDeadline + 1 day)
        vm.warp(block.timestamp + RESOLUTION_DEADLINE_OFFSET + 2 days);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.RevealDeadlinePassed.selector);
        market.revealBet(betId, true, salt);
    }

    function test_RevealBet_RevertAlreadyRevealed() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.prank(bob);
        market.revealBet(betId, true, salt);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.AlreadyRevealed.selector);
        market.revealBet(betId, true, salt);
    }

    function test_RevealBet_RevertInvalidCommitment_WrongDirection() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.InvalidCommitment.selector);
        market.revealBet(betId, false, salt); // Wrong direction
    }

    function test_RevealBet_RevertInvalidCommitment_WrongSalt() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.InvalidCommitment.selector);
        market.revealBet(betId, true, keccak256("wrong_salt"));
    }

    // ============ Resolve Market Tests ============

    function test_ResolveMarket() public {
        uint256 marketId = _createMarket();

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);

        vm.expectEmit(true, false, false, true);
        emit MarketResolved(marketId, true, 0, 0);

        vm.prank(admin);
        market.resolveMarket(marketId, true);

        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(uint256(m.status), uint256(VoidMarketCore.MarketStatus.RESOLVED));
        assertEq(m.outcome, true);
    }

    function test_ResolveMarket_ResolvesForks() public {
        uint256 parentId = _createMarket();

        vm.prank(bob);
        uint256 forkedId = market.createForkedMarket(parentId, "", 0, 0);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);

        vm.prank(admin);
        market.resolveMarket(parentId, true);

        VoidMarketCore.Market memory parent = market.getMarket(parentId);
        VoidMarketCore.Market memory forked = market.getMarket(forkedId);

        assertEq(uint256(parent.status), uint256(VoidMarketCore.MarketStatus.RESOLVED));
        assertEq(uint256(forked.status), uint256(VoidMarketCore.MarketStatus.RESOLVED));
        assertEq(parent.outcome, true);
        assertEq(forked.outcome, true);
    }

    function test_ResolveMarket_RevertNotAdmin() public {
        uint256 marketId = _createMarket();

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.OnlyAdmin.selector);
        market.resolveMarket(marketId, true);
    }

    function test_ResolveMarket_RevertNotActive() public {
        uint256 marketId = _createMarket();

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.prank(admin);
        vm.expectRevert(VoidMarketCore.MarketNotActive.selector);
        market.resolveMarket(marketId, false);
    }

    function test_ResolveMarket_RevertDeadlineNotPassed() public {
        uint256 marketId = _createMarket();

        vm.prank(admin);
        vm.expectRevert(VoidMarketCore.BettingDeadlineNotPassed.selector);
        market.resolveMarket(marketId, true);
    }

    // ============ Claim Winnings Tests ============

    function test_ClaimWinnings_SingleWinner() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.prank(bob);
        market.revealBet(betId, true, salt);

        uint256 bobBalanceBefore = bob.balance;

        vm.prank(bob);
        market.claimWinnings(betId);

        VoidMarketCore.Bet memory bet = market.getBet(betId);
        assertEq(bet.claimed, true);

        // Single winner gets their bet back (no losers to take from)
        assertEq(bob.balance, bobBalanceBefore + BET_AMOUNT);
    }

    function test_ClaimWinnings_WithLosingPool() public {
        uint256 marketId = _createMarket();
        bytes32 saltBob = keccak256("bob_salt");
        bytes32 saltCharlie = keccak256("charlie_salt");

        // Bob bets YES (1 ether), Charlie bets NO (2 ether)
        (uint256 bobBetId,) = _placeBet(bob, marketId, true, saltBob, 1 ether);
        (uint256 charlieBetId,) = _placeBet(charlie, marketId, false, saltCharlie, 2 ether);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true); // YES wins

        // Both reveal
        vm.prank(bob);
        market.revealBet(bobBetId, true, saltBob);
        vm.prank(charlie);
        market.revealBet(charlieBetId, false, saltCharlie);

        uint256 bobBalanceBefore = bob.balance;

        vm.expectEmit(true, true, true, true);
        emit WinningsClaimed(bobBetId, marketId, bob, 3 ether); // 1 + 2 = 3 ether

        vm.prank(bob);
        market.claimWinnings(bobBetId);

        // Bob wins his bet + all of Charlie's bet (only winner)
        assertEq(bob.balance, bobBalanceBefore + 3 ether);
    }

    function test_ClaimWinnings_MultipleWinners() public {
        uint256 marketId = _createMarket();
        bytes32 saltAlice = keccak256("alice_salt");
        bytes32 saltBob = keccak256("bob_salt");
        bytes32 saltCharlie = keccak256("charlie_salt");

        // Alice bets YES (1 ether), Bob bets YES (2 ether), Charlie bets NO (3 ether)
        (uint256 aliceBetId,) = _placeBet(alice, marketId, true, saltAlice, 1 ether);
        (uint256 bobBetId,) = _placeBet(bob, marketId, true, saltBob, 2 ether);
        (uint256 charlieBetId,) = _placeBet(charlie, marketId, false, saltCharlie, 3 ether);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true); // YES wins

        // All reveal
        vm.prank(alice);
        market.revealBet(aliceBetId, true, saltAlice);
        vm.prank(bob);
        market.revealBet(bobBetId, true, saltBob);
        vm.prank(charlie);
        market.revealBet(charlieBetId, false, saltCharlie);

        uint256 aliceBalanceBefore = alice.balance;
        uint256 bobBalanceBefore = bob.balance;

        vm.prank(alice);
        market.claimWinnings(aliceBetId);

        vm.prank(bob);
        market.claimWinnings(bobBetId);

        // Total YES pool = 3 ether, NO pool = 3 ether
        // Alice: 1 + (1 * 3 / 3) = 2 ether
        // Bob: 2 + (2 * 3 / 3) = 4 ether
        assertEq(alice.balance, aliceBalanceBefore + 2 ether);
        assertEq(bob.balance, bobBalanceBefore + 4 ether);
    }

    function test_ClaimWinnings_RevertNotResolved() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.MarketNotResolved.selector);
        market.claimWinnings(betId);
    }

    function test_ClaimWinnings_RevertNotRevealed() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.InvalidCommitment.selector);
        market.claimWinnings(betId);
    }

    function test_ClaimWinnings_RevertAlreadyClaimed() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.prank(bob);
        market.revealBet(betId, true, salt);

        vm.prank(bob);
        market.claimWinnings(betId);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.AlreadyClaimed.selector);
        market.claimWinnings(betId);
    }

    function test_ClaimWinnings_RevertNotWinner() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, true, salt, BET_AMOUNT); // Bet YES

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, false); // NO wins

        vm.prank(bob);
        market.revealBet(betId, true, salt);

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.NotWinner.selector);
        market.claimWinnings(betId);
    }

    // ============ Cancel Market Tests ============

    function test_CancelMarket() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        uint256 bobBalanceBefore = bob.balance;
        _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.expectEmit(true, false, false, false);
        emit MarketCancelled(marketId);

        vm.prank(admin);
        market.cancelMarket(marketId);

        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(uint256(m.status), uint256(VoidMarketCore.MarketStatus.CANCELLED));

        // Bob should get refund
        assertEq(bob.balance, bobBalanceBefore);
    }

    function test_CancelMarket_MultipleBets() public {
        uint256 marketId = _createMarket();

        uint256 bobBalanceBefore = bob.balance;
        uint256 charlieBalanceBefore = charlie.balance;

        _placeBet(bob, marketId, true, keccak256("salt1"), 1 ether);
        _placeBet(charlie, marketId, false, keccak256("salt2"), 2 ether);

        vm.prank(admin);
        market.cancelMarket(marketId);

        assertEq(bob.balance, bobBalanceBefore);
        assertEq(charlie.balance, charlieBalanceBefore);
    }

    function test_CancelMarket_RevertNotAdmin() public {
        uint256 marketId = _createMarket();

        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.OnlyAdmin.selector);
        market.cancelMarket(marketId);
    }

    function test_CancelMarket_RevertNotActive() public {
        uint256 marketId = _createMarket();

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        vm.prank(admin);
        vm.expectRevert(VoidMarketCore.MarketNotActive.selector);
        market.cancelMarket(marketId);
    }

    // ============ Admin Tests ============

    function test_SetAdmin() public {
        vm.prank(admin);
        market.setAdmin(bob);

        assertEq(market.admin(), bob);
    }

    function test_SetAdmin_RevertNotAdmin() public {
        vm.prank(bob);
        vm.expectRevert(VoidMarketCore.OnlyAdmin.selector);
        market.setAdmin(bob);
    }

    function test_SetAdmin_RevertZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("Invalid address");
        market.setAdmin(address(0));
    }

    // ============ View Functions Tests ============

    function test_GenerateCommitment() public view {
        bytes32 salt = keccak256("secret");
        bytes32 expected = keccak256(abi.encodePacked(true, salt));
        bytes32 result = market.generateCommitment(true, salt);

        assertEq(result, expected);
    }

    function test_CalculatePotentialPayout_NoOpposingSide() public {
        uint256 marketId = _createMarket();

        uint256 payout = market.calculatePotentialPayout(marketId, 1 ether, true);
        assertEq(payout, 1 ether);
    }

    function test_CalculatePotentialPayout_WithOpposingSide() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("salt");

        // Place a NO bet first (this gets revealed, so adds to NO pool)
        (uint256 betId,) = _placeBet(bob, marketId, false, salt, 2 ether);

        // Resolve and reveal to get actual pool
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, false);
        vm.prank(bob);
        market.revealBet(betId, false, salt);

        // Now calculate potential payout for YES bet
        // totalNoAmount = 2 ether, adding 1 ether to YES
        // Payout = 1 + (1 * 2 / 1) = 3 ether
        uint256 payout = market.calculatePotentialPayout(marketId, 1 ether, true);
        assertEq(payout, 3 ether);
    }

    // ============ Full Lifecycle Test ============

    function test_FullLifecycle() public {
        // 1. Create market
        uint256 marketId = _createMarket();

        // 2. Place bets
        bytes32 saltAlice = keccak256("alice");
        bytes32 saltBob = keccak256("bob");
        bytes32 saltCharlie = keccak256("charlie");

        (uint256 aliceBet,) = _placeBet(alice, marketId, true, saltAlice, 1 ether);
        (uint256 bobBet,) = _placeBet(bob, marketId, true, saltBob, 1 ether);
        (uint256 charlieBet,) = _placeBet(charlie, marketId, false, saltCharlie, 2 ether);

        // 3. Check market state
        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(m.totalPool, 4 ether);

        // 4. Warp time and resolve
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        // 5. Reveal bets
        vm.prank(alice);
        market.revealBet(aliceBet, true, saltAlice);
        vm.prank(bob);
        market.revealBet(bobBet, true, saltBob);
        vm.prank(charlie);
        market.revealBet(charlieBet, false, saltCharlie);

        // 6. Check revealed totals
        m = market.getMarket(marketId);
        assertEq(m.totalYesAmount, 2 ether);
        assertEq(m.totalNoAmount, 2 ether);

        // 7. Claim winnings
        uint256 aliceBalanceBefore = alice.balance;
        uint256 bobBalanceBefore = bob.balance;

        vm.prank(alice);
        market.claimWinnings(aliceBet);
        vm.prank(bob);
        market.claimWinnings(bobBet);

        // Alice: 1 + (1 * 2 / 2) = 2 ether
        // Bob: 1 + (1 * 2 / 2) = 2 ether
        assertEq(alice.balance, aliceBalanceBefore + 2 ether);
        assertEq(bob.balance, bobBalanceBefore + 2 ether);

        // Charlie can't claim (loser)
        vm.prank(charlie);
        vm.expectRevert(VoidMarketCore.NotWinner.selector);
        market.claimWinnings(charlieBet);
    }

    // ============ Edge Cases ============

    function test_EdgeCase_RevealWithoutClaiming() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        _placeBet(bob, marketId, true, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true);

        // User can reveal but choose not to claim
        // This is fine - funds stay in contract
    }

    function test_EdgeCase_LoserReveals() public {
        uint256 marketId = _createMarket();
        bytes32 salt = keccak256("secret");

        (uint256 betId,) = _placeBet(bob, marketId, false, salt, BET_AMOUNT);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(admin);
        market.resolveMarket(marketId, true); // YES wins, Bob bet NO

        // Loser can still reveal (required to update totals for payout calculations)
        vm.prank(bob);
        market.revealBet(betId, false, salt);

        VoidMarketCore.Bet memory bet = market.getBet(betId);
        assertEq(bet.revealed, true);
    }

    function test_EdgeCase_LargeNumberOfBets() public {
        uint256 marketId = _createMarket();

        for (uint256 i = 0; i < 10; i++) {
            address bettor = makeAddr(string(abi.encodePacked("bettor", i)));
            vm.deal(bettor, 10 ether);
            bytes32 salt = keccak256(abi.encodePacked("salt", i));

            vm.prank(bettor);
            market.placeBet{value: 0.1 ether}(marketId, _generateCommitment(i % 2 == 0, salt));
        }

        VoidMarketCore.Market memory m = market.getMarket(marketId);
        assertEq(m.totalPool, 1 ether);

        uint256[] memory bets = market.getMarketBets(marketId);
        assertEq(bets.length, 10);
    }

    // ============ Fuzz Tests ============

    function testFuzz_PlaceBet_AnyAmount(uint256 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount <= 100 ether);

        uint256 marketId = _createMarket();
        bytes32 commitment = _generateCommitment(true, keccak256("salt"));

        vm.deal(bob, amount);
        vm.prank(bob);
        uint256 betId = market.placeBet{value: amount}(marketId, commitment);

        VoidMarketCore.Bet memory bet = market.getBet(betId);
        assertEq(bet.amount, amount);
    }

    function testFuzz_GenerateCommitment(bool direction, bytes32 salt) public view {
        bytes32 result = market.generateCommitment(direction, salt);
        bytes32 expected = keccak256(abi.encodePacked(direction, salt));
        assertEq(result, expected);
    }

    // ============ Receive Function Test ============

    function test_ReceiveEther() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool success,) = address(market).call{value: 0.5 ether}("");
        assertTrue(success);
        assertEq(address(market).balance, 0.5 ether);
    }
}
