export interface Player {
  id: string;
  name: string;
  ranking: number; // 1–6, where 1 = beginner, 6 = pro
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

export type Theme = 'dark' | 'light';
