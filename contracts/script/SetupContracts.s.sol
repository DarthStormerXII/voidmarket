// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VoidMarketCore.sol";
import "../src/ClusterManager.sol";
import "../src/NovaManager.sol";
import "../src/VoidMarketResolver.sol";

/**
 * @title SetupContracts Script
 * @notice Post-deployment configuration for VoidMarket contracts
 * @dev Run after Deploy.s.sol to configure admin addresses and other settings
 *
 * Usage:
 *   forge script script/SetupContracts.s.sol:SetupAdmins \
 *     --rpc-url $ARC_TESTNET_RPC_URL \
 *     --broadcast
 *
 * Required environment variables:
 *   - DEPLOYER_PRIVATE_KEY: Current admin private key
 *   - VOIDMARKET_CORE_ADDRESS: Deployed VoidMarketCore address
 *   - CLUSTER_MANAGER_ADDRESS: Deployed ClusterManager address
 *   - NOVA_MANAGER_ADDRESS: Deployed NovaManager address
 *   - VOIDMARKET_RESOLVER_ADDRESS: Deployed VoidMarketResolver address
 *   - NEW_ADMIN_ADDRESS: (Optional) New admin address
 */

/**
 * @title SetupAdmins
 * @notice Transfer admin roles to a new address
 */
contract SetupAdmins is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address newAdmin = vm.envAddress("NEW_ADMIN_ADDRESS");

        address coreAddress = vm.envAddress("VOIDMARKET_CORE_ADDRESS");
        address clusterAddress = vm.envAddress("CLUSTER_MANAGER_ADDRESS");
        address novaAddress = vm.envAddress("NOVA_MANAGER_ADDRESS");
        address resolverAddress = vm.envAddress("VOIDMARKET_RESOLVER_ADDRESS");

        console.log("=== Transferring Admin Roles ===");
        console.log("New Admin:", newAdmin);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Transfer VoidMarketCore admin
        VoidMarketCore core = VoidMarketCore(payable(coreAddress));
        console.log("VoidMarketCore current admin:", core.admin());
        core.setAdmin(newAdmin);
        console.log("VoidMarketCore new admin:", core.admin());

        // Transfer ClusterManager admin
        ClusterManager cluster = ClusterManager(clusterAddress);
        console.log("");
        console.log("ClusterManager current admin:", cluster.admin());
        cluster.setAdmin(newAdmin);
        console.log("ClusterManager new admin:", cluster.admin());

        // Transfer NovaManager admin
        NovaManager nova = NovaManager(payable(novaAddress));
        console.log("");
        console.log("NovaManager current admin:", nova.admin());
        nova.setAdmin(newAdmin);
        console.log("NovaManager new admin:", nova.admin());

        // Transfer VoidMarketResolver ownership
        VoidMarketResolver resolver = VoidMarketResolver(resolverAddress);
        console.log("");
        console.log("VoidMarketResolver current owner:", resolver.owner());
        resolver.transferOwnership(newAdmin);
        console.log("VoidMarketResolver new owner:", resolver.owner());

        vm.stopBroadcast();

        console.log("");
        console.log("=== Admin Transfer Complete ===");
    }
}

/**
 * @title SetupGateway
 * @notice Update gateway URLs for the resolver
 */
contract SetupGateway is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address resolverAddress = vm.envAddress("VOIDMARKET_RESOLVER_ADDRESS");
        string memory gatewayUrl = vm.envString("GATEWAY_URL");

        console.log("=== Updating Gateway URLs ===");
        console.log("Resolver:", resolverAddress);
        console.log("New Gateway URL:", gatewayUrl);

        vm.startBroadcast(deployerPrivateKey);

        VoidMarketResolver resolver = VoidMarketResolver(resolverAddress);

        string[] memory newUrls = new string[](1);
        newUrls[0] = gatewayUrl;
        resolver.setGatewayUrls(newUrls);

        vm.stopBroadcast();

        console.log("");
        console.log("Gateway URLs updated successfully");
    }
}

/**
 * @title SetupGatewaySigner
 * @notice Update gateway signer for the resolver
 */
contract SetupGatewaySigner is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address resolverAddress = vm.envAddress("VOIDMARKET_RESOLVER_ADDRESS");
        address newSigner = vm.envAddress("GATEWAY_SIGNER");

        console.log("=== Updating Gateway Signer ===");
        console.log("Resolver:", resolverAddress);
        console.log("New Signer:", newSigner);

        vm.startBroadcast(deployerPrivateKey);

        VoidMarketResolver resolver = VoidMarketResolver(resolverAddress);
        console.log("Current signer:", resolver.signer());
        resolver.setSigner(newSigner);
        console.log("New signer:", resolver.signer());

        vm.stopBroadcast();

        console.log("");
        console.log("Gateway signer updated successfully");
    }
}

