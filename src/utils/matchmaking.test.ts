import { describe, it, expect } from 'vitest';
import {
  createMatches,
  createRounds,
  createRoundsMixed,
  createHistoryAwareRounds,
  createHistoryAwareMixedRounds,
} from './matchmaking';
import type { Player, MatchResult } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────

/** 16 players: 8M + 8W, varied rankings → exactly 4 courts, 0 unmatched. */
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
 * 4 players with rankings spaced ≥ 1.5 apart so ±0.5 jitter cannot reorder
 * them. Enables fully deterministic history-algorithm tests.
 */
const PLAYERS_4_RANKED: Player[] = [
  { id: 'p1', name: 'P1', ranking: 7.0, gender: 'M' },
  { id: 'p2', name: 'P2', ranking: 5.0, gender: 'W' },
  { id: 'p3', name: 'P3', ranking: 3.0, gender: 'M' },
  { id: 'p4', name: 'P4', ranking: 1.5, gender: 'W' },
];

/**
 * 4 players: 2M + 2W, rankings spaced ≥ 1.0 apart, jitter-stable.
 * Used for deterministic mixed-history tests.
 */
const PLAYERS_4_MIXED: Player[] = [
  { id: 'm1', name: 'M1', ranking: 7.0, gender: 'M' },
  { id: 'w1', name: 'W1', ranking: 5.5, gender: 'W' },
  { id: 'm2', name: 'M2', ranking: 3.5, gender: 'M' },
  { id: 'w2', name: 'W2', ranking: 2.0, gender: 'W' },
];

// ── Helpers ───────────────────────────────────────────────────────────────

/** Collect all player IDs in a result (courts + unmatched). */
function collectIds(result: MatchResult): string[] {
  return [
    ...result.courts.flatMap(c =>
      [...c.team1.players, ...c.team2.players].map(p => p.id)
    ),
    ...result.unmatched.map(p => p.id),
  ];
}

/** Assert every input player appears exactly once in the result. */
function assertComplete(result: MatchResult, total: number): void {
  const ids = collectIds(result);
  expect(ids).toHaveLength(total);
  expect(new Set(ids).size).toBe(total);
}

/** Return sorted [idA, idB] pairs for every team partnership in a result. */
function partnerships(result: MatchResult): Array<[string, string]> {
  return result.courts.flatMap(c =>
    [c.team1, c.team2].map(t => {
      const [a, b] = t.players.map(p => p.id).sort();
      return [a, b] as [string, string];
    })
  );
}

// ── Battery 1: Output shape ────────────────────────────────────────────────

describe('Output shape', () => {
  function assertShape(rounds: MatchResult[], n: number): void {
    const expectedCourts    = Math.floor(n / 4);
    const expectedUnmatched = n % 4;
    for (const round of rounds) {
      expect(round.courts).toHaveLength(expectedCourts);
      expect(round.unmatched).toHaveLength(expectedUnmatched);
      for (const court of round.courts) {
        expect(court.team1.players).toHaveLength(2);
        expect(court.team2.players).toHaveLength(2);
      }
    }
  }

  it('ranking: 4 courts, 0 unmatched, 2-player teams', () => {
    assertShape([createMatches(PLAYERS_16, 'ranking')], 16);
  });
  it('mixed: 4 courts, 0 unmatched, 2-player teams', () => {
    assertShape([createMatches(PLAYERS_16, 'mixed')], 16);
  });
  it('multiround: correct shape for each round', () => {
    assertShape(createRounds(PLAYERS_16, 4), 16);
  });
  it('multiround-mixed: correct shape for each round', () => {
    assertShape(createRoundsMixed(PLAYERS_16, 4), 16);
  });
  it('history: correct shape for each round', () => {
    assertShape(createHistoryAwareRounds(PLAYERS_16, 4), 16);
  });
  it('history-mixed: correct shape for each round', () => {
    assertShape(createHistoryAwareMixedRounds(PLAYERS_16, 4), 16);
  });
});

// ── Battery 2: Player completeness ────────────────────────────────────────

