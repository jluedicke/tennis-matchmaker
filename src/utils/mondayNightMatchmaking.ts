import type { Player, MNTCourt, MNTRound } from '../types';

// ── History tracking (within-team partnerships) ──────────────────────────────
type HistoryMap = Map<string, Map<string, number>>;

function historyCount(h: HistoryMap, a: string, b: string): number {
  return h.get(a)?.get(b) ?? 0;
}

function recordPartnership(h: HistoryMap, a: string, b: string): void {
  if (!h.has(a)) h.set(a, new Map());
  if (!h.has(b)) h.set(b, new Map());
  h.get(a)!.set(b, (h.get(a)!.get(b) ?? 0) + 1);
  h.get(b)!.set(a, (h.get(b)!.get(a) ?? 0) + 1);
}

function updateHistory(h: HistoryMap, round: MNTRound): void {
  for (const court of round.courts) {
    if (court.type === 'doubles') {
      recordPartnership(h, court.team1[0].id, court.team1[1].id);
      recordPartnership(h, court.team2[0].id, court.team2[1].id);
    }
  }
}

// ── Sorting helpers ──────────────────────────────────────────────────────────
function rankSort(players: Player[]): Player[] {
  return [...players]
    .map(p => ({ p, tb: Math.random() }))
    .sort((a, b) => b.p.ranking !== a.p.ranking ? b.p.ranking - a.p.ranking : a.tb - b.tb)
    .map(x => x.p);
}

function jitterSort(players: Player[]): Player[] {
  return [...players]
    .map(p => ({
      p,
      j: Math.max(1.5, Math.min(7.0, p.ranking + (Math.random() > 0.5 ? 0.5 : -0.5))),
      tb: Math.random(),
    }))
    .sort((a, b) => b.j !== a.j ? b.j - a.j : a.tb - b.tb)
    .map(x => x.p);
}

// ── Pairing strategies within one team ──────────────────────────────────────

/** Pair adjacent players in a pre-sorted list. Returns pairs + optional solo. */
function pairsFromSorted(sorted: Player[]): { pairs: Player[][]; solo?: Player } {
  const pairs: Player[][] = [];
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    pairs.push([sorted[i], sorted[i + 1]]);
  }
  return { pairs, solo: sorted.length % 2 === 1 ? sorted[sorted.length - 1] : undefined };
}

/**
 * Mixed pairing: form as many 1M+1W pairs as possible (sorted by ranking
 * within each gender), then fall through to same-sex pairs for any leftover.
 */
function mixedPairsFromSorted(players: Player[]): { pairs: Player[][]; solo?: Player } {
  const men   = players.filter(p => p.gender === 'M');
  const women = players.filter(p => p.gender === 'W');
  const numMixed = Math.min(men.length, women.length);
  const pairs: Player[][] = [];
  for (let i = 0; i < numMixed; i++) pairs.push([men[i], women[i]]);

  // Any gender surplus → pair them up, possibly with a solo
  const leftover = [...men.slice(numMixed), ...women.slice(numMixed)];
  const { pairs: extra, solo } = pairsFromSorted(leftover);
  return { pairs: [...pairs, ...extra], solo };
}

/**
 * History-aware greedy pairing within a team.
 * Players are pre-jitter-sorted. For each unpaired player (highest ranked
 * first), choose the partner that minimises repeat-partnership count.
 */
function pairsHistoryAware(players: Player[], h: HistoryMap): { pairs: Player[][]; solo?: Player } {
  const sorted = jitterSort(players);
  const pairs: Player[][] = [];
  const used = new Set<string>();

  for (const first of sorted) {
    if (used.has(first.id)) continue;
    const avail = sorted.filter(p => !used.has(p.id) && p.id !== first.id);
    if (avail.length === 0) break;
    const partner = avail.reduce((best, p) =>
      historyCount(h, first.id, p.id) < historyCount(h, first.id, best.id) ? p : best,
      avail[0],
    );
    pairs.push([first, partner]);
    used.add(first.id);
    used.add(partner.id);
  }

  const solo = sorted.find(p => !used.has(p.id));
  return { pairs, solo };
}

/**
 * History-aware mixed pairing: prefer 1M+1W pairs, then fall through
 * to same-sex history-aware pairing for any gender surplus.
 */
function pairsMixedHistoryAware(players: Player[], h: HistoryMap): { pairs: Player[][]; solo?: Player } {
  const sorted = jitterSort(players);
  const men   = sorted.filter(p => p.gender === 'M');
  const women = sorted.filter(p => p.gender === 'W');
  const numMixed = Math.min(men.length, women.length);
  const pairs: Player[][] = [];
  const usedW = new Set<string>();

  for (let i = 0; i < numMixed; i++) {
    const man = men[i];
    // Choose the unused woman with the lowest partnership history with this man
    const availW = women.filter(w => !usedW.has(w.id));
    const woman = availW.reduce((best, w) =>
      historyCount(h, man.id, w.id) < historyCount(h, man.id, best.id) ? w : best,
      availW[0],
    );
    usedW.add(woman.id);
    pairs.push([man, woman]);
  }

  const leftover = [...men.slice(numMixed), ...women.filter(w => !usedW.has(w.id))];
  const { pairs: extra, solo } = pairsHistoryAware(leftover, h);
  return { pairs: [...pairs, ...extra], solo };
}

// ── Cross-team court assembly ────────────────────────────────────────────────
/**
 * Given team1 pairs and team2 pairs (sorted by avg ranking desc), assemble
 * MNTCourt array: best vs best, 2nd vs 2nd, etc. Add singles court if both
 * teams have a solo player. Unmatched = surplus pairs from the larger side.
 */
