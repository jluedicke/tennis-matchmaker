import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import type { Player, TeamFormat, TeamAssignment, CourtDef } from '../types';
import { FORMAT_COURTS } from '../utils/teamFormats';
import './MatchResults.css';
import './TeamMatchResults.css';

interface Props {
  format: TeamFormat;
  team1Name: string;
  team2Name: string;
  team1Players: Player[];
  team2Players: Player[];
  teamAssignment: TeamAssignment;
  onSlotDrop: (slotKey: string, playerId: string) => void;
  onSlotClear: (slotKey: string) => void;
}

// ── Ranking badge (shared with singles/doubles) ──────────────────────────────
function rankTier(rating: number) { return Math.min(7, Math.max(1, Math.floor(rating))); }

function RankingBadge({ ranking }: { ranking: number }) {
  return (
    <span className={`ranking-badge rank-${rankTier(ranking)}`} title={`USTA ${ranking.toFixed(1)}`}>
      {ranking.toFixed(1)}
    </span>
  );
}

// ── Drop slot with cross-team validation ────────────────────────────────────
interface DropSlotProps {
  slotKey: string;
  player: Player | undefined;
  teamNum: 1 | 2;
  team1Ids: Set<string>;
  team2Ids: Set<string>;
  onDrop: (slotKey: string, playerId: string) => void;
  onClear: (slotKey: string) => void;
}

