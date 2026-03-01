import type { Player, Court, MatchResult, MatchAlgorithm } from '../types';

/** Sort players by ranking descending; equal rankings get a random tiebreak. */
function sortByRanking(players: Player[]): Player[] {
  return players
    .map(p => ({ player: p, tb: Math.random() }))
    .sort((a, b) => {
      const diff = b.player.ranking - a.player.ranking;
      return diff !== 0 ? diff : a.tb - b.tb;
    })
    .map(x => x.player);
}

/** Default team assignment for a sorted group of 4: best+weakest vs 2nd+3rd. */
function defaultTeams(group: Player[], id: number): Court {
  const [a, b, c, d] = group;
  return { id, team1: { players: [a, d] }, team2: { players: [b, c] } };
}

/**
 * Match by Ranking (default)
 *
 * Sort all players by ranking, assign consecutive groups of 4 to courts.
 * Within each group the two best players are on opposing teams.
 * `startId` lets fallback courts in the mixed algorithm continue numbering.
 */
function matchByRanking(players: Player[], startId = 1): MatchResult {
  const sorted = sortByRanking(players);
  const numCourts = Math.floor(sorted.length / 4);
  const courts: Court[] = [];
  for (let i = 0; i < numCourts; i++) {
    courts.push(defaultTeams(sorted.slice(i * 4, i * 4 + 4), startId + i));
  }
  return { courts, unmatched: sorted.slice(numCourts * 4) };
}

/**
 * Mixed by Ranking
 *
 * Builds as many mixed courts (each team = 1 man + 1 woman) as possible by
 * pairing the top-ranked men with the top-ranked women. The two best players
 * on each court are placed on opposing teams.
 *
 * Once one gender is exhausted the leftover players are matched with the
 * default ranking algorithm.
 */
function matchMixed(players: Player[]): MatchResult {
  const sorted = sortByRanking(players);
  const men   = sorted.filter(p => p.gender === 'M');
  const women = sorted.filter(p => p.gender === 'W');

  // How many full mixed courts can we build? (each needs 2M + 2W)
  const numMixed = Math.min(Math.floor(men.length / 2), Math.floor(women.length / 2));
  const courts: Court[] = [];

  for (let i = 0; i < numMixed; i++) {
    // Grab the next 2M and 2W (already sorted by ranking within their group)
    const group = [men[i * 2], men[i * 2 + 1], women[i * 2], women[i * 2 + 1]]
      .sort((a, b) => b.ranking - a.ranking); // sort these 4 by ranking

    const [p0, p1, p2, p3] = group;
    // p0 (best) → Team 1, p1 (2nd best) → Team 2
    // Each team must be 1M+1W, so find the opposite-gender partner for p0
    // from the remaining two players.
    const remaining = [p2, p3];
    const need = p0.gender === 'M' ? 'W' : 'M';
    const mateIdx = remaining.findIndex(p => p.gender === need);
    const mate1 = remaining[mateIdx >= 0 ? mateIdx : 0]; // opposite gender if available
    const mate2 = remaining.find(p => p !== mate1)!;

    courts.push({
      id: courts.length + 1,
      team1: { players: [p0, mate1] },
      team2: { players: [p1, mate2] },
    });
  }

  // Any remaining players (gender surplus) → default ranking algorithm
  const leftover = [...men.slice(numMixed * 2), ...women.slice(numMixed * 2)];
  if (leftover.length >= 4) {
    const { courts: extra, unmatched } = matchByRanking(leftover, courts.length + 1);
    return { courts: [...courts, ...extra], unmatched };
  }

  return { courts, unmatched: leftover };
}

/**
 * Multiround — jitter-based pairing
 *
 * Each round, a random ±0.5 offset is added to every player's ranking before
 * sorting. This perturbs the sort order at skill boundaries, producing varied
 * groupings while keeping matches roughly balanced. Original rankings are
 * restored in the returned result (display is unaffected).
 */
