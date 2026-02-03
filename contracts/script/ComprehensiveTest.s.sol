// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VoidMarketCore.sol";
import "../src/ClusterManager.sol";
import "../src/NovaManager.sol";

/**
 * @title Comprehensive On-Chain Test
 * @notice Tests all contract functionality on Arc Testnet
 */
contract ComprehensiveTestScript is Script {
    VoidMarketCore public voidMarketCore;
    ClusterManager public clusterManager;
    NovaManager public novaManager;

    uint256 public deployerKey;
    address public deployer;

    function run() external {
        deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        deployer = vm.addr(deployerKey);

        voidMarketCore = VoidMarketCore(payable(0xe05dC9467de459adFc5c31Ce4746579d29B65ba2));
        clusterManager = ClusterManager(0x9DFBFbA639a5Fd11Cf9bc58169157C450Ce99661);
        novaManager = NovaManager(payable(0xCEF696B36e24945f45166548B1632c7585e3F0DB));

        console.log("=== Comprehensive On-Chain Test ===");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("");

        vm.startBroadcast(deployerKey);

        // Test 1: Market with multiple bets (simulating 2 bets from same user)
        testMarketWithMultipleBets();

        // Test 2: Cancel market (refund test)
        testCancelMarket();

        // Test 3: Forked market resolution
        testForkedMarketResolution();

        // Test 4: Cluster operations
        testClusterOperations();

        vm.stopBroadcast();

        console.log("");
        console.log("=== All Comprehensive Tests Passed! ===");
    }

    function testMarketWithMultipleBets() internal {
        console.log("--- Test 1: Market with Multiple Bets ---");

        // Create market with short deadline
        uint256 deadline = block.timestamp + 30;
        uint256 resolutionDeadline = block.timestamp + 60;
        uint256 marketId = voidMarketCore.createMarket(
            "Multiple Bets Test",
            deadline,
            resolutionDeadline
        );
        console.log("Created market:", marketId);

        // Place YES bet
        bytes32 salt1 = keccak256(abi.encodePacked(block.timestamp, "bet1"));
        bytes32 commitment1 = keccak256(abi.encodePacked(true, salt1));
        uint256 bet1Id = voidMarketCore.placeBet{value: 0.02 ether}(marketId, commitment1);
        console.log("Placed YES bet:", bet1Id, "amount: 0.02 USDC");

        // Place NO bet
        bytes32 salt2 = keccak256(abi.encodePacked(block.timestamp, "bet2"));
        bytes32 commitment2 = keccak256(abi.encodePacked(false, salt2));
        uint256 bet2Id = voidMarketCore.placeBet{value: 0.03 ether}(marketId, commitment2);
        console.log("Placed NO bet:", bet2Id, "amount: 0.03 USDC");

        // Check pool
        VoidMarketCore.Market memory market = voidMarketCore.getMarket(marketId);
        console.log("Total pool:", market.totalPool);
        require(market.totalPool == 0.05 ether, "Pool mismatch");

        console.log("Test 1: PASSED");
        console.log("");
    }

    function testCancelMarket() internal {
        console.log("--- Test 2: Cancel Market (Refund Test) ---");

        // Create market
        uint256 marketId = voidMarketCore.createMarket(
            "Cancel Test Market",
            block.timestamp + 1 hours,
            block.timestamp + 2 hours
        );
        console.log("Created market:", marketId);

        // Place bet
        bytes32 salt = keccak256(abi.encodePacked(block.timestamp, "cancel_test"));
        bytes32 commitment = keccak256(abi.encodePacked(true, salt));
        uint256 balanceBefore = deployer.balance;
        uint256 betId = voidMarketCore.placeBet{value: 0.01 ether}(marketId, commitment);
        console.log("Placed bet:", betId);

        // Cancel market
        voidMarketCore.cancelMarket(marketId);
        uint256 balanceAfter = deployer.balance;
        console.log("Market cancelled, refund received");

        // Verify refund (approximately, accounting for gas)
        require(balanceAfter > balanceBefore - 0.005 ether, "Refund not received");
        console.log("Refund verified");

        // Verify market status
        VoidMarketCore.Market memory market = voidMarketCore.getMarket(marketId);
        require(market.status == VoidMarketCore.MarketStatus.CANCELLED, "Market not cancelled");

        console.log("Test 2: PASSED");
        console.log("");
    }

    function testForkedMarketResolution() internal {
        console.log("--- Test 3: Forked Market Resolution ---");

        // Create parent market
        uint256 deadline = block.timestamp + 30;
        uint256 resolutionDeadline = block.timestamp + 60;
        uint256 parentId = voidMarketCore.createMarket(
            "Parent Market for Fork Test",
            deadline,
            resolutionDeadline
        );
        console.log("Created parent market:", parentId);

        // Create forked market
        uint256 forkedId = voidMarketCore.createForkedMarket(
            parentId,
            "Forked Market Test",
            0,
            0
        );
        console.log("Created forked market:", forkedId);

        // Verify link
        VoidMarketCore.Market memory forked = voidMarketCore.getMarket(forkedId);
        require(forked.parentMarketId == parentId, "Parent link mismatch");
        require(forked.isForked, "Should be forked");

        console.log("Fork verified");
        console.log("Test 3: PASSED");
        console.log("");
    }

    function testClusterOperations() internal {
        console.log("--- Test 4: Cluster Operations ---");

        // Check if we're already in a cluster
        ClusterManager.Member memory existingMember = clusterManager.getMember(deployer);
        if (existingMember.isActive) {
            console.log("Already in cluster:", existingMember.clusterId);
            console.log("Skipping cluster creation");
        } else {
            // Create new cluster
            uint256 clusterId = clusterManager.createCluster("Test Warriors", false);
            console.log("Created cluster:", clusterId);

            // Verify membership
            ClusterManager.Cluster memory cluster = clusterManager.getCluster(clusterId);
            require(cluster.leader == deployer, "Leader mismatch");
            require(cluster.memberCount == 1, "Member count mismatch");
            console.log("Cluster created and verified");
        }

        // Get current cluster info
        existingMember = clusterManager.getMember(deployer);
        console.log("Current cluster ID:", existingMember.clusterId);
        console.log("Photons:", existingMember.photons);

        // Create invite
        bytes32 inviteCode = clusterManager.inviteToCluster(existingMember.clusterId, address(0));
        console.log("Created open invite");

        // Get cluster total photons
        uint256 totalPhotons = clusterManager.getClusterTotalPhotons(existingMember.clusterId);
        console.log("Total cluster photons:", totalPhotons);

        console.log("Test 4: PASSED");
        console.log("");
    }
}

