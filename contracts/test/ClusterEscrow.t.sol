// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ClusterEscrow.sol";

contract ClusterEscrowTest is Test {
    ClusterEscrow public escrow;

    address public leader;
    address public clusterManager;
    address public novaManager;
    address public alice;
    address public bob;

    uint256 public constant CLUSTER_ID = 1;
    uint256 public constant DEPOSIT_AMOUNT = 5 ether;
    uint256 public constant WAGER_AMOUNT = 1 ether;

    // ============ Events (re-declared for expectEmit) ============

    event Deposited(address indexed depositor, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed to, uint256 amount, uint256 newBalance);
    event NovaDepositMade(uint256 indexed novaId, uint256 amount);
    event NovaFundsReleased(uint256 indexed novaId, address indexed recipient, uint256 amount);
    event NovaRefunded(uint256 indexed novaId, uint256 amount);
    event LeaderChanged(address indexed oldLeader, address indexed newLeader);

    function setUp() public {
        leader = makeAddr("leader");
        clusterManager = makeAddr("clusterManager");
        novaManager = makeAddr("novaManager");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        escrow = new ClusterEscrow(CLUSTER_ID, leader, clusterManager);

        vm.prank(clusterManager);
        escrow.setNovaManager(novaManager);

        // Fund test accounts
        vm.deal(leader, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(novaManager, 100 ether);
    }

    // ============ Helper Functions ============

    function _depositAsLeader(uint256 amount) internal {
        vm.prank(leader);
        escrow.deposit{value: amount}();
    }

    function _depositForNova(uint256 novaId, uint256 amount) internal {
        vm.prank(leader);
        escrow.depositForNova(novaId, amount);
    }

    // ============ Constructor Tests ============

    function test_Constructor_SetsParams() public view {
        assertEq(escrow.clusterId(), CLUSTER_ID);
        assertEq(escrow.leader(), leader);
        assertEq(escrow.clusterManager(), clusterManager);
    }

    function test_Constructor_RevertZeroLeader() public {
        vm.expectRevert(ClusterEscrow.InvalidAddress.selector);
        new ClusterEscrow(CLUSTER_ID, address(0), clusterManager);
    }

    function test_Constructor_RevertZeroClusterManager() public {
        vm.expectRevert(ClusterEscrow.InvalidAddress.selector);
        new ClusterEscrow(CLUSTER_ID, leader, address(0));
    }

    // ============ Admin Function Tests ============

    function test_SetNovaManager() public {
        address newNovaManager = makeAddr("newNovaManager");

        vm.prank(clusterManager);
        escrow.setNovaManager(newNovaManager);

        assertEq(escrow.novaManager(), newNovaManager);
    }

    function test_SetNovaManager_RevertNotClusterManager() public {
        vm.prank(alice);
        vm.expectRevert(ClusterEscrow.OnlyClusterManager.selector);
        escrow.setNovaManager(makeAddr("newNovaManager"));
    }

    function test_SetNovaManager_RevertZeroAddress() public {
        vm.prank(clusterManager);
        vm.expectRevert(ClusterEscrow.InvalidAddress.selector);
        escrow.setNovaManager(address(0));
    }

    function test_UpdateLeader() public {
        address newLeader = makeAddr("newLeader");

        vm.expectEmit(true, true, false, false);
        emit LeaderChanged(leader, newLeader);

        vm.prank(clusterManager);
        escrow.updateLeader(newLeader);

        assertEq(escrow.leader(), newLeader);
    }

    function test_UpdateLeader_RevertNotClusterManager() public {
        vm.prank(alice);
        vm.expectRevert(ClusterEscrow.OnlyClusterManager.selector);
        escrow.updateLeader(makeAddr("newLeader"));
    }

    function test_UpdateLeader_RevertZeroAddress() public {
        vm.prank(clusterManager);
        vm.expectRevert(ClusterEscrow.InvalidAddress.selector);
        escrow.updateLeader(address(0));
    }

    // ============ Deposit Tests ============

    function test_Deposit() public {
        vm.expectEmit(true, false, false, true);
        emit Deposited(leader, DEPOSIT_AMOUNT, DEPOSIT_AMOUNT);

        _depositAsLeader(DEPOSIT_AMOUNT);

        assertEq(escrow.availableBalance(), DEPOSIT_AMOUNT);
        assertEq(address(escrow).balance, DEPOSIT_AMOUNT);
    }

    function test_Deposit_AnyoneCanDeposit() public {
        vm.expectEmit(true, false, false, true);
        emit Deposited(alice, 2 ether, 2 ether);

        vm.prank(alice);
        escrow.deposit{value: 2 ether}();

        assertEq(escrow.availableBalance(), 2 ether);
    }

    function test_Deposit_RevertZeroAmount() public {
        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.InvalidAmount.selector);
        escrow.deposit{value: 0}();
    }

    function test_Receive() public {
        vm.expectEmit(true, false, false, true);
        emit Deposited(alice, 3 ether, 3 ether);

        vm.prank(alice);
        (bool success,) = address(escrow).call{value: 3 ether}("");
        assertTrue(success);

        assertEq(escrow.availableBalance(), 3 ether);
        assertEq(address(escrow).balance, 3 ether);
    }

    // ============ Withdrawal Tests ============

    function test_Withdraw_Partial() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        uint256 leaderBalanceBefore = leader.balance;
        uint256 withdrawAmount = 2 ether;

        vm.expectEmit(true, false, false, true);
        emit Withdrawn(leader, withdrawAmount, DEPOSIT_AMOUNT - withdrawAmount);

        vm.prank(leader);
        escrow.withdraw(withdrawAmount);

        assertEq(escrow.availableBalance(), DEPOSIT_AMOUNT - withdrawAmount);
        assertEq(leader.balance, leaderBalanceBefore + withdrawAmount);
    }

    function test_WithdrawAll() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        uint256 leaderBalanceBefore = leader.balance;

        vm.expectEmit(true, false, false, true);
        emit Withdrawn(leader, DEPOSIT_AMOUNT, 0);

        vm.prank(leader);
        escrow.withdrawAll();

        assertEq(escrow.availableBalance(), 0);
        assertEq(leader.balance, leaderBalanceBefore + DEPOSIT_AMOUNT);
    }

    function test_Withdraw_RevertInsufficientBalance() public {
        _depositAsLeader(1 ether);

        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.InsufficientBalance.selector);
        escrow.withdraw(2 ether);
    }

    function test_Withdraw_RevertZeroAmount() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.InvalidAmount.selector);
        escrow.withdraw(0);
    }

    function test_Withdraw_RevertNotLeader() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(ClusterEscrow.OnlyLeader.selector);
        escrow.withdraw(1 ether);
    }

    function test_WithdrawAll_RevertNotLeader() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(ClusterEscrow.OnlyLeader.selector);
        escrow.withdrawAll();
    }

    function test_WithdrawAll_RevertZeroBalance() public {
        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.InsufficientBalance.selector);
        escrow.withdrawAll();
    }

    // ============ Nova Deposit Tests ============

    function test_DepositForNova() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        uint256 novaId = 42;

        vm.expectEmit(true, false, false, true);
        emit NovaDepositMade(novaId, WAGER_AMOUNT);

        _depositForNova(novaId, WAGER_AMOUNT);

        assertEq(escrow.novaDeposits(novaId), WAGER_AMOUNT);
        assertEq(escrow.availableBalance(), DEPOSIT_AMOUNT - WAGER_AMOUNT);
    }

    function test_DepositForNova_RevertAlreadyDeposited() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.NovaAlreadyDeposited.selector);
        escrow.depositForNova(novaId, WAGER_AMOUNT);
    }

    function test_DepositForNova_RevertInsufficientBalance() public {
        _depositAsLeader(0.5 ether);

        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.InsufficientBalance.selector);
        escrow.depositForNova(1, WAGER_AMOUNT);
    }

    function test_DepositForNova_RevertZeroAmount() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.InvalidAmount.selector);
        escrow.depositForNova(1, 0);
    }

    function test_DepositForNova_RevertNotLeader() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(ClusterEscrow.OnlyLeader.selector);
        escrow.depositForNova(1, WAGER_AMOUNT);
    }

    // ============ Nova Release Tests ============

    function test_ReleaseForNova() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        uint256 novaManagerBalanceBefore = novaManager.balance;

        vm.expectEmit(true, true, false, true);
        emit NovaFundsReleased(novaId, novaManager, WAGER_AMOUNT);

        vm.prank(novaManager);
        uint256 released = escrow.releaseForNova(novaId);

        assertEq(released, WAGER_AMOUNT);
        assertEq(escrow.novaReleased(novaId), true);
        assertEq(novaManager.balance, novaManagerBalanceBefore + WAGER_AMOUNT);
        // Available balance should NOT change (funds were already locked)
        assertEq(escrow.availableBalance(), DEPOSIT_AMOUNT - WAGER_AMOUNT);
    }

    function test_ReleaseForNova_RevertNotNovaManager() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(ClusterEscrow.OnlyNovaManager.selector);
        escrow.releaseForNova(novaId);
    }

    function test_ReleaseForNova_RevertNotDeposited() public {
        vm.prank(novaManager);
        vm.expectRevert(ClusterEscrow.NovaNotDeposited.selector);
        escrow.releaseForNova(999);
    }

    function test_ReleaseForNova_RevertAlreadyReleased() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        vm.prank(novaManager);
        escrow.releaseForNova(novaId);

        vm.prank(novaManager);
        vm.expectRevert(ClusterEscrow.NovaAlreadyReleased.selector);
        escrow.releaseForNova(novaId);
    }

    // ============ Nova Refund Tests ============

    function test_RefundNova() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        uint256 availableBefore = escrow.availableBalance();

        vm.expectEmit(true, false, false, true);
        emit NovaRefunded(novaId, WAGER_AMOUNT);

        vm.prank(novaManager);
        escrow.refundNova(novaId);

        assertEq(escrow.novaReleased(novaId), true);
        assertEq(escrow.availableBalance(), availableBefore + WAGER_AMOUNT);
    }

    function test_RefundNova_RevertNotNovaManager() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(ClusterEscrow.OnlyNovaManager.selector);
        escrow.refundNova(novaId);
    }

    function test_RefundNova_RevertNotDeposited() public {
        vm.prank(novaManager);
        vm.expectRevert(ClusterEscrow.NovaNotDeposited.selector);
        escrow.refundNova(999);
    }

    function test_RefundNova_RevertAlreadyReleased() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        vm.prank(novaManager);
        escrow.releaseForNova(novaId);

        vm.prank(novaManager);
        vm.expectRevert(ClusterEscrow.NovaAlreadyReleased.selector);
        escrow.refundNova(novaId);
    }

    function test_CancelNovaDeposit() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        uint256 availableBefore = escrow.availableBalance();

        vm.expectEmit(true, false, false, true);
        emit NovaRefunded(novaId, WAGER_AMOUNT);

        vm.prank(leader);
        escrow.cancelNovaDeposit(novaId);

        // Deposit cleared, balance restored
        assertEq(escrow.novaDeposits(novaId), 0);
        assertEq(escrow.availableBalance(), availableBefore + WAGER_AMOUNT);
    }

    function test_CancelNovaDeposit_RevertNotLeader() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(ClusterEscrow.OnlyLeader.selector);
        escrow.cancelNovaDeposit(novaId);
    }

    function test_CancelNovaDeposit_RevertNotDeposited() public {
        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.NovaNotDeposited.selector);
        escrow.cancelNovaDeposit(999);
    }

    function test_CancelNovaDeposit_RevertAlreadyReleased() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);

        vm.prank(novaManager);
        escrow.releaseForNova(novaId);

        vm.prank(leader);
        vm.expectRevert(ClusterEscrow.NovaAlreadyReleased.selector);
        escrow.cancelNovaDeposit(novaId);
    }

    // ============ View Function Tests ============

    function test_GetTotalBalance() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        assertEq(escrow.getTotalBalance(), DEPOSIT_AMOUNT);
    }

    function test_GetAvailableBalance() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        _depositForNova(1, WAGER_AMOUNT);

        assertEq(escrow.getAvailableBalance(), DEPOSIT_AMOUNT - WAGER_AMOUNT);
    }

    function test_GetLockedBalance() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        _depositForNova(1, WAGER_AMOUNT);

        // Locked = total contract balance - available
        assertEq(escrow.getLockedBalance(), WAGER_AMOUNT);
    }

    function test_GetInfo() public {
        _depositAsLeader(DEPOSIT_AMOUNT);

        (uint256 id, address ldr, uint256 available, uint256 total) = escrow.getInfo();

        assertEq(id, CLUSTER_ID);
        assertEq(ldr, leader);
        assertEq(available, DEPOSIT_AMOUNT);
        assertEq(total, DEPOSIT_AMOUNT);
    }

    function test_IsReadyForNova_True() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        _depositForNova(1, WAGER_AMOUNT);

        assertTrue(escrow.isReadyForNova(1, WAGER_AMOUNT));
        assertTrue(escrow.isReadyForNova(1, 0.5 ether));
    }

    function test_IsReadyForNova_False() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        _depositForNova(1, WAGER_AMOUNT);

        assertFalse(escrow.isReadyForNova(1, WAGER_AMOUNT + 1));
        assertFalse(escrow.isReadyForNova(999, WAGER_AMOUNT));
    }

    function test_GetNovaDeposit() public {
        _depositAsLeader(DEPOSIT_AMOUNT);
        _depositForNova(1, WAGER_AMOUNT);

        assertEq(escrow.getNovaDeposit(1), WAGER_AMOUNT);
        assertEq(escrow.getNovaDeposit(999), 0);
    }

    // ============ Full Lifecycle Tests ============

    function test_FullLifecycle_DepositLockRelease() public {
        // 1. Leader deposits funds
        _depositAsLeader(DEPOSIT_AMOUNT);
        assertEq(escrow.getAvailableBalance(), DEPOSIT_AMOUNT);
        assertEq(escrow.getTotalBalance(), DEPOSIT_AMOUNT);

        // 2. Leader locks wager for Nova
        uint256 novaId = 42;
        _depositForNova(novaId, WAGER_AMOUNT);
        assertEq(escrow.getAvailableBalance(), DEPOSIT_AMOUNT - WAGER_AMOUNT);
        assertEq(escrow.getLockedBalance(), WAGER_AMOUNT);
        assertEq(escrow.getTotalBalance(), DEPOSIT_AMOUNT);

        // 3. NovaManager releases the wager (Nova starts)
        uint256 novaManagerBalanceBefore = novaManager.balance;

        vm.prank(novaManager);
        uint256 released = escrow.releaseForNova(novaId);

        assertEq(released, WAGER_AMOUNT);
        assertEq(novaManager.balance, novaManagerBalanceBefore + WAGER_AMOUNT);

        // 4. Verify final balances
        assertEq(escrow.getTotalBalance(), DEPOSIT_AMOUNT - WAGER_AMOUNT);
        assertEq(escrow.getAvailableBalance(), DEPOSIT_AMOUNT - WAGER_AMOUNT);
        assertEq(escrow.getLockedBalance(), 0);
        assertTrue(escrow.novaReleased(novaId));
    }

    function test_FullLifecycle_DepositLockRefund() public {
        // 1. Leader deposits funds
        _depositAsLeader(DEPOSIT_AMOUNT);

        // 2. Leader locks wager for Nova
        uint256 novaId = 7;
        _depositForNova(novaId, WAGER_AMOUNT);
        assertEq(escrow.getAvailableBalance(), DEPOSIT_AMOUNT - WAGER_AMOUNT);

        // 3. Nova is cancelled - NovaManager refunds
        vm.prank(novaManager);
        escrow.refundNova(novaId);

        // 4. Funds returned to available balance
        assertEq(escrow.getAvailableBalance(), DEPOSIT_AMOUNT);
        assertEq(escrow.getTotalBalance(), DEPOSIT_AMOUNT);

        // 5. Leader can withdraw everything
        uint256 leaderBalanceBefore = leader.balance;
        vm.prank(leader);
        escrow.withdrawAll();
        assertEq(leader.balance, leaderBalanceBefore + DEPOSIT_AMOUNT);
    }

    function test_FullLifecycle_MultipleNovas() public {
        _depositAsLeader(10 ether);

        // Lock wagers for three different Novas
        _depositForNova(1, 2 ether);
        _depositForNova(2, 3 ether);
        _depositForNova(3, 1 ether);

        assertEq(escrow.getAvailableBalance(), 4 ether);
        assertEq(escrow.getLockedBalance(), 6 ether);

        // Release Nova 1
        vm.prank(novaManager);
        escrow.releaseForNova(1);

        // Refund Nova 2
        vm.prank(novaManager);
        escrow.refundNova(2);

        // Cancel Nova 3 by leader
        vm.prank(leader);
        escrow.cancelNovaDeposit(3);

        // Available = 4 (original) + 3 (refund) + 1 (cancel) = 8
        assertEq(escrow.getAvailableBalance(), 8 ether);
        // Total contract balance = 10 - 2 (released) = 8
        assertEq(escrow.getTotalBalance(), 8 ether);
        assertEq(escrow.getLockedBalance(), 0);
    }

    // ============ Fuzz Tests ============

    function testFuzz_Deposit_AnyAmount(uint256 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount <= 100 ether);

        vm.deal(alice, amount);
        vm.prank(alice);
        escrow.deposit{value: amount}();

        assertEq(escrow.availableBalance(), amount);
        assertEq(address(escrow).balance, amount);
    }

    function testFuzz_DepositAndWithdraw(uint256 depositAmt, uint256 withdrawAmt) public {
        vm.assume(depositAmt > 0 && depositAmt <= 100 ether);
        vm.assume(withdrawAmt > 0 && withdrawAmt <= depositAmt);

        _depositAsLeader(depositAmt);

        vm.prank(leader);
        escrow.withdraw(withdrawAmt);

        assertEq(escrow.availableBalance(), depositAmt - withdrawAmt);
    }
}
