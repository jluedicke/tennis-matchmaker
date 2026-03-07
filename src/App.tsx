import { useState, useEffect } from 'react';
import type { Theme, AppMode } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import DoublesApp from './modes/DoublesApp';
import SinglesApp from './modes/SinglesApp';
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo-row">
          {mode !== 'welcome' && (
            <button
              className="back-btn"
              onClick={() => setMode('welcome')}
              aria-label="Back to home"
            >
              ← Back
            </button>
          )}
          <div className="app-logo">
            <span className="logo-icon">🎾</span>
            <h1 className="app-title">Tennis <span>Match Maker</span></h1>
          </div>
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

      {mode === 'welcome'  && <WelcomeScreen onSelectMode={setMode} />}
      {mode === 'doubles'  && <DoublesApp />}
      {mode === 'singles'  && <SinglesApp />}
    </div>
  );
}
