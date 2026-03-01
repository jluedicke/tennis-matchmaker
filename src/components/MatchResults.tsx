import { useState, useRef, useEffect } from 'react';
import type { MatchResult, MatchAlgorithm, ManualAssignment, Player, Court, PlayerPosition } from '../types';
import { toPng } from 'html-to-image';
import './MatchResults.css';

interface Props {
  result: MatchResult | null;
  rounds: MatchResult[] | null;
  numRounds: number;
  algorithm: MatchAlgorithm;
  players: Player[];
  manualAssignment: ManualAssignment;
  onSlotDrop: (slotKey: string, playerId: string) => void;
  onSlotClear: (slotKey: string) => void;
  onSwapPlayers: (posA: PlayerPosition, posB: PlayerPosition) => void;
}

// Map USTA rating to a colour tier 1–7 using the whole-number floor
function rankTier(rating: number): number {
  return Math.min(7, Math.max(1, Math.floor(rating)));
}

function RankingBadge({ ranking }: { ranking: number }) {
  return (
    <span className={`ranking-badge rank-${rankTier(ranking)}`} title={`USTA ${ranking.toFixed(1)}`}>
      {ranking.toFixed(1)}
    </span>
  );
}

// ── Shared court card (auto + multiround + history modes) ──────────────────
interface CourtCardProps {
  court: Court;
  courtIdx: number;
  roundIdx: number;
  selectedPos: PlayerPosition | null;
  onPlayerClick: (pos: PlayerPosition) => void;
}

function CourtCard({ court, courtIdx, roundIdx, selectedPos, onPlayerClick }: CourtCardProps) {
  const ratings = [...court.team1.players, ...court.team2.players].map(p => p.ranking);
  const spread = (Math.max(...ratings) - Math.min(...ratings)).toFixed(1);

  function isSelected(team: 1 | 2, playerIdx: number) {
    return selectedPos?.roundIdx === roundIdx &&
           selectedPos?.courtIdx === courtIdx &&
           selectedPos?.team === team &&
           selectedPos?.playerIdx === playerIdx;
  }

  function renderChip(p: Player, team: 1 | 2, playerIdx: number) {
    const selected = isSelected(team, playerIdx);
    return (
      <div
        key={p.id}
        className={`player-chip chip-swappable${selected ? ' chip-selected' : ''}`}
        onClick={() => onPlayerClick({ roundIdx, courtIdx, team, playerIdx })}
        title={selected ? 'Selected — tap another player to swap' : 'Tap to select, then tap another to swap'}
      >
        <RankingBadge ranking={p.ranking} />
        <span className="chip-name">{p.name}</span>
      </div>
    );
  }

  return (
    <div className="court-card">
      <div className="court-header">Court {court.id}</div>
      <div className="teams">
        <div className="team team-a">
          <div className="team-label">Team A</div>
          {court.team1.players.map((p, pi) => renderChip(p, 1, pi))}
          <div className="team-avg">
            avg {(court.team1.players.reduce((s, p) => s + p.ranking, 0) / 2).toFixed(1)}
          </div>
        </div>

        <div className="vs-divider">vs</div>

        <div className="team team-b">
          <div className="team-label">Team B</div>
          {court.team2.players.map((p, pi) => renderChip(p, 2, pi))}
          <div className="team-avg">
            avg {(court.team2.players.reduce((s, p) => s + p.ranking, 0) / 2).toFixed(1)}
          </div>
        </div>
      </div>
      <div className="court-spread">Court spread: {spread}</div>
    </div>
  );
}

// ── Rounds result list (shared by multiround + history) ────────────────────
interface RoundsListProps {
  rounds: MatchResult[];
  selectedPos: PlayerPosition | null;
  onPlayerClick: (pos: PlayerPosition) => void;
}

