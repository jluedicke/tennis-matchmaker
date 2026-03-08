import { useState, useEffect } from 'react';
import PlayerList from '../components/PlayerList';
import TeamMatchResults from '../components/TeamMatchResults';
import MondayNightResults from '../components/MondayNightResults';
import type { Player, TeamFormat, TeamAssignment, MNTAlgorithm, MNTRound, MNTPlayerPosition, ListPanelControl } from '../types';

interface Props { listPanel: ListPanelControl; }
import { FORMAT_LABELS } from '../utils/teamFormats';
import { createMNTRounds } from '../utils/mondayNightMatchmaking';

const STORAGE_KEY = 'tennis-matchmaker-team';

interface TeamState {
  team1Name: string;
  team2Name: string;
  team1Players: Player[];
  team2Players: Player[];
  format: TeamFormat;
  mntAlgorithm: MNTAlgorithm;
  teamAssignment: TeamAssignment;
}

function loadState(): TeamState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { mntAlgorithm: 'ranking', ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultState();
}

function defaultState(): TeamState {
  return {
    team1Name: 'Team 1',
    team2Name: 'Team 2',
    team1Players: [],
    team2Players: [],
    format: 'usta-league',
    mntAlgorithm: 'ranking',
    teamAssignment: {},
  };
}

// Which algorithms have multiple rounds (need stepper + Match button)
function isMNTMultiRound(algo: MNTAlgorithm) {
  return algo === 'multiround' || algo === 'multiround-mixed'
    || algo === 'history' || algo === 'history-mixed';
}