function matchWithJitter(players: Player[]): MatchResult {
  const originalMap = new Map(players.map(p => [p.id, p]));
  const jittered = players.map(p => ({
    ...p,
    ranking: Math.max(1.5, Math.min(7.0, p.ranking + (Math.random() > 0.5 ? 0.5 : -0.5))),
  }));
  const sorted = jittered
    .map(p => ({ player: p, tb: Math.random() }))
    .sort((a, b) => {
      const diff = b.player.ranking - a.player.ranking;
      return diff !== 0 ? diff : a.tb - b.tb;
    })
    .map(x => x.player);
  const numCourts = Math.floor(sorted.length / 4);
  const courts: Court[] = [];
  for (let i = 0; i < numCourts; i++) {
    const group = sorted.slice(i * 4, i * 4 + 4).map(jp => originalMap.get(jp.id)!);
    courts.push(defaultTeams(group, i + 1));
  }
  const unmatched = sorted.slice(numCourts * 4).map(jp => originalMap.get(jp.id)!);
  return { courts, unmatched };
}

export function createRounds(players: Player[], numRounds: number): MatchResult[] {
  return Array.from({ length: numRounds }, () => matchWithJitter(players));
}

/**
 * Multiround mixed — jitter-based pairing with mixed-gender teams
 *
 * Same jitter perturbation as the standard multiround algorithm, but men and
 * women are sorted separately by their jittered ranking so that each court
 * gets 2 men and 2 women. Each team is then 1 man + 1 woman. Any surplus
 * players (when one gender outnumbers the other by 4+) fall back to the
 * standard ranking algorithm.
 */
function matchWithJitterMixed(players: Player[]): MatchResult {
  const originalMap = new Map(players.map(p => [p.id, p]));
  const jittered = players.map(p => ({
    ...p,
    ranking: Math.max(1.5, Math.min(7.0, p.ranking + (Math.random() > 0.5 ? 0.5 : -0.5))),
  }));

  const men   = jittered.filter(p => p.gender === 'M').sort((a, b) => b.ranking - a.ranking);
  const women = jittered.filter(p => p.gender === 'W').sort((a, b) => b.ranking - a.ranking);
  const numMixed = Math.min(Math.floor(men.length / 2), Math.floor(women.length / 2));
  const courts: Court[] = [];

  for (let i = 0; i < numMixed; i++) {
    // Map jittered players back to originals, sort by original ranking
    const group = [men[i * 2], men[i * 2 + 1], women[i * 2], women[i * 2 + 1]]
      .map(jp => originalMap.get(jp.id)!)
      .sort((a, b) => b.ranking - a.ranking);
    const [p0, p1, p2, p3] = group;
    const remaining = [p2, p3];
    const need = p0.gender === 'M' ? 'W' : 'M';
    const mateIdx = remaining.findIndex(p => p.gender === need);
    const mate1 = remaining[mateIdx >= 0 ? mateIdx : 0];
    const mate2 = remaining.find(p => p !== mate1)!;
    courts.push({ id: courts.length + 1, team1: { players: [p0, mate1] }, team2: { players: [p1, mate2] } });
  }

  // Gender surplus → standard ranking fallback
  const leftover = [
    ...men.slice(numMixed * 2).map(jp => originalMap.get(jp.id)!),
    ...women.slice(numMixed * 2).map(jp => originalMap.get(jp.id)!),
  ];
  if (leftover.length >= 4) {
    const { courts: extra, unmatched } = matchByRanking(leftover, courts.length + 1);
    return { courts: [...courts, ...extra], unmatched };
  }
  return { courts, unmatched: leftover };
}

export function createRoundsMixed(players: Player[], numRounds: number): MatchResult[] {
  return Array.from({ length: numRounds }, () => matchWithJitterMixed(players));
}

// ── Multiround match history aware ──────────────────────────────────────────
// HistoryMap: playerId → (partnerId → times-partnered)
type HistoryMap = Map<string, Map<string, number>>;

function historyCount(h: HistoryMap, a: string, b: string): number {
  return h.get(a)?.get(b) ?? 0;
}

function recordPartnership(h: HistoryMap, a: string, b: string): void {
  if (!h.has(a)) h.set(a, new Map());
  h.get(a)!.set(b, (h.get(a)!.get(b) ?? 0) + 1);
}

function updateHistory(h: HistoryMap, result: MatchResult): void {
  for (const court of result.courts) {
    for (const team of [court.team1, court.team2]) {
      const [a, b] = team.players;
      recordPartnership(h, a.id, b.id);
      recordPartnership(h, b.id, a.id);
    }
  }
}

/**
 * Given 4 players sorted descending by ranking, build a Court keeping the two
 * best on opposing teams (only 2 valid skill-balanced splits) while choosing
 * the split that minimises partner-history cost.
 */