describe('Player completeness', () => {
  it('ranking: every player appears exactly once', () => {
    assertComplete(createMatches(PLAYERS_16, 'ranking'), 16);
  });
  it('mixed: every player appears exactly once', () => {
    assertComplete(createMatches(PLAYERS_16, 'mixed'), 16);
  });
  it('multiround: no duplicates or missing players per round', () => {
    for (const round of createRounds(PLAYERS_16, 5))
      assertComplete(round, 16);
  });
  it('multiround-mixed: no duplicates or missing players per round', () => {
    for (const round of createRoundsMixed(PLAYERS_16, 5))
      assertComplete(round, 16);
  });
  it('history: no duplicates or missing players per round', () => {
    for (const round of createHistoryAwareRounds(PLAYERS_16, 5))
      assertComplete(round, 16);
  });
  it('history-mixed: no duplicates or missing players per round', () => {
    for (const round of createHistoryAwareMixedRounds(PLAYERS_16, 5))
      assertComplete(round, 16);
  });

  it('jitter algorithms return players with their original rankings (no jitter leak)', () => {
    const originals = new Map(PLAYERS_16.map(p => [p.id, p.ranking]));
    const allRounds = [
      ...createRounds(PLAYERS_16, 2),
      ...createRoundsMixed(PLAYERS_16, 2),
      ...createHistoryAwareRounds(PLAYERS_16, 2),
      ...createHistoryAwareMixedRounds(PLAYERS_16, 2),
    ];
    for (const round of allRounds) {
      for (const court of round.courts) {
        for (const p of [...court.team1.players, ...court.team2.players]) {
          expect(p.ranking).toBe(originals.get(p.id));
        }
      }
    }
  });
});

// ── Battery 3: Skill balance — ranking algorithm ───────────────────────────

describe('Skill balance — ranking algorithm', () => {
  it('best and 2nd-best are on opposing teams (4 players)', () => {
    const { courts } = createMatches(PLAYERS_4_RANKED, 'ranking');
    const team1Ids = new Set(courts[0].team1.players.map(p => p.id));
    // p1 (7.0) and p2 (5.0) must not share a team
    expect(team1Ids.has('p1') && team1Ids.has('p2')).toBe(false);
  });

  it('best paired with weakest, 2nd-best with 3rd-best (4 players)', () => {
    const { courts } = createMatches(PLAYERS_4_RANKED, 'ranking');
    const teamPairs = [courts[0].team1, courts[0].team2].map(t =>
      t.players.map(p => p.id).sort().join(',')
    );
    expect(teamPairs).toContain('p1,p4'); // best + worst
    expect(teamPairs).toContain('p2,p3'); // 2nd + 3rd
  });

  it('within every court the top-2 players are always on opposing teams (16 players)', () => {
    // Run several times because sortByRanking uses a random tiebreaker
    for (let i = 0; i < 5; i++) {
      const { courts } = createMatches(PLAYERS_16, 'ranking');
      for (const court of courts) {
        const [top1, top2] = [...court.team1.players, ...court.team2.players]
          .sort((a, b) => b.ranking - a.ranking);
        const team1Ids = new Set(court.team1.players.map(p => p.id));
        expect(team1Ids.has(top1.id) && team1Ids.has(top2.id)).toBe(false);
      }
    }
  });
});

// ── Battery 4: Mixed gender constraint ────────────────────────────────────

describe('Mixed gender constraint', () => {
  function assertMixedTeams(rounds: MatchResult[]): void {
    for (const round of rounds) {
      for (const court of round.courts) {
        for (const team of [court.team1, court.team2]) {
          const genders = team.players.map(p => p.gender);
          expect(genders).toContain('M');
          expect(genders).toContain('W');
        }
      }
    }
  }

  it('mixed: all teams are 1M + 1W (balanced 8M + 8W input)', () => {
    assertMixedTeams([createMatches(PLAYERS_16, 'mixed')]);
  });
  it('multiround-mixed: all teams are 1M + 1W across all rounds', () => {
    assertMixedTeams(createRoundsMixed(PLAYERS_16, 5));
  });
  it('history-mixed: all teams are 1M + 1W across all rounds', () => {
    assertMixedTeams(createHistoryAwareMixedRounds(PLAYERS_16, 5));
  });

  it('mixed: gender surplus handled correctly — 10M + 6W → 3 mixed courts + 1 same-gender court', () => {
    const tenM = Array.from({ length: 10 }, (_, i) => ({
      id: `xm${i}`, name: `M${i}`, ranking: 2.0 + (i % 5) * 0.5, gender: 'M' as const,
    }));
    const sixW = Array.from({ length: 6 }, (_, i) => ({
      id: `xw${i}`, name: `W${i}`, ranking: 2.0 + (i % 5) * 0.5, gender: 'W' as const,
    }));
    const { courts } = createMatches([...tenM, ...sixW], 'mixed');
    expect(courts).toHaveLength(4); // 16 players → 4 courts total
    const mixedCourts = courts.filter(c =>
      [c.team1, c.team2].every(t => {
        const g = t.players.map(p => p.gender);
        return g.includes('M') && g.includes('W');
      })
    );
    expect(mixedCourts).toHaveLength(3);
  });
});

