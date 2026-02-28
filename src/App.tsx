import { useState, useEffect } from 'react';
import PlayerList from './components/PlayerList';
import MatchResults from './components/MatchResults';
import type { Player, MatchResult, Theme } from './types';
import { createMatches } from './utils/matchmaking';
import './App.css';

const STORAGE_KEY = 'tennis-matchmaker-players';
const THEME_KEY   = 'tennis-matchmaker-theme';

function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultPlayers();
  } catch {
    return defaultPlayers();
  }
}

function defaultPlayers(): Player[] {
  return [
    { id: crypto.randomUUID(), name: 'Alice',   ranking: 5 },
    { id: crypto.randomUUID(), name: 'Bob',     ranking: 3 },
    { id: crypto.randomUUID(), name: 'Carol',   ranking: 4 },
    { id: crypto.randomUUID(), name: 'Dave',    ranking: 2 },
    { id: crypto.randomUUID(), name: 'Eve',     ranking: 6 },
    { id: crypto.randomUUID(), name: 'Frank',   ranking: 1 },
    { id: crypto.randomUUID(), name: 'Grace',   ranking: 4 },
    { id: crypto.randomUUID(), name: 'Hank',    ranking: 3 },
    { id: crypto.randomUUID(), name: 'Iris',    ranking: 5 },
    { id: crypto.randomUUID(), name: 'Jack',    ranking: 2 },
    { id: crypto.randomUUID(), name: 'Karen',   ranking: 3 },
    { id: crypto.randomUUID(), name: 'Leo',     ranking: 6 },
    { id: crypto.randomUUID(), name: 'Mia',     ranking: 4 },
    { id: crypto.randomUUID(), name: 'Nate',    ranking: 1 },
    { id: crypto.randomUUID(), name: 'Olivia',  ranking: 5 },
    { id: crypto.randomUUID(), name: 'Pete',    ranking: 3 },
  ];
}

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [players, setPlayers]     = useState<Player[]>(loadPlayers);
  const [result, setResult]       = useState<MatchResult | null>(null);
  const [theme, setTheme]         = useState<Theme>(loadTheme);

  // Persist players
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    // Changing the player list invalidates the current match result
    setResult(null);
  }, [players]);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function handleMatch() {
    if (players.length < 4) return;
    setResult(createMatches(players));
  }

  const canMatch = players.length >= 4;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">🎾</span>
          <h1 className="app-title">Tennis <span>Match Maker</span></h1>
        </div>
        <div className="header-controls">
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="match-bar">
        <button
          className="btn-match"
          onClick={handleMatch}
          disabled={!canMatch}
          title={canMatch ? 'Generate matches' : 'Need at least 4 players'}
        >
          ⚡ Match
        </button>
      </div>

      <div className="dashboard">
        <div className="card">
          <PlayerList players={players} onChange={setPlayers} />
        </div>
        <div className="card">
          <MatchResults result={result} />
        </div>
      </div>
    </div>
  );
}
