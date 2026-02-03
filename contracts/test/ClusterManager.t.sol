// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ClusterManager.sol";

contract ClusterManagerTest is Test {
    ClusterManager public cluster;

    address public admin;
    address public novaManager;
    address public alice;
    address public bob;
    address public charlie;
    address public diana;

    event ClusterCreated(
        uint256 indexed clusterId,
        address indexed leader,
        string name,
        bool isPrivate
    );

    event MemberJoined(
        uint256 indexed clusterId,
        address indexed member,
        bytes32 inviteCode
    );

    event MemberLeft(
        uint256 indexed clusterId,
        address indexed member
    );

    event InviteCreated(
        uint256 indexed inviteId,
        uint256 indexed clusterId,
        address indexed invitee,
        bytes32 inviteCode,
        uint256 expiresAt
    );

    event InviteUsed(
        uint256 indexed inviteId,
        uint256 indexed clusterId,
        address indexed member
    );

    event PhotonsUpdated(
        uint256 indexed clusterId,
        address indexed member,
        int256 delta,
        uint256 newTotal
    );

    event EnergyUpdated(
        uint256 indexed clusterId,
        int256 delta,
        uint256 newTotal
    );

    event NovaResultRecorded(
        uint256 indexed clusterId,
        bool won
    );

    event LeaderTransferred(
        uint256 indexed clusterId,
        address indexed oldLeader,
        address indexed newLeader
    );

    function setUp() public {
        admin = makeAddr("admin");
        novaManager = makeAddr("novaManager");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");
        diana = makeAddr("diana");

        vm.prank(admin);
        cluster = new ClusterManager();

        vm.prank(admin);
        cluster.setNovaManager(novaManager);
    }

    // ============ Helper Functions ============

    function _createCluster(address creator, string memory name, bool isPrivate)
        internal
        returns (uint256 clusterId)
    {
        vm.prank(creator);
        clusterId = cluster.createCluster(name, isPrivate);
    }

    function _createPublicCluster(address creator, string memory name)
        internal
        returns (uint256 clusterId)
    {
        return _createCluster(creator, name, false);
    }

    function _createPrivateCluster(address creator, string memory name)
        internal
        returns (uint256 clusterId)
    {
        return _createCluster(creator, name, true);
    }

    function _inviteToCluster(address inviter, uint256 clusterId, address invitee)
        internal
        returns (bytes32 inviteCode)
    {
        vm.prank(inviter);
        inviteCode = cluster.inviteToCluster(clusterId, invitee);
    }

    // ============ Cluster Creation Tests ============

    function test_CreatePublicCluster() public {
        vm.expectEmit(true, true, false, true);
        emit ClusterCreated(1, alice, "Alpha Squad", false);

        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        assertEq(clusterId, 1);
        assertEq(cluster.clusterCount(), 1);

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.id, 1);
        assertEq(c.name, "Alpha Squad");
        assertEq(c.leader, alice);
        assertEq(c.energy, 0);
        assertEq(c.novasWon, 0);
        assertEq(c.totalNovas, 0);
        assertEq(c.isPrivate, false);
        assertEq(c.memberCount, 1);
        assertEq(c.maxMembers, 50);
    }

    function test_CreatePrivateCluster() public {
        vm.expectEmit(true, true, false, true);
        emit ClusterCreated(1, alice, "Secret Squad", true);

        uint256 clusterId = _createPrivateCluster(alice, "Secret Squad");

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.isPrivate, true);
    }

    function test_CreateCluster_CreatorIsMember() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        ClusterManager.Member memory member = cluster.getMember(alice);
        assertEq(member.memberAddress, alice);
        assertEq(member.clusterId, clusterId);
        assertEq(member.photons, 0);
        assertEq(member.isActive, true);

        address[] memory members = cluster.getClusterMembers(clusterId);
        assertEq(members.length, 1);
        assertEq(members[0], alice);
    }

    function test_CreateCluster_RevertAlreadyInCluster() public {
        _createPublicCluster(alice, "First Cluster");

        vm.prank(alice);
        vm.expectRevert(ClusterManager.AlreadyInCluster.selector);
        cluster.createCluster("Second Cluster", false);
    }

    function test_CreateCluster_RevertNameTaken() public {
        _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        vm.expectRevert(ClusterManager.NameTaken.selector);
        cluster.createCluster("Alpha Squad", false);
    }

    function test_CreateMultipleClusters() public {
        uint256 cluster1 = _createPublicCluster(alice, "Alpha");
        uint256 cluster2 = _createPublicCluster(bob, "Beta");
        uint256 cluster3 = _createPrivateCluster(charlie, "Gamma");

        assertEq(cluster1, 1);
        assertEq(cluster2, 2);
        assertEq(cluster3, 3);
        assertEq(cluster.clusterCount(), 3);
    }

    // ============ Invite Tests ============

    function test_InviteToCluster() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.expectEmit(true, true, true, false);
        emit InviteCreated(1, clusterId, bob, bytes32(0), 0);

        bytes32 inviteCode = _inviteToCluster(alice, clusterId, bob);

        assertTrue(inviteCode != bytes32(0));
        assertEq(cluster.inviteCount(), 1);

        ClusterManager.Invite memory invite = cluster.getInvite(1);
        assertEq(invite.id, 1);
        assertEq(invite.clusterId, clusterId);
        assertEq(invite.invitee, bob);
        assertEq(invite.inviter, alice);
        assertEq(invite.inviteCode, inviteCode);
        assertEq(invite.used, false);
        assertEq(invite.expiresAt, block.timestamp + 7 days);
    }

    function test_InviteToCluster_OpenInvite() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        bytes32 inviteCode = _inviteToCluster(alice, clusterId, address(0));

        ClusterManager.Invite memory invite = cluster.getInviteByCode(inviteCode);
        assertEq(invite.invitee, address(0));
    }

    function test_InviteToCluster_RevertNotMember() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob); // Bob is not a member
        vm.expectRevert(ClusterManager.OnlyClusterMember.selector);
        cluster.inviteToCluster(clusterId, charlie);
    }

    function test_InviteToCluster_RevertClusterNotFound() public {
        vm.prank(alice);
        vm.expectRevert(ClusterManager.OnlyClusterMember.selector);
        cluster.inviteToCluster(999, bob);
    }

    function test_GetClusterInvites() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        _inviteToCluster(alice, clusterId, bob);
        _inviteToCluster(alice, clusterId, charlie);

        uint256[] memory invites = cluster.getClusterInvites(clusterId);
        assertEq(invites.length, 2);
        assertEq(invites[0], 1);
        assertEq(invites[1], 2);
    }

    // ============ Join Cluster Tests ============

    function test_JoinPublicCluster() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.expectEmit(true, true, false, true);
        emit MemberJoined(clusterId, bob, bytes32(0));

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.memberCount, 2);

        ClusterManager.Member memory member = cluster.getMember(bob);
        assertEq(member.clusterId, clusterId);
        assertEq(member.isActive, true);

        assertTrue(cluster.isMemberOf(bob, clusterId));
    }

    function test_JoinPrivateCluster_WithInvite() public {
        uint256 clusterId = _createPrivateCluster(alice, "Secret Squad");

        bytes32 inviteCode = _inviteToCluster(alice, clusterId, bob);

        vm.expectEmit(true, true, true, true);
        emit InviteUsed(1, clusterId, bob);

        vm.expectEmit(true, true, false, true);
        emit MemberJoined(clusterId, bob, inviteCode);

        vm.prank(bob);
        cluster.joinCluster(clusterId, inviteCode);

        ClusterManager.Member memory member = cluster.getMember(bob);
        assertEq(member.clusterId, clusterId);

        ClusterManager.Invite memory invite = cluster.getInvite(1);
        assertEq(invite.used, true);
    }

    function test_JoinPublicCluster_WithOpenInvite() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        bytes32 openInvite = _inviteToCluster(alice, clusterId, address(0));

        vm.prank(bob);
        cluster.joinCluster(clusterId, openInvite);

        assertTrue(cluster.isMemberOf(bob, clusterId));
    }

    function test_JoinCluster_RevertClusterNotFound() public {
        vm.prank(bob);
        vm.expectRevert(ClusterManager.ClusterNotFound.selector);
        cluster.joinCluster(999, bytes32(0));
    }

    function test_JoinCluster_RevertAlreadyInCluster() public {
        _createPublicCluster(alice, "Alpha Squad");
        uint256 cluster2 = _createPublicCluster(bob, "Beta Squad");

        vm.prank(alice);
        vm.expectRevert(ClusterManager.AlreadyInCluster.selector);
        cluster.joinCluster(cluster2, bytes32(0));
    }

    function test_JoinPrivateCluster_RevertNoInvite() public {
        uint256 clusterId = _createPrivateCluster(alice, "Secret Squad");

        vm.prank(bob);
        vm.expectRevert(ClusterManager.InvalidInvite.selector);
        cluster.joinCluster(clusterId, bytes32(0));
    }

    function test_JoinCluster_RevertInvalidInvite() public {
        uint256 clusterId = _createPrivateCluster(alice, "Secret Squad");

        bytes32 fakeInvite = keccak256("fake");

        vm.prank(bob);
        vm.expectRevert(ClusterManager.InvalidInvite.selector);
        cluster.joinCluster(clusterId, fakeInvite);
    }

    function test_JoinCluster_RevertInviteExpired() public {
        uint256 clusterId = _createPrivateCluster(alice, "Secret Squad");

        bytes32 inviteCode = _inviteToCluster(alice, clusterId, bob);

        // Fast forward past expiry
        vm.warp(block.timestamp + 8 days);

        vm.prank(bob);
        vm.expectRevert(ClusterManager.InviteExpired.selector);
        cluster.joinCluster(clusterId, inviteCode);
    }

    function test_JoinCluster_RevertInviteAlreadyUsed() public {
        uint256 clusterId = _createPrivateCluster(alice, "Secret Squad");

        bytes32 inviteCode = _inviteToCluster(alice, clusterId, address(0)); // Open invite

        vm.prank(bob);
        cluster.joinCluster(clusterId, inviteCode);

        vm.prank(charlie);
        vm.expectRevert(ClusterManager.InviteAlreadyUsed.selector);
        cluster.joinCluster(clusterId, inviteCode);
    }

    function test_JoinCluster_RevertWrongInvitee() public {
        uint256 clusterId = _createPrivateCluster(alice, "Secret Squad");

        bytes32 inviteCode = _inviteToCluster(alice, clusterId, bob); // Specific to Bob

        vm.prank(charlie); // Charlie tries to use Bob's invite
        vm.expectRevert(ClusterManager.InvalidInvite.selector);
        cluster.joinCluster(clusterId, inviteCode);
    }

    function test_JoinCluster_RevertClusterFull() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        // Fill up the cluster (max 50 members, alice is already 1)
        for (uint256 i = 0; i < 49; i++) {
            address member = makeAddr(string(abi.encodePacked("member", i)));
            vm.prank(member);
            cluster.joinCluster(clusterId, bytes32(0));
        }

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.memberCount, 50);

        address extraMember = makeAddr("extraMember");
        vm.prank(extraMember);
        vm.expectRevert(ClusterManager.ClusterFull.selector);
        cluster.joinCluster(clusterId, bytes32(0));
    }

    // ============ Leave Cluster Tests ============

    function test_LeaveCluster() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        vm.expectEmit(true, true, false, false);
        emit MemberLeft(clusterId, bob);

        vm.prank(bob);
        cluster.leaveCluster();

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.memberCount, 1);

        ClusterManager.Member memory member = cluster.getMember(bob);
        assertEq(member.isActive, false);
        assertEq(member.clusterId, 0);

        assertFalse(cluster.isMemberOf(bob, clusterId));
    }

    function test_LeaveCluster_RevertNotInCluster() public {
        vm.prank(bob);
        vm.expectRevert(ClusterManager.NotInCluster.selector);
        cluster.leaveCluster();
    }

    function test_LeaveCluster_RevertLeaderCannotLeave() public {
        _createPublicCluster(alice, "Alpha Squad");

        vm.prank(alice);
        vm.expectRevert(ClusterManager.CannotLeaveAsLeader.selector);
        cluster.leaveCluster();
    }

    function test_LeaveCluster_UpdatesMemberArray() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));
        vm.prank(charlie);
        cluster.joinCluster(clusterId, bytes32(0));

        address[] memory membersBefore = cluster.getClusterMembers(clusterId);
        assertEq(membersBefore.length, 3);

        vm.prank(bob);
        cluster.leaveCluster();

        address[] memory membersAfter = cluster.getClusterMembers(clusterId);
        assertEq(membersAfter.length, 2);
    }

    // ============ Leadership Transfer Tests ============

    function test_TransferLeadership() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        vm.expectEmit(true, true, true, false);
        emit LeaderTransferred(clusterId, alice, bob);

        vm.prank(alice);
        cluster.transferLeadership(clusterId, bob);

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.leader, bob);
    }

    function test_TransferLeadership_ThenLeaderCanLeave() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        vm.prank(alice);
        cluster.transferLeadership(clusterId, bob);

        // Now Alice can leave
        vm.prank(alice);
        cluster.leaveCluster();

        assertFalse(cluster.isMemberOf(alice, clusterId));
    }

    function test_TransferLeadership_RevertNotLeader() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        vm.prank(bob);
        vm.expectRevert(ClusterManager.OnlyClusterLeader.selector);
        cluster.transferLeadership(clusterId, charlie);
    }

    function test_TransferLeadership_RevertNotMember() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(alice);
        vm.expectRevert(ClusterManager.OnlyClusterMember.selector);
        cluster.transferLeadership(clusterId, bob);
    }

    // ============ Photons Tests ============

    function test_UpdatePhotons_Increase() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.expectEmit(true, true, false, true);
        emit PhotonsUpdated(clusterId, alice, 100, 100);

        vm.prank(novaManager);
        cluster.updatePhotons(clusterId, alice, 100);

        ClusterManager.Member memory member = cluster.getMember(alice);
        assertEq(member.photons, 100);
    }

    function test_UpdatePhotons_Decrease() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(novaManager);
        cluster.updatePhotons(clusterId, alice, 100);

        vm.expectEmit(true, true, false, true);
        emit PhotonsUpdated(clusterId, alice, -30, 70);

        vm.prank(novaManager);
        cluster.updatePhotons(clusterId, alice, -30);

        ClusterManager.Member memory member = cluster.getMember(alice);
        assertEq(member.photons, 70);
    }

    function test_UpdatePhotons_DecreaseToZero() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(novaManager);
        cluster.updatePhotons(clusterId, alice, 50);

        vm.prank(novaManager);
        cluster.updatePhotons(clusterId, alice, -100); // More than balance

        ClusterManager.Member memory member = cluster.getMember(alice);
        assertEq(member.photons, 0); // Floors at 0
    }

    function test_UpdatePhotons_RevertNotNovaManager() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(admin);
        vm.expectRevert(ClusterManager.OnlyNovaManager.selector);
        cluster.updatePhotons(clusterId, alice, 100);
    }

    function test_UpdatePhotons_RevertNotClusterMember() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(novaManager);
        vm.expectRevert(ClusterManager.OnlyClusterMember.selector);
        cluster.updatePhotons(clusterId, bob, 100);
    }

    function test_GetClusterTotalPhotons() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));
        vm.prank(charlie);
        cluster.joinCluster(clusterId, bytes32(0));

        vm.startPrank(novaManager);
        cluster.updatePhotons(clusterId, alice, 100);
        cluster.updatePhotons(clusterId, bob, 150);
        cluster.updatePhotons(clusterId, charlie, 50);
        vm.stopPrank();

        uint256 total = cluster.getClusterTotalPhotons(clusterId);
        assertEq(total, 300);
    }

    // ============ Energy Tests ============

    function test_UpdateEnergy_Increase() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.expectEmit(true, false, false, true);
        emit EnergyUpdated(clusterId, 500, 500);

        vm.prank(novaManager);
        cluster.updateEnergy(clusterId, 500);

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.energy, 500);
    }

    function test_UpdateEnergy_Decrease() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(novaManager);
        cluster.updateEnergy(clusterId, 500);

        vm.expectEmit(true, false, false, true);
        emit EnergyUpdated(clusterId, -200, 300);

        vm.prank(novaManager);
        cluster.updateEnergy(clusterId, -200);

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.energy, 300);
    }

    function test_UpdateEnergy_DecreaseToZero() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(novaManager);
        cluster.updateEnergy(clusterId, 100);

        vm.prank(novaManager);
        cluster.updateEnergy(clusterId, -500); // More than balance

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.energy, 0);
    }

    function test_UpdateEnergy_RevertNotNovaManager() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(admin);
        vm.expectRevert(ClusterManager.OnlyNovaManager.selector);
        cluster.updateEnergy(clusterId, 500);
    }

    function test_UpdateEnergy_RevertClusterNotFound() public {
        vm.prank(novaManager);
        vm.expectRevert(ClusterManager.ClusterNotFound.selector);
        cluster.updateEnergy(999, 500);
    }

    // ============ Nova Result Tests ============

    function test_RecordNovaResult_Won() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.expectEmit(true, false, false, true);
        emit NovaResultRecorded(clusterId, true);

        vm.prank(novaManager);
        cluster.recordNovaResult(clusterId, true);

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.totalNovas, 1);
        assertEq(c.novasWon, 1);
    }

    function test_RecordNovaResult_Lost() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.expectEmit(true, false, false, true);
        emit NovaResultRecorded(clusterId, false);

        vm.prank(novaManager);
        cluster.recordNovaResult(clusterId, false);

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.totalNovas, 1);
        assertEq(c.novasWon, 0);
    }

    function test_RecordNovaResult_Multiple() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.startPrank(novaManager);
        cluster.recordNovaResult(clusterId, true);
        cluster.recordNovaResult(clusterId, false);
        cluster.recordNovaResult(clusterId, true);
        cluster.recordNovaResult(clusterId, true);
        vm.stopPrank();

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.totalNovas, 4);
        assertEq(c.novasWon, 3);
    }

    function test_RecordNovaResult_RevertNotNovaManager() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(admin);
        vm.expectRevert(ClusterManager.OnlyNovaManager.selector);
        cluster.recordNovaResult(clusterId, true);
    }

    function test_RecordNovaResult_RevertClusterNotFound() public {
        vm.prank(novaManager);
        vm.expectRevert(ClusterManager.ClusterNotFound.selector);
        cluster.recordNovaResult(999, true);
    }

    // ============ Admin Tests ============

    function test_SetNovaManager() public {
        address newNovaManager = makeAddr("newNovaManager");

        vm.prank(admin);
        cluster.setNovaManager(newNovaManager);

        assertEq(cluster.novaManager(), newNovaManager);
    }

    function test_SetNovaManager_RevertNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(ClusterManager.OnlyAdmin.selector);
        cluster.setNovaManager(alice);
    }

    function test_SetNovaManager_RevertZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(ClusterManager.InvalidAddress.selector);
        cluster.setNovaManager(address(0));
    }

    function test_SetAdmin() public {
        vm.prank(admin);
        cluster.setAdmin(alice);

        assertEq(cluster.admin(), alice);
    }

    function test_SetAdmin_RevertNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(ClusterManager.OnlyAdmin.selector);
        cluster.setAdmin(alice);
    }

    function test_SetAdmin_RevertZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(ClusterManager.InvalidAddress.selector);
        cluster.setAdmin(address(0));
    }

    // ============ View Functions Tests ============

    function test_GetClusterMemberDetails() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        vm.prank(novaManager);
        cluster.updatePhotons(clusterId, alice, 100);

        ClusterManager.Member[] memory members = cluster.getClusterMemberDetails(clusterId);
        assertEq(members.length, 2);
        assertEq(members[0].memberAddress, alice);
        assertEq(members[0].photons, 100);
        assertEq(members[1].memberAddress, bob);
        assertEq(members[1].photons, 0);
    }

    function test_IsMemberOf() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        assertTrue(cluster.isMemberOf(alice, clusterId));
        assertFalse(cluster.isMemberOf(bob, clusterId));

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        assertTrue(cluster.isMemberOf(bob, clusterId));
    }

    function test_IsMemberOf_AfterLeaving() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        vm.prank(bob);
        cluster.leaveCluster();

        assertFalse(cluster.isMemberOf(bob, clusterId));
    }

    // ============ Full Lifecycle Test ============

    function test_FullLifecycle() public {
        // 1. Alice creates a private cluster
        uint256 clusterId = _createPrivateCluster(alice, "Elite Squad");

        // 2. Alice invites Bob
        bytes32 bobInvite = _inviteToCluster(alice, clusterId, bob);

        // 3. Bob joins
        vm.prank(bob);
        cluster.joinCluster(clusterId, bobInvite);

        // 4. Bob invites Charlie (as a member)
        bytes32 charlieInvite = _inviteToCluster(bob, clusterId, charlie);

        // 5. Charlie joins
        vm.prank(charlie);
        cluster.joinCluster(clusterId, charlieInvite);

        // 6. Nova manager updates photons
        vm.startPrank(novaManager);
        cluster.updatePhotons(clusterId, alice, 200);
        cluster.updatePhotons(clusterId, bob, 150);
        cluster.updatePhotons(clusterId, charlie, 100);
        vm.stopPrank();

        // 7. Nova manager updates energy
        vm.prank(novaManager);
        cluster.updateEnergy(clusterId, 1000);

        // 8. Record nova win
        vm.prank(novaManager);
        cluster.recordNovaResult(clusterId, true);

        // 9. Verify final state
        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.memberCount, 3);
        assertEq(c.energy, 1000);
        assertEq(c.novasWon, 1);
        assertEq(c.totalNovas, 1);

        uint256 totalPhotons = cluster.getClusterTotalPhotons(clusterId);
        assertEq(totalPhotons, 450);

        // 10. Alice transfers leadership to Bob
        vm.prank(alice);
        cluster.transferLeadership(clusterId, bob);

        // 11. Alice can now leave
        vm.prank(alice);
        cluster.leaveCluster();

        c = cluster.getCluster(clusterId);
        assertEq(c.memberCount, 2);
        assertEq(c.leader, bob);
    }

    // ============ Edge Cases ============

    function test_EdgeCase_RejoinAfterLeaving() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        vm.prank(bob);
        cluster.leaveCluster();

        // Bob can rejoin
        vm.prank(bob);
        cluster.joinCluster(clusterId, bytes32(0));

        assertTrue(cluster.isMemberOf(bob, clusterId));
    }

    function test_EdgeCase_JoinDifferentClusterAfterLeaving() public {
        uint256 cluster1 = _createPublicCluster(alice, "Alpha");
        uint256 cluster2 = _createPublicCluster(bob, "Beta");

        vm.prank(charlie);
        cluster.joinCluster(cluster1, bytes32(0));

        // Transfer leadership so charlie can leave
        vm.prank(alice);
        cluster.transferLeadership(cluster1, charlie);

        vm.prank(alice);
        cluster.leaveCluster();

        // Alice joins cluster2
        vm.prank(alice);
        cluster.joinCluster(cluster2, bytes32(0));

        assertTrue(cluster.isMemberOf(alice, cluster2));
        assertFalse(cluster.isMemberOf(alice, cluster1));
    }

    function test_EdgeCase_InviteMultipleUsers() public {
        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        bytes32 invite1 = _inviteToCluster(alice, clusterId, bob);
        bytes32 invite2 = _inviteToCluster(alice, clusterId, charlie);
        bytes32 invite3 = _inviteToCluster(alice, clusterId, diana);

        assertTrue(invite1 != invite2);
        assertTrue(invite2 != invite3);
        assertTrue(invite1 != invite3);
    }

    // ============ Fuzz Tests ============

    function testFuzz_CreateCluster_AnyName(string memory name) public {
        vm.assume(bytes(name).length > 0);
        vm.assume(bytes(name).length < 100);

        vm.prank(alice);
        uint256 clusterId = cluster.createCluster(name, false);

        ClusterManager.Cluster memory c = cluster.getCluster(clusterId);
        assertEq(c.name, name);
    }

    function testFuzz_UpdatePhotons_AnyPositiveDelta(int256 delta) public {
        vm.assume(delta > 0);
        vm.assume(delta < type(int256).max / 2);

        uint256 clusterId = _createPublicCluster(alice, "Alpha Squad");

        vm.prank(novaManager);
        cluster.updatePhotons(clusterId, alice, delta);

        ClusterManager.Member memory member = cluster.getMember(alice);
        assertEq(member.photons, uint256(delta));
    }
}
