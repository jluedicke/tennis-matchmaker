import type { Player, MatchAlgorithm, SinglesCourt, SinglesResult } from '../types';

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

function jitter(p: Player): Player {
  return { ...p, ranking: Math.max(1.5, Math.min(7.0, p.ranking + (Math.random() > 0.5 ? 0.5 : -0.5))) };
}

/** Pair sorted players consecutively: [0]v[1], [2]v[3], … */
function pairConsecutive(sorted: Player[], startId = 1): SinglesResult {
  const numCourts = Math.floor(sorted.length / 2);
  const courts: SinglesCourt[] = [];
  for (let i = 0; i < numCourts; i++) {
    courts.push({ id: startId + i, player1: sorted[i * 2], player2: sorted[i * 2 + 1] });
  }
  return { courts, unmatched: sorted.slice(numCourts * 2) };
}

/**
 * Match by ranking: sort all players by USTA rating, pair 1v2, 3v4, …
 * `startId` lets fallback courts in the mixed algorithm continue numbering.
 */
function matchSinglesByRanking(players: Player[], startId = 1): SinglesResult {
  return pairConsecutive(sortByRanking(players), startId);
}

/**
 * Mixed by ranking: sort men and women separately by rating, pair the
 * top-ranked man vs top-ranked woman, next man vs next woman, etc.
 * When one gender is exhausted the remaining players fall back to the
 * standard ranking algorithm.
 */
function matchSinglesMixed(players: Player[]): SinglesResult {
  const sorted = sortByRanking(players);
  const men   = sorted.filter(p => p.gender === 'M');
  const women = sorted.filter(p => p.gender === 'W');
  const numMixed = Math.min(men.length, women.length);
  const courts: SinglesCourt[] = [];
  for (let i = 0; i < numMixed; i++) {
    courts.push({ id: i + 1, player1: men[i], player2: women[i] });
  }
  const leftover = [...men.slice(numMixed), ...women.slice(numMixed)];
  if (leftover.length >= 2) {
    const { courts: extra, unmatched } = matchSinglesByRanking(leftover, courts.length + 1);
    return { courts: [...courts, ...extra], unmatched };
  }
  return { courts, unmatched: leftover };
}

/**
 * Multiround — jitter-based pairing
 *
 * Each round a ±0.5 offset is added to every player's ranking before
 * sorting so pairings vary while remaining roughly balanced.
 */
function matchSinglesWithJitter(players: Player[]): SinglesResult {
  const originalMap = new Map(players.map(p => [p.id, p]));
  const sorted = sortByRanking(players.map(jitter));
  const numCourts = Math.floor(sorted.length / 2);
  const courts: SinglesCourt[] = [];
  for (let i = 0; i < numCourts; i++) {
    courts.push({
      id: i + 1,
      player1: originalMap.get(sorted[i * 2].id)!,
      player2: originalMap.get(sorted[i * 2 + 1].id)!,
    });
  }
  return { courts, unmatched: sorted.slice(numCourts * 2).map(p => originalMap.get(p.id)!) };
}

export function createSinglesRounds(players: Player[], numRounds: number): SinglesResult[] {
  return Array.from({ length: numRounds }, () => matchSinglesWithJitter(players));
}

/**
 * Multiround mixed — jitter-based pairing with M vs W per court.
 *
 * Men and women are jitter-sorted separately so each court pairs
 * a man against a woman. Gender surplus falls back to ranking pairing.
 */
function matchSinglesWithJitterMixed(players: Player[]): SinglesResult {
  const originalMap = new Map(players.map(p => [p.id, p]));
  const jittered = players.map(jitter);
  const men   = jittered.filter(p => p.gender === 'M').sort((a, b) => b.ranking - a.ranking);
  const women = jittered.filter(p => p.gender === 'W').sort((a, b) => b.ranking - a.ranking);
  const numMixed = Math.min(men.length, women.length);
  const courts: SinglesCourt[] = [];
  for (let i = 0; i < numMixed; i++) {
    courts.push({
      id: i + 1,
      player1: originalMap.get(men[i].id)!,
      player2: originalMap.get(women[i].id)!,
    });
  }
  const leftover = [
    ...men.slice(numMixed).map(p => originalMap.get(p.id)!),
    ...women.slice(numMixed).map(p => originalMap.get(p.id)!),
  ];
  if (leftover.length >= 2) {
    const { courts: extra, unmatched } = matchSinglesByRanking(leftover, courts.length + 1);
    return { courts: [...courts, ...extra], unmatched };
  }
  return { courts, unmatched: leftover };
}

export function createSinglesRoundsMixed(players: Player[], numRounds: number): SinglesResult[] {
  return Array.from({ length: numRounds }, () => matchSinglesWithJitterMixed(players));
}

