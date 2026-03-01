import React, { useState, useRef } from 'react';
import type { Player, MatchAlgorithm } from '../types';
import './PlayerList.css';

interface Props {
  players: Player[];
  onChange: (players: Player[]) => void;
  algorithm: MatchAlgorithm;
  assignedPlayerIds: Set<string>;
}

// USTA rating scale: 1.5 – 7.0 in 0.5 increments
const USTA_RATINGS = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0];

/** 7 pips: filled, half-filled, or empty based on USTA rating */
function RankingPips({ value }: { value: number }) {
  return (
    <span className="ranking-pips" aria-label={`USTA rating ${value}`}>
      {[1, 2, 3, 4, 5, 6, 7].map(n => {
        const filled = n <= Math.floor(value);
        const half   = !filled && value % 1 !== 0 && n === Math.ceil(value);
        return <span key={n} className={`pip ${filled ? 'filled' : half ? 'half' : ''}`} />;
      })}
    </span>
  );
}

function exportPlayers(players: Player[]) {
  const lines = players.map(p => `${p.name},${p.ranking.toFixed(1)},${p.gender}`).join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'players.txt';
  a.click();
  URL.revokeObjectURL(url);
}

type SortOrder = 'asc' | 'desc' | null;

export default function PlayerList({ players, onChange, algorithm, assignedPlayerIds }: Props) {
  const [newName,    setNewName]    = useState('');
  const [newRanking, setNewRanking] = useState(3.5);
  const [newGender,  setNewGender]  = useState<'M' | 'W'>('M');
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editName,   setEditName]   = useState('');
  const [editRanking,setEditRanking]= useState(3.5);
  const [editGender, setEditGender] = useState<'M' | 'W'>('M');
  const [sortOrder,  setSortOrder]  = useState<SortOrder>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) ?? '';
      const imported: Player[] = [];
      for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        const [namePart, rankPart, genderPart] = line.split(',');
        const name = namePart?.trim();
        const ranking = parseFloat(rankPart ?? '');
        const gender = genderPart?.trim().toUpperCase();
        if (!name || !USTA_RATINGS.includes(ranking) || (gender !== 'M' && gender !== 'W')) continue;
        imported.push({ id: crypto.randomUUID(), name, ranking, gender: gender as 'M' | 'W' });
      }
      if (imported.length > 0) onChange(imported);
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  // Sort for display only — underlying array order is preserved
  const displayedPlayers = sortOrder === null
    ? players
    : [...players].sort((a, b) =>
        sortOrder === 'asc' ? a.ranking - b.ranking : b.ranking - a.ranking
      );

  function cycleSortOrder() {
    setSortOrder(o => o === null ? 'asc' : o === 'asc' ? 'desc' : null);
  }

  function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    onChange([...players, { id: crypto.randomUUID(), name, ranking: newRanking, gender: newGender }]);
    setNewName('');
    setNewRanking(3.5);
    setNewGender('M');
  }

  function removePlayer(id: string) {
    onChange(players.filter(p => p.id !== id));
  }

  function startEdit(player: Player) {
    setEditingId(player.id);
    setEditName(player.name);
    setEditRanking(player.ranking);
    setEditGender(player.gender);
  }

  function commitEdit() {
    if (!editingId) return;
    onChange(players.map(p =>
      p.id === editingId
        ? { ...p, name: editName.trim() || p.name, ranking: editRanking, gender: editGender }
        : p
    ));
    setEditingId(null);
  }

  function toggleGender(id: string) {
    onChange(players.map(p =>
      p.id === id ? { ...p, gender: p.gender === 'M' ? 'W' : 'M' } : p
    ));
  }

  function handleKeyDown(e: React.KeyboardEvent, action: () => void) {
    if (e.key === 'Enter') action();
    if (e.key === 'Escape') setEditingId(null);
  }

  const sortIcon = sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : '↕';

  return (
    <section className="player-list-section">
      <h2 className="section-title">
        Players <span className="player-count">{players.length}</span>
        <div className="title-actions">
          <button
            className="icon-btn"
            title="Import players from file (replaces current list)"
            onClick={() => fileInputRef.current?.click()}
          >⬆</button>
          <button
            className="icon-btn"
            title="Export players to file"
            onClick={() => exportPlayers(players)}
            disabled={players.length === 0}
          >⬇</button>
        </div>
      </h2>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

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
          aria-label="USTA Rating"
        >
          {USTA_RATINGS.map(r => (
            <option key={r} value={r}>{r.toFixed(1)}</option>
          ))}
        </select>
        <button
          className={`btn btn-gender gender-${newGender}`}
          onClick={() => setNewGender(g => g === 'M' ? 'W' : 'M')}
          title="Toggle gender"
        >
          {newGender}
        </button>
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
              <th>
                <button className={`sort-btn ${sortOrder ? 'active' : ''}`} onClick={cycleSortOrder} title="Sort by ranking">
                  Ranking <span className="sort-icon">{sortIcon}</span>
                </button>
              </th>
              <th>Gender</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayedPlayers.map((player, idx) => {
              const isAssigned  = algorithm === 'manual' && assignedPlayerIds.has(player.id);
              const isDraggable = algorithm === 'manual' && !isAssigned;
              return (
              <tr
                key={player.id}
                className={[editingId === player.id ? 'editing' : '', isAssigned ? 'assigned' : ''].filter(Boolean).join(' ')}
                draggable={isDraggable}
                onDragStart={isDraggable ? e => {
                  e.dataTransfer.setData('text/plain', player.id);
                  // Use a compact pill as the drag image so it doesn't obscure drop targets
                  const ghost = document.createElement('div');
                  ghost.textContent = player.name;
                  ghost.style.cssText = 'position:fixed;top:-9999px;left:0;padding:0.3rem 0.75rem;background:var(--color-accent);color:var(--color-bg);border-radius:999px;font-size:0.85rem;font-weight:700;white-space:nowrap;pointer-events:none;';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                } : undefined}
              >
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
                        {USTA_RATINGS.map(r => (
                          <option key={r} value={r}>{r.toFixed(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className={`btn btn-gender gender-${editGender}`}
                        onClick={() => setEditGender(g => g === 'M' ? 'W' : 'M')}
                      >
                        {editGender}
                      </button>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-save" onClick={commitEdit}>Save</button>
                        <button className="btn btn-cancel" onClick={() => setEditingId(null)}>✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="player-name">{player.name}</td>
                    <td>
                      <RankingPips value={player.ranking} />
                      <span className="ranking-value">{player.ranking.toFixed(1)}</span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-gender gender-${player.gender}`}
                        onClick={() => toggleGender(player.id)}
                        title="Click to toggle gender"
                      >
                        {player.gender}
                      </button>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-edit" onClick={() => startEdit(player)} title="Edit">✎</button>
                        <button className="btn btn-remove" onClick={() => removePlayer(player.id)} title="Remove">✕</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
              );
            })}
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
