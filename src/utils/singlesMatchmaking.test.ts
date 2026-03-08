import { describe, it, expect } from 'vitest';
import {
  createSinglesMatches,
  createSinglesRounds,
  createSinglesRoundsMixed,
  createSinglesRoundsSameGender,
  createSinglesHistoryAwareRounds,
  createSinglesHistoryAwareMixedRounds,
  createSinglesHistoryAwareSameGenderRounds,
} from './singlesMatchmaking';
import type { Player, SinglesResult } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────

/** 16 players: 8M + 8W, varied rankings → exactly 8 courts, 0 unmatched. */
const PLAYERS_16: Player[] = [
  { id: 'a1', name: 'Alice',  ranking: 5.5, gender: 'W' },
  { id: 'a2', name: 'Bob',    ranking: 3.5, gender: 'M' },
  { id: 'a3', name: 'Carol',  ranking: 4.5, gender: 'W' },
  { id: 'a4', name: 'Dave',   ranking: 2.5, gender: 'M' },
  { id: 'a5', name: 'Eve',    ranking: 6.5, gender: 'W' },
  { id: 'a6', name: 'Frank',  ranking: 1.5, gender: 'M' },
  { id: 'a7', name: 'Grace',  ranking: 4.0, gender: 'W' },
  { id: 'a8', name: 'Hank',   ranking: 3.0, gender: 'M' },
  { id: 'a9', name: 'Iris',   ranking: 5.0, gender: 'W' },
  { id: 'b1', name: 'Jack',   ranking: 2.5, gender: 'M' },
  { id: 'b2', name: 'Karen',  ranking: 3.5, gender: 'W' },
  { id: 'b3', name: 'Leo',    ranking: 7.0, gender: 'M' },
  { id: 'b4', name: 'Mia',    ranking: 4.5, gender: 'W' },
  { id: 'b5', name: 'Nate',   ranking: 2.0, gender: 'M' },
  { id: 'b6', name: 'Olivia', ranking: 5.5, gender: 'W' },
  { id: 'b7', name: 'Pete',   ranking: 3.5, gender: 'M' },
];

/**
 * 4 players: 2M + 2W, rankings spaced ≥ 1.5 apart so ±0.5 jitter cannot
 * reorder them. Used for history-aware and history-mixed tests.
 *
 * Sorted desc: p1(7.0,M) > p2(5.0,W) > p3(3.0,M) > p4(1.5,W)
 *
 * Greedy cost = |jittered_spread| + 0.5×history.  Jitter randomises cost
 * values (not just sort order), so exact cycling is non-deterministic.
 * After 6 rounds of the same matching the penalty guarantees a change.
 */
const PLAYERS_4_RANKED: Player[] = [
  { id: 'p1', name: 'P1', ranking: 7.0, gender: 'M' },
  { id: 'p2', name: 'P2', ranking: 5.0, gender: 'W' },
  { id: 'p3', name: 'P3', ranking: 3.0, gender: 'M' },
  { id: 'p4', name: 'P4', ranking: 1.5, gender: 'W' },
];

/**
 * 4 all-male players, jitter-stable (gaps ≥ 1.5).
 * Used for history-same-gender tests.
 *
 * Sorted desc: sm1(7.0) > sm2(5.0) > sm3(3.0) > sm4(1.5)
 *
 * Jitter randomises cost values, so exact cycling is non-deterministic.
 * After 9 rounds of the same matching the penalty guarantees a change.
 */