function buildHistoryCourt(sorted4: Player[], h: HistoryMap, id: number): Court {
  const [p0, p1, p2, p3] = sorted4;
  const costA = historyCount(h, p0.id, p2.id) + historyCount(h, p1.id, p3.id);
  const costB = historyCount(h, p0.id, p3.id) + historyCount(h, p1.id, p2.id);
  return costA <= costB
    ? { id, team1: { players: [p0, p2] }, team2: { players: [p1, p3] } }
    : { id, team1: { players: [p0, p3] }, team2: { players: [p1, p2] } };
}

/**
 * One history-aware round.
 *
 * Players are first sorted by jittered ranking (±0.5, same as multiround).
 * For each court, all C(remaining, 4) candidate groups are scored by
 *   cost = skill_spread + 0.5 × min_partner_history_cost
 * and the cheapest group is chosen. Within that group the team split is also
 * optimised for minimum partner-history cost (skill balance guaranteed).
 */
function matchHistoryAware(players: Player[], h: HistoryMap): MatchResult {
  const originalMap = new Map(players.map(p => [p.id, p]));
  const jittered = players.map(p => ({
    ...p,
    ranking: Math.max(1.5, Math.min(7.0, p.ranking + (Math.random() > 0.5 ? 0.5 : -0.5))),
  }));
  const remaining = [...jittered].sort((a, b) => b.ranking - a.ranking);
  const courts: Court[] = [];
  const numCourts = Math.floor(players.length / 4);
  const PARTNER_W = 0.5; // repeat partnership ≈ 0.5 USTA levels of cost

  for (let ci = 0; ci < numCourts; ci++) {
    const n = remaining.length;
    let bestIdx: [number, number, number, number] = [0, 1, 2, 3];
    let bestCost = Infinity;
    for (let a = 0; a < n - 3; a++) {
      for (let b = a + 1; b < n - 2; b++) {
        for (let c = b + 1; c < n - 1; c++) {
          for (let d = c + 1; d < n; d++) {
            const pa = remaining[a], pb = remaining[b],
                  pc = remaining[c], pd = remaining[d];
            // remaining is sorted desc so pa.ranking ≥ pb ≥ pc ≥ pd (jittered)
            const skillSpread = pa.ranking - pd.ranking;
            const minPartner = Math.min(
              historyCount(h, pa.id, pc.id) + historyCount(h, pb.id, pd.id),
              historyCount(h, pa.id, pd.id) + historyCount(h, pb.id, pc.id),
            );
            const cost = skillSpread + PARTNER_W * minPartner;
            if (cost < bestCost) { bestCost = cost; bestIdx = [a, b, c, d]; }
          }
        }
      }
    }
    const [ai, bi, ci2, di] = bestIdx;
    const selected = [remaining[ai], remaining[bi], remaining[ci2], remaining[di]];
    for (const i of [di, ci2, bi, ai]) remaining.splice(i, 1); // reverse order
    const orig = selected.map(p => originalMap.get(p.id)!);
    orig.sort((a, b) => b.ranking - a.ranking); // sort by original ranking
    courts.push(buildHistoryCourt(orig, h, ci + 1));
  }

  return { courts, unmatched: remaining.map(p => originalMap.get(p.id)!) };
}

export function createHistoryAwareRounds(players: Player[], numRounds: number): MatchResult[] {
  const h: HistoryMap = new Map();
  return Array.from({ length: numRounds }, () => {
    const round = matchHistoryAware(players, h);
    updateHistory(h, round);
    return round;
  });
}

/**
 * Given a group of 4 players that includes exactly 2 men and 2 women, build a
 * Court where each team is 1M+1W, choosing the split with the lowest
 * partner-history cost. Falls back to buildHistoryCourt for non-2M+2W groups.
 */
function buildMixedHistoryCourt(group4: Player[], h: HistoryMap, id: number): Court {
  const men   = group4.filter(p => p.gender === 'M').sort((a, b) => b.ranking - a.ranking);
  const women = group4.filter(p => p.gender === 'W').sort((a, b) => b.ranking - a.ranking);
  if (men.length === 2 && women.length === 2) {
    const [m0, m1] = men;
    const [w0, w1] = women;
    const costA = historyCount(h, m0.id, w0.id) + historyCount(h, m1.id, w1.id);
    const costB = historyCount(h, m0.id, w1.id) + historyCount(h, m1.id, w0.id);
    return costA <= costB
      ? { id, team1: { players: [m0, w0] }, team2: { players: [m1, w1] } }
      : { id, team1: { players: [m0, w1] }, team2: { players: [m1, w0] } };
  }
  return buildHistoryCourt(group4, h, id);
}

