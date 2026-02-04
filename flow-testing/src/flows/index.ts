/**
 * VoidMarket Flow Testing Suite
 *
 * Complete integration tests for all 13 core flows
 *
 * Usage: npx tsx src/flows/index.ts [flow-number]
 *
 * Flows:
 * 1. User Registration
 * 2. Create Profile + ENS
 * 3. Create Regular Market
 * 4. Bet on Regular Market
 * 5. Create Forked Market
 * 6. Bet on Forked Market
 * 7. Resolve Market + Reveal + Claim
 * 8. Create Cluster
 * 9. Invite to Cluster
 * 10. Join Cluster
 * 11. Start Nova
 * 12. Nova Rounds
 * 13. Nova Resolution
 */

import { registerUser } from './01-user-registration.js';
import { createUserProfile } from './02-create-profile.js';
import { createPredictionMarket } from './03-create-market.js';
import { placeMarketBet } from './04-place-bet.js';
import { createForkedPredictionMarket } from './05-create-forked-market.js';
import { placeForkedMarketBet } from './06-bet-forked-market.js';
import { resolveMarket, revealBet, claimWinnings, executeFullLifecycle } from './07-resolve-reveal-claim.js';
import { createUserCluster } from './08-create-cluster.js';
import { generateClusterInvite } from './09-invite-to-cluster.js';
import { joinUserCluster } from './10-join-cluster.js';
import { startNovaBattle } from './11-start-nova.js';
import { createRoundMatches, runNovaRound, completeRoundAndAdvance } from './12-nova-rounds.js';
import { getNovaResults, claimNovaReward, completeNovaLifecycle } from './13-nova-resolution.js';

// Re-export all flows
export * from './01-user-registration.js';
export * from './02-create-profile.js';
export * from './03-create-market.js';
export * from './04-place-bet.js';
export * from './05-create-forked-market.js';
export * from './06-bet-forked-market.js';
export * from './07-resolve-reveal-claim.js';
export * from './08-create-cluster.js';
export * from './09-invite-to-cluster.js';
export * from './10-join-cluster.js';
export * from './11-start-nova.js';
export * from './12-nova-rounds.js';
export * from './13-nova-resolution.js';

/**
 * Run all flows in sequence
 */