// ── History-aware singles ────────────────────────────────────────────────────
// HistoryMap: playerId → (opponentId → times-faced)
type HistoryMap = Map<string, Map<string, number>>;

function opponentCount(h: HistoryMap, a: string, b: string): number {
  return h.get(a)?.get(b) ?? 0;
}

function recordMatch(h: HistoryMap, a: string, b: string): void {
  for (const [x, y] of [[a, b], [b, a]] as [string, string][]) {
    if (!h.has(x)) h.set(x, new Map());
    h.get(x)!.set(y, (h.get(x)!.get(y) ?? 0) + 1);
  }
}

function updateHistory(h: HistoryMap, result: SinglesResult): void {
  for (const court of result.courts) {
    recordMatch(h, court.player1.id, court.player2.id);
  }
}

/**
 * One history-aware round.
 *
 * Players are sorted by jittered ranking. For each court the pair that
 * minimises  skillSpread + 0.5 × opponent-history  is chosen greedily.
 */
function matchSinglesHistoryAware(players: Player[], h: HistoryMap): SinglesResult {
  const originalMap = new Map(players.map(p => [p.id, p]));
  const remaining = [...players.map(jitter)].sort((a, b) => b.ranking - a.ranking);
  const courts: SinglesCourt[] = [];
  const numCourts = Math.floor(players.length / 2);
  const OPPONENT_W = 0.5;

  for (let ci = 0; ci < numCourts; ci++) {
    const n = remaining.length;
    let bestI = 0, bestJ = 1, bestCost = Infinity;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const pa = remaining[i], pb = remaining[j];
        const cost = Math.abs(pa.ranking - pb.ranking) + OPPONENT_W * opponentCount(h, pa.id, pb.id);
        if (cost < bestCost) { bestCost = cost; bestI = i; bestJ = j; }
      }
    }
    const pa = originalMap.get(remaining[bestI].id)!;
    const pb = originalMap.get(remaining[bestJ].id)!;
    courts.push({ id: ci + 1, player1: pa, player2: pb });
    remaining.splice(bestJ, 1);
    remaining.splice(bestI, 1);
  }
  return { courts, unmatched: remaining.map(p => originalMap.get(p.id)!) };
}

export function createSinglesHistoryAwareRounds(players: Player[], numRounds: number): SinglesResult[] {
  const h: HistoryMap = new Map();
  return Array.from({ length: numRounds }, () => {
    const round = matchSinglesHistoryAware(players, h);
    updateHistory(h, round);
    return round;
  });
}

/**
 * History-aware mixed singles — same greedy history approach but only
 * considers M vs W pairs while both genders have players remaining.
 */
function matchSinglesHistoryAwareMixed(players: Player[], h: HistoryMap): SinglesResult {
  const originalMap = new Map(players.map(p => [p.id, p]));
  const remaining = [...players.map(jitter)].sort((a, b) => b.ranking - a.ranking);
  const courts: SinglesCourt[] = [];
  const numCourts = Math.floor(players.length / 2);
  const OPPONENT_W = 0.5;

  for (let ci = 0; ci < numCourts; ci++) {
    const n = remaining.length;
    const canMix = remaining.some(p => p.gender === 'M') && remaining.some(p => p.gender === 'W');
    let bestI = 0, bestJ = 1, bestCost = Infinity;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const pa = remaining[i], pb = remaining[j];
        if (canMix && pa.gender === pb.gender) continue;
        const cost = Math.abs(pa.ranking - pb.ranking) + OPPONENT_W * opponentCount(h, pa.id, pb.id);
        if (cost < bestCost) { bestCost = cost; bestI = i; bestJ = j; }
      }
    }
    const pa = originalMap.get(remaining[bestI].id)!;
    const pb = originalMap.get(remaining[bestJ].id)!;
    courts.push({ id: ci + 1, player1: pa, player2: pb });
    remaining.splice(bestJ, 1);
    remaining.splice(bestI, 1);
  }
  return { courts, unmatched: remaining.map(p => originalMap.get(p.id)!) };
}

export function createSinglesHistoryAwareMixedRounds(players: Player[], numRounds: number): SinglesResult[] {
  const h: HistoryMap = new Map();
  return Array.from({ length: numRounds }, () => {
    const round = matchSinglesHistoryAwareMixed(players, h);
    updateHistory(h, round);
    return round;
  });
}

/** Dispatch to the selected single-round algorithm. */
export function createSinglesMatches(players: Player[], algorithm: MatchAlgorithm = 'ranking'): SinglesResult {
  if (players.length < 2) return { courts: [], unmatched: players };
  return algorithm === 'mixed' ? matchSinglesMixed(players) : matchSinglesByRanking(players);
}