// ── Battery 5: History effectiveness ──────────────────────────────────────

describe('History effectiveness', () => {
  // With 4 players there is only one possible group of 4, so the history
  // algorithm's only degree of freedom is which of the 2 valid team splits to
  // use. Rankings are spaced ≥ 1.5 apart so ±0.5 jitter cannot reorder them,
  // making these tests fully deterministic.
  //
  // Split A (tiebreak default): team1=[p1,p3], team2=[p2,p4]
  // Split B:                    team1=[p1,p4], team2=[p2,p3]
  //
  // Round 1 (no history): costA = costB = 0 → picks A (tiebreak)
  // Round 2 (A recorded): costA = 2, costB = 0 → picks B
  // Round 3 (A=1,B=1):    costA = costB = 2   → picks A (tiebreak)

  it('history-aware: round 2 uses a different split than round 1', () => {
    const rounds = createHistoryAwareRounds(PLAYERS_4_RANKED, 2);
    const r1 = partnerships(rounds[0]);
    const r2 = partnerships(rounds[1]);
    for (const pair of r1) {
      expect(r2).not.toContainEqual(pair);
    }
  });

  it('history-aware: round 3 cycles back to the same split as round 1', () => {
    const rounds = createHistoryAwareRounds(PLAYERS_4_RANKED, 3);
    expect(partnerships(rounds[2])).toEqual(partnerships(rounds[0]));
  });

  it('history-mixed: round 2 uses a different mixed split than round 1', () => {
    const rounds = createHistoryAwareMixedRounds(PLAYERS_4_MIXED, 2);
    const r1 = partnerships(rounds[0]);
    const r2 = partnerships(rounds[1]);
    for (const pair of r1) {
      expect(r2).not.toContainEqual(pair);
    }
  });

  it('history-mixed: round 3 cycles back to the same split as round 1', () => {
    const rounds = createHistoryAwareMixedRounds(PLAYERS_4_MIXED, 3);
    expect(partnerships(rounds[2])).toEqual(partnerships(rounds[0]));
  });
});

// ── Battery 6: Edge cases ─────────────────────────────────────────────────

describe('Edge cases', () => {
  it('fewer than 4 players → no courts, all players unmatched', () => {
    for (let n = 0; n < 4; n++) {
      const result = createMatches(PLAYERS_16.slice(0, n));
      expect(result.courts).toHaveLength(0);
      expect(result.unmatched).toHaveLength(n);
    }
  });

  it('exactly 4 players → 1 court, 0 unmatched', () => {
    const result = createMatches(PLAYERS_4_RANKED, 'ranking');
    expect(result.courts).toHaveLength(1);
    expect(result.unmatched).toHaveLength(0);
  });

  it('5 players → 1 court, 1 unmatched', () => {
    const result = createMatches(PLAYERS_16.slice(0, 5), 'ranking');
    expect(result.courts).toHaveLength(1);
    expect(result.unmatched).toHaveLength(1);
  });

  it('all same gender: ranking algorithm still fills all courts', () => {
    const allMen = PLAYERS_16.filter(p => p.gender === 'M'); // 8 players
    const result = createMatches(allMen, 'ranking');
    expect(result.courts).toHaveLength(2);
    assertComplete(result, allMen.length);
  });

  it('all same gender: mixed algorithm falls back gracefully to ranking', () => {
    const allMen = PLAYERS_16.filter(p => p.gender === 'M'); // 8 players
    const result = createMatches(allMen, 'mixed');
    expect(result.courts).toHaveLength(2);
    assertComplete(result, allMen.length);
  });

  it('all round-based functions produce the requested number of rounds', () => {
    for (const n of [1, 3, 5]) {
      expect(createRounds(PLAYERS_16, n)).toHaveLength(n);
      expect(createRoundsMixed(PLAYERS_16, n)).toHaveLength(n);
      expect(createHistoryAwareRounds(PLAYERS_16, n)).toHaveLength(n);
      expect(createHistoryAwareMixedRounds(PLAYERS_16, n)).toHaveLength(n);
    }
  });
});
