import { useState, useEffect } from 'react';
import PlayerList from '../components/PlayerList';
import SinglesMatchResults from '../components/SinglesMatchResults';
import SinglesHelpModal from '../components/SinglesHelpModal';
import type { Player, SinglesResult, MatchAlgorithm, ManualAssignment, SinglesPlayerPosition } from '../types';
import {
  createSinglesMatches,
  createSinglesRounds,
  createSinglesRoundsMixed,
  createSinglesHistoryAwareRounds,
  createSinglesHistoryAwareMixedRounds,
} from '../utils/singlesMatchmaking';

const STORAGE_KEY = 'tennis-matchmaker-players';

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
    { id: crypto.randomUUID(), name: 'Alice',  ranking: 5.5, gender: 'W' },
    { id: crypto.randomUUID(), name: 'Bob',    ranking: 3.5, gender: 'M' },
    { id: crypto.randomUUID(), name: 'Carol',  ranking: 4.5, gender: 'W' },
    { id: crypto.randomUUID(), name: 'Dave',   ranking: 2.5, gender: 'M' },
    { id: crypto.randomUUID(), name: 'Eve',    ranking: 6.5, gender: 'W' },
    { id: crypto.randomUUID(), name: 'Frank',  ranking: 1.5, gender: 'M' },
    { id: crypto.randomUUID(), name: 'Grace',  ranking: 4.0, gender: 'W' },
    { id: crypto.randomUUID(), name: 'Hank',   ranking: 3.0, gender: 'M' },
    { id: crypto.randomUUID(), name: 'Iris',   ranking: 5.0, gender: 'W' },
    { id: crypto.randomUUID(), name: 'Jack',   ranking: 2.5, gender: 'M' },
    { id: crypto.randomUUID(), name: 'Karen',  ranking: 3.5, gender: 'W' },
    { id: crypto.randomUUID(), name: 'Leo',    ranking: 7.0, gender: 'M' },
    { id: crypto.randomUUID(), name: 'Mia',    ranking: 4.5, gender: 'W' },
    { id: crypto.randomUUID(), name: 'Nate',   ranking: 2.0, gender: 'M' },
    { id: crypto.randomUUID(), name: 'Olivia', ranking: 5.5, gender: 'W' },
    { id: crypto.randomUUID(), name: 'Pete',   ranking: 3.5, gender: 'M' },
  ];
}

