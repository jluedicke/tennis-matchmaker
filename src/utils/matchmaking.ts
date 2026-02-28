import type { Player, Court, MatchResult } from '../types';

/**
 * Balanced Doubles Algorithm
 *
 * 1. Sort players by ranking descending, using a random tiebreak for equal rankings.
 * 2. Assign consecutive groups of 4 to courts — this minimises the intra-court
 *    ranking spread while maximising the spread across courts.
 * 3. Within each court group [a, b, c, d] (best → weakest):
 *    - Team 1: a (best) + d (weakest)
 *    - Team 2: b (2nd best) + c (3rd best)
 *    The two strongest players (a & b) end up on opposing teams, and the
 *    pairing also balances each team's combined strength.
 */
export function createMatches(players: Player[]): MatchResult {
  // Attach a random tiebreak weight to each player before sorting
  const withTiebreak = players.map(p => ({ player: p, tiebreak: Math.random() }));

  withTiebreak.sort((a, b) => {
    const diff = b.player.ranking - a.player.ranking; // descending by ranking
    return diff !== 0 ? diff : a.tiebreak - b.tiebreak; // stable random tiebreak
  });

  const sorted = withTiebreak.map(x => x.player);
  const numCourts = Math.floor(sorted.length / 4);
  const courts: Court[] = [];

  for (let i = 0; i < numCourts; i++) {
    const [a, b, c, d] = sorted.slice(i * 4, i * 4 + 4);
    courts.push({
      id: i + 1,
      team1: { players: [a, d] }, // best + weakest
      team2: { players: [b, c] }, // 2nd + 3rd
    });
  }

  const unmatched = sorted.slice(numCourts * 4);

  return { courts, unmatched };
}