/**
 * Multiround history-aware mixed — history-aware pairing with mixed-gender teams
 *
 * Identical to the standard history-aware algorithm except that whenever at
 * least two men and two women remain, only 2M+2W candidate groups are
 * considered (hard constraint). This guarantees every court is mixed when
 * the player pool allows it, regardless of skill spread or partner-history
 * penalties. For 2M+2W groups the team-split history cost considers only the
 * two valid 1M+1W assignments.
 */
function matchHistoryAwareMixed(players: Player[], h: HistoryMap): MatchResult {
  const originalMap = new Map(players.map(p => [p.id, p]));
  const jittered = players.map(p => ({
    ...p,
    ranking: Math.max(1.5, Math.min(7.0, p.ranking + (Math.random() > 0.5 ? 0.5 : -0.5))),
  }));
  const remaining = [...jittered].sort((a, b) => b.ranking - a.ranking);
  const courts: Court[] = [];
  const numCourts = Math.floor(players.length / 4);
  const PARTNER_W = 0.5;

  for (let ci = 0; ci < numCourts; ci++) {
    const n = remaining.length;
    let bestIdx: [number, number, number, number] = [0, 1, 2, 3];
    let bestCost = Infinity;
    // If enough of both genders remain, restrict candidates to 2M+2W groups.
    const canMix = remaining.filter(p => p.gender === 'M').length >= 2
                && remaining.filter(p => p.gender === 'W').length >= 2;
    for (let a = 0; a < n - 3; a++) {
      for (let b = a + 1; b < n - 2; b++) {
        for (let c = b + 1; c < n - 1; c++) {
          for (let d = c + 1; d < n; d++) {
            const pa = remaining[a], pb = remaining[b],
                  pc = remaining[c], pd = remaining[d];
            const group4 = [pa, pb, pc, pd];
            const gMen  = group4.filter(p => p.gender === 'M');
            const isMixed = gMen.length === 2;
            if (canMix && !isMixed) continue; // skip non-mixed when mixed are available
            const skillSpread = pa.ranking - pd.ranking;
            let minPartner: number;
            if (isMixed) {
              const gWomen = group4.filter(p => p.gender === 'W');
              const [gm0, gm1] = gMen.sort((x, y) => y.ranking - x.ranking);
              const [gw0, gw1] = gWomen.sort((x, y) => y.ranking - x.ranking);
              minPartner = Math.min(
                historyCount(h, gm0.id, gw0.id) + historyCount(h, gm1.id, gw1.id),
                historyCount(h, gm0.id, gw1.id) + historyCount(h, gm1.id, gw0.id),
              );
            } else {
              minPartner = Math.min(
                historyCount(h, pa.id, pc.id) + historyCount(h, pb.id, pd.id),
                historyCount(h, pa.id, pd.id) + historyCount(h, pb.id, pc.id),
              );
            }
            const cost = skillSpread + PARTNER_W * minPartner;
            if (cost < bestCost) { bestCost = cost; bestIdx = [a, b, c, d]; }
          }
        }
      }
    }
    const [ai, bi, ci2, di] = bestIdx;
    const selected = [remaining[ai], remaining[bi], remaining[ci2], remaining[di]];
    for (const i of [di, ci2, bi, ai]) remaining.splice(i, 1);
    const orig = selected.map(p => originalMap.get(p.id)!);
    orig.sort((a, b) => b.ranking - a.ranking);
    courts.push(buildMixedHistoryCourt(orig, h, ci + 1));
  }

  return { courts, unmatched: remaining.map(p => originalMap.get(p.id)!) };
}

export function createHistoryAwareMixedRounds(players: Player[], numRounds: number): MatchResult[] {
  const h: HistoryMap = new Map();
  return Array.from({ length: numRounds }, () => {
    const round = matchHistoryAwareMixed(players, h);
    updateHistory(h, round);
    return round;
  });
}

/** Dispatch to the selected algorithm. */
export function createMatches(players: Player[], algorithm: MatchAlgorithm = 'ranking'): MatchResult {
  if (players.length < 4) return { courts: [], unmatched: players };
  return algorithm === 'mixed' ? matchMixed(players) : matchByRanking(players);
}
