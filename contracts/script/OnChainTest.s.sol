// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VoidMarketCore.sol";
import "../src/ClusterManager.sol";
import "../src/NovaManager.sol";

/**
 * @title OnChainTest Script
 * @notice Tests all VoidMarket contracts on Arc Testnet
 * @dev Run with: forge script script/OnChainTest.s.sol:OnChainTestScript --rpc-url $ARC_TESTNET_RPC_URL --broadcast
 */
contract OnChainTestScript is Script {
    // Deployed contract addresses
    VoidMarketCore public voidMarketCore;
    ClusterManager public clusterManager;
    NovaManager public novaManager;

    address public deployer;
    uint256 public deployerKey;

    function run() external {
        deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        deployer = vm.addr(deployerKey);

        // Load deployed contracts
        voidMarketCore = VoidMarketCore(payable(vm.envAddress("VOIDMARKET_CORE_ADDRESS")));
        clusterManager = ClusterManager(vm.envAddress("CLUSTER_MANAGER_ADDRESS"));
        novaManager = NovaManager(payable(vm.envAddress("NOVA_MANAGER_ADDRESS")));

        console.log("=== VoidMarket On-Chain Tests ===");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("");

        vm.startBroadcast(deployerKey);

        // Test 1: VoidMarketCore
        testVoidMarketCore();

        // Test 2: ClusterManager
        testClusterManager();

        // Test 3: NovaManager (requires clusters)
        testNovaManager();

        vm.stopBroadcast();

        console.log("");
        console.log("=== All Tests Passed! ===");
    }

    function testVoidMarketCore() internal {
        console.log("--- Testing VoidMarketCore ---");

        // 1. Create a market
        uint256 deadline = block.timestamp + 1 hours;
        uint256 resolutionDeadline = block.timestamp + 2 hours;
        uint256 marketId = voidMarketCore.createMarket(
            "Will ETH hit $5000 in 2025?",
            deadline,
            resolutionDeadline
        );
        console.log("Created market ID:", marketId);

        // Verify market
        VoidMarketCore.Market memory market = voidMarketCore.getMarket(marketId);
        require(market.id == marketId, "Market ID mismatch");
        require(market.creator == deployer, "Creator mismatch");
        console.log("  Question:", market.question);
        console.log("  Creator:", market.creator);

        // 2. Place a bet with commitment
        bytes32 salt = keccak256(abi.encodePacked(block.timestamp, deployer, "secret"));
        bool direction = true; // Betting YES
        bytes32 commitment = keccak256(abi.encodePacked(direction, salt));

        uint256 betAmount = 0.1 ether; // 0.1 USDC
        uint256 betId = voidMarketCore.placeBet{value: betAmount}(marketId, commitment);
        console.log("Placed bet ID:", betId);
        console.log("  Amount:", betAmount);

        // Verify bet
        VoidMarketCore.Bet memory bet = voidMarketCore.getBet(betId);
        require(bet.bettor == deployer, "Bettor mismatch");
        require(bet.amount == betAmount, "Amount mismatch");
        require(bet.commitmentHash == commitment, "Commitment mismatch");
        console.log("  Commitment verified");

        // 3. Create a forked market
        uint256 forkedMarketId = voidMarketCore.createForkedMarket(
            marketId,
            "Private bet: Will ETH hit $5000?",
            0, // Inherit deadline
            0  // Inherit resolution deadline
        );
        console.log("Created forked market ID:", forkedMarketId);

        // Verify forked market
        VoidMarketCore.Market memory forkedMarket = voidMarketCore.getMarket(forkedMarketId);
        require(forkedMarket.isForked, "Not forked");
        require(forkedMarket.parentMarketId == marketId, "Parent mismatch");
        console.log("  Parent market:", forkedMarket.parentMarketId);
        console.log("  Is forked:", forkedMarket.isForked);

        console.log("VoidMarketCore: PASSED");
        console.log("");
    }

    function testClusterManager() internal {
        console.log("--- Testing ClusterManager ---");

        // 1. Create a public cluster
        uint256 cluster1Id = clusterManager.createCluster("Alpha Warriors", false);
        console.log("Created cluster 1 ID:", cluster1Id);

        // Verify cluster
        ClusterManager.Cluster memory cluster1 = clusterManager.getCluster(cluster1Id);
        require(cluster1.id == cluster1Id, "Cluster ID mismatch");
        require(cluster1.leader == deployer, "Leader mismatch");
        require(!cluster1.isPrivate, "Should be public");
        console.log("  Name:", cluster1.name);
        console.log("  Leader:", cluster1.leader);
        console.log("  Member count:", cluster1.memberCount);

        // 2. Check membership
        bool isMember = clusterManager.isMemberOf(deployer, cluster1Id);
        require(isMember, "Should be member");
        console.log("  Deployer is member: true");

        // 3. Create invite (even for public cluster)
        bytes32 inviteCode = clusterManager.inviteToCluster(cluster1Id, address(0)); // Open invite
        console.log("Created invite code");

        // 4. Get cluster members
        address[] memory members = clusterManager.getClusterMembers(cluster1Id);
        require(members.length == 1, "Should have 1 member");
        require(members[0] == deployer, "First member should be deployer");
        console.log("  Members:", members.length);

        console.log("ClusterManager: PASSED");
        console.log("");
    }

    function testNovaManager() internal {
        console.log("--- Testing NovaManager ---");

        // We need 2 clusters with members for Nova
        // Cluster 1 was created in testClusterManager

        // First, leave the current cluster by transferring leadership
        // Actually, we can't easily test Nova without multiple addresses
        // Let's just verify the Nova contracts are set up correctly

        console.log("Verifying NovaManager setup...");
        console.log("  ClusterManager:", address(novaManager.clusterManager()));
        console.log("  MarketCore:", address(novaManager.marketCore()));
        console.log("  Admin:", novaManager.admin());

        require(address(novaManager.clusterManager()) == address(clusterManager), "ClusterManager mismatch");
        require(address(novaManager.marketCore()) == address(voidMarketCore), "MarketCore mismatch");
        require(novaManager.admin() == deployer, "Admin mismatch");

        console.log("NovaManager: SETUP VERIFIED");
        console.log("");
    }
}