export default function TeamApp({ listPanel }: Props) {
  const initial = loadState();
  const [team1Name, setTeam1Name]         = useState(initial.team1Name);
  const [team2Name, setTeam2Name]         = useState(initial.team2Name);
  const [team1Players, setTeam1Players]   = useState<Player[]>(initial.team1Players);
  const [team2Players, setTeam2Players]   = useState<Player[]>(initial.team2Players);
  const [format, setFormat]               = useState<TeamFormat>(initial.format);
  const [mntAlgorithm, setMntAlgorithm]   = useState<MNTAlgorithm>(initial.mntAlgorithm);
  const [numRounds, setNumRounds]         = useState(3);
  const [teamAssignment, setTeamAssignment] = useState<TeamAssignment>(initial.teamAssignment);
  // MNT algorithmic results
  const [mntResult, setMntResult]   = useState<MNTRound | null>(null);
  const [mntRounds, setMntRounds]   = useState<MNTRound[] | null>(null);

  const isMNT = format === 'monday-night';

  // Persist stable state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      team1Name, team2Name, team1Players, team2Players, format, mntAlgorithm, teamAssignment,
    }));
  }, [team1Name, team2Name, team1Players, team2Players, format, mntAlgorithm, teamAssignment]);

  // Clear assignment + MNT results when format changes
  useEffect(() => {
    setTeamAssignment({});
    setMntResult(null);
    setMntRounds(null);
  }, [format]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear MNT results when algorithm changes
  useEffect(() => {
    setMntResult(null);
    setMntRounds(null);
    setTeamAssignment({});
  }, [mntAlgorithm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evict removed players from teamAssignment
  useEffect(() => {
    const allIds = new Set([...team1Players, ...team2Players].map(p => p.id));
    setTeamAssignment(prev => {
      const hasStale = Object.values(prev).some(id => !allIds.has(id));
      if (!hasStale) return prev;
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (!allIds.has(next[k])) delete next[k]; });
      return next;
    });
    // Also clear algorithmic results (they reference old players)
    setMntResult(null);
    setMntRounds(null);
  }, [team1Players, team2Players]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSlotDrop(slotKey: string, playerId: string) {
    if (isMNT && mntAlgorithm === 'manual') {
      // MNT manual: evict player from other slots in the same round
      setTeamAssignment(prev => {
        const next = { ...prev };
        const roundPrefix = slotKey.split('-')[0] + '-';
        Object.keys(next).forEach(k => {
          if (next[k] === playerId && k.startsWith(roundPrefix)) delete next[k];
        });
        next[slotKey] = playerId;
        return next;
      });
    } else {
      // Other team formats: no eviction (player can be on multiple courts)
      setTeamAssignment(prev => ({ ...prev, [slotKey]: playerId }));
    }
  }

  function handleSlotClear(slotKey: string) {
    setTeamAssignment(prev => { const next = { ...prev }; delete next[slotKey]; return next; });
  }

  function handleMNTSwap(posA: MNTPlayerPosition, posB: MNTPlayerPosition) {
    if (posA.roundIdx !== posB.roundIdx || posA.teamNum !== posB.teamNum) return;

    function swapInRound(round: MNTRound): MNTRound {
      const courts = round.courts.map(c => ({ ...c, team1: [...c.team1], team2: [...c.team2] }));
      const teamA = posA.teamNum === 1 ? courts[posA.courtIdx].team1 : courts[posA.courtIdx].team2;
      const teamB = posB.teamNum === 1 ? courts[posB.courtIdx].team1 : courts[posB.courtIdx].team2;
      const pA = teamA[posA.playerIdx];
      const pB = teamB[posB.playerIdx];
      teamA[posA.playerIdx] = pB;
      teamB[posB.playerIdx] = pA;
      return { ...round, courts };
    }

    if (mntResult) setMntResult(swapInRound(mntResult));
    else if (mntRounds) setMntRounds(mntRounds.map((r, ri) => ri === posA.roundIdx ? swapInRound(r) : r));
  }

  function handleMNTMatch() {
    const algo = mntAlgorithm;
    const rounds = isMNTMultiRound(algo) ? numRounds : 1;
    const result = createMNTRounds(team1Players, team2Players, rounds, algo);
    if (isMNTMultiRound(algo)) {
      setMntRounds(result);
      setMntResult(null);
    } else {
      setMntResult(result[0] ?? null);
      setMntRounds(null);
    }
  }

  const hasAssignments  = Object.keys(teamAssignment).length > 0;
  const canMatchMNT     = team1Players.length >= 1 && team2Players.length >= 1;

  // ── Controls for the right side of the match-bar ──────────────────────────
  function renderNonMNTControls() {
    return (
      <div className="match-bar-right">
        <button
          className="btn-match btn-clear"
          onClick={() => setTeamAssignment({})}
          disabled={!hasAssignments}
          title="Clear all court assignments"
        >
          ✕ Clear
        </button>
      </div>
    );
  }

  function renderMNTControls() {
    if (mntAlgorithm === 'manual') {
      return (
        <div className="multiround-ctrl">
          <div className="rounds-label">
            Rounds
            <div className="rounds-stepper">
              <button className="stepper-btn" onClick={() => setNumRounds(n => Math.max(1, n - 1))} disabled={numRounds <= 1} aria-label="Decrease rounds">−</button>
              <span className="stepper-value">{numRounds}</span>
              <button className="stepper-btn" onClick={() => setNumRounds(n => Math.min(10, n + 1))} disabled={numRounds >= 10} aria-label="Increase rounds">+</button>
            </div>
          </div>
          <button
            className="btn-match btn-clear"
            onClick={() => setTeamAssignment({})}
            disabled={!hasAssignments}
            title="Clear all court assignments"
          >
            ✕ Clear
          </button>
        </div>
      );
    }

    if (isMNTMultiRound(mntAlgorithm)) {
      return (
        <div className="multiround-ctrl">
          <div className="rounds-label">
            Rounds
            <div className="rounds-stepper">
              <button className="stepper-btn" onClick={() => setNumRounds(n => Math.max(1, n - 1))} disabled={numRounds <= 1} aria-label="Decrease rounds">−</button>
              <span className="stepper-value">{numRounds}</span>
              <button className="stepper-btn" onClick={() => setNumRounds(n => Math.min(10, n + 1))} disabled={numRounds >= 10} aria-label="Increase rounds">+</button>
            </div>
          </div>
          <button
            className="btn-match"
            onClick={handleMNTMatch}
            disabled={!canMatchMNT}
            title={canMatchMNT ? 'Generate rounds' : 'Need at least 1 player per team'}
          >
            ▶ Match
          </button>
        </div>
      );
    }

    // Single-round (ranking / mixed)
    return (
      <div className="match-bar-right">
        <button
          className="btn-match"
          onClick={handleMNTMatch}
          disabled={!canMatchMNT}
          title={canMatchMNT ? 'Generate matches' : 'Need at least 1 player per team'}
        >
          ▶ Match
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ── Control bar ───────────────────────────────────────────────── */}
      <div className="match-bar">
        <div className="match-bar-selects">
          <select
            className="algo-select"
            value={format}
            onChange={e => setFormat(e.target.value as TeamFormat)}
            aria-label="Match format"
          >
            {(Object.keys(FORMAT_LABELS) as TeamFormat[]).map(key => (
              <option key={key} value={key}>{FORMAT_LABELS[key]}</option>
            ))}
          </select>

          {isMNT && (
            <select
              className="algo-select"
              value={mntAlgorithm}
              onChange={e => setMntAlgorithm(e.target.value as MNTAlgorithm)}
              aria-label="Matching algorithm"
            >
              <option value="ranking">Match by ranking</option>
              <option value="mixed">Mixed by ranking</option>
              <option value="multiround">Multiround match</option>
              <option value="multiround-mixed">Multiround match mixed</option>
              <option value="history">Multiround match history aware</option>
              <option value="history-mixed">Multiround match history aware mixed</option>
              <option value="manual">Match manually</option>
            </select>
          )}
        </div>

        {isMNT ? renderMNTControls() : renderNonMNTControls()}
      </div>

      {/* ── Team player cards ──────────────────────────────────────────── */}
      <div className="dashboard">
        <div className="card">
          <div className="team-name-bar">
            <input className="team-name-input" value={team1Name} onChange={e => setTeam1Name(e.target.value)} placeholder="Team 1" maxLength={40} aria-label="Team 1 name" />
          </div>
          <PlayerList
            players={team1Players}
            onChange={setTeam1Players}
            algorithm="manual"
            assignedPlayerIds={new Set()}
            draggable={true}
            hideGroupWarning={true}
            onAddFromList={() => listPanel.openForSelection(
              ps => setTeam1Players(ps.map(p => ({ ...p, id: crypto.randomUUID() }))),
              ps => setTeam1Players(prev => [...prev, ...ps.map(p => ({ ...p, id: crypto.randomUUID() }))])
            )}
            onSaveList={() => listPanel.openForSave(team1Players)}
          />
        </div>
        <div className="card">
          <div className="team-name-bar">
            <input className="team-name-input" value={team2Name} onChange={e => setTeam2Name(e.target.value)} placeholder="Team 2" maxLength={40} aria-label="Team 2 name" />
          </div>
          <PlayerList
            players={team2Players}
            onChange={setTeam2Players}
            algorithm="manual"
            assignedPlayerIds={new Set()}
            draggable={true}
            hideGroupWarning={true}
            onAddFromList={() => listPanel.openForSelection(
              ps => setTeam2Players(ps.map(p => ({ ...p, id: crypto.randomUUID() }))),
              ps => setTeam2Players(prev => [...prev, ...ps.map(p => ({ ...p, id: crypto.randomUUID() }))])
            )}
            onSaveList={() => listPanel.openForSave(team2Players)}
          />
        </div>
      </div>

      {/* ── Results card (full-width) ──────────────────────────────────── */}
      <div className="card team-results-card">
        {isMNT ? (
          <MondayNightResults
            mntAlgorithm={mntAlgorithm}
            numRounds={numRounds}
            team1Name={team1Name || 'Team 1'}
            team2Name={team2Name || 'Team 2'}
            team1Players={team1Players}
            team2Players={team2Players}
            mntResult={mntResult}
            mntRounds={mntRounds}
            teamAssignment={teamAssignment}
            onSlotDrop={handleSlotDrop}
            onSlotClear={handleSlotClear}
            onSwapPlayers={handleMNTSwap}
          />
        ) : (
          <TeamMatchResults
            format={format}
            team1Name={team1Name || 'Team 1'}
            team2Name={team2Name || 'Team 2'}
            team1Players={team1Players}
            team2Players={team2Players}
            teamAssignment={teamAssignment}
            onSlotDrop={handleSlotDrop}
            onSlotClear={handleSlotClear}
          />
        )}
      </div>
    </>
  );
}
