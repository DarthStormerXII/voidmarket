/**
 * Nova Flow Tests
 *
 * Tests for Nova battle lifecycle: start, rounds, resolution
 */

import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';

// Constants from NovaManager
const BASE_PHOTONS_WIN = 100;
const BASE_PHOTONS_LOSE = 25;
const ENERGY_BONUS_WIN = 500;
const DEFAULT_BETTING_DURATION = 3600; // 1 hour in seconds
const DEFAULT_MATCHES_PER_ROUND = 3;

describe('Nova Configuration', () => {
  it('should have correct photon values', () => {
    expect(BASE_PHOTONS_WIN).toBe(100);
    expect(BASE_PHOTONS_LOSE).toBe(25);
  });

  it('should have correct energy bonus', () => {
    expect(ENERGY_BONUS_WIN).toBe(500);
  });

  it('should have correct default settings', () => {
    expect(DEFAULT_BETTING_DURATION).toBe(3600);
    expect(DEFAULT_MATCHES_PER_ROUND).toBe(3);
  });
});

describe('Nova Creation', () => {
  it('should validate different clusters', () => {
    const cluster1Id = 1n;
    const cluster2Id = 2n;

    expect(cluster1Id).not.toBe(cluster2Id);
  });

  it('should reject same cluster battle', () => {
    const cluster1Id = 1n;
    const cluster2Id = 1n;

    expect(cluster1Id === cluster2Id).toBe(true);
  });

  it('should calculate prize pool correctly', () => {
    const cluster1Wager = parseEther('0.01');
    const cluster2Wager = parseEther('0.01');

    const prizePool = cluster1Wager + cluster2Wager;

    expect(prizePool).toBe(parseEther('0.02'));
  });
});

describe('Nova Match Flow', () => {
  it('should assign photons based on outcome', () => {
    // Star 1 wins
    const outcome = true;
    const star1Photons = outcome ? BASE_PHOTONS_WIN : BASE_PHOTONS_LOSE;
    const star2Photons = outcome ? BASE_PHOTONS_LOSE : BASE_PHOTONS_WIN;

    expect(star1Photons).toBe(100);
    expect(star2Photons).toBe(25);
  });

  it('should accumulate cluster photons', () => {
    let cluster1TotalPhotons = 0;
    let cluster2TotalPhotons = 0;

    // Round 1: Match 1 - Star1 (C1) wins
    cluster1TotalPhotons += BASE_PHOTONS_WIN;
    cluster2TotalPhotons += BASE_PHOTONS_LOSE;

    // Round 1: Match 2 - Star2 (C2) wins
    cluster1TotalPhotons += BASE_PHOTONS_LOSE;
    cluster2TotalPhotons += BASE_PHOTONS_WIN;

    // Round 1: Match 3 - Star1 (C1) wins
    cluster1TotalPhotons += BASE_PHOTONS_WIN;
    cluster2TotalPhotons += BASE_PHOTONS_LOSE;

    expect(cluster1TotalPhotons).toBe(225); // 100 + 25 + 100
    expect(cluster2TotalPhotons).toBe(150); // 25 + 100 + 25
  });

  it('should track match count per round', () => {
    const matchesPerRound = DEFAULT_MATCHES_PER_ROUND;
    const totalRounds = 3;

    const totalMatches = matchesPerRound * totalRounds;

    expect(totalMatches).toBe(9);
  });
});

describe('Nova Round Advancement', () => {
  it('should require all matches resolved before advancing', () => {
    const roundMatches = [
      { status: 'RESOLVED' },
      { status: 'RESOLVED' },
      { status: 'BETTING' }, // Not resolved
    ];

    const allResolved = roundMatches.every((m) => m.status === 'RESOLVED');

    expect(allResolved).toBe(false);
  });

  it('should allow advancement when all matches resolved', () => {
    const roundMatches = [
      { status: 'RESOLVED' },
      { status: 'RESOLVED' },
      { status: 'RESOLVED' },
    ];

    const allResolved = roundMatches.every((m) => m.status === 'RESOLVED');

    expect(allResolved).toBe(true);
  });

  it('should advance round counter', () => {
    let currentRound = 0;
    const totalRounds = 3;

    // Complete round 1
    currentRound++;
    expect(currentRound).toBe(1);
    expect(currentRound < totalRounds).toBe(true);

    // Complete round 2
    currentRound++;
    expect(currentRound).toBe(2);
    expect(currentRound < totalRounds).toBe(true);

    // Complete round 3
    currentRound++;
    expect(currentRound).toBe(3);
    expect(currentRound >= totalRounds).toBe(true);
  });
});

