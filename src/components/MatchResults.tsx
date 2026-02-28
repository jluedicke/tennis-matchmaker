import type { MatchResult } from '../types';
import './MatchResults.css';

interface Props {
  result: MatchResult | null;
}

const RANKING_LABELS: Record<number, string> = {
  1: 'Beginner', 2: 'Novice', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert', 6: 'Pro',
};

function RankingBadge({ ranking }: { ranking: number }) {
  return (
    <span className={`ranking-badge rank-${ranking}`} title={RANKING_LABELS[ranking]}>
      {ranking}
    </span>
  );
}

export default function MatchResults({ result }: Props) {
  if (!result) {
    return (
      <section className="results-section">
        <h2 className="section-title">Match Results</h2>
        <p className="empty-hint">Add at least 4 players and press <strong>Match</strong> to generate pairings.</p>
      </section>
    );
  }

  const { courts, unmatched } = result;

  return (
    <section className="results-section">
      <h2 className="section-title">
        Match Results <span className="player-count">{courts.length} court{courts.length !== 1 ? 's' : ''}</span>
      </h2>

      <div className="courts-grid">
        {courts.map(court => (
          <div key={court.id} className="court-card">
            <div className="court-header">Court {court.id}</div>

            <div className="teams">
              <div className="team team-a">
                <div className="team-label">Team A</div>
                {court.team1.players.map(p => (
                  <div key={p.id} className="player-chip">
                    <RankingBadge ranking={p.ranking} />
                    <span className="chip-name">{p.name}</span>
                  </div>
                ))}
                <div className="team-avg">
                  avg {(court.team1.players.reduce((s, p) => s + p.ranking, 0) / 2).toFixed(1)}
                </div>
              </div>

              <div className="vs-divider">vs</div>

              <div className="team team-b">
                <div className="team-label">Team B</div>
                {court.team2.players.map(p => (
                  <div key={p.id} className="player-chip">
                    <RankingBadge ranking={p.ranking} />
                    <span className="chip-name">{p.name}</span>
                  </div>
                ))}
                <div className="team-avg">
                  avg {(court.team2.players.reduce((s, p) => s + p.ranking, 0) / 2).toFixed(1)}
                </div>
              </div>
            </div>

            <div className="court-spread">
              Court spread: {
                Math.max(...[...court.team1.players, ...court.team2.players].map(p => p.ranking)) -
                Math.min(...[...court.team1.players, ...court.team2.players].map(p => p.ranking))
              }
            </div>
          </div>
        ))}
      </div>

      {unmatched.length > 0 && (
        <div className="unmatched">
          <strong>Unmatched players:</strong>{' '}
          {unmatched.map(p => p.name).join(', ')}
        </div>
      )}
    </section>
  );
}
