import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import type { Player, MNTAlgorithm, MNTRound, MNTPlayerPosition, TeamAssignment } from '../types';
import { computeMNTManualLayout } from '../utils/mondayNightMatchmaking';
import './MatchResults.css';
import './MondayNightResults.css';

interface Props {
  mntAlgorithm: MNTAlgorithm;
  numRounds: number;
  team1Name: string;
  team2Name: string;
  team1Players: Player[];
  team2Players: Player[];
  mntResult: MNTRound | null;
  mntRounds: MNTRound[] | null;
  teamAssignment: TeamAssignment;
  onSlotDrop: (slotKey: string, playerId: string) => void;
  onSlotClear: (slotKey: string) => void;
  onSwapPlayers: (posA: MNTPlayerPosition, posB: MNTPlayerPosition) => void;
}

// ── Shared ranking badge ─────────────────────────────────────────────────────
function rankTier(r: number) { return Math.min(7, Math.max(1, Math.floor(r))); }

function RankingBadge({ ranking }: { ranking: number }) {
  return (
    <span className={`ranking-badge rank-${rankTier(ranking)}`} title={`USTA ${ranking.toFixed(1)}`}>
      {ranking.toFixed(1)}
    </span>
  );
}

// ── Drop slot with cross-team validation (manual mode) ───────────────────────
interface DropSlotProps {
  slotKey: string;
  player: Player | undefined;
  teamNum: 1 | 2;
  team1Ids: Set<string>;
  team2Ids: Set<string>;
  onDrop: (slotKey: string, playerId: string) => void;
  onClear: (slotKey: string) => void;
}

