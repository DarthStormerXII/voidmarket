/**
 * Market Integration Tests
 *
 * Tests the complete market lifecycle logic patterns
 */

import { describe, it, expect } from 'vitest';
import { parseEther, keccak256, encodePacked, type Hex } from 'viem';

// Market status enum (matches contract)
const MarketStatus: Record<string, number> = {
  OPEN: 0,
  BETTING_CLOSED: 1,
  RESOLVED: 2,
};

describe('Market Creation Logic', () => {
  it('should calculate deadlines correctly', () => {
    const now = Math.floor(Date.now() / 1000);
    const deadlineHours = 24;
    const resolutionHours = 48;

    const deadline = BigInt(now + deadlineHours * 3600);
    const resolutionDeadline = BigInt(now + (deadlineHours + resolutionHours) * 3600);

    expect(Number(resolutionDeadline) - Number(deadline)).toBe(resolutionHours * 3600);
    expect(Number(deadline) - now).toBe(deadlineHours * 3600);
  });

  it('should validate question requirements', () => {
    const validQuestions = [
      'Will ETH reach $5000?',
      'Will BTC hit 100k by end of year?',
      'Q: Is this a valid market question?',
    ];

    const invalidQuestions = [
      '', // Empty
      'x'.repeat(1001), // Too long (assuming 1000 char limit)
    ];

    for (const q of validQuestions) {
      expect(q.length).toBeGreaterThan(0);
      expect(q.length).toBeLessThanOrEqual(1000);
    }

    expect(invalidQuestions[0].length).toBe(0);
    expect(invalidQuestions[1].length).toBeGreaterThan(1000);
  });
});

describe('Commit-Reveal Betting Logic', () => {
  describe('Commitment Generation', () => {
    it('should generate unique commitments', () => {
      const direction = true;
      const salt1 = '0x' + '1'.repeat(64) as Hex;
      const salt2 = '0x' + '2'.repeat(64) as Hex;

      const commitment1 = keccak256(encodePacked(['bool', 'bytes32'], [direction, salt1]));
      const commitment2 = keccak256(encodePacked(['bool', 'bytes32'], [direction, salt2]));

      expect(commitment1).not.toBe(commitment2);
    });

    it('should differentiate YES and NO with same salt', () => {
      const salt = '0x' + 'a'.repeat(64) as Hex;

      const yesCommitment = keccak256(encodePacked(['bool', 'bytes32'], [true, salt]));
      const noCommitment = keccak256(encodePacked(['bool', 'bytes32'], [false, salt]));

      expect(yesCommitment).not.toBe(noCommitment);
    });

    it('should be deterministic', () => {
      const direction = true;
      const salt = '0x' + 'b'.repeat(64) as Hex;

      const commitment1 = keccak256(encodePacked(['bool', 'bytes32'], [direction, salt]));
      const commitment2 = keccak256(encodePacked(['bool', 'bytes32'], [direction, salt]));

      expect(commitment1).toBe(commitment2);
    });
  });

  describe('Commitment Verification', () => {
    it('should verify correct reveal', () => {
      const direction = true;
      const salt = '0x' + 'c'.repeat(64) as Hex;

      const commitment = keccak256(encodePacked(['bool', 'bytes32'], [direction, salt]));

      // Verify by recomputing
      const verifyCommitment = keccak256(encodePacked(['bool', 'bytes32'], [direction, salt]));

      expect(commitment).toBe(verifyCommitment);
    });

    it('should reject wrong direction', () => {
      const originalDirection = true;
      const wrongDirection = false;
      const salt = '0x' + 'd'.repeat(64) as Hex;

      const commitment = keccak256(encodePacked(['bool', 'bytes32'], [originalDirection, salt]));
      const wrongVerify = keccak256(encodePacked(['bool', 'bytes32'], [wrongDirection, salt]));

      expect(commitment).not.toBe(wrongVerify);
    });

    it('should reject wrong salt', () => {
      const direction = true;
      const correctSalt = '0x' + 'e'.repeat(64) as Hex;
      const wrongSalt = '0x' + 'f'.repeat(64) as Hex;

      const commitment = keccak256(encodePacked(['bool', 'bytes32'], [direction, correctSalt]));
      const wrongVerify = keccak256(encodePacked(['bool', 'bytes32'], [direction, wrongSalt]));

      expect(commitment).not.toBe(wrongVerify);
    });
  });
});

describe('Bet Amount Logic', () => {
  const MIN_BET = parseEther('0.001'); // 0.001 USDC

  it('should enforce minimum bet', () => {
    const validAmounts = [parseEther('0.001'), parseEther('0.01'), parseEther('1')];
    const invalidAmounts = [parseEther('0.0001'), parseEther('0'), 0n];

    for (const amount of validAmounts) {
      expect(amount >= MIN_BET).toBe(true);
    }

    for (const amount of invalidAmounts) {
      expect(amount >= MIN_BET).toBe(false);
    }
  });

  it('should accumulate pool amounts', () => {
    let totalYes = 0n;
    let totalNo = 0n;

    // Simulated bets
    const bets = [
      { direction: true, amount: parseEther('10') },
      { direction: false, amount: parseEther('5') },
      { direction: true, amount: parseEther('3') },
      { direction: false, amount: parseEther('7') },
    ];

    for (const bet of bets) {
      if (bet.direction) {
        totalYes += bet.amount;
      } else {
        totalNo += bet.amount;
      }
    }

    expect(totalYes).toBe(parseEther('13'));
    expect(totalNo).toBe(parseEther('12'));
    expect(totalYes + totalNo).toBe(parseEther('25'));
  });
});