/**
 * @title LinkNovaManager
 * @notice Link NovaManager to ClusterManager (if not done during deployment)
 */
contract LinkNovaManager is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address clusterAddress = vm.envAddress("CLUSTER_MANAGER_ADDRESS");
        address novaAddress = vm.envAddress("NOVA_MANAGER_ADDRESS");

        console.log("=== Linking NovaManager ===");
        console.log("ClusterManager:", clusterAddress);
        console.log("NovaManager:", novaAddress);

        vm.startBroadcast(deployerPrivateKey);

        ClusterManager cluster = ClusterManager(clusterAddress);
        console.log("Current NovaManager in ClusterManager:", cluster.novaManager());
        cluster.setNovaManager(novaAddress);
        console.log("New NovaManager in ClusterManager:", cluster.novaManager());

        vm.stopBroadcast();

        console.log("");
        console.log("NovaManager linked successfully");
    }
}

/**
 * @title VerifyDeployment
 * @notice Verify all contracts are deployed and configured correctly
 */
contract VerifyDeployment is Script {
    function run() external view {
        address coreAddress = vm.envAddress("VOIDMARKET_CORE_ADDRESS");
        address clusterAddress = vm.envAddress("CLUSTER_MANAGER_ADDRESS");
        address novaAddress = vm.envAddress("NOVA_MANAGER_ADDRESS");
        address resolverAddress = vm.envAddress("VOIDMARKET_RESOLVER_ADDRESS");

        console.log("=== Verifying Deployment ===");
        console.log("");

        // Verify VoidMarketCore
        VoidMarketCore core = VoidMarketCore(payable(coreAddress));
        console.log("VoidMarketCore:");
        console.log("  Address:", coreAddress);
        console.log("  Admin:", core.admin());
        console.log("  Market Count:", core.marketCount());
        console.log("  Bet Count:", core.betCount());

        // Verify ClusterManager
        ClusterManager cluster = ClusterManager(clusterAddress);
        console.log("");
        console.log("ClusterManager:");
        console.log("  Address:", clusterAddress);
        console.log("  Admin:", cluster.admin());
        console.log("  NovaManager:", cluster.novaManager());
        console.log("  Cluster Count:", cluster.clusterCount());

        // Verify NovaManager
        NovaManager nova = NovaManager(payable(novaAddress));
        console.log("");
        console.log("NovaManager:");
        console.log("  Address:", novaAddress);
        console.log("  Admin:", nova.admin());
        console.log("  ClusterManager:", address(nova.clusterManager()));
        console.log("  MarketCore:", address(nova.marketCore()));
        console.log("  Nova Count:", nova.novaCount());

        // Verify VoidMarketResolver
        VoidMarketResolver resolver = VoidMarketResolver(resolverAddress);
        console.log("");
        console.log("VoidMarketResolver:");
        console.log("  Address:", resolverAddress);
        console.log("  Owner:", resolver.owner());
        console.log("  Signer:", resolver.signer());

        // Verify cross-contract links
        console.log("");
        console.log("=== Cross-Contract Links ===");

        bool novaLinked = cluster.novaManager() == novaAddress;
        bool clusterLinked = address(nova.clusterManager()) == clusterAddress;
        bool marketLinked = address(nova.marketCore()) == coreAddress;

        console.log("ClusterManager -> NovaManager:", novaLinked ? "OK" : "FAILED");
        console.log("NovaManager -> ClusterManager:", clusterLinked ? "OK" : "FAILED");
        console.log("NovaManager -> MarketCore:", marketLinked ? "OK" : "FAILED");

        if (novaLinked && clusterLinked && marketLinked) {
            console.log("");
            console.log("All contracts verified successfully!");
        } else {
            console.log("");
            console.log("WARNING: Some cross-contract links are not configured correctly!");
        }
    }
}

/**
 * @title FundContract
 * @notice Fund a contract with native USDC (for testing)
 */
contract FundContract is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address targetAddress = vm.envAddress("TARGET_ADDRESS");
        uint256 amount = vm.envOr("AMOUNT", uint256(1 ether)); // Default 1 USDC

        console.log("=== Funding Contract ===");
        console.log("Target:", targetAddress);
        console.log("Amount:", amount, "wei (native USDC)");

        vm.startBroadcast(deployerPrivateKey);

        (bool success, ) = targetAddress.call{value: amount}("");
        require(success, "Transfer failed");

        vm.stopBroadcast();

        console.log("");
        console.log("Funding complete!");
    }
}