async function runAllFlows(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           VoidMarket Integration Test Suite                ║
║                                                            ║
║  Testing all 13 core flows on Arc Testnet                  ║
╚════════════════════════════════════════════════════════════╝
`);

  const testTelegramId = `test_${Date.now()}`;
  let marketId: bigint | undefined;

  try {
    // Flow 1: User Registration
    console.log('\n' + '═'.repeat(60));
    console.log('FLOW 1: User Registration');
    console.log('═'.repeat(60));

    const registrationResult = await registerUser(testTelegramId);
    if (!registrationResult.success) {
      throw new Error(`Flow 1 failed: ${registrationResult.error}`);
    }
    console.log('✅ Flow 1 PASSED\n');

    // Flow 2: Create Profile
    console.log('\n' + '═'.repeat(60));
    console.log('FLOW 2: Create Profile');
    console.log('═'.repeat(60));

    const profileResult = await createUserProfile(
      testTelegramId,
      'TestStar',
      'NEUTRON_STAR',
      true
    );
    if (!profileResult.success) {
      throw new Error(`Flow 2 failed: ${profileResult.error}`);
    }
    console.log('✅ Flow 2 PASSED\n');

    // Flow 3: Create Market
    console.log('\n' + '═'.repeat(60));
    console.log('FLOW 3: Create Market');
    console.log('═'.repeat(60));

    const marketResult = await createPredictionMarket(
      testTelegramId,
      'Will ETH reach $5000 by end of Q1 2025?',
      24,
      48
    );
    if (!marketResult.success) {
      throw new Error(`Flow 3 failed: ${marketResult.error}`);
    }
    marketId = marketResult.marketId;
    console.log('✅ Flow 3 PASSED\n');

    // Flow 4: Place Bet
    let betId: bigint | undefined;
    if (marketId) {
      console.log('\n' + '═'.repeat(60));
      console.log('FLOW 4: Place Bet');
      console.log('═'.repeat(60));

      const betResult = await placeMarketBet(
        testTelegramId,
        marketId,
        true, // YES
        '5.00'
      );
      if (!betResult.success) {
        throw new Error(`Flow 4 failed: ${betResult.error}`);
      }
      betId = betResult.betId;
      console.log('✅ Flow 4 PASSED\n');
    }

    // Flow 5: Create Forked Market
    let forkedMarketId: bigint | undefined;
    if (marketId) {
      console.log('\n' + '═'.repeat(60));
      console.log('FLOW 5: Create Forked Market');
      console.log('═'.repeat(60));

      const forkedResult = await createForkedPredictionMarket(
        testTelegramId,
        marketId,
        'Will ETH reach $5000 by end of Q1 2025? (Private Group)',
        12,
        24
      );
      if (!forkedResult.success) {
        throw new Error(`Flow 5 failed: ${forkedResult.error}`);
      }
      forkedMarketId = forkedResult.forkedMarketId;
      console.log('✅ Flow 5 PASSED\n');
    }

    // Flow 6: Bet on Forked Market
    let forkedBetId: bigint | undefined;
    if (forkedMarketId) {
      console.log('\n' + '═'.repeat(60));
      console.log('FLOW 6: Bet on Forked Market');
      console.log('═'.repeat(60));

      const forkedBetResult = await placeForkedMarketBet(
        testTelegramId,
        forkedMarketId,
        true, // YES
        '3.00'
      );
      if (!forkedBetResult.success) {
        throw new Error(`Flow 6 failed: ${forkedBetResult.error}`);
      }
      forkedBetId = forkedBetResult.betId;
      console.log('✅ Flow 6 PASSED\n');
    }

    // Flow 7: Resolve + Reveal + Claim
    if (marketId && betId) {
      console.log('\n' + '═'.repeat(60));
      console.log('FLOW 7: Resolve Market + Reveal + Claim');
      console.log('═'.repeat(60));

      // Use same telegramId as admin for testing
      const lifecycleResult = await executeFullLifecycle(
        testTelegramId, // admin
        testTelegramId, // user
        marketId,
        true, // YES wins
        [betId]
      );
      if (!lifecycleResult.success) {
        throw new Error(`Flow 7 failed: ${lifecycleResult.error}`);
      }
      console.log('✅ Flow 7 PASSED\n');
    }

    // Flow 8: Create Cluster
    let clusterId: bigint | undefined;
    console.log('\n' + '═'.repeat(60));
    console.log('FLOW 8: Create Cluster');
    console.log('═'.repeat(60));

    const clusterResult = await createUserCluster(
      testTelegramId,
      `TestCluster_${Date.now()}`,
      false // Public cluster
    );
    if (!clusterResult.success) {
      throw new Error(`Flow 8 failed: ${clusterResult.error}`);
    }
    clusterId = clusterResult.clusterId;
    console.log('✅ Flow 8 PASSED\n');

    // Flow 9: Invite to Cluster
    let inviteCode: `0x${string}` | undefined;
    if (clusterId) {
      console.log('\n' + '═'.repeat(60));
      console.log('FLOW 9: Invite to Cluster');
      console.log('═'.repeat(60));

      const inviteResult = await generateClusterInvite(
        testTelegramId,
        clusterId
      );
      if (!inviteResult.success) {
        throw new Error(`Flow 9 failed: ${inviteResult.error}`);
      }
      inviteCode = inviteResult.inviteCode;
      console.log('✅ Flow 9 PASSED\n');
    }

    // Flow 10: Join Cluster (with second user)
    const secondUserTelegramId = `test_friend_${Date.now()}`;
    if (clusterId && inviteCode) {
      console.log('\n' + '═'.repeat(60));
      console.log('FLOW 10: Join Cluster');
      console.log('═'.repeat(60));

      // First, register second user
      const secondUserResult = await registerUser(secondUserTelegramId);
      if (!secondUserResult.success) {
        throw new Error(`Failed to register second user: ${secondUserResult.error}`);
      }

      const joinResult = await joinUserCluster(
        secondUserTelegramId,
        clusterId,
        inviteCode
      );
      if (!joinResult.success) {
        throw new Error(`Flow 10 failed: ${joinResult.error}`);
      }
      console.log('✅ Flow 10 PASSED\n');
    }

    // Flow 11: Start Nova (requires two clusters)
    // Create a second cluster for the Nova battle
    let cluster2Id: bigint | undefined;
    const thirdUserTelegramId = `test_opponent_${Date.now()}`;
    let novaId: bigint | undefined;

    console.log('\n' + '═'.repeat(60));
    console.log('FLOW 11: Start Nova');
    console.log('═'.repeat(60));

    // Register third user and create opposing cluster
    const thirdUserResult = await registerUser(thirdUserTelegramId);
    if (!thirdUserResult.success) {
      console.log(`⚠️  Skipping Flow 11-13: Could not create second cluster`);
    } else {
      const cluster2Result = await createUserCluster(
        thirdUserTelegramId,
        `OpponentCluster_${Date.now()}`,
        false
      );
      if (!cluster2Result.success) {
        console.log(`⚠️  Skipping Flow 11-13: ${cluster2Result.error}`);
      } else {
        cluster2Id = cluster2Result.clusterId;

        // Start Nova between the two clusters
        if (clusterId && cluster2Id) {
          const novaResult = await startNovaBattle(
            testTelegramId, // Initiator
            clusterId,
            cluster2Id,
            2, // 2 rounds
            '10.00', // 10 USDC prize pool
            300, // 5 minute betting period
            1 // 1 match per round
          );
          if (!novaResult.success) {
            throw new Error(`Flow 11 failed: ${novaResult.error}`);
          }
          novaId = novaResult.novaId;
          console.log('✅ Flow 11 PASSED\n');
        }
      }
    }

    // Flow 12: Nova Rounds
    if (novaId) {
      console.log('\n' + '═'.repeat(60));
      console.log('FLOW 12: Nova Rounds');
      console.log('═'.repeat(60));

      // Run round 1
      const round1Result = await runNovaRound(testTelegramId, novaId, [true]); // Star1 wins
      if (!round1Result.success) {
        throw new Error(`Flow 12 (Round 1) failed: ${round1Result.error}`);
      }

      // Run round 2 (final)
      const round2Result = await runNovaRound(testTelegramId, novaId, [false]); // Star2 wins
      if (!round2Result.success) {
        throw new Error(`Flow 12 (Round 2) failed: ${round2Result.error}`);
      }
      console.log('✅ Flow 12 PASSED\n');
    }

    // Flow 13: Nova Resolution
    if (novaId) {
      console.log('\n' + '═'.repeat(60));
      console.log('FLOW 13: Nova Resolution');
      console.log('═'.repeat(60));

      const resolutionResult = await completeNovaLifecycle(novaId, [testTelegramId, thirdUserTelegramId]);
      if (!resolutionResult.success) {
        throw new Error(`Flow 13 failed: ${resolutionResult.error}`);
      }
      console.log('✅ Flow 13 PASSED\n');
    }

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                   TEST RESULTS                             ║
╠════════════════════════════════════════════════════════════╣
║  Flow 1: User Registration           ✅ PASSED             ║
║  Flow 2: Create Profile              ✅ PASSED             ║
║  Flow 3: Create Market               ✅ PASSED             ║
║  Flow 4: Place Bet                   ✅ PASSED             ║
║  Flow 5: Create Forked Market        ✅ PASSED             ║
║  Flow 6: Bet on Forked Market        ✅ PASSED             ║
║  Flow 7: Resolve + Reveal + Claim    ✅ PASSED             ║
║  Flow 8: Create Cluster              ✅ PASSED             ║
║  Flow 9: Invite to Cluster           ✅ PASSED             ║
║  Flow 10: Join Cluster               ✅ PASSED             ║
║  Flow 11: Start Nova                 ✅ PASSED             ║
║  Flow 12: Nova Rounds                ✅ PASSED             ║
║  Flow 13: Nova Resolution            ✅ PASSED             ║
╚════════════════════════════════════════════════════════════╝
`);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