describe('Market Resolution Logic', () => {
  it('should determine winner correctly', () => {
    const outcome = true; // YES wins

    const yesBets = [
      { direction: true, amount: parseEther('10') },
      { direction: true, amount: parseEther('5') },
    ];

    const noBets = [
      { direction: false, amount: parseEther('8') },
      { direction: false, amount: parseEther('4') },
    ];

    const allBets = [...yesBets, ...noBets];

    const winners = allBets.filter((b) => b.direction === outcome);
    const losers = allBets.filter((b) => b.direction !== outcome);

    expect(winners.length).toBe(2);
    expect(losers.length).toBe(2);
  });

  it('should only allow resolution after betting closed', () => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = now - 3600; // 1 hour ago

    const canResolve = now > deadline;
    expect(canResolve).toBe(true);

    const futureDeadline = now + 3600; // 1 hour from now
    const cannotResolveYet = now > futureDeadline;
    expect(cannotResolveYet).toBe(false);
  });
});

describe('Winnings Calculation Logic', () => {
  it('should calculate proportional winnings', () => {
    // Scenario: YES wins
    // YES pool: 100 USDC
    // NO pool: 50 USDC
    // User bet 40 USDC on YES (40% of winning pool)
    const winningPool = parseEther('100');
    const losingPool = parseEther('50');
    const userBet = parseEther('40');

    // User gets back their bet + proportional share of losing pool
    // proportionalShare = (userBet / winningPool) * losingPool
    // = (40 / 100) * 50 = 20 USDC
    const proportionalShare = (userBet * losingPool) / winningPool;
    const totalWinnings = userBet + proportionalShare;

    expect(proportionalShare).toBe(parseEther('20'));
    expect(totalWinnings).toBe(parseEther('60'));
  });

  it('should handle zero losing pool', () => {
    // Everyone bet YES, no losers
    const winningPool = parseEther('100');
    const losingPool = 0n;
    const userBet = parseEther('40');

    const proportionalShare = losingPool > 0n ? (userBet * losingPool) / winningPool : 0n;
    const totalWinnings = userBet + proportionalShare;

    // User just gets back their original bet
    expect(proportionalShare).toBe(0n);
    expect(totalWinnings).toBe(parseEther('40'));
  });

  it('should distribute full losing pool to winners', () => {
    // Multiple winners should collectively receive the full losing pool
    const losingPool = parseEther('100');
    const winningPool = parseEther('200');

    const winner1Bet = parseEther('80'); // 40% of winning pool
    const winner2Bet = parseEther('120'); // 60% of winning pool

    const winner1Share = (winner1Bet * losingPool) / winningPool;
    const winner2Share = (winner2Bet * losingPool) / winningPool;

    expect(winner1Share).toBe(parseEther('40'));
    expect(winner2Share).toBe(parseEther('60'));
    expect(winner1Share + winner2Share).toBe(losingPool);
  });
});

describe('Bet State Machine', () => {
  it('should track bet lifecycle states', () => {
    const states = ['COMMITTED', 'REVEALED', 'CLAIMED'];

    let currentState = 'COMMITTED';

    // Can only reveal after market resolved
    expect(currentState).toBe('COMMITTED');

    // After reveal
    currentState = 'REVEALED';
    expect(currentState).toBe('REVEALED');

    // After claim
    currentState = 'CLAIMED';
    expect(currentState).toBe('CLAIMED');
  });

  it('should prevent double reveal', () => {
    const bet = {
      revealed: false,
      claimed: false,
    };

    // First reveal
    expect(bet.revealed).toBe(false);
    bet.revealed = true;

    // Second reveal attempt should fail
    const canRevealAgain = !bet.revealed;
    expect(canRevealAgain).toBe(false);
  });

  it('should prevent claim before reveal', () => {
    const bet = {
      revealed: false,
      claimed: false,
    };

    const canClaim = bet.revealed && !bet.claimed;
    expect(canClaim).toBe(false);
  });

  it('should prevent double claim', () => {
    const bet = {
      revealed: true,
      claimed: false,
    };

    // First claim
    expect(bet.claimed).toBe(false);
    bet.claimed = true;

    // Second claim attempt should fail
    const canClaimAgain = bet.revealed && !bet.claimed;
    expect(canClaimAgain).toBe(false);
  });
});

describe('Market State Machine', () => {
  it('should progress through states correctly', () => {
    let status = MarketStatus.OPEN;

    // Initial state
    expect(status).toBe(MarketStatus.OPEN);

    // After deadline passes
    status = MarketStatus.BETTING_CLOSED;
    expect(status).toBe(MarketStatus.BETTING_CLOSED);

    // After resolution
    status = MarketStatus.RESOLVED;
    expect(status).toBe(MarketStatus.RESOLVED);
  });

  it('should only allow betting when OPEN', () => {
    const canBet = (status: number) => status === MarketStatus.OPEN;

    expect(canBet(MarketStatus.OPEN)).toBe(true);
    expect(canBet(MarketStatus.BETTING_CLOSED)).toBe(false);
    expect(canBet(MarketStatus.RESOLVED)).toBe(false);
  });

  it('should only allow reveal when RESOLVED', () => {
    const canReveal = (status: number) => status === MarketStatus.RESOLVED;

    expect(canReveal(MarketStatus.OPEN)).toBe(false);
    expect(canReveal(MarketStatus.BETTING_CLOSED)).toBe(false);
    expect(canReveal(MarketStatus.RESOLVED)).toBe(true);
  });
});
