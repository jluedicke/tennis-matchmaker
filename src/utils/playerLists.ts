import type { SavedPlayerList } from '../types';

const KEY = 'tennis-matchmaker-saved-lists';

export function loadSavedLists(): SavedPlayerList[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSavedLists(lists: SavedPlayerList[]): void {
  localStorage.setItem(KEY, JSON.stringify(lists));
}
