// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IENSRegistry {
    function setResolver(bytes32 node, address resolver) external;
    function owner(bytes32 node) external view returns (address);
}

/**
 * @title SetResolver Script
 * @notice Sets the resolver for voidmarket.eth on Sepolia ENS
 * @dev The deployer must own voidmarket.eth on Sepolia ENS Registry
 *
 * Usage:
 *   forge script script/SetResolver.s.sol:SetResolverScript \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --broadcast
 *
 * Required env:
 *   - DEPLOYER_PRIVATE_KEY: Owner of voidmarket.eth
 *   - VOIDMARKET_RESOLVER_ADDRESS: Deployed resolver address on Sepolia
 */
contract SetResolverScript is Script {
    // Sepolia ENS Registry
    address constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

    // namehash("voidmarket.eth")
    // keccak256(abi.encodePacked(keccak256(abi.encodePacked(bytes32(0), keccak256("eth"))), keccak256("voidmarket")))
    function _namehash() internal pure returns (bytes32) {
        bytes32 ethNode = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));
        return keccak256(abi.encodePacked(ethNode, keccak256("voidmarket")));
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address resolverAddress = vm.envAddress("VOIDMARKET_RESOLVER_ADDRESS");

        bytes32 node = _namehash();

        console.log("=== Set Resolver for voidmarket.eth ===");
        console.log("ENS Registry:", ENS_REGISTRY);
        console.log("Node (namehash):");
        console.logBytes32(node);
        console.log("Resolver:", resolverAddress);

        // Check current owner
        IENSRegistry ens = IENSRegistry(ENS_REGISTRY);
        address currentOwner = ens.owner(node);
        console.log("Current owner of voidmarket.eth:", currentOwner);
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);

        ens.setResolver(node, resolverAddress);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Resolver Set Successfully ===");
        console.log("voidmarket.eth now resolves via:", resolverAddress);
    }
}