function TeamDropSlot({ slotKey, player, teamNum, team1Ids, team2Ids, onDrop, onClear }: DropSlotProps) {
  const [dragOver, setDragOver] = useState(false);
  const [invalid, setInvalid] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const playerId = e.dataTransfer.getData('text/plain');
    if (!playerId) return;

    // Cross-team validation: reject if player belongs to wrong team
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

// ── Auto-derived player display (Davis Cup courts 4 & 5) ────────────────────
function AutoPlayerDisplay({ player }: { player: Player | undefined }) {
  if (!player) return <div className="auto-empty">—</div>;
  return (
    <div className="auto-player-chip">
      <RankingBadge ranking={player.ranking} />
      <span className="chip-name">{player.name}</span>
    </div>
  );
}

// ── Team slot section (one team's side of a court) ───────────────────────────
interface TeamSectionProps {
  courtDef: CourtDef;
  teamNum: 1 | 2;
  teamName: string;
  teamAssignment: TeamAssignment;
  team1Ids: Set<string>;
  team2Ids: Set<string>;
  allPlayers: Player[];
  onDrop: (slotKey: string, playerId: string) => void;
  onClear: (slotKey: string) => void;
}

function TeamSection({ courtDef, teamNum, teamName, teamAssignment, team1Ids, team2Ids, allPlayers, onDrop, onClear }: TeamSectionProps) {
  const sideClass = teamNum === 1 ? 'team-slot-section-a' : '';
  const slotCount = courtDef.type === 'doubles' ? 2 : 1;

  if (courtDef.auto) {
    // Davis Cup auto-derived — read only
    const player = getDavisCupDerivedPlayer(courtDef.id as 4 | 5, teamNum, teamAssignment, allPlayers);
    return (
      <div className={`team-slot-section ${sideClass}`}>
        <div className="team-slot-label">{teamName}</div>
        <AutoPlayerDisplay player={player} />
      </div>
    );
  }

  const slots = Array.from({ length: slotCount }, (_, i) => {
    const slotKey = `${courtDef.id}-t${teamNum}-${i + 1}`;
    const playerId = teamAssignment[slotKey];
    const player = playerId ? allPlayers.find(p => p.id === playerId) : undefined;
    return { slotKey, player };
  });

  return (
    <div className={`team-slot-section ${sideClass}`}>
      <div className="team-slot-label">{teamName}</div>
      {slots.map(({ slotKey, player }) => (
        <TeamDropSlot
          key={slotKey}
          slotKey={slotKey}
          player={player}
          teamNum={teamNum}
          team1Ids={team1Ids}
          team2Ids={team2Ids}
          onDrop={onDrop}
          onClear={onClear}
        />
      ))}
    </div>
  );
}

// ── Davis Cup auto-derive logic ──────────────────────────────────────────────
function getDavisCupDerivedPlayer(
  courtId: 4 | 5,
  teamNum: 1 | 2,
  assignment: TeamAssignment,
  allPlayers: Player[],
): Player | undefined {
  // Court 4: t1 = court1's t1;  t2 = court2's t2
  // Court 5: t1 = court2's t1;  t2 = court1's t2
  const sourceSlot =
    courtId === 4
      ? (teamNum === 1 ? '1-t1-1' : '2-t2-1')
      : (teamNum === 1 ? '2-t1-1' : '1-t2-1');
  const playerId = assignment[sourceSlot];
  return playerId ? allPlayers.find(p => p.id === playerId) : undefined;
}

// ── Team court card ──────────────────────────────────────────────────────────
interface TeamCourtCardProps {
  courtDef: CourtDef;
  team1Name: string;
  team2Name: string;
  teamAssignment: TeamAssignment;
  team1Ids: Set<string>;
  team2Ids: Set<string>;
  allPlayers: Player[];
  onDrop: (slotKey: string, playerId: string) => void;
  onClear: (slotKey: string) => void;
}

function TeamCourtCard({ courtDef, team1Name, team2Name, teamAssignment, team1Ids, team2Ids, allPlayers, onDrop, onClear }: TeamCourtCardProps) {
  return (
    <div className="court-card">
      <div className="court-header">
        {courtDef.label}
        {courtDef.auto && <span className="auto-court-badge">auto</span>}
        {courtDef.genderLabel && <span className="gender-badge">{courtDef.genderLabel}</span>}
      </div>
      <div className="team-court-body">
        <TeamSection
          courtDef={courtDef}
          teamNum={1}
          teamName={team1Name}
          teamAssignment={teamAssignment}
          team1Ids={team1Ids}
          team2Ids={team2Ids}
          allPlayers={allPlayers}
          onDrop={onDrop}
          onClear={onClear}
        />
        <div className="team-court-vs">vs</div>
        <TeamSection
          courtDef={courtDef}
          teamNum={2}
          teamName={team2Name}
          teamAssignment={teamAssignment}
          team1Ids={team1Ids}
          team2Ids={team2Ids}
          allPlayers={allPlayers}
          onDrop={onDrop}
          onClear={onClear}
        />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function TeamMatchResults({ format, team1Name, team2Name, team1Players, team2Players, teamAssignment, onSlotDrop, onSlotClear }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const courts = FORMAT_COURTS[format];
  const allPlayers = [...team1Players, ...team2Players];
  const team1Ids = new Set(team1Players.map(p => p.id));
  const team2Ids = new Set(team2Players.map(p => p.id));

  async function handleExportImage() {
    const card = (sectionRef.current?.closest('.card') ?? sectionRef.current) as HTMLElement | null;
    if (!card) return;
    const dataUrl = await toPng(card, { cacheBust: true });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'team-match-results.png';
    a.click();
  }

  return (
    <section ref={sectionRef} className="results-section">
      <h2 className="section-title">
        Match Results
        <span className="player-count">{courts.length} court{courts.length !== 1 ? 's' : ''}</span>
        <div className="title-actions">
          <button className="icon-btn" title="Export match results as image" onClick={handleExportImage}>⬇</button>
        </div>
      </h2>
      <div className="team-courts-grid">
        {courts.map(courtDef => (
          <TeamCourtCard
            key={courtDef.id}
            courtDef={courtDef}
            team1Name={team1Name}
            team2Name={team2Name}
            teamAssignment={teamAssignment}
            team1Ids={team1Ids}
            team2Ids={team2Ids}
            allPlayers={allPlayers}
            onDrop={onSlotDrop}
            onClear={onSlotClear}
          />
        ))}
      </div>
    </section>
  );
}