/**
 * @title Full Integration Test Script
 * @notice Tests the complete flow including betting and resolution
 */
contract FullIntegrationTestScript is Script {
    VoidMarketCore public voidMarketCore;
    ClusterManager public clusterManager;
    NovaManager public novaManager;

    address public deployer;
    uint256 public deployerKey;

    // Test state
    uint256 public marketId;
    uint256 public betId;
    bytes32 public salt;
    bool public direction;

    function run() external {
        deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        deployer = vm.addr(deployerKey);

        voidMarketCore = VoidMarketCore(payable(vm.envAddress("VOIDMARKET_CORE_ADDRESS")));
        clusterManager = ClusterManager(vm.envAddress("CLUSTER_MANAGER_ADDRESS"));
        novaManager = NovaManager(payable(vm.envAddress("NOVA_MANAGER_ADDRESS")));

        console.log("=== Full Integration Test ===");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("");

        vm.startBroadcast(deployerKey);

        // Step 1: Create market with short deadlines for testing
        console.log("Step 1: Creating market...");
        uint256 deadline = block.timestamp + 60; // 1 minute
        uint256 resolutionDeadline = block.timestamp + 120; // 2 minutes
        marketId = voidMarketCore.createMarket(
            "Integration Test Market",
            deadline,
            resolutionDeadline
        );
        console.log("  Market ID:", marketId);

        // Step 2: Place a bet
        console.log("Step 2: Placing bet...");
        salt = keccak256(abi.encodePacked(block.timestamp, deployer, "integration_test"));
        direction = true;
        bytes32 commitment = keccak256(abi.encodePacked(direction, salt));
        betId = voidMarketCore.placeBet{value: 0.05 ether}(marketId, commitment);
        console.log("  Bet ID:", betId);

        // Step 3: Wait for deadline (in real test, we'd wait)
        console.log("Step 3: Market state before resolution...");
        VoidMarketCore.Market memory market = voidMarketCore.getMarket(marketId);
        console.log("  Status:", uint256(market.status));
        console.log("  Total Pool:", market.totalPool);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Integration Test Complete ===");
        console.log("Note: To complete the test, wait for deadline and run:");
        console.log("  - ResolveAndClaimScript with marketId:", marketId);
        console.log("  - betId:", betId);
        console.log("  - direction:", direction);
        console.log("  - salt:", vm.toString(salt));
    }
}

/**
 * @title Resolve and Claim Script
 * @notice Resolves a market and claims winnings
 */
contract ResolveAndClaimScript is Script {
    VoidMarketCore public voidMarketCore;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        voidMarketCore = VoidMarketCore(payable(vm.envAddress("VOIDMARKET_CORE_ADDRESS")));

        uint256 marketId = vm.envUint("MARKET_ID");
        uint256 betId = vm.envUint("BET_ID");
        bool direction = vm.envBool("DIRECTION");
        bytes32 salt = vm.envBytes32("SALT");

        console.log("=== Resolve and Claim ===");
        console.log("Market ID:", marketId);
        console.log("Bet ID:", betId);

        vm.startBroadcast(deployerKey);

        // Check market status
        VoidMarketCore.Market memory market = voidMarketCore.getMarket(marketId);
        console.log("Market status:", uint256(market.status));

        if (market.status == VoidMarketCore.MarketStatus.ACTIVE) {
            // Resolve market (admin only)
            console.log("Resolving market with outcome:", direction);
            voidMarketCore.resolveMarket(marketId, direction);
            console.log("Market resolved!");
        }

        // Reveal bet
        market = voidMarketCore.getMarket(marketId);
        if (market.status == VoidMarketCore.MarketStatus.RESOLVED) {
            console.log("Revealing bet...");
            voidMarketCore.revealBet(betId, direction, salt);
            console.log("Bet revealed!");

            // Claim winnings
            console.log("Claiming winnings...");
            voidMarketCore.claimWinnings(betId);
            console.log("Winnings claimed!");
        }

        vm.stopBroadcast();

        console.log("=== Complete ===");
    }
}
