import type { CourtDef, TeamFormat } from '../types';

export const FORMAT_COURTS: Record<TeamFormat, CourtDef[]> = {
  'usta-league': [
    { id: 1, label: 'Singles 1',  type: 'singles' },
    { id: 2, label: 'Singles 2',  type: 'singles' },
    { id: 3, label: 'Doubles 1',  type: 'doubles' },
    { id: 4, label: 'Doubles 2',  type: 'doubles' },
    { id: 5, label: 'Doubles 3',  type: 'doubles' },
  ],

  'usta-mixed': [
    { id: 1, label: 'Mixed Doubles 1', type: 'doubles' },
    { id: 2, label: 'Mixed Doubles 2', type: 'doubles' },
    { id: 3, label: 'Mixed Doubles 3', type: 'doubles' },
  ],

  'davis-cup': [
    { id: 1, label: 'Singles 1', type: 'singles' },
    { id: 2, label: 'Singles 2', type: 'singles' },
    { id: 3, label: 'Doubles',   type: 'doubles' },
    // Courts 4 & 5 are auto-derived from courts 1 & 2 (rubber day 3 reverse)
    // Court 4 t1 = court1 t1;  court 4 t2 = court2 t2
    // Court 5 t1 = court2 t1;  court 5 t2 = court1 t2
    { id: 4, label: 'Singles 3 (auto)', type: 'singles', auto: true },
    { id: 5, label: 'Singles 4 (auto)', type: 'singles', auto: true },
  ],

  'world-team-tennis': [
    { id: 1, label: "Men's Singles",    type: 'singles', genderLabel: 'M' },
    { id: 2, label: "Women's Singles",  type: 'singles', genderLabel: 'W' },
    { id: 3, label: "Men's Doubles",    type: 'doubles', genderLabel: 'M' },
    { id: 4, label: "Women's Doubles",  type: 'doubles', genderLabel: 'W' },
    { id: 5, label: 'Mixed Doubles',    type: 'doubles', genderLabel: 'Mixed' },
  ],

  'monday-night': [], // courts are computed dynamically from player counts

  'college': [
    { id: 1, label: 'Doubles 1', type: 'doubles' },
    { id: 2, label: 'Doubles 2', type: 'doubles' },
    { id: 3, label: 'Doubles 3', type: 'doubles' },
    { id: 4, label: 'Singles 1', type: 'singles' },
    { id: 5, label: 'Singles 2', type: 'singles' },
    { id: 6, label: 'Singles 3', type: 'singles' },
    { id: 7, label: 'Singles 4', type: 'singles' },
    { id: 8, label: 'Singles 5', type: 'singles' },
    { id: 9, label: 'Singles 6', type: 'singles' },
  ],
};

export const FORMAT_LABELS: Record<TeamFormat, string> = {
  'usta-league':       'USTA League (2S + 3D)',
  'usta-mixed':        'USTA Mixed Doubles (3 Mixed D)',
  'davis-cup':         'Davis Cup (2S + D + 2 auto S)',
  'world-team-tennis': 'World Team Tennis',
  'college':           'College Tennis (3D + 6S)',
  'monday-night':      'Monday Night Tennis',
};
