import { useState, useEffect, useRef } from 'react';
import type { Theme, AppMode, Player, ListPanelControl } from './types';

const MODE_LABELS: Partial<Record<AppMode, string>> = {
  singles: 'Singles',
  doubles: 'Doubles',
  team:    'Team',
};
import WelcomeScreen from './components/WelcomeScreen';
import DoublesApp from './modes/DoublesApp';
import SinglesApp from './modes/SinglesApp';
import TeamApp from './modes/TeamApp';
import PlayerListsPanel from './components/PlayerListsPanel';
import HelpModal from './components/HelpModal';
import SinglesHelpModal from './components/SinglesHelpModal';
import TeamHelpModal from './components/TeamHelpModal';
import './App.css';

const THEME_KEY = 'tennis-matchmaker-theme';

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('welcome');
  const [theme, setTheme] = useState<Theme>(loadTheme);

  const [showHelp, setShowHelp] = useState(false);

  // Player lists panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'manage' | 'select' | 'save'>('manage');
  const [panelSavePlayers, setPanelSavePlayers] = useState<Player[]>([]);
  const panelCallbacks = useRef<{
    onLoad?: (ps: Player[]) => void;
    onAdd?: (ps: Player[]) => void;
  }>({});

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => { setShowHelp(false); }, [mode]);

  function openForSelection(onLoad: (ps: Player[]) => void, onAdd: (ps: Player[]) => void) {
    panelCallbacks.current = { onLoad, onAdd };
    setPanelMode('select');
    setPanelOpen(true);
  }

  function openForSave(players: Player[]) {
    setPanelSavePlayers(players);
    setPanelMode('save');
    setPanelOpen(true);
  }

  const listPanelControl: ListPanelControl = { openForSelection, openForSave };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          {mode !== 'welcome' && (
            <button
              className="back-btn"
              onClick={() => setMode('welcome')}
              aria-label="Back to home"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="app-logo">
          <div className="app-logo-main">
            <span className="logo-icon" aria-hidden="true">T</span>
            <h1 className="app-title">Tennis <span>Match Maker</span></h1>
          </div>
          {MODE_LABELS[mode] && <span className="app-mode-label">{MODE_LABELS[mode]}</span>}
        </div>
        <div className="header-controls">
          {mode !== 'welcome' && (
            <button
              className="icon-btn"
              onClick={() => setShowHelp(true)}
              title="Quick guide"
              aria-label="Quick guide"
            >
              ?
            </button>
          )}
          <button
            className="icon-btn"
            onClick={() => { setPanelMode('manage'); setPanelOpen(true); }}
            title="Manage player lists"
            aria-label="Manage player lists"
          >
            ☰
          </button>
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

      {showHelp && mode === 'doubles' && <HelpModal onClose={() => setShowHelp(false)} />}
      {showHelp && mode === 'singles' && <SinglesHelpModal onClose={() => setShowHelp(false)} />}
      {showHelp && mode === 'team'    && <TeamHelpModal onClose={() => setShowHelp(false)} />}

      <PlayerListsPanel
        open={panelOpen}
        mode={panelMode}
        savePlayers={panelSavePlayers}
        onLoadAll={ps => panelCallbacks.current.onLoad?.(ps)}
        onAddSelected={ps => panelCallbacks.current.onAdd?.(ps)}
        onClose={() => setPanelOpen(false)}
      />

      {mode === 'welcome'  && <WelcomeScreen onSelectMode={setMode} />}
      {mode === 'doubles'  && <DoublesApp listPanel={listPanelControl} />}
      {mode === 'singles'  && <SinglesApp listPanel={listPanelControl} />}
      {mode === 'team'     && <TeamApp listPanel={listPanelControl} />}
    </div>
  );
}