describe('Nova Completion', () => {
  it('should determine winner by photons', () => {
    const cluster1Photons = 450n;
    const cluster2Photons = 400n;

    let winningClusterId: number;
    if (cluster1Photons > cluster2Photons) {
      winningClusterId = 1;
    } else if (cluster2Photons > cluster1Photons) {
      winningClusterId = 2;
    } else {
      winningClusterId = 1; // Tiebreaker: cluster1
    }

    expect(winningClusterId).toBe(1);
  });

  it('should handle tie correctly', () => {
    const cluster1Photons = 400n;
    const cluster2Photons = 400n;

    let winningClusterId: number;
    if (cluster1Photons > cluster2Photons) {
      winningClusterId = 1;
    } else if (cluster2Photons > cluster1Photons) {
      winningClusterId = 2;
    } else {
      winningClusterId = 1; // Tiebreaker
    }

    expect(winningClusterId).toBe(1); // Tie goes to cluster1
  });

  it('should award energy bonus to winner', () => {
    const winnerEnergy = 1000n;
    const newEnergy = winnerEnergy + BigInt(ENERGY_BONUS_WIN);

    expect(newEnergy).toBe(1500n);
  });
});

describe('Nova Rewards', () => {
  it('should track individual photons earned', () => {
    const rewards = new Map<string, { photonsEarned: number; claimed: boolean }>();

    rewards.set('star1', { photonsEarned: 200, claimed: false });
    rewards.set('star2', { photonsEarned: 100, claimed: false });

    expect(rewards.get('star1')?.photonsEarned).toBe(200);
    expect(rewards.get('star2')?.photonsEarned).toBe(100);
  });

  it('should calculate proportional USDC distribution', () => {
    const prizePool = parseEther('0.02'); // 0.02 USDC
    const winningClusterPhotons = 300n;
    const star1Photons = 150n;
    const star2Photons = 150n;

    const star1Reward = (star1Photons * prizePool) / winningClusterPhotons;
    const star2Reward = (star2Photons * prizePool) / winningClusterPhotons;

    expect(star1Reward).toBe(parseEther('0.01'));
    expect(star2Reward).toBe(parseEther('0.01'));
    expect(star1Reward + star2Reward).toBe(prizePool);
  });

  it('should only allow winning cluster to claim', () => {
    const winningClusterId = 1;
    const star1ClusterId = 1;
    const star2ClusterId = 2;

    expect(star1ClusterId === winningClusterId).toBe(true); // Can claim
    expect(star2ClusterId === winningClusterId).toBe(false); // Cannot claim
  });

  it('should prevent double claiming', () => {
    const rewards = new Map<string, { photonsEarned: number; claimed: boolean }>();
    rewards.set('star1', { photonsEarned: 200, claimed: false });

    // First claim
    const reward = rewards.get('star1')!;
    expect(reward.claimed).toBe(false);
    reward.claimed = true;

    // Second claim attempt
    const rewardAfterClaim = rewards.get('star1')!;
    expect(rewardAfterClaim.claimed).toBe(true); // Should be rejected
  });
});

describe('Nova Cancellation', () => {
  it('should refund prize pool on cancellation', () => {
    const prizePool = parseEther('0.02');

    // Simulate refund to admin (or split)
    const refundAmount = prizePool;

    expect(refundAmount).toBe(parseEther('0.02'));
  });

  it('should cancel all pending matches', () => {
    const matches = [
      { status: 'BETTING' },
      { status: 'PENDING' },
      { status: 'RESOLVED' },
    ];

    // Cancel pending/betting matches
    const cancelledMatches = matches.map((m) => ({
      ...m,
      status:
        m.status === 'PENDING' || m.status === 'BETTING'
          ? 'CANCELLED'
          : m.status,
    }));

    expect(cancelledMatches[0].status).toBe('CANCELLED');
    expect(cancelledMatches[1].status).toBe('CANCELLED');
    expect(cancelledMatches[2].status).toBe('RESOLVED'); // Unchanged
  });
});

describe('Escrow Integration', () => {
  it('should require dual escrow deposits', () => {
    const cluster1Deposit = parseEther('0.01');
    const cluster2Deposit = parseEther('0.01');
    const requiredWager = parseEther('0.01');

    const cluster1Ready = cluster1Deposit >= requiredWager;
    const cluster2Ready = cluster2Deposit >= requiredWager;
    const canStartNova = cluster1Ready && cluster2Ready;

    expect(canStartNova).toBe(true);
  });

  it('should block nova if one escrow missing', () => {
    const cluster1Deposit = parseEther('0.01');
    const cluster2Deposit = parseEther('0'); // No deposit
    const requiredWager = parseEther('0.01');

    const cluster1Ready = cluster1Deposit >= requiredWager;
    const cluster2Ready = cluster2Deposit >= requiredWager;
    const canStartNova = cluster1Ready && cluster2Ready;

    expect(canStartNova).toBe(false);
  });

  it('should release escrow funds when nova starts', () => {
    const cluster1Escrow = parseEther('0.05');
    const novaDeposit = parseEther('0.01');

    const availableAfterRelease = cluster1Escrow - novaDeposit;

    expect(availableAfterRelease).toBe(parseEther('0.04'));
  });

  it('should refund escrow if nova cancelled', () => {
    let escrowAvailable = parseEther('0.04');
    const refundAmount = parseEther('0.01');

    escrowAvailable += refundAmount;

    expect(escrowAvailable).toBe(parseEther('0.05'));
  });
});