const PLAYERS_4M: Player[] = [
  { id: 'sm1', name: 'SM1', ranking: 7.0, gender: 'M' },
  { id: 'sm2', name: 'SM2', ranking: 5.0, gender: 'M' },
  { id: 'sm3', name: 'SM3', ranking: 3.0, gender: 'M' },
  { id: 'sm4', name: 'SM4', ranking: 1.5, gender: 'M' },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function collectIds(result: SinglesResult): string[] {
  return [
    ...result.courts.flatMap(c => [c.player1.id, c.player2.id]),
    ...result.unmatched.map(p => p.id),
  ];
}

function assertComplete(result: SinglesResult, total: number): void {
  const ids = collectIds(result);
  expect(ids).toHaveLength(total);
  expect(new Set(ids).size).toBe(total);
}

/**
 * Return a sorted list of "idA:idB" strings (idA < idB lexicographically)
 * for every court in the result. Sorting the outer array makes assertions
 * order-independent.
 */
function matchupStrings(result: SinglesResult): string[] {
  return result.courts
    .map(c => [c.player1.id, c.player2.id].sort().join(':'))
    .sort();
}

// ── Battery 1: Output shape ────────────────────────────────────────────────

describe('Singles — output shape', () => {
  function assertShape(rounds: SinglesResult[], n: number): void {
    const expectedCourts    = Math.floor(n / 2);
    const expectedUnmatched = n % 2;
    for (const round of rounds) {
      expect(round.courts).toHaveLength(expectedCourts);
      expect(round.unmatched).toHaveLength(expectedUnmatched);
      for (const court of round.courts) {
        expect(court.player1).toBeDefined();
        expect(court.player2).toBeDefined();
        expect(court.player1.id).not.toBe(court.player2.id);
      }
    }
  }

  it('ranking: 8 courts, 0 unmatched, 2 distinct players per court', () => {
    assertShape([createSinglesMatches(PLAYERS_16, 'ranking')], 16);
  });
  it('mixed: 8 courts, 0 unmatched', () => {
    assertShape([createSinglesMatches(PLAYERS_16, 'mixed')], 16);
  });
  it('same-gender: 8 courts, 0 unmatched', () => {
    assertShape([createSinglesMatches(PLAYERS_16, 'same-gender')], 16);
  });
  it('multiround: correct shape for each round', () => {
    assertShape(createSinglesRounds(PLAYERS_16, 4), 16);
  });
  it('multiround-mixed: correct shape for each round', () => {
    assertShape(createSinglesRoundsMixed(PLAYERS_16, 4), 16);
  });
  it('multiround-same-gender: correct shape for each round', () => {
    assertShape(createSinglesRoundsSameGender(PLAYERS_16, 4), 16);
  });
  it('history: correct shape for each round', () => {
    assertShape(createSinglesHistoryAwareRounds(PLAYERS_16, 4), 16);
  });
  it('history-mixed: correct shape for each round', () => {
    assertShape(createSinglesHistoryAwareMixedRounds(PLAYERS_16, 4), 16);
  });
  it('history-same-gender: correct shape for each round', () => {
    assertShape(createSinglesHistoryAwareSameGenderRounds(PLAYERS_16, 4), 16);
  });
});

// ── Battery 2: Player completeness ────────────────────────────────────────

describe('Singles — player completeness', () => {
  it('ranking: every player appears exactly once', () => {
    assertComplete(createSinglesMatches(PLAYERS_16, 'ranking'), 16);
  });
  it('mixed: every player appears exactly once', () => {
    assertComplete(createSinglesMatches(PLAYERS_16, 'mixed'), 16);
  });
  it('same-gender: every player appears exactly once', () => {
    assertComplete(createSinglesMatches(PLAYERS_16, 'same-gender'), 16);
  });
  it('multiround: no duplicates or missing players per round', () => {
    for (const round of createSinglesRounds(PLAYERS_16, 5))
      assertComplete(round, 16);
  });
  it('multiround-mixed: no duplicates or missing players per round', () => {
    for (const round of createSinglesRoundsMixed(PLAYERS_16, 5))
      assertComplete(round, 16);
  });
  it('multiround-same-gender: no duplicates or missing players per round', () => {
    for (const round of createSinglesRoundsSameGender(PLAYERS_16, 5))
      assertComplete(round, 16);
  });
  it('history: no duplicates or missing players per round', () => {
    for (const round of createSinglesHistoryAwareRounds(PLAYERS_16, 5))
      assertComplete(round, 16);
  });
  it('history-mixed: no duplicates or missing players per round', () => {
    for (const round of createSinglesHistoryAwareMixedRounds(PLAYERS_16, 5))
      assertComplete(round, 16);
  });
  it('history-same-gender: no duplicates or missing players per round', () => {
    for (const round of createSinglesHistoryAwareSameGenderRounds(PLAYERS_16, 5))
      assertComplete(round, 16);
  });

  it('jitter algorithms return players with their original rankings (no jitter leak)', () => {
    const originals = new Map(PLAYERS_16.map(p => [p.id, p.ranking]));
    const allRounds = [
      ...createSinglesRounds(PLAYERS_16, 2),
      ...createSinglesRoundsMixed(PLAYERS_16, 2),
      ...createSinglesRoundsSameGender(PLAYERS_16, 2),
      ...createSinglesHistoryAwareRounds(PLAYERS_16, 2),
      ...createSinglesHistoryAwareMixedRounds(PLAYERS_16, 2),
      ...createSinglesHistoryAwareSameGenderRounds(PLAYERS_16, 2),
    ];
    for (const round of allRounds) {
      for (const court of round.courts) {
        expect(court.player1.ranking).toBe(originals.get(court.player1.id));
        expect(court.player2.ranking).toBe(originals.get(court.player2.id));
      }
    }
  });
});

// ── Battery 3: Skill balance — ranking algorithm ───────────────────────────

describe('Singles — skill balance', () => {
  it('ranking: 1st faces 2nd, 3rd faces 4th (4 jitter-stable players)', () => {
    // PLAYERS_4_RANKED sorted desc: p1 > p2 > p3 > p4 — jitter cannot reorder them.
    // ranking pairs consecutive: p1vp2 and p3vp4.
    const { courts } = createSinglesMatches(PLAYERS_4_RANKED, 'ranking');
    const mu = matchupStrings({ courts, unmatched: [] });
    expect(mu).toContain('p1:p2');
    expect(mu).toContain('p3:p4');
  });

  it('ranking: every court pairs distinct players (no self-match), 5 trials', () => {
    for (let i = 0; i < 5; i++) {
      const { courts } = createSinglesMatches(PLAYERS_16, 'ranking');
      for (const court of courts) {
        expect(court.player1.id).not.toBe(court.player2.id);
      }
    }
  });
});

// ── Battery 4: Mixed gender constraint ────────────────────────────────────

describe('Singles — mixed gender constraint', () => {
  function assertAllMixedCourts(rounds: SinglesResult[]): void {
    for (const round of rounds) {
      for (const court of round.courts) {
        expect(court.player1.gender).not.toBe(court.player2.gender);
      }
    }
  }

  it('mixed: all courts M vs W (balanced 8M + 8W)', () => {
    assertAllMixedCourts([createSinglesMatches(PLAYERS_16, 'mixed')]);
  });
  it('multiround-mixed: all courts M vs W across all rounds', () => {
    assertAllMixedCourts(createSinglesRoundsMixed(PLAYERS_16, 5));
  });
  it('history-mixed: all courts M vs W across all rounds', () => {
    assertAllMixedCourts(createSinglesHistoryAwareMixedRounds(PLAYERS_16, 5));
  });

  it('mixed: gender surplus — 9M + 7W yields exactly 7 mixed courts and 1 same-gender fallback', () => {
    const nineM = Array.from({ length: 9 }, (_, i) => ({
      id: `xm${i}`, name: `M${i}`, ranking: 2.0 + (i % 5) * 0.5, gender: 'M' as const,
    }));
    const sevenW = Array.from({ length: 7 }, (_, i) => ({
      id: `xw${i}`, name: `W${i}`, ranking: 2.0 + (i % 5) * 0.5, gender: 'W' as const,
    }));
    const { courts } = createSinglesMatches([...nineM, ...sevenW], 'mixed');
    expect(courts).toHaveLength(8); // 16 players / 2
    const mixedCount = courts.filter(c => c.player1.gender !== c.player2.gender).length;
    expect(mixedCount).toBe(7); // min(9, 7) = 7 M vs W pairs
  });
});

// ── Battery 5: Same-gender constraint ─────────────────────────────────────

describe('Singles — same-gender constraint', () => {
  it('same-gender: all courts M vs M or W vs W (balanced 8M + 8W)', () => {
    const { courts } = createSinglesMatches(PLAYERS_16, 'same-gender');
    expect(courts).toHaveLength(8);
    expect(courts.every(c => c.player1.gender === c.player2.gender)).toBe(true);
  });

  it('same-gender: produces exactly 4 M vs M and 4 W vs W courts (8M + 8W)', () => {
    const { courts } = createSinglesMatches(PLAYERS_16, 'same-gender');
    const mvmCount = courts.filter(c => c.player1.gender === 'M' && c.player2.gender === 'M').length;
    const wvwCount = courts.filter(c => c.player1.gender === 'W' && c.player2.gender === 'W').length;
    expect(mvmCount).toBe(4);
    expect(wvwCount).toBe(4);
  });

  it('same-gender: maximises same-gender courts — 9M + 7W → floor(9/2)+floor(7/2) = 7 same-gender, 1 mixed remainder', () => {
    const nineM = Array.from({ length: 9 }, (_, i) => ({
      id: `gm${i}`, name: `GM${i}`, ranking: 2.0 + (i % 5) * 0.5, gender: 'M' as const,
    }));
    const sevenW = Array.from({ length: 7 }, (_, i) => ({
      id: `gw${i}`, name: `GW${i}`, ranking: 2.0 + (i % 5) * 0.5, gender: 'W' as const,
    }));
    const { courts } = createSinglesMatches([...nineM, ...sevenW], 'same-gender');
    expect(courts).toHaveLength(8);
    const sameCount = courts.filter(c => c.player1.gender === c.player2.gender).length;
    expect(sameCount).toBe(7);
  });

  it('multiround-same-gender: every court in every round is same-gender (8M + 8W, 5 rounds)', () => {
    const rounds = createSinglesRoundsSameGender(PLAYERS_16, 5);
    for (const round of rounds) {
      for (const court of round.courts) {
        expect(court.player1.gender).toBe(court.player2.gender);
      }
    }
  });

  it('history-same-gender: every court in every round is same-gender (8M + 8W, 5 rounds)', () => {
    const rounds = createSinglesHistoryAwareSameGenderRounds(PLAYERS_16, 5);
    for (const round of rounds) {
      for (const court of round.courts) {
        expect(court.player1.gender).toBe(court.player2.gender);
      }
    }
  });

  it('same-gender: all same-gender input fills all courts correctly', () => {
    const allMen = PLAYERS_16.filter(p => p.gender === 'M'); // 8 players
    const { courts, unmatched } = createSinglesMatches(allMen, 'same-gender');
    expect(courts).toHaveLength(4);
    expect(unmatched).toHaveLength(0);
    expect(courts.every(c => c.player1.gender === 'M' && c.player2.gender === 'M')).toBe(true);
  });
});

// ── Battery 6: History effectiveness ──────────────────────────────────────

describe('Singles — history effectiveness', () => {
  // The history algorithms apply ±0.5 jitter to ranking values used in cost
  // computation, not just to the sort order. This makes exact round-by-round
  // cycling non-deterministic. Instead we verify that the accumulated history
  // penalty is large enough to force pairing variety within 10 rounds.
  //
  // Proof sketch (history, PLAYERS_4_RANKED):
  //   Non-A pair (p2:p3) has max cost 3.0. After k rounds of matching A,
  //   the penalised A-pair (p3:p4) has min cost 0.5 + 0.5k. For k=6 that is
  //   3.5 > 3.0, so a non-A pair ALWAYS wins the greedy step. Therefore a
  //   change is guaranteed by round 7 at the latest → ≥2 distinct sets in 10.
  //
  // history-mixed: same logic, k=5 suffices (forced by round 6).
  // history-same-gender (PLAYERS_4M): non-A pair (sm2:sm4) max cost 4.5;
  //   penalised A-pair min cost 0.5+0.5k > 4.5 at k=9 → ≥2 sets in 10.

  it('history: 10 rounds with 4 players produce at least 2 distinct matchup sets', () => {
    const rounds = createSinglesHistoryAwareRounds(PLAYERS_4_RANKED, 10);
    const sets = new Set(rounds.map(r => matchupStrings(r).join('|')));
    expect(sets.size).toBeGreaterThanOrEqual(2);
  });

  it('history-mixed: 10 rounds with 4 players produce at least 2 distinct matchup sets', () => {
    const rounds = createSinglesHistoryAwareMixedRounds(PLAYERS_4_RANKED, 10);
    const sets = new Set(rounds.map(r => matchupStrings(r).join('|')));
    expect(sets.size).toBeGreaterThanOrEqual(2);
  });

  it('history-same-gender: 10 rounds with 4 same-gender players produce at least 2 distinct matchup sets', () => {
    const rounds = createSinglesHistoryAwareSameGenderRounds(PLAYERS_4M, 10);
    const sets = new Set(rounds.map(r => matchupStrings(r).join('|')));
    expect(sets.size).toBeGreaterThanOrEqual(2);
  });
});

// ── Battery 7: Edge cases ─────────────────────────────────────────────────

describe('Singles — edge cases', () => {
  it('0 or 1 players → no courts, all players unmatched', () => {
    for (let n = 0; n < 2; n++) {
      const result = createSinglesMatches(PLAYERS_16.slice(0, n));
      expect(result.courts).toHaveLength(0);
      expect(result.unmatched).toHaveLength(n);
    }
  });

  it('exactly 2 players → 1 court, 0 unmatched', () => {
    const result = createSinglesMatches(PLAYERS_16.slice(0, 2));
    expect(result.courts).toHaveLength(1);
    expect(result.unmatched).toHaveLength(0);
  });

  it('3 players → 1 court, 1 unmatched', () => {
    const result = createSinglesMatches(PLAYERS_16.slice(0, 3), 'ranking');
    expect(result.courts).toHaveLength(1);
    expect(result.unmatched).toHaveLength(1);
  });

  it('all same gender: mixed falls back to ranking — still fills all courts', () => {
    const allMen = PLAYERS_16.filter(p => p.gender === 'M'); // 8 players
    const result = createSinglesMatches(allMen, 'mixed');
    expect(result.courts).toHaveLength(4);
    assertComplete(result, allMen.length);
  });

  it('all same gender: history-mixed falls back gracefully across rounds', () => {
    const allMen = PLAYERS_16.filter(p => p.gender === 'M'); // 8 players
    for (const round of createSinglesHistoryAwareMixedRounds(allMen, 3))
      assertComplete(round, allMen.length);
  });

  it('all same gender: history-same-gender fills all courts as same-gender', () => {
    const allWomen = PLAYERS_16.filter(p => p.gender === 'W'); // 8 players
    for (const round of createSinglesHistoryAwareSameGenderRounds(allWomen, 3)) {
      assertComplete(round, allWomen.length);
      for (const court of round.courts) {
        expect(court.player1.gender).toBe(court.player2.gender);
      }
    }
  });

  it('all round-based functions return the requested number of rounds', () => {
    for (const n of [1, 3, 5]) {
      expect(createSinglesRounds(PLAYERS_16, n)).toHaveLength(n);
      expect(createSinglesRoundsMixed(PLAYERS_16, n)).toHaveLength(n);
      expect(createSinglesRoundsSameGender(PLAYERS_16, n)).toHaveLength(n);
      expect(createSinglesHistoryAwareRounds(PLAYERS_16, n)).toHaveLength(n);
      expect(createSinglesHistoryAwareMixedRounds(PLAYERS_16, n)).toHaveLength(n);
      expect(createSinglesHistoryAwareSameGenderRounds(PLAYERS_16, n)).toHaveLength(n);
    }
  });
});
