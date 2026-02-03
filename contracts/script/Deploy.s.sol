// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VoidMarketCore.sol";
import "../src/ClusterManager.sol";
import "../src/NovaManager.sol";
import "../src/VoidMarketResolver.sol";

/**
 * @title Deploy Script for VoidMarket
 * @notice Deploys all VoidMarket contracts to Arc Testnet
 * @dev Arc Testnet: Chain ID 5042002, USDC as native gas token
 *
 * Deployment order:
 * 1. VoidMarketCore (standalone)
 * 2. ClusterManager (standalone)
 * 3. NovaManager (needs VoidMarketCore + ClusterManager)
 * 4. VoidMarketResolver (needs gateway URL + signer)
 * 5. Link ClusterManager to NovaManager
 *
 * Usage:
 *   forge script script/Deploy.s.sol \
 *     --rpc-url $ARC_TESTNET_RPC_URL \
 *     --broadcast \
 *     --verify
 *
 * Required environment variables:
 *   - DEPLOYER_PRIVATE_KEY: Private key for deployment
 *   - GATEWAY_URL: ENS CCIP-Read gateway URL
 *   - GATEWAY_SIGNER: Address that signs gateway responses
 */
contract DeployScript is Script {
    // Deployed contract addresses
    VoidMarketCore public voidMarketCore;
    ClusterManager public clusterManager;
    NovaManager public novaManager;
    VoidMarketResolver public voidMarketResolver;

    function run() external {
        // Load deployment configuration
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory gatewayUrl = vm.envOr("GATEWAY_URL", string("https://gateway.voidmarket.xyz/{sender}/{data}.json"));
        address gatewaySigner = vm.envOr("GATEWAY_SIGNER", vm.addr(deployerPrivateKey));

        console.log("=== VoidMarket Deployment ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Gateway URL:", gatewayUrl);
        console.log("Gateway Signer:", gatewaySigner);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy VoidMarketCore
        console.log("Deploying VoidMarketCore...");
        voidMarketCore = new VoidMarketCore();
        console.log("VoidMarketCore deployed at:", address(voidMarketCore));
        console.log("  Admin:", voidMarketCore.admin());

        // 2. Deploy ClusterManager
        console.log("");
        console.log("Deploying ClusterManager...");
        clusterManager = new ClusterManager();
        console.log("ClusterManager deployed at:", address(clusterManager));
        console.log("  Admin:", clusterManager.admin());

        // 3. Deploy NovaManager (needs VoidMarketCore and ClusterManager)
        console.log("");
        console.log("Deploying NovaManager...");
        novaManager = new NovaManager(address(clusterManager), address(voidMarketCore));
        console.log("NovaManager deployed at:", address(novaManager));
        console.log("  Admin:", novaManager.admin());
        console.log("  ClusterManager:", address(novaManager.clusterManager()));
        console.log("  MarketCore:", address(novaManager.marketCore()));

        // 4. Link ClusterManager to NovaManager
        console.log("");
        console.log("Linking ClusterManager to NovaManager...");
        clusterManager.setNovaManager(address(novaManager));
        console.log("  ClusterManager.novaManager:", clusterManager.novaManager());

        // 5. Deploy VoidMarketResolver
        console.log("");
        console.log("Deploying VoidMarketResolver...");
        string[] memory gatewayUrls = new string[](1);
        gatewayUrls[0] = gatewayUrl;
        voidMarketResolver = new VoidMarketResolver(gatewayUrls, gatewaySigner);
        console.log("VoidMarketResolver deployed at:", address(voidMarketResolver));
        console.log("  Owner:", voidMarketResolver.owner());
        console.log("  Signer:", voidMarketResolver.signer());

        vm.stopBroadcast();

        // Output deployment summary
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("");
        console.log("Contract Addresses (copy to .env):");
        console.log("VOIDMARKET_CORE_ADDRESS=", address(voidMarketCore));
        console.log("CLUSTER_MANAGER_ADDRESS=", address(clusterManager));
        console.log("NOVA_MANAGER_ADDRESS=", address(novaManager));
        console.log("VOIDMARKET_RESOLVER_ADDRESS=", address(voidMarketResolver));
        console.log("");
        console.log("Verify contracts on block explorer:");
        console.log("VoidMarketCore: no constructor args");
        console.log("ClusterManager: no constructor args");
        console.log("NovaManager: constructor args:", address(clusterManager), address(voidMarketCore));
        console.log("VoidMarketResolver: constructor args:", gatewayUrl, gatewaySigner);
    }
}

/**
 * @title DeployCore Script
 * @notice Deploy only VoidMarketCore (useful for testing)
 */
contract DeployCoreScript is Script {
    function run() external returns (VoidMarketCore) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        VoidMarketCore core = new VoidMarketCore();
        vm.stopBroadcast();

        console.log("VoidMarketCore deployed at:", address(core));
        return core;
    }
}

/**
 * @title DeployCluster Script
 * @notice Deploy only ClusterManager (useful for testing)
 */
contract DeployClusterScript is Script {
    function run() external returns (ClusterManager) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        ClusterManager cluster = new ClusterManager();
        vm.stopBroadcast();

        console.log("ClusterManager deployed at:", address(cluster));
        return cluster;
    }
}

/**
 * @title DeployResolver Script
 * @notice Deploy only VoidMarketResolver
 */
contract DeployResolverScript is Script {
    function run() external returns (VoidMarketResolver) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory gatewayUrl = vm.envOr("GATEWAY_URL", string("https://gateway.voidmarket.xyz/{sender}/{data}.json"));
        address gatewaySigner = vm.envOr("GATEWAY_SIGNER", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);

        string[] memory gatewayUrls = new string[](1);
        gatewayUrls[0] = gatewayUrl;
        VoidMarketResolver resolver = new VoidMarketResolver(gatewayUrls, gatewaySigner);

        vm.stopBroadcast();

        console.log("VoidMarketResolver deployed at:", address(resolver));
        return resolver;
    }
}