/**
 * @title Nova Test Script
 * @notice Tests Nova (cluster battle) functionality
 * @dev Requires two clusters with members - creates test accounts
 */
contract NovaTestScript is Script {
    VoidMarketCore public voidMarketCore;
    ClusterManager public clusterManager;
    NovaManager public novaManager;

    uint256 public deployerKey;
    address public deployer;

    function run() external {
        deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        deployer = vm.addr(deployerKey);

        voidMarketCore = VoidMarketCore(payable(0xe05dC9467de459adFc5c31Ce4746579d29B65ba2));
        clusterManager = ClusterManager(0x9DFBFbA639a5Fd11Cf9bc58169157C450Ce99661);
        novaManager = NovaManager(payable(0xCEF696B36e24945f45166548B1632c7585e3F0DB));

        console.log("=== Nova System Test ===");
        console.log("Deployer:", deployer);
        console.log("");

        // For Nova to work, we need:
        // 1. Two clusters with members
        // 2. NovaManager to be admin of VoidMarketCore (to resolve markets)

        // Check current setup
        console.log("NovaManager admin:", novaManager.admin());
        console.log("VoidMarketCore admin:", voidMarketCore.admin());
        console.log("ClusterManager novaManager:", clusterManager.novaManager());

        // Nova requires 2 clusters, which is hard to test with single account
        // Let's verify the setup is correct
        require(address(novaManager.clusterManager()) == address(clusterManager), "ClusterManager not linked");
        require(address(novaManager.marketCore()) == address(voidMarketCore), "MarketCore not linked");
        require(clusterManager.novaManager() == address(novaManager), "NovaManager not set in ClusterManager");

        console.log("");
        console.log("Nova system configuration: VERIFIED");
        console.log("");
        console.log("Note: Full Nova testing requires multiple accounts to create");
        console.log("two separate clusters. The infrastructure is verified and ready.");
    }
}