export default function SinglesApp() {
  const [players, setPlayers]               = useState<Player[]>(loadPlayers);
  const [result, setResult]                 = useState<SinglesResult | null>(null);
  const [rounds, setRounds]                 = useState<SinglesResult[] | null>(null);
  const [numRounds, setNumRounds]           = useState(3);
  const [algorithm, setAlgorithm]           = useState<MatchAlgorithm>('ranking');
  const [manualAssignment, setManualAssignment] = useState<ManualAssignment>({});
  const [showHelp, setShowHelp]             = useState(false);

  // Persist players; clear result/rounds; remove slots for deleted players
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    setResult(null);
    setRounds(null);
    const ids = new Set(players.map(p => p.id));
    setManualAssignment(prev => {
      const hasStale = Object.values(prev).some(id => !ids.has(id));
      if (!hasStale) return prev;
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (!ids.has(next[k])) delete next[k]; });
      return next;
    });
  }, [players]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear everything when the algorithm changes
  useEffect(() => {
    setResult(null);
    setRounds(null);
    setManualAssignment({});
  }, [algorithm]);

  function handleMatch() {
    if (players.length < 2) return;
    if (algorithm === 'multiround') {
      setRounds(createSinglesRounds(players, numRounds));
    } else if (algorithm === 'multiround-mixed') {
      setRounds(createSinglesRoundsMixed(players, numRounds));
    } else if (algorithm === 'history') {
      setRounds(createSinglesHistoryAwareRounds(players, numRounds));
    } else if (algorithm === 'history-mixed') {
      setRounds(createSinglesHistoryAwareMixedRounds(players, numRounds));
    } else {
      setResult(createSinglesMatches(players, algorithm));
    }
  }

  function handleSlotDrop(slotKey: string, playerId: string) {
    setManualAssignment(prev => {
      const next = { ...prev };
      // Evict the player from any other slot in the same round
      const roundPrefix = slotKey.split('-')[0] + '-';
      Object.keys(next).forEach(k => {
        if (next[k] === playerId && k.startsWith(roundPrefix)) delete next[k];
      });
      next[slotKey] = playerId;
      return next;
    });
  }

  function handleSwapPlayers(posA: SinglesPlayerPosition, posB: SinglesPlayerPosition) {
    if (posA.roundIdx !== posB.roundIdx) return;
    function swapInResult(r: SinglesResult): SinglesResult {
      const courts = r.courts.map(c => ({ ...c }));
      const ca = courts[posA.courtIdx];
      const cb = courts[posB.courtIdx];
      const pA = posA.playerNum === 1 ? ca.player1 : ca.player2;
      const pB = posB.playerNum === 1 ? cb.player1 : cb.player2;
      if (posA.playerNum === 1) courts[posA.courtIdx] = { ...ca, player1: pB };
      else courts[posA.courtIdx] = { ...ca, player2: pB };
      if (posB.playerNum === 1) courts[posB.courtIdx] = { ...cb, player1: pA };
      else courts[posB.courtIdx] = { ...cb, player2: pA };
      return { ...r, courts };
    }
    if (result)       setResult(swapInResult(result));
    else if (rounds)  setRounds(rounds.map((r, ri) => ri === posA.roundIdx ? swapInResult(r) : r));
  }

  function handleSlotClear(slotKey: string) {
    setManualAssignment(prev => { const next = { ...prev }; delete next[slotKey]; return next; });
  }

  const assignedPlayerIds = new Set(Object.values(manualAssignment));
  const canMatch = players.length >= 2;

  return (
    <>
      {showHelp && <SinglesHelpModal onClose={() => setShowHelp(false)} />}

      <div className="match-bar">
        <select
          className="algo-select"
          value={algorithm}
          onChange={e => setAlgorithm(e.target.value as MatchAlgorithm)}
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

        {algorithm === 'manual' ? (
          <div className="multiround-ctrl">
            <div className="rounds-label">
              Rounds
              <div className="rounds-stepper">
                <button
                  className="stepper-btn"
                  onClick={() => setNumRounds(n => Math.max(1, n - 1))}
                  disabled={numRounds <= 1}
                  aria-label="Decrease rounds"
                >−</button>
                <span className="stepper-value">{numRounds}</span>
                <button
                  className="stepper-btn"
                  onClick={() => setNumRounds(n => Math.min(10, n + 1))}
                  disabled={numRounds >= 10}
                  aria-label="Increase rounds"
                >+</button>
              </div>
            </div>
            <button
              className="btn-match btn-clear"
              onClick={() => setManualAssignment({})}
              disabled={assignedPlayerIds.size === 0}
              title="Clear all manual assignments"
            >
              ✕ Clear
            </button>
            <button className="icon-btn" onClick={() => setShowHelp(true)} title="Quick guide">?</button>
          </div>
        ) : algorithm === 'multiround' || algorithm === 'multiround-mixed' || algorithm === 'history' || algorithm === 'history-mixed' ? (
          <div className="multiround-ctrl">
            <div className="rounds-label">
              Rounds
              <div className="rounds-stepper">
                <button
                  className="stepper-btn"
                  onClick={() => setNumRounds(n => Math.max(1, n - 1))}
                  disabled={numRounds <= 1}
                  aria-label="Decrease rounds"
                >−</button>
                <span className="stepper-value">{numRounds}</span>
                <button
                  className="stepper-btn"
                  onClick={() => setNumRounds(n => Math.min(10, n + 1))}
                  disabled={numRounds >= 10}
                  aria-label="Increase rounds"
                >+</button>
              </div>
            </div>
            <button
              className="btn-match"
              onClick={handleMatch}
              disabled={!canMatch}
              title={canMatch ? 'Generate rounds' : 'Need at least 2 players'}
            >
              ⚡ Match
            </button>
            <button className="icon-btn" onClick={() => setShowHelp(true)} title="Quick guide">?</button>
          </div>
        ) : (
          <div className="match-bar-right">
            <button
              className="btn-match"
              onClick={handleMatch}
              disabled={!canMatch}
              title={canMatch ? 'Generate matches' : 'Need at least 2 players'}
            >
              ⚡ Match
            </button>
            <button className="icon-btn" onClick={() => setShowHelp(true)} title="Quick guide">?</button>
          </div>
        )}
      </div>

      <div className="dashboard">
        <div className="card">
          <PlayerList
            players={players}
            onChange={setPlayers}
            algorithm={algorithm}
            assignedPlayerIds={assignedPlayerIds}
            groupSize={2}
          />
        </div>
        <div className="card">
          <SinglesMatchResults
            result={result}
            rounds={rounds}
            numRounds={numRounds}
            algorithm={algorithm}
            players={players}
            manualAssignment={manualAssignment}
            onSlotDrop={handleSlotDrop}
            onSlotClear={handleSlotClear}
            onSwapPlayers={handleSwapPlayers}
          />
        </div>
      </div>
    </>
  );
}
