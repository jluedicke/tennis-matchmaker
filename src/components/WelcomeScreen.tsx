import type { AppMode } from '../types';
import './WelcomeScreen.css';

interface Props {
  onSelectMode: (mode: AppMode) => void;
}

export default function WelcomeScreen({ onSelectMode }: Props) {
  return (
    <div className="welcome-screen">
      <p className="welcome-tagline">Choose your match format to get started.</p>
      <div className="mode-grid">

        <button className="mode-btn" onClick={() => onSelectMode('singles')}>
          <span className="mode-icon">👤</span>
          <span className="mode-label">Singles</span>
          <span className="mode-desc">1 vs 1 matches</span>
        </button>

        <button className="mode-btn" onClick={() => onSelectMode('doubles')}>
          <span className="mode-icon">👥</span>
          <span className="mode-label">Doubles</span>
          <span className="mode-desc">2 vs 2 matches</span>
        </button>

        <button className="mode-btn mode-btn-soon" disabled>
          <span className="mode-icon">🏅</span>
          <span className="mode-label">Team</span>
          <span className="mode-soon-badge">Coming soon</span>
        </button>

        <button className="mode-btn mode-btn-soon" disabled>
          <span className="mode-icon">🏆</span>
          <span className="mode-label">Tournament</span>
          <span className="mode-soon-badge">Coming soon</span>
        </button>

      </div>
    </div>
  );
}
