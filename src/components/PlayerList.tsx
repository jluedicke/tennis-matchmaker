import React, { useState } from 'react';
import type { Player } from '../types';
import './PlayerList.css';

interface Props {
  players: Player[];
  onChange: (players: Player[]) => void;
}

const RANKING_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Novice',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
  6: 'Pro',
};

function RankingPips({ value }: { value: number }) {
  return (
    <span className="ranking-pips" aria-label={`Ranking ${value} – ${RANKING_LABELS[value]}`}>
      {[1, 2, 3, 4, 5, 6].map(n => (
        <span key={n} className={`pip ${n <= value ? 'filled' : ''}`} />
      ))}
    </span>
  );
}

export default function PlayerList({ players, onChange }: Props) {
  const [newName, setNewName] = useState('');
  const [newRanking, setNewRanking] = useState(3);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRanking, setEditRanking] = useState(3);

  function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    const player: Player = {
      id: crypto.randomUUID(),
      name,
      ranking: newRanking,
    };
    onChange([...players, player]);
    setNewName('');
    setNewRanking(3);
  }

  function removePlayer(id: string) {
    onChange(players.filter(p => p.id !== id));
  }

  function startEdit(player: Player) {
    setEditingId(player.id);
    setEditName(player.name);
    setEditRanking(player.ranking);
  }

  function commitEdit() {
    if (!editingId) return;
    onChange(
      players.map(p =>
        p.id === editingId ? { ...p, name: editName.trim() || p.name, ranking: editRanking } : p
      )
    );
    setEditingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent, action: () => void) {
    if (e.key === 'Enter') action();
    if (e.key === 'Escape') setEditingId(null);
  }

  return (
    <section className="player-list-section">
      <h2 className="section-title">
        Players <span className="player-count">{players.length}</span>
      </h2>

      {/* Add player row */}
      <div className="add-player-row">
        <input
          className="name-input"
          type="text"
          placeholder="Player name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => handleKeyDown(e, addPlayer)}
          maxLength={40}
        />
        <select
          className="ranking-select"
          value={newRanking}
          onChange={e => setNewRanking(Number(e.target.value))}
          aria-label="Ranking"
        >
          {[1, 2, 3, 4, 5, 6].map(r => (
            <option key={r} value={r}>
              {r} – {RANKING_LABELS[r]}
            </option>
          ))}
        </select>
        <button className="btn btn-add" onClick={addPlayer} disabled={!newName.trim()}>
          + Add
        </button>
      </div>

      {/* Player table */}
      {players.length === 0 ? (
        <p className="empty-hint">No players yet. Add some above.</p>
      ) : (
        <table className="player-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Ranking</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, idx) => (
              <tr key={player.id} className={editingId === player.id ? 'editing' : ''}>
                <td className="player-index">{idx + 1}</td>
                {editingId === player.id ? (
                  <>
                    <td>
                      <input
                        className="name-input inline"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => handleKeyDown(e, commitEdit)}
                        autoFocus
                        maxLength={40}
                      />
                    </td>
                    <td>
                      <select
                        className="ranking-select"
                        value={editRanking}
                        onChange={e => setEditRanking(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6].map(r => (
                          <option key={r} value={r}>
                            {r} – {RANKING_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="actions">
                      <button className="btn btn-save" onClick={commitEdit}>Save</button>
                      <button className="btn btn-cancel" onClick={() => setEditingId(null)}>✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="player-name">{player.name}</td>
                    <td>
                      <RankingPips value={player.ranking} />
                      <span className="ranking-label">{RANKING_LABELS[player.ranking]}</span>
                    </td>
                    <td className="actions">
                      <button className="btn btn-edit" onClick={() => startEdit(player)} title="Edit">✎</button>
                      <button className="btn btn-remove" onClick={() => removePlayer(player.id)} title="Remove">✕</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {players.length > 0 && players.length % 4 !== 0 && (
        <p className="warning">
          ⚠ {players.length % 4} player{players.length % 4 !== 1 ? 's' : ''} won't be matched
          (need a multiple of 4). Add {4 - (players.length % 4)} more or remove some.
        </p>
      )}
    </section>
  );
}
