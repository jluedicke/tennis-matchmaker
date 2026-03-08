export interface SavedPlayerList {
  id: string;
  name: string;
  players: Player[];
  createdAt: number;
}

export interface ListPanelControl {
  openForSelection: (onLoad: (players: Player[]) => void, onAdd: (players: Player[]) => void) => void;
  openForSave: (players: Player[]) => void;
}

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

export type TeamFormat = 'usta-league' | 'usta-mixed' | 'davis-cup' | 'world-team-tennis' | 'college' | 'monday-night';

export type MNTAlgorithm = 'ranking' | 'mixed' | 'multiround' | 'multiround-mixed' | 'history' | 'history-mixed' | 'manual';

export interface MNTCourt {
  id: number;
  type: 'singles' | 'doubles';
  team1: Player[]; // 1 player for singles, 2 for doubles
  team2: Player[]; // 1 player for singles, 2 for doubles
}

export interface MNTRound {
  courts: MNTCourt[];
  unmatchedTeam1: Player[];
  unmatchedTeam2: Player[];
}

export interface MNTPlayerPosition {
  roundIdx:  number;  // 0 for single-round (mntResult)
  courtIdx:  number;  // 0-based index into round.courts
  teamNum:   1 | 2;
  playerIdx: number;  // 0 or 1 for doubles; always 0 for singles
}

export interface CourtDef {
  id: number;
  label: string;
  type: 'singles' | 'doubles';
  auto?: boolean;       // read-only, auto-derived (Davis Cup courts 4 & 5)
  genderLabel?: string; // display hint for WTT courts (M / W / Mixed)
}

/** slotKey → playerId  (key format: "${courtId}-t${1|2}-${slotIdx}") */
export type TeamAssignment = Record<string, string>;

/** Identifies a single player slot within an auto-generated result */
export interface PlayerPosition {
  roundIdx:  number;   // 0 for single-round results
  courtIdx:  number;   // 0-based index into courts array
  team:      1 | 2;
  playerIdx: number;   // 0 or 1
}