function RoundsList({ rounds, selectedPos, onPlayerClick }: RoundsListProps) {
  return (
    <>
      {rounds.map((round, ri) => (
        <div key={ri} className="round-section">
          <div className="round-header">Round {ri + 1}</div>
          <div className="courts-grid">
            {round.courts.map((court, ci) => (
              <CourtCard
                key={court.id}
                court={court}
                courtIdx={ci}
                roundIdx={ri}
                selectedPos={selectedPos}
                onPlayerClick={onPlayerClick}
              />
            ))}
          </div>
          {round.unmatched.length > 0 && (
            <div className="unmatched">
              <strong>Unmatched:</strong>{' '}{round.unmatched.map(p => p.name).join(', ')}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ── Drop slot used in manual mode ──────────────────────────────────────────
interface DropSlotProps {
  slotKey: string;
  player: Player | undefined;
  onDrop: (slotKey: string, playerId: string) => void;
  onClear: (slotKey: string) => void;
}

function DropSlot({ slotKey, player, onDrop, onClear }: DropSlotProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`drop-slot ${player ? 'slot-filled' : 'slot-empty'} ${dragOver ? 'drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData('text/plain');
        if (id) onDrop(slotKey, id);
      }}
    >
      {player ? (
        <>
          <RankingBadge ranking={player.ranking} />
          <span className="chip-name">{player.name}</span>
          <button className="slot-clear-btn" onClick={() => onClear(slotKey)} title="Remove">✕</button>
        </>
      ) : (
        <span className="slot-placeholder">Drop player here</span>
      )}
    </div>
  );
}

// ── Manual court card ──────────────────────────────────────────────────────
// Slot key format: "${roundId}-${courtId}-${teamNum}-${playerIdx}"
interface ManualCourtProps {
  roundId: number;
  courtId: number;
  players: Player[];
  manualAssignment: ManualAssignment;
  onSlotDrop: (slotKey: string, playerId: string) => void;
  onSlotClear: (slotKey: string) => void;
}

function ManualCourt({ roundId, courtId, players, manualAssignment, onSlotDrop, onSlotClear }: ManualCourtProps) {
  const key = (teamNum: number, playerIdx: number) => `${roundId}-${courtId}-${teamNum}-${playerIdx}`;

  function getPlayer(slotKey: string): Player | undefined {
    const id = manualAssignment[slotKey];
    return id ? players.find(p => p.id === id) : undefined;
  }

  const allPlayers = [key(1,0), key(1,1), key(2,0), key(2,1)].map(getPlayer);
  const allFilled = allPlayers.every(Boolean);
  const spread = allFilled
    ? (Math.max(...allPlayers.map(p => p!.ranking)) - Math.min(...allPlayers.map(p => p!.ranking))).toFixed(1)
    : null;

  const p0a = getPlayer(key(1, 0));
  const p1a = getPlayer(key(1, 1));
  const p0b = getPlayer(key(2, 0));
  const p1b = getPlayer(key(2, 1));
  const avgA = p0a && p1a ? ((p0a.ranking + p1a.ranking) / 2).toFixed(1) : null;
  const avgB = p0b && p1b ? ((p0b.ranking + p1b.ranking) / 2).toFixed(1) : null;

  return (
    <div className="court-card">
      <div className="court-header">Court {courtId}</div>
      <div className="teams">
        <div className="team team-a">
          <div className="team-label">Team A</div>
          <DropSlot slotKey={key(1, 0)} player={p0a} onDrop={onSlotDrop} onClear={onSlotClear} />
          <DropSlot slotKey={key(1, 1)} player={p1a} onDrop={onSlotDrop} onClear={onSlotClear} />
          {avgA && <div className="team-avg">avg {avgA}</div>}
        </div>
        <div className="vs-divider">vs</div>
        <div className="team team-b">
          <div className="team-label">Team B</div>
          <DropSlot slotKey={key(2, 0)} player={p0b} onDrop={onSlotDrop} onClear={onSlotClear} />
          <DropSlot slotKey={key(2, 1)} player={p1b} onDrop={onSlotDrop} onClear={onSlotClear} />
          {avgB && <div className="team-avg">avg {avgB}</div>}
        </div>
      </div>
      {spread && <div className="court-spread">Court spread: {spread}</div>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MatchResults({
  result, rounds, numRounds, algorithm, players, manualAssignment, onSlotDrop, onSlotClear, onSwapPlayers,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedPos, setSelectedPos] = useState<PlayerPosition | null>(null);

  // Clear selection whenever a new result is generated
  useEffect(() => { setSelectedPos(null); }, [result, rounds]);

  function handlePlayerClick(pos: PlayerPosition) {
    if (!selectedPos) {
      setSelectedPos(pos);
    } else if (
      selectedPos.roundIdx === pos.roundIdx &&
      selectedPos.courtIdx === pos.courtIdx &&
      selectedPos.team === pos.team &&
      selectedPos.playerIdx === pos.playerIdx
    ) {
      setSelectedPos(null); // tapped the same chip → deselect
    } else {
      onSwapPlayers(selectedPos, pos);
      setSelectedPos(null);
    }
  }

  async function handleExportImage() {
    const card = (sectionRef.current?.closest('.card') ?? sectionRef.current) as HTMLElement | null;
    if (!card) return;
    const dataUrl = await toPng(card, { cacheBust: true });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'match-results.png';
    a.click();
  }

  const exportBtn = (
    <div className="title-actions">
      <button className="icon-btn" title="Export match results as image" onClick={handleExportImage}>⬇</button>
    </div>
  );

  // ── Manual mode ──
  if (algorithm === 'manual') {
    const numCourts = Math.floor(players.length / 4);
    if (numCourts === 0) {
      return (
        <section ref={sectionRef} className="results-section">
          <h2 className="section-title">Match Results{exportBtn}</h2>
          <p className="empty-hint">Add at least 4 players to use manual matching.</p>
        </section>
      );
    }
    const courtIds = Array.from({ length: numCourts }, (_, i) => i + 1);
    const roundIds = Array.from({ length: numRounds }, (_, i) => i + 1);
    return (
      <section ref={sectionRef} className="results-section">
        <h2 className="section-title">
          Match Results <span className="player-count">{numRounds} round{numRounds !== 1 ? 's' : ''}</span>
          {exportBtn}
        </h2>
        {roundIds.map(roundId => (
          <div key={roundId} className="round-section">
            <div className="round-header">Round {roundId}</div>
            <div className="courts-grid">
              {courtIds.map(id => (
                <ManualCourt
                  key={id}
                  roundId={roundId}
                  courtId={id}
                  players={players}
                  manualAssignment={manualAssignment}
                  onSlotDrop={onSlotDrop}
                  onSlotClear={onSlotClear}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    );
  }

  // ── Multiround + history modes ──
  if (algorithm === 'multiround' || algorithm === 'multiround-mixed' || algorithm === 'history' || algorithm === 'history-mixed') {
    if (!rounds || rounds.length === 0) {
      return (
        <section ref={sectionRef} className="results-section">
          <h2 className="section-title">Match Results{exportBtn}</h2>
          <p className="empty-hint">Set the number of rounds above and press <strong>Match</strong> to generate.</p>
        </section>
      );
    }
    return (
      <section ref={sectionRef} className="results-section">
        <h2 className="section-title">
          Match Results <span className="player-count">{rounds.length} round{rounds.length !== 1 ? 's' : ''}</span>
          {exportBtn}
        </h2>
        <RoundsList rounds={rounds} selectedPos={selectedPos} onPlayerClick={handlePlayerClick} />
      </section>
    );
  }

  // ── Automatic mode ──
  if (!result) {
    return (
      <section ref={sectionRef} className="results-section">
        <h2 className="section-title">Match Results{exportBtn}</h2>
        <p className="empty-hint">Add at least 4 players and press <strong>Match</strong> to generate pairings.</p>
      </section>
    );
  }

  const { courts, unmatched } = result;

  return (
    <section ref={sectionRef} className="results-section">
      <h2 className="section-title">
        Match Results <span className="player-count">{courts.length} court{courts.length !== 1 ? 's' : ''}</span>
        {exportBtn}
      </h2>

      <div className="courts-grid">
        {courts.map((court, ci) => (
          <CourtCard
            key={court.id}
            court={court}
            courtIdx={ci}
            roundIdx={0}
            selectedPos={selectedPos}
            onPlayerClick={handlePlayerClick}
          />
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
