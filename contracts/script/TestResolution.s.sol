// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VoidMarketCore.sol";

/**
 * @title Test Resolution Script
 * @notice Tests market resolution, bet reveal, and claiming on-chain
 */
contract TestResolutionScript is Script {
    VoidMarketCore public voidMarketCore;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        voidMarketCore = VoidMarketCore(payable(0xe05dC9467de459adFc5c31Ce4746579d29B65ba2));

        console.log("=== Test Resolution Flow ===");
        console.log("Deployer:", deployer);
        console.log("Balance before:", deployer.balance);

        // Market 3, Bet 2 from the integration test
        uint256 marketId = 3;
        uint256 betId = 2;
        bool direction = true;
        bytes32 salt = 0x98a9b83c3f8d71dffcc387a3b3b90c77661bb8a9ff03f836cc75518a1d260c20;

        vm.startBroadcast(deployerKey);

        // Step 1: Check market status
        console.log("");
        console.log("Step 1: Checking market status...");
        VoidMarketCore.Market memory market = voidMarketCore.getMarket(marketId);
        console.log("  Market ID:", market.id);
        console.log("  Status:", uint256(market.status));
        console.log("  Deadline:", market.deadline);
        console.log("  Current time:", block.timestamp);

        // Step 2: Resolve market
        if (market.status == VoidMarketCore.MarketStatus.ACTIVE) {
            console.log("");
            console.log("Step 2: Resolving market...");
            voidMarketCore.resolveMarket(marketId, direction);
            console.log("  Market resolved with outcome: YES");
        }

        // Step 3: Reveal bet
        console.log("");
        console.log("Step 3: Revealing bet...");
        VoidMarketCore.Bet memory bet = voidMarketCore.getBet(betId);
        console.log("  Bet ID:", bet.marketId);
        console.log("  Already revealed:", bet.revealed);

        if (!bet.revealed) {
            voidMarketCore.revealBet(betId, direction, salt);
            console.log("  Bet revealed!");
        }

        // Step 4: Claim winnings
        console.log("");
        console.log("Step 4: Claiming winnings...");
        bet = voidMarketCore.getBet(betId);
        console.log("  Already claimed:", bet.claimed);

        if (!bet.claimed) {
            uint256 balanceBefore = deployer.balance;
            voidMarketCore.claimWinnings(betId);
            uint256 balanceAfter = deployer.balance;
            console.log("  Winnings claimed!");
            console.log("  Payout:", balanceAfter - balanceBefore);
        }

        vm.stopBroadcast();

        console.log("");
        console.log("Balance after:", deployer.balance);
        console.log("=== Resolution Test Complete! ===");
    }
}