function MNTDropSlot({ slotKey, player, teamNum, team1Ids, team2Ids, onDrop, onClear }: DropSlotProps) {
  const [dragOver, setDragOver] = useState(false);
  const [invalid, setInvalid] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const playerId = e.dataTransfer.getData('text/plain');
    if (!playerId) return;
    const inTeam1 = team1Ids.has(playerId);
    const inTeam2 = team2Ids.has(playerId);
    if (inTeam1 || inTeam2) {
      const correctTeam = inTeam1 ? 1 : 2;
      if (correctTeam !== teamNum) {
        setInvalid(true);
        setTimeout(() => setInvalid(false), 600);
        return;
      }
    }
    onDrop(slotKey, playerId);
  }

  return (
    <div
      className={`drop-slot ${player ? 'slot-filled' : 'slot-empty'} ${dragOver ? 'drag-over' : ''} ${invalid ? 'slot-invalid' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
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

// ── Swappable player chip (algorithmic mode) ─────────────────────────────────
interface SwappableChipProps {
  player: Player;
  pos: MNTPlayerPosition;
  selectedPos: MNTPlayerPosition | null;
  onPlayerClick: (pos: MNTPlayerPosition) => void;
}

function posMatch(a: MNTPlayerPosition, b: MNTPlayerPosition) {
  return a.roundIdx === b.roundIdx && a.courtIdx === b.courtIdx
    && a.teamNum === b.teamNum && a.playerIdx === b.playerIdx;
}

function SwappableChip({ player, pos, selectedPos, onPlayerClick }: SwappableChipProps) {
  const isSelected = selectedPos !== null && posMatch(selectedPos, pos);
  const canSwap = selectedPos !== null && !isSelected
    && selectedPos.roundIdx === pos.roundIdx
    && selectedPos.teamNum === pos.teamNum;

  const title = isSelected
    ? 'Selected — tap another player from the same team to swap'
    : canSwap
    ? 'Tap to swap with selected player'
    : 'Tap to select, then tap another from the same team to swap';

  return (
    <div
      className={`player-chip chip-swappable${isSelected ? ' chip-selected' : ''}`}
      onClick={() => onPlayerClick(pos)}
      title={title}
    >
      <RankingBadge ranking={player.ranking} />
      <span className="chip-name">{player.name}</span>
    </div>
  );
}

// ── Team section inside a court card ────────────────────────────────────────
interface TeamSectionProps {
  label: string;
  isTop: boolean;
  players: Player[];
  // Algo mode extras
  roundIdx?: number;
  courtIdx?: number;
  teamNum?: 1 | 2;
  selectedPos?: MNTPlayerPosition | null;
  onPlayerClick?: (pos: MNTPlayerPosition) => void;
  // Manual mode
  manual?: true;
  slotKeys?: string[];
  team1Ids?: Set<string>;
  team2Ids?: Set<string>;
  teamAssignment?: TeamAssignment;
  allPlayers?: Player[];
  onDrop?: (slotKey: string, playerId: string) => void;
  onClear?: (slotKey: string) => void;
}

function TeamSection({
  label, isTop, players,
  roundIdx, courtIdx, teamNum, selectedPos, onPlayerClick,
  manual, slotKeys, team1Ids, team2Ids, teamAssignment, allPlayers, onDrop, onClear,
}: TeamSectionProps) {
  const sectionClass = `mnt-slot-section${isTop ? ' mnt-slot-section-a' : ''}`;
  return (
    <div className={sectionClass}>
      <div className="mnt-slot-label">{label}</div>
      {manual && slotKeys ? (
        slotKeys.map(key => {
          const pid = teamAssignment![key];
          const p = pid ? allPlayers!.find(x => x.id === pid) : undefined;
          return (
            <MNTDropSlot key={key} slotKey={key} player={p} teamNum={teamNum!}
              team1Ids={team1Ids!} team2Ids={team2Ids!} onDrop={onDrop!} onClear={onClear!} />
          );
        })
      ) : (
        players.map((p, pi) => (
          <SwappableChip
            key={p.id}
            player={p}
            pos={{ roundIdx: roundIdx!, courtIdx: courtIdx!, teamNum: teamNum!, playerIdx: pi }}
            selectedPos={selectedPos ?? null}
            onPlayerClick={onPlayerClick!}
          />
        ))
      )}
    </div>
  );
}

// ── Algorithmic court card ───────────────────────────────────────────────────
interface AlgoCourtCardProps {
  court: MNTCourt;
  courtIdx: number;
  roundIdx: number;
  team1Name: string;
  team2Name: string;
  selectedPos: MNTPlayerPosition | null;
  onPlayerClick: (pos: MNTPlayerPosition) => void;
}

type MNTCourt = MNTRound['courts'][0];

function AlgoCourtCard({ court, courtIdx, roundIdx, team1Name, team2Name, selectedPos, onPlayerClick }: AlgoCourtCardProps) {
  return (
    <div className="court-card">
      <div className="court-header">
        Court {court.id} — {court.type === 'doubles' ? 'Doubles' : 'Singles'}
      </div>
      <div className="mnt-court-body">
        <TeamSection
          label={team1Name} isTop={true} players={court.team1}
          roundIdx={roundIdx} courtIdx={courtIdx} teamNum={1}
          selectedPos={selectedPos} onPlayerClick={onPlayerClick}
        />
        <div className="mnt-court-vs">vs</div>
        <TeamSection
          label={team2Name} isTop={false} players={court.team2}
          roundIdx={roundIdx} courtIdx={courtIdx} teamNum={2}
          selectedPos={selectedPos} onPlayerClick={onPlayerClick}
        />
      </div>
    </div>
  );
}

// ── Manual court card ────────────────────────────────────────────────────────
interface ManualCourtCardProps {
  roundId: number;
  courtId: number;
  courtType: 'singles' | 'doubles';
  team1Name: string;
  team2Name: string;
  team1Players: Player[];
  team2Players: Player[];
  teamAssignment: TeamAssignment;
  onSlotDrop: (slotKey: string, playerId: string) => void;
  onSlotClear: (slotKey: string) => void;
}

function ManualCourtCard({ roundId, courtId, courtType, team1Name, team2Name, team1Players, team2Players, teamAssignment, onSlotDrop, onSlotClear }: ManualCourtCardProps) {
  const slots = courtType === 'doubles' ? [1, 2] : [1];
  const team1Keys = slots.map(s => `${roundId}-${courtId}-t1-${s}`);
  const team2Keys = slots.map(s => `${roundId}-${courtId}-t2-${s}`);
  const team1Ids = new Set(team1Players.map(p => p.id));
  const team2Ids = new Set(team2Players.map(p => p.id));
  const allPlayers = [...team1Players, ...team2Players];

  return (
    <div className="court-card">
      <div className="court-header">
        Court {courtId} — {courtType === 'doubles' ? 'Doubles' : 'Singles'}
      </div>
      <div className="mnt-court-body">
        <TeamSection label={team1Name} isTop={true} players={[]}
          manual slotKeys={team1Keys} teamNum={1}
          team1Ids={team1Ids} team2Ids={team2Ids}
          teamAssignment={teamAssignment} allPlayers={allPlayers}
          onDrop={onSlotDrop} onClear={onSlotClear} />
        <div className="mnt-court-vs">vs</div>
        <TeamSection label={team2Name} isTop={false} players={[]}
          manual slotKeys={team2Keys} teamNum={2}
          team1Ids={team1Ids} team2Ids={team2Ids}
          teamAssignment={teamAssignment} allPlayers={allPlayers}
          onDrop={onSlotDrop} onClear={onSlotClear} />
      </div>
    </div>
  );
}

// ── One round's courts (algo mode) ───────────────────────────────────────────
interface AlgoRoundProps {
  round: MNTRound;
  roundIdx: number;
  team1Name: string;
  team2Name: string;
  selectedPos: MNTPlayerPosition | null;
  onPlayerClick: (pos: MNTPlayerPosition) => void;
}

function AlgoRound({ round, roundIdx, team1Name, team2Name, selectedPos, onPlayerClick }: AlgoRoundProps) {
  return (
    <>
      <div className="courts-grid">
        {round.courts.map((court, ci) => (
          <AlgoCourtCard
            key={court.id}
            court={court}
            courtIdx={ci}
            roundIdx={roundIdx}
            team1Name={team1Name}
            team2Name={team2Name}
            selectedPos={selectedPos}
            onPlayerClick={onPlayerClick}
          />
        ))}
      </div>
      {(round.unmatchedTeam1.length > 0 || round.unmatchedTeam2.length > 0) && (
        <div className="unmatched">
          <strong>Unmatched:</strong>{' '}
          {[...round.unmatchedTeam1, ...round.unmatchedTeam2].map(p => p.name).join(', ')}
        </div>
      )}
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MondayNightResults({
  mntAlgorithm, numRounds,
  team1Name, team2Name, team1Players, team2Players,
  mntResult, mntRounds,
  teamAssignment, onSlotDrop, onSlotClear, onSwapPlayers,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedPos, setSelectedPos] = useState<MNTPlayerPosition | null>(null);

  // Reset selection whenever results change
  useEffect(() => { setSelectedPos(null); }, [mntResult, mntRounds]);

  function handlePlayerClick(pos: MNTPlayerPosition) {
    if (!selectedPos) { setSelectedPos(pos); return; }
    if (posMatch(selectedPos, pos)) { setSelectedPos(null); return; }
    // Different round or different team: re-select
    if (selectedPos.roundIdx !== pos.roundIdx || selectedPos.teamNum !== pos.teamNum) {
      setSelectedPos(pos);
      return;
    }
    // Same round, same team: swap
    onSwapPlayers(selectedPos, pos);
    setSelectedPos(null);
  }

  async function handleExport() {
    const card = (sectionRef.current?.closest('.card') ?? sectionRef.current) as HTMLElement | null;
    if (!card) return;
    const dataUrl = await toPng(card, { cacheBust: true });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'mnt-results.png';
    a.click();
  }

  const exportBtn = (
    <div className="title-actions">
      <button className="icon-btn" title="Export as image" onClick={handleExport}>⬇</button>
    </div>
  );

  // ── Manual mode ──
  if (mntAlgorithm === 'manual') {
    const { numDoubles, numSingles } = computeMNTManualLayout(team1Players.length, team2Players.length);
    if (numDoubles + numSingles === 0) {
      return (
        <section ref={sectionRef} className="results-section">
          <h2 className="section-title">Match Results{exportBtn}</h2>
          <p className="empty-hint">Add at least 1 player to each team to use manual matching.</p>
        </section>
      );
    }
    const roundIds = Array.from({ length: numRounds }, (_, i) => i + 1);
    return (
      <section ref={sectionRef} className="results-section">
        <h2 className="section-title">
          Match Results
          <span className="player-count">{numRounds} round{numRounds !== 1 ? 's' : ''}</span>
          {exportBtn}
        </h2>
        {roundIds.map(roundId => (
          <div key={roundId} className="round-section">
            <div className="round-header">Round {roundId}</div>
            <div className="courts-grid">
              {Array.from({ length: numDoubles }, (_, i) => (
                <ManualCourtCard key={i + 1} roundId={roundId} courtId={i + 1} courtType="doubles"
                  team1Name={team1Name || 'Team 1'} team2Name={team2Name || 'Team 2'}
                  team1Players={team1Players} team2Players={team2Players}
                  teamAssignment={teamAssignment} onSlotDrop={onSlotDrop} onSlotClear={onSlotClear} />
              ))}
              {numSingles === 1 && (
                <ManualCourtCard key="singles" roundId={roundId} courtId={numDoubles + 1} courtType="singles"
                  team1Name={team1Name || 'Team 1'} team2Name={team2Name || 'Team 2'}
                  team1Players={team1Players} team2Players={team2Players}
                  teamAssignment={teamAssignment} onSlotDrop={onSlotDrop} onSlotClear={onSlotClear} />
              )}
            </div>
          </div>
        ))}
      </section>
    );
  }

  // ── Multi-round algorithmic modes ──
  const isMultiRound = mntAlgorithm === 'multiround' || mntAlgorithm === 'multiround-mixed'
    || mntAlgorithm === 'history' || mntAlgorithm === 'history-mixed';

  if (isMultiRound) {
    if (!mntRounds || mntRounds.length === 0) {
      return (
        <section ref={sectionRef} className="results-section">
          <h2 className="section-title">Match Results{exportBtn}</h2>
          <p className="empty-hint">Set the number of rounds and press <strong>Match</strong> to generate.</p>
        </section>
      );
    }
    return (
      <section ref={sectionRef} className="results-section">
        <h2 className="section-title">
          Match Results
          <span className="player-count">{mntRounds.length} round{mntRounds.length !== 1 ? 's' : ''}</span>
          {exportBtn}
        </h2>
        {mntRounds.map((round, ri) => (
          <div key={ri} className="round-section">
            <div className="round-header">Round {ri + 1}</div>
            <AlgoRound round={round} roundIdx={ri}
              team1Name={team1Name || 'Team 1'} team2Name={team2Name || 'Team 2'}
              selectedPos={selectedPos} onPlayerClick={handlePlayerClick} />
          </div>
        ))}
      </section>
    );
  }

  // ── Single-round algorithmic modes (ranking / mixed) ──
  if (!mntResult) {
    return (
      <section ref={sectionRef} className="results-section">
        <h2 className="section-title">Match Results{exportBtn}</h2>
        <p className="empty-hint">Press <strong>Match</strong> to generate court pairings.</p>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="results-section">
      <h2 className="section-title">
        Match Results
        <span className="player-count">{mntResult.courts.length} court{mntResult.courts.length !== 1 ? 's' : ''}</span>
        {exportBtn}
      </h2>
      <AlgoRound round={mntResult} roundIdx={0}
        team1Name={team1Name || 'Team 1'} team2Name={team2Name || 'Team 2'}
        selectedPos={selectedPos} onPlayerClick={handlePlayerClick} />
    </section>
  );
}