function buildCourts(
  t1pairs: Player[][],
  t2pairs: Player[][],
  t1solo: Player | undefined,
  t2solo: Player | undefined,
): { courts: MNTCourt[]; unmatchedTeam1: Player[]; unmatchedTeam2: Player[] } {
  const avgRank = (pair: Player[]) => pair.reduce((s, p) => s + p.ranking, 0) / pair.length;
  const sorted1 = [...t1pairs].sort((a, b) => avgRank(b) - avgRank(a));
  const sorted2 = [...t2pairs].sort((a, b) => avgRank(b) - avgRank(a));

  const courts: MNTCourt[] = [];
  const numDoubles = Math.min(sorted1.length, sorted2.length);
  for (let i = 0; i < numDoubles; i++) {
    courts.push({ id: i + 1, type: 'doubles', team1: sorted1[i], team2: sorted2[i] });
  }

  if (t1solo && t2solo) {
    courts.push({ id: numDoubles + 1, type: 'singles', team1: [t1solo], team2: [t2solo] });
  }

  return {
    courts,
    unmatchedTeam1: [
      ...sorted1.slice(numDoubles).flat(),
      ...(t1solo && !t2solo ? [t1solo] : []),
    ],
    unmatchedTeam2: [
      ...sorted2.slice(numDoubles).flat(),
      ...(t2solo && !t1solo ? [t2solo] : []),
    ],
  };
}

// ── Per-round builders ───────────────────────────────────────────────────────
function roundRanking(t1: Player[], t2: Player[]): MNTRound {
  const { pairs: p1, solo: s1 } = pairsFromSorted(rankSort(t1));
  const { pairs: p2, solo: s2 } = pairsFromSorted(rankSort(t2));
  const { courts, unmatchedTeam1, unmatchedTeam2 } = buildCourts(p1, p2, s1, s2);
  return { courts, unmatchedTeam1, unmatchedTeam2 };
}

function roundMixed(t1: Player[], t2: Player[]): MNTRound {
  const { pairs: p1, solo: s1 } = mixedPairsFromSorted(rankSort(t1));
  const { pairs: p2, solo: s2 } = mixedPairsFromSorted(rankSort(t2));
  const { courts, unmatchedTeam1, unmatchedTeam2 } = buildCourts(p1, p2, s1, s2);
  return { courts, unmatchedTeam1, unmatchedTeam2 };
}

function roundJitter(t1: Player[], t2: Player[]): MNTRound {
  const { pairs: p1, solo: s1 } = pairsFromSorted(jitterSort(t1));
  const { pairs: p2, solo: s2 } = pairsFromSorted(jitterSort(t2));
  const { courts, unmatchedTeam1, unmatchedTeam2 } = buildCourts(p1, p2, s1, s2);
  return { courts, unmatchedTeam1, unmatchedTeam2 };
}

function roundJitterMixed(t1: Player[], t2: Player[]): MNTRound {
  const { pairs: p1, solo: s1 } = mixedPairsFromSorted(jitterSort(t1));
  const { pairs: p2, solo: s2 } = mixedPairsFromSorted(jitterSort(t2));
  const { courts, unmatchedTeam1, unmatchedTeam2 } = buildCourts(p1, p2, s1, s2);
  return { courts, unmatchedTeam1, unmatchedTeam2 };
}

function roundHistory(t1: Player[], t2: Player[], h: HistoryMap): MNTRound {
  const { pairs: p1, solo: s1 } = pairsHistoryAware(t1, h);
  const { pairs: p2, solo: s2 } = pairsHistoryAware(t2, h);
  const { courts, unmatchedTeam1, unmatchedTeam2 } = buildCourts(p1, p2, s1, s2);
  return { courts, unmatchedTeam1, unmatchedTeam2 };
}

function roundHistoryMixed(t1: Player[], t2: Player[], h: HistoryMap): MNTRound {
  const { pairs: p1, solo: s1 } = pairsMixedHistoryAware(t1, h);
  const { pairs: p2, solo: s2 } = pairsMixedHistoryAware(t2, h);
  const { courts, unmatchedTeam1, unmatchedTeam2 } = buildCourts(p1, p2, s1, s2);
  return { courts, unmatchedTeam1, unmatchedTeam2 };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Generate rounds for the given algorithm. For 'ranking'/'mixed' pass numRounds=1. */
export function createMNTRounds(
  team1: Player[],
  team2: Player[],
  numRounds: number,
  algo: string,
): MNTRound[] {
  if (team1.length === 0 || team2.length === 0) return [];

  if (algo === 'ranking') {
    return Array.from({ length: numRounds }, () => roundRanking(team1, team2));
  }
  if (algo === 'mixed') {
    return Array.from({ length: numRounds }, () => roundMixed(team1, team2));
  }
  if (algo === 'multiround') {
    return Array.from({ length: numRounds }, () => roundJitter(team1, team2));
  }
  if (algo === 'multiround-mixed') {
    return Array.from({ length: numRounds }, () => roundJitterMixed(team1, team2));
  }
  if (algo === 'history') {
    const h: HistoryMap = new Map();
    return Array.from({ length: numRounds }, () => {
      const round = roundHistory(team1, team2, h);
      updateHistory(h, round);
      return round;
    });
  }
  if (algo === 'history-mixed') {
    const h: HistoryMap = new Map();
    return Array.from({ length: numRounds }, () => {
      const round = roundHistoryMixed(team1, team2, h);
      updateHistory(h, round);
      return round;
    });
  }
  return [];
}

/** Compute the court layout for manual mode (no player assignments yet). */
export function computeMNTManualLayout(
  t1count: number,
  t2count: number,
): { numDoubles: number; numSingles: number } {
  const usable = Math.min(t1count, t2count);
  return { numDoubles: Math.floor(usable / 2), numSingles: usable % 2 };
}
