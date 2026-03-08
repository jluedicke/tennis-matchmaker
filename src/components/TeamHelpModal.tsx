import './HelpModal.css';

interface Props {
  onClose: () => void;
}

export default function TeamHelpModal({ onClose }: Props) {
  return (
    <div className="help-backdrop" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-header">
          <h2 className="help-title">Tennis Match Maker — Team Quick Guide</h2>
          <button className="help-close" onClick={onClose} aria-label="Close help">✕</button>
        </div>

        <div className="help-body">

          <h3>Teams &amp; players</h3>
          <ul>
            <li><strong>Team names</strong> — click the name field at the top of each team card and type to rename the team.</li>
            <li><strong>Add a player</strong> — enter a name, pick a USTA rating (1.5–7.0), toggle M/W, click <em>+ Add</em>.</li>
            <li><strong>Edit / Remove</strong> — use the ✎ and ✕ buttons on each row. Click <em>Save</em> or press Enter to confirm an edit.</li>
            <li><strong>Remove all</strong> — click the ✕ button in the table header (above the individual Remove buttons). It lights up red on hover.</li>
            <li><strong>Toggle gender</strong> — click the M/W badge directly in the table without entering edit mode.</li>
            <li><strong>Sort by rating</strong> — click the <em>Ranking</em> column header to cycle ascending / descending / original order.</li>
            <li><strong>Import / Export</strong> — the ↑/↓ buttons in the Players title bar read and write a plain-text file (one player per line: <code>Name,Rating,Gender</code>). Import replaces the current list.</li>
            <li><strong>Save list (⊞)</strong> — save the current players as a named list for reuse.</li>
            <li><strong>Load from list (☰)</strong> — browse saved lists; <em>Load all</em> replaces the current team roster, or expand a list and check individual players to append.</li>
          </ul>

          <h3>Player Lists</h3>
          <ul>
            <li>Use the <strong>☰</strong> button in the top-right header to open the Player Lists panel, where you can view, rename, delete, and edit all saved lists.</li>
            <li>The <strong>Edit</strong> button on any list opens a full player editor for that list. Changes are not saved until you click <strong>Save</strong> in the overlay footer.</li>
            <li><strong>Undo / Redo</strong> — the <strong>◀ N/M ▶</strong> navigator in the edit overlay footer lets you step back and forward through your edits.</li>
            <li>Click <strong>Discard</strong> to close without saving.</li>
          </ul>

          <h3>Match formats</h3>
          <ul>
            <li><strong>USTA League (2S + 3D)</strong> — 2 singles courts followed by 3 doubles courts.</li>
            <li><strong>USTA Mixed Doubles (3 Mixed D)</strong> — 3 mixed doubles courts.</li>
            <li><strong>Davis Cup</strong> — 2 singles and 1 doubles on days 1–2; courts 4 &amp; 5 (day 3) are automatically derived by reversing the singles draw from day 1.</li>
            <li><strong>World Team Tennis</strong> — Men's singles, Women's singles, Men's doubles, Women's doubles, Mixed doubles.</li>
            <li><strong>College Tennis (3D + 6S)</strong> — 3 doubles courts scored as a set, then 6 singles courts.</li>
            <li><strong>Monday Night Tennis</strong> — rotating doubles (with optional singles) over multiple rounds; supports both manual and algorithmic assignment (see below).</li>
          </ul>

          <h3>Filling courts (all formats except Monday Night Tennis)</h3>
          <ul>
            <li>Drag a player from one of the team lists and drop them into any court slot.</li>
            <li>Players can appear on multiple courts (e.g. a player can play both singles and doubles).</li>
            <li><strong>Cross-team validation</strong> — dropping a Team 1 player into a Team 2 slot (or vice versa) is blocked with a red flash.</li>
            <li><strong>Davis Cup auto courts</strong> — courts 4 &amp; 5 are read-only and update automatically when courts 1 &amp; 2 are filled.</li>
            <li>Click <strong>✕ Clear</strong> to remove all assignments at once.</li>
          </ul>

          <h3>Monday Night Tennis — algorithms</h3>
          <p>Choose an algorithm from the second dropdown (shown when Monday Night Tennis is selected).</p>
          <ul>
            <li><strong>Match by ranking</strong> — sorts each team by rating and pairs adjacent players as doubles partners; best pairs face each other across teams.</li>
            <li><strong>Mixed by ranking</strong> — same as above, but forms 1M + 1W pairs within each team where possible.</li>
            <li><strong>Multiround match</strong> — generates several rounds with a small jitter applied to ratings so partners rotate while skill balance is preserved.</li>
            <li><strong>Multiround match mixed</strong> — multiround with jitter, plus the 1M + 1W per pair constraint.</li>
            <li><strong>Multiround history aware</strong> — minimises repeat partnerships across rounds by tracking who has already played together within each team.</li>
            <li><strong>Multiround history aware mixed</strong> — history-aware pairing with the 1M + 1W constraint.</li>
            <li><strong>Match manually</strong> — courts are pre-generated from the player counts; drag players into slots yourself.</li>
          </ul>

          <h3>Monday Night Tennis — generating matches</h3>
          <ol>
            <li>Select <em>Monday Night Tennis</em> as the format, then choose an algorithm.</li>
            <li>For multi-round modes, set the number of rounds with the <strong>−</strong> / <strong>+</strong> stepper.</li>
            <li>Click <strong>Match</strong> to generate pairings.</li>
          </ol>

          <h3>Monday Night Tennis — court layout</h3>
          <ul>
            <li>Courts are calculated from the smaller team size: one doubles court per 2 players on the smaller side, plus one singles court if that count is odd.</li>
            <li>Example: 7 vs 7 → 3 doubles + 1 singles (14 players). 6 vs 8 → 3 doubles, no singles (2 players from the larger team sit out).</li>
            <li>Doubles partners are always from the <strong>same team</strong>; the opposing pair is always from the other team.</li>
          </ul>

          <h3>Monday Night Tennis — swap players</h3>
          <ul>
            <li>After generating algorithmic results, tap any player chip to select it (highlighted).</li>
            <li>Then tap another player chip from the <strong>same team in the same round</strong> to swap their positions.</li>
            <li>Tap the same player again to deselect without swapping.</li>
            <li>Swapping across teams or across rounds is not permitted.</li>
          </ul>

          <h3>Match results</h3>
          <ul>
            <li>Each court card shows the two team sections separated by a <em>vs</em> divider.</li>
            <li>Use the <strong>↓</strong> button in the Match Results title bar to export the current results as a PNG image.</li>
          </ul>

          <h3>Data &amp; settings</h3>
          <ul>
            <li>Team names, players, format, and court assignments are saved automatically in the browser and restored on your next visit.</li>
            <li>All saved player lists are available from any mode via the <strong>☰</strong> button in the header.</li>
            <li>Use <strong>Export</strong> (↓) to back up a player list and <strong>Import</strong> (↑) to restore it on another device.</li>
            <li>The <strong>☀️ / 🌙</strong> button in the top-right toggles between light and dark mode.</li>
          </ul>

        </div>
      </div>
    </div>
  );
}
