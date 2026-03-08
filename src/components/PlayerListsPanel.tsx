import { useState, useEffect } from 'react';
import type { Player, SavedPlayerList } from '../types';
import { loadSavedLists, saveSavedLists } from '../utils/playerLists';
import PlayerList from './PlayerList';
import './PlayerListsPanel.css';

interface Props {
  open: boolean;
  mode: 'manage' | 'select' | 'save';
  savePlayers?: Player[];
  onLoadAll?: (players: Player[]) => void;
  onAddSelected?: (players: Player[]) => void;
  onClose: () => void;
}

function makeKey(listId: string, playerIdx: number) {
  return `${listId}:${playerIdx}`;
}

const TITLES = { manage: 'Player Lists', select: 'Load from List', save: 'Save Player List' };

export default function PlayerListsPanel({ open, mode, savePlayers = [], onLoadAll, onAddSelected, onClose }: Props) {
  const [lists, setLists] = useState<SavedPlayerList[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [showEditAdd, setShowEditAdd]     = useState(false);
  const [editAddKeys, setEditAddKeys]     = useState<Set<string>>(new Set());
  const [showEditSave, setShowEditSave]   = useState(false);
  const [editSaveCopyName, setEditSaveCopyName] = useState('');
  const [editListName, setEditListName]   = useState('');
  const [editHistory, setEditHistory]     = useState<Player[][]>([]);
  const [editHistoryIdx, setEditHistoryIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setLists(loadSavedLists());
      setExpanded(new Set());
      setSelectedKeys(new Set());
      setRenamingId(null);
      setEditingListId(null);
      if (mode === 'save') setSaveName('My List');
    }
  }, [open, mode]);

  useEffect(() => {
    setShowEditAdd(false);
    setEditAddKeys(new Set());
    setShowEditSave(false);
    setEditSaveCopyName('');
    const isNew = editingListId === '__new__';
    const list = lists.find(l => l.id === editingListId);
    setEditListName(isNew ? '' : (list?.name ?? ''));
    setEditHistory(isNew ? [[]] : (list ? [list.players] : []));
    setEditHistoryIdx(0);
  }, [editingListId]); // eslint-disable-line react-hooks/exhaustive-deps

  function pushEditHistory(players: Player[]) {
    setEditHistory(prev => {
      const trimmed = prev.slice(0, editHistoryIdx + 1);
      return [...trimmed, players];
    });
    setEditHistoryIdx(i => i + 1);
  }

  function persistLists(next: SavedPlayerList[]) {
    setLists(next);
    saveSavedLists(next);
  }

  function deleteList(id: string) {
    persistLists(lists.filter(l => l.id !== id));
  }

  function startRename(list: SavedPlayerList) {
    setRenamingId(list.id);
    setRenameName(list.name);
  }

  function commitRename() {
    if (!renamingId) return;
    const name = renameName.trim();
    if (name && !lists.some(l => l.id !== renamingId && l.name === name)) {
      persistLists(lists.map(l => l.id === renamingId ? { ...l, name } : l));
    }
    setRenamingId(null);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePlayerKey(key: string) {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleListSelect(listId: string, count: number) {
    const keys = Array.from({ length: count }, (_, i) => makeKey(listId, i));
    const allSelected = keys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  }

  function handleLoadAll(players: Player[]) {
    onLoadAll?.(players.map(p => ({ ...p, id: crypto.randomUUID() })));
    onClose();
  }

  function handleAddSelected() {
    const selected: Player[] = [];
    for (const list of lists) {
      list.players.forEach((p, i) => {
        if (selectedKeys.has(makeKey(list.id, i))) selected.push(p);
      });
    }
    onAddSelected?.(selected.map(p => ({ ...p, id: crypto.randomUUID() })));
    onClose();
  }

  function handleSaveNew() {
    const name = saveName.trim() || 'My List';
    if (lists.some(l => l.name === name)) return;
    const newList: SavedPlayerList = {
      id: crypto.randomUUID(),
      name,
      players: savePlayers,
      createdAt: Date.now(),
    };
    persistLists([...lists, newList]);
    onClose();
  }

  function handleReplaceList(listId: string) {
    persistLists(lists.map(l => l.id === listId ? { ...l, players: savePlayers } : l));
    onClose();
  }

  function handleEditAddAll(fromList: SavedPlayerList) {
    const draft = editHistory[editHistoryIdx] ?? [];
    const next = [...draft, ...fromList.players.map(p => ({ ...p, id: crypto.randomUUID() }))];
    pushEditHistory(next);
    setShowEditAdd(false);
    setEditAddKeys(new Set());
  }

  function handleEditAddSelected() {
    const draft = editHistory[editHistoryIdx] ?? [];
    const toAdd: Player[] = [];
    for (const other of lists.filter(l => l.id !== editingListId)) {
      other.players.forEach((p, i) => { if (editAddKeys.has(makeKey(other.id, i))) toAdd.push(p); });
    }
    pushEditHistory([...draft, ...toAdd.map(p => ({ ...p, id: crypto.randomUUID() }))]);
    setShowEditAdd(false);
    setEditAddKeys(new Set());
  }

  function handleSaveCopy() {
    const cur = lists.find(l => l.id === editingListId);
    if (!cur) return;
    const draft = editHistory[editHistoryIdx] ?? cur.players;
    const name = editSaveCopyName.trim() || `Copy of ${cur.name}`;
    if (lists.some(l => l.name === name)) return;
    persistLists([...lists, { id: crypto.randomUUID(), name, players: draft, createdAt: Date.now() }]);
    setShowEditSave(false);
    setEditSaveCopyName('');
  }

  function handleEditSave() {
    if (!editingListId) return;
    const draft = editHistory[editHistoryIdx] ?? [];
    if (editingListId === '__new__') {
      const name = editListName.trim() || 'New List';
      if (!lists.some(l => l.name === name)) {
        persistLists([...lists, { id: crypto.randomUUID(), name, players: draft, createdAt: Date.now() }]);
      }
    } else {
      const name = editListName.trim();
      const nameConflict = name !== '' && lists.some(l => l.id !== editingListId && l.name === name);
      if (!nameConflict) {
        persistLists(lists.map(l => l.id === editingListId
          ? { ...l, name: name || l.name, players: draft }
          : l
        ));
      }
    }
    setEditingListId(null);
  }

  const selectedCount = selectedKeys.size;

  if (!open) return null;

  return (
    <>
      <div className="lists-panel-overlay" onClick={onClose} />
      <div className="lists-panel" role="dialog" aria-label={TITLES[mode]}>
        <div className="lists-panel-header">
          <h2 className="lists-panel-title">{TITLES[mode]}</h2>
          <button className="lists-panel-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="lists-panel-body">

          {/* ── MANAGE MODE ───────────────────────────────────── */}
          {mode === 'manage' && (
            <>
              {lists.length === 0 && (
                <p className="lists-empty">No saved lists yet. Click <em>+ Create new list</em> below or use the save button (⊞) in any player list.</p>
              )}
              {lists.map(list => (
                <div key={list.id} className="list-item">
                  <div className="list-row">
                    <button
                      className="list-expand-btn"
                      onClick={() => toggleExpand(list.id)}
                      aria-label={expanded.has(list.id) ? 'Collapse' : 'Expand'}
                    >
                      {expanded.has(list.id) ? '▾' : '▸'}
                    </button>
                    {renamingId === list.id ? (() => {
                      const renameConflict = renameName.trim() !== '' && lists.some(l => l.id !== renamingId && l.name === renameName.trim());
                      return (
                      <input
                        className={`list-rename-input${renameConflict ? ' input-conflict' : ''}`}
                        value={renameName}
                        onChange={e => setRenameName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !renameConflict) commitRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        title={renameConflict ? 'A list with this name already exists' : undefined}
                        autoFocus
                        maxLength={60}
                      />
                      );
                    })() : (
                      <span className="list-name">{list.name}</span>
                    )}
                    <span className="list-count">{list.players.length}p</span>
                    {renamingId === list.id ? (() => {
                      const conflict = renameName.trim() !== '' && lists.some(l => l.id !== renamingId && l.name === renameName.trim());
                      return (
                      <>
                        <button className="icon-btn" onClick={commitRename} disabled={conflict} title={conflict ? 'Name already taken' : 'Save name'}>✓</button>
                        <button className="icon-btn" onClick={() => setRenamingId(null)} title="Cancel">✕</button>
                      </>
                      );
                    })() : (
                      <>
                        <button className="btn-edit-list" onClick={() => setEditingListId(list.id)} title="Edit players in this list">Edit</button>
                        <button className="icon-btn" onClick={() => startRename(list)} title="Rename">✎</button>
                        <button className="icon-btn btn-danger" onClick={() => deleteList(list.id)} title="Delete list">✕</button>
                      </>
                    )}
                  </div>
                  {expanded.has(list.id) && (
                    <div className="list-players-preview">
                      {list.players.length === 0
                        ? <span className="lists-empty-small">Empty list</span>
                        : list.players.map((p, i) => (
                          <div key={i} className="preview-player-row">
                            <span className="preview-player-name">{p.name}</span>
                            <span className="preview-player-meta">{p.ranking.toFixed(1)} {p.gender}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              ))}
              <button
                className="btn-create-list"
                onClick={() => setEditingListId('__new__')}
              >
                + Create new list
              </button>
            </>
          )}

          {/* ── SELECT MODE ───────────────────────────────────── */}
          {mode === 'select' && (
            <>
              {lists.length === 0 && (
                <p className="lists-empty">No saved lists yet.</p>
              )}
              {lists.map(list => (
                <div key={list.id} className="list-item">
                  <div className="list-row">
                    <button
                      className="list-expand-btn"
                      onClick={() => toggleExpand(list.id)}
                      aria-label={expanded.has(list.id) ? 'Collapse' : 'Expand'}
                    >
                      {expanded.has(list.id) ? '▾' : '▸'}
                    </button>
                    <span className="list-name">{list.name}</span>
                    <span className="list-count">{list.players.length}p</span>
                    <button className="btn-edit-list" onClick={() => setEditingListId(list.id)} title="Edit players in this list">Edit</button>
                    <button
                      className="btn-load-all"
                      onClick={() => handleLoadAll(list.players)}
                      title="Replace current players with this list"
                    >
                      Load all
                    </button>
                  </div>
                  {expanded.has(list.id) && (
                    <div className="list-players-preview">
                      <label className="select-all-row">
                        <input
                          type="checkbox"
                          checked={list.players.length > 0 && list.players.every((_, i) => selectedKeys.has(makeKey(list.id, i)))}
                          onChange={() => toggleListSelect(list.id, list.players.length)}
                        />
                        <span>Select all</span>
                      </label>
                      {list.players.map((p, i) => (
                        <label key={i} className="select-player-row">
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(makeKey(list.id, i))}
                            onChange={() => togglePlayerKey(makeKey(list.id, i))}
                          />
                          <span className="preview-player-name">{p.name}</span>
                          <span className="preview-player-meta">{p.ranking.toFixed(1)} {p.gender}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── SAVE MODE ─────────────────────────────────────── */}
          {mode === 'save' && (() => {
            const saveNameTaken = saveName.trim() !== '' && lists.some(l => l.name === saveName.trim());
            return (
              <>
              <div className="save-section">
                <label className="save-label">List name</label>
                <input
                  className={`save-name-input${saveNameTaken ? ' input-conflict' : ''}`}
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="My List"
                  maxLength={60}
                  onKeyDown={e => { if (e.key === 'Enter' && !saveNameTaken) handleSaveNew(); }}
                  autoFocus
                />
                {saveNameTaken
                  ? <p className="name-taken-hint">A list named "{saveName.trim()}" already exists.</p>
                  : <p className="save-preview">{savePlayers.length} player{savePlayers.length !== 1 ? 's' : ''} will be saved</p>
                }
                <button
                  className="btn-save-new"
                  onClick={handleSaveNew}
                  disabled={savePlayers.length === 0 || saveNameTaken}
                >
                  Save as new list
                </button>
              </div>

              {lists.length > 0 && (
                <div className="replace-section">
                  <p className="replace-label">Or replace an existing list:</p>
                  {lists.map(list => (
                    <div key={list.id} className="replace-row">
                      <span className="list-name">{list.name}</span>
                      <span className="list-count">{list.players.length}p</span>
                      <button className="btn-replace" onClick={() => handleReplaceList(list.id)}>Replace</button>
                    </div>
                  ))}
                </div>
              )}
              </>
            );
          })()}

        </div>

        {mode === 'select' && selectedCount > 0 && (
          <div className="lists-panel-footer">
            <button className="btn-add-selected" onClick={handleAddSelected}>
              + Add selected ({selectedCount})
            </button>
          </div>
        )}
      </div>

      {/* ── Edit-list overlay ──────────────────────────────────── */}
      {editingListId && (() => {
        const isNew = editingListId === '__new__';
        const list = lists.find(l => l.id === editingListId);
        if (!list && !isNew) return null;
        const draft = editHistory[editHistoryIdx] ?? (isNew ? [] : list!.players);
        const otherLists = isNew ? lists : lists.filter(l => l.id !== editingListId);
        const canUndo = editHistoryIdx > 0;
        const canRedo = editHistoryIdx < editHistory.length - 1;
        const hasChanges = editHistoryIdx > 0;
        const effectiveName = editListName.trim() || (isNew ? 'New List' : (list?.name ?? ''));
        const nameConflict = lists.some(l => (isNew || l.id !== editingListId) && l.name === effectiveName);
        return (
          <div className="edit-list-backdrop" onClick={() => setEditingListId(null)}>
            <div className="edit-list-modal" onClick={e => e.stopPropagation()}>

              <div className="edit-list-header">
                {showEditAdd && (
                  <button className="icon-btn" onClick={() => { setShowEditAdd(false); setEditAddKeys(new Set()); }} title="Back">←</button>
                )}
                {showEditAdd
                  ? <span className="edit-list-title">Add from list</span>
                  : <input
                      className={`edit-list-name-input${nameConflict ? ' input-conflict' : ''}`}
                      value={editListName}
                      onChange={e => setEditListName(e.target.value)}
                      placeholder={isNew ? 'New list name' : list?.name}
                      maxLength={60}
                      title={nameConflict ? 'A list with this name already exists' : undefined}
                    />
                }
                <button className="lists-panel-close" onClick={() => setEditingListId(null)} aria-label="Close">✕</button>
              </div>

              {showEditAdd ? (
                /* ── Add-from-list sub-view ── */
                <>
                  <div className="edit-list-body">
                    {otherLists.length === 0 ? (
                      <p className="lists-empty">No other saved lists.</p>
                    ) : otherLists.map(other => (
                      <div key={other.id} className="list-item">
                        <div className="list-row">
                          <button className="list-expand-btn" onClick={() => toggleExpand(other.id)}>
                            {expanded.has(other.id) ? '▾' : '▸'}
                          </button>
                          <span className="list-name">{other.name}</span>
                          <span className="list-count">{other.players.length}p</span>
                          <button className="btn-load-all" onClick={() => handleEditAddAll(other)}>Add all</button>
                        </div>
                        {expanded.has(other.id) && (
                          <div className="list-players-preview">
                            <label className="select-all-row">
                              <input
                                type="checkbox"
                                checked={other.players.length > 0 && other.players.every((_, i) => editAddKeys.has(makeKey(other.id, i)))}
                                onChange={() => {
                                  const keys = Array.from({ length: other.players.length }, (_, i) => makeKey(other.id, i));
                                  const allSel = keys.every(k => editAddKeys.has(k));
                                  setEditAddKeys(prev => { const n = new Set(prev); if (allSel) keys.forEach(k => n.delete(k)); else keys.forEach(k => n.add(k)); return n; });
                                }}
                              />
                              <span>Select all</span>
                            </label>
                            {other.players.map((p, i) => (
                              <label key={i} className="select-player-row">
                                <input
                                  type="checkbox"
                                  checked={editAddKeys.has(makeKey(other.id, i))}
                                  onChange={() => {
                                    const key = makeKey(other.id, i);
                                    setEditAddKeys(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
                                  }}
                                />
                                <span className="preview-player-name">{p.name}</span>
                                <span className="preview-player-meta">{p.ranking.toFixed(1)} {p.gender}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {editAddKeys.size > 0 && (
                    <div className="lists-panel-footer">
                      <button className="btn-add-selected" onClick={handleEditAddSelected}>
                        + Add selected ({editAddKeys.size})
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* ── Normal edit view ── */
                <>
                  <div className="edit-list-body">
                    {showEditSave && (() => {
                      const copyName = editSaveCopyName.trim() || `Copy of ${effectiveName}`;
                      const copyNameTaken = lists.some(l => l.name === copyName);
                      return (
                      <div className="edit-save-row">
                        <div className="edit-save-name-wrap">
                          <input
                            className={`save-name-input${copyNameTaken ? ' input-conflict' : ''}`}
                            value={editSaveCopyName}
                            onChange={e => setEditSaveCopyName(e.target.value)}
                            placeholder={`Copy of ${effectiveName}`}
                            maxLength={60}
                            onKeyDown={e => { if (e.key === 'Enter' && !copyNameTaken) handleSaveCopy(); if (e.key === 'Escape') setShowEditSave(false); }}
                            autoFocus
                          />
                          {copyNameTaken && <span className="name-taken-hint">Name already exists.</span>}
                        </div>
                        <button className="btn-save-new" onClick={handleSaveCopy} disabled={copyNameTaken}>Save as new</button>
                        <button className="icon-btn" onClick={() => setShowEditSave(false)} title="Cancel">✕</button>
                      </div>
                      );
                    })()}
                    <PlayerList
                      players={draft}
                      onChange={pushEditHistory}
                      algorithm="manual"
                      assignedPlayerIds={new Set()}
                      hideGroupWarning={true}
                      draggable={false}
                      onAddFromList={() => { setEditAddKeys(new Set()); setShowEditAdd(true); }}
                      onSaveList={() => { setEditSaveCopyName(`Copy of ${effectiveName}`); setShowEditSave(true); }}
                    />
                  </div>
                  <div className="edit-list-footer">
                    <button className="btn-discard" onClick={() => setEditingListId(null)}>Discard</button>
                    <div className="edit-history-nav">
                      <button className="icon-btn" onClick={() => setEditHistoryIdx(i => i - 1)} disabled={!canUndo} title="Undo">◀</button>
                      <span className={`edit-history-pos${hasChanges ? ' has-changes' : ''}`}>{editHistoryIdx + 1}/{editHistory.length}</span>
                      <button className="icon-btn" onClick={() => setEditHistoryIdx(i => i + 1)} disabled={!canRedo} title="Redo">▶</button>
                    </div>
                    <button className="btn-save-edit" onClick={handleEditSave} disabled={nameConflict} title={nameConflict ? 'Name already taken' : undefined}>{isNew ? 'Create' : 'Save'}</button>
                  </div>
                </>
              )}

            </div>
          </div>
        );
      })()}
    </>
  );
}
