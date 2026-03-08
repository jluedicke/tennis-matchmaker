import { useState, useRef, useEffect } from 'react';
import type { SinglesResult, MatchAlgorithm, ManualAssignment, Player, SinglesCourt, SinglesPlayerPosition } from '../types';
import { toPng } from 'html-to-image';
import './MatchResults.css';
import './SinglesMatchResults.css';

interface Props {
  result: SinglesResult | null;
  rounds: SinglesResult[] | null;
  numRounds: number;
  algorithm: MatchAlgorithm;
  players: Player[];
  manualAssignment: ManualAssignment;
  onSlotDrop: (slotKey: string, playerId: string) => void;
  onSlotClear: (slotKey: string) => void;
  onSwapPlayers: (posA: SinglesPlayerPosition, posB: SinglesPlayerPosition) => void;
}

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

// ── Singles court card (auto + multiround modes) ────────────────────────────
interface SinglesCourtCardProps {
  court: SinglesCourt;
  courtIdx: number;
  roundIdx: number;
  selectedPos: SinglesPlayerPosition | null;
  onPlayerClick: (pos: SinglesPlayerPosition) => void;
}

function SinglesCourtCard({ court, courtIdx, roundIdx, selectedPos, onPlayerClick }: SinglesCourtCardProps) {
  const spread = Math.abs(court.player1.ranking - court.player2.ranking).toFixed(1);

  function isSelected(playerNum: 1 | 2) {
    return selectedPos?.roundIdx === roundIdx &&
           selectedPos?.courtIdx === courtIdx &&
           selectedPos?.playerNum === playerNum;
  }

  function renderChip(p: Player, playerNum: 1 | 2) {
    const selected = isSelected(playerNum);
    return (
      <div
        key={p.id}
        className={`player-chip chip-swappable${selected ? ' chip-selected' : ''}`}
        onClick={() => onPlayerClick({ roundIdx, courtIdx, playerNum })}
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
      <div className="singles-matchup">
        {renderChip(court.player1, 1)}
        <div className="singles-vs">vs</div>
        {renderChip(court.player2, 2)}
      </div>
      <div className="court-spread">Spread: {spread}</div>
    </div>
  );
}

// ── Rounds list (shared by multiround + history modes) ──────────────────────
interface SinglesRoundsListProps {
  rounds: SinglesResult[];
  selectedPos: SinglesPlayerPosition | null;
  onPlayerClick: (pos: SinglesPlayerPosition) => void;
}

function SinglesRoundsList({ rounds, selectedPos, onPlayerClick }: SinglesRoundsListProps) {
  return (
    <>
      {rounds.map((round, ri) => (
        <div key={ri} className="round-section">
          <div className="round-header">Round {ri + 1}</div>
          <div className="courts-grid">
            {round.courts.map((court, ci) => (
              <SinglesCourtCard
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

// ── Drop slot (manual mode) ─────────────────────────────────────────────────
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

// ── Manual court card ───────────────────────────────────────────────────────
// Slot key format: "${roundId}-${courtId}-${playerNum}"
interface ManualCourtProps {
  roundId: number;
  courtId: number;
  players: Player[];
  manualAssignment: ManualAssignment;
  onSlotDrop: (slotKey: string, playerId: string) => void;
  onSlotClear: (slotKey: string) => void;
}

function ManualCourt({ roundId, courtId, players, manualAssignment, onSlotDrop, onSlotClear }: ManualCourtProps) {
  const key1 = `${roundId}-${courtId}-1`;
  const key2 = `${roundId}-${courtId}-2`;
  const p1 = manualAssignment[key1] ? players.find(p => p.id === manualAssignment[key1]) : undefined;
  const p2 = manualAssignment[key2] ? players.find(p => p.id === manualAssignment[key2]) : undefined;
  const spread = p1 && p2 ? Math.abs(p1.ranking - p2.ranking).toFixed(1) : null;

  return (
    <div className="court-card">
      <div className="court-header">Court {courtId}</div>
      <div className="singles-matchup singles-matchup-manual">
        <DropSlot slotKey={key1} player={p1} onDrop={onSlotDrop} onClear={onSlotClear} />
        <div className="singles-vs">vs</div>
        <DropSlot slotKey={key2} player={p2} onDrop={onSlotDrop} onClear={onSlotClear} />
      </div>
      {spread && <div className="court-spread">Spread: {spread}</div>}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function SinglesMatchResults({
  result, rounds, numRounds, algorithm, players, manualAssignment, onSlotDrop, onSlotClear, onSwapPlayers,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedPos, setSelectedPos] = useState<SinglesPlayerPosition | null>(null);

  useEffect(() => { setSelectedPos(null); }, [result, rounds]);

  function handlePlayerClick(pos: SinglesPlayerPosition) {
    if (!selectedPos) {
      setSelectedPos(pos);
    } else if (
      selectedPos.roundIdx === pos.roundIdx &&
      selectedPos.courtIdx === pos.courtIdx &&
      selectedPos.playerNum === pos.playerNum
    ) {
      setSelectedPos(null);
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
    const numCourts = Math.floor(players.length / 2);
    if (numCourts === 0) {
      return (
        <section ref={sectionRef} className="results-section">
          <h2 className="section-title">Match Results{exportBtn}</h2>
          <p className="empty-hint">Add at least 2 players to use manual matching.</p>
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
  if (algorithm === 'multiround' || algorithm === 'multiround-mixed' || algorithm === 'multiround-same-gender' || algorithm === 'history' || algorithm === 'history-mixed' || algorithm === 'history-same-gender') {
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
        <SinglesRoundsList rounds={rounds} selectedPos={selectedPos} onPlayerClick={handlePlayerClick} />
      </section>
    );
  }

  // ── Automatic mode ──
  if (!result) {
    return (
      <section ref={sectionRef} className="results-section">
        <h2 className="section-title">Match Results{exportBtn}</h2>
        <p className="empty-hint">Add at least 2 players and press <strong>Match</strong> to generate pairings.</p>
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
          <SinglesCourtCard
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
