export interface Player {
  id: string;
  name: string;
  ranking: number; // USTA rating: 1.5 – 7.0, in 0.5 steps
  gender: 'M' | 'W';
}

export interface Team {
  players: [Player, Player];
}

export interface Court {
  id: number;
  team1: Team;
  team2: Team;
}

export interface MatchResult {
  courts: Court[];
  unmatched: Player[]; // players left over when count is not divisible by 4
}

export interface SinglesCourt {
  id: number;
  player1: Player;
  player2: Player;
}

export interface SinglesResult {
  courts: SinglesCourt[];
  unmatched: Player[];
}

export interface SinglesPlayerPosition {
  roundIdx: number;
  courtIdx: number;
  playerNum: 1 | 2;
}

export type Theme = 'dark' | 'light';

export type AppMode = 'welcome' | 'singles' | 'doubles' | 'team' | 'tournament';

export type MatchAlgorithm = 'ranking' | 'mixed' | 'same-gender' | 'manual' | 'multiround' | 'multiround-mixed' | 'multiround-same-gender' | 'history' | 'history-mixed' | 'history-same-gender';

/** slotKey → playerId  (key format: "${courtId}-${teamNum}-${playerIdx}") */
export type ManualAssignment = Record<string, string>;

/** Identifies a single player slot within an auto-generated result */
export interface PlayerPosition {
  roundIdx:  number;   // 0 for single-round results
  courtIdx:  number;   // 0-based index into courts array
  team:      1 | 2;
  playerIdx: number;   // 0 or 1
}