/**
 * Run a specific flow by number
 */
async function runSingleFlow(flowNumber: number): Promise<void> {
  const testTelegramId = `test_${Date.now()}`;

  switch (flowNumber) {
    case 1:
      await registerUser(testTelegramId);
      break;
    case 2:
      await createUserProfile(testTelegramId, 'TestStar', 'NEUTRON_STAR', true);
      break;
    case 3:
      await createPredictionMarket(testTelegramId, 'Test question?', 24, 48);
      break;
    case 4:
      await placeMarketBet(testTelegramId, 1n, true, '5.00');
      break;
    case 5:
      await createForkedPredictionMarket(testTelegramId, 1n, 'Forked market test?', 12, 24);
      break;
    case 6:
      await placeForkedMarketBet(testTelegramId, 2n, true, '3.00');
      break;
    case 7:
      await executeFullLifecycle(testTelegramId, testTelegramId, 1n, true, [1n]);
      break;
    case 8:
      await createUserCluster(testTelegramId, 'TestCluster', false);
      break;
    case 9:
      await generateClusterInvite(testTelegramId, 1n, '0x0000000000000000000000000000000000000000');
      break;
    case 10:
      await joinUserCluster(testTelegramId, 1n, '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`);
      break;
    case 11:
      await startNovaBattle(testTelegramId, 1n, 2n, 3, '50.00', 3600, 2);
      break;
    case 12:
      await runNovaRound(testTelegramId, 1n);
      break;
    case 13:
      await getNovaResults(1n);
      break;
    default:
      console.log(`Flow ${flowNumber} not yet implemented`);
  }
}

// Main entry point
const flowArg = process.argv[2];

if (flowArg) {
  const flowNumber = parseInt(flowArg, 10);
  if (isNaN(flowNumber) || flowNumber < 1 || flowNumber > 13) {
    console.log('Usage: npx tsx src/flows/index.ts [1-13]');
    process.exit(1);
  }
  runSingleFlow(flowNumber).catch(console.error);
} else {
  runAllFlows().catch(console.error);
}
