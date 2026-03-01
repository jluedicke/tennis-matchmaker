import './HelpModal.css';

interface Props {
  onClose: () => void;
}

export default function HelpModal({ onClose }: Props) {
  return (
    <div className="help-backdrop" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-header">
          <h2 className="help-title">Tennis Match Maker — Quick Guide</h2>
          <button className="help-close" onClick={onClose} aria-label="Close help">✕</button>
        </div>

        <div className="help-body">

          <h3>Players</h3>
          <ul>
            <li><strong>Add a player</strong> — enter a name, pick a USTA rating (1.5–7.0), toggle M/W, click <em>+ Add</em>.</li>
            <li><strong>Edit / Remove</strong> — use the ✎ and ✕ buttons on each row. Click <em>Save</em> or press Enter to confirm an edit.</li>
            <li><strong>Toggle gender</strong> — click the M/W badge directly in the table without entering edit mode.</li>
            <li><strong>Sort by rating</strong> — click the <em>Ranking</em> column header to cycle ascending / descending / original order.</li>
            <li><strong>Import / Export</strong> — the ↑/↓ buttons in the Players title bar read and write a plain-text file (one player per line: <code>Name,Rating,Gender</code>). Import replaces the current list.</li>
          </ul>

          <h3>Algorithms</h3>
          <ul>
            <li><strong>Match by ranking</strong> — sorts players by USTA rating and pairs the closest ratings together for balanced courts.</li>
            <li><strong>Mixed by ranking</strong> — same as above, but enforces one man + one woman per team.</li>
            <li><strong>Multiround match</strong> — generates several rounds. A small random jitter is applied to ratings each round so pairings vary while skill balance is preserved.</li>
            <li><strong>Multiround match mixed</strong> — multiround with jitter, plus the gender-mixed team constraint.</li>
            <li><strong>Multiround history aware</strong> — minimises repeat partnerships across rounds by tracking who has already played with whom.</li>
            <li><strong>Multiround history aware mixed</strong> — history-aware pairing with gender-mixed teams.</li>
            <li><strong>Match manually</strong> — drag players from the list on the left into the court slots on the right. Set the number of rounds with the − / + stepper.</li>
          </ul>

          <h3>Generating matches</h3>
          <ol>
            <li>Add at least 4 players. Multiples of 4 fill every court slot; any remainder is listed as unmatched.</li>
            <li>Choose an algorithm from the dropdown.</li>
            <li>For multi-round modes, set the number of rounds with the <strong>−</strong> / <strong>+</strong> stepper.</li>
            <li>Click <strong>⚡ Match</strong> to generate pairings.</li>
          </ol>

          <h3>Match results</h3>
          <ul>
            <li>Each court card shows <strong>Team A</strong> vs <strong>Team B</strong> with average ratings and the overall skill spread for that court.</li>
            <li><strong>Swap players</strong> — tap any player name to select it (highlighted), then tap any other player name to swap their positions. Tap the same player again to deselect. Works across teams and courts within the same round.</li>
            <li>Use the <strong>↓</strong> button in the Match Results title bar to export the current results as a PNG image.</li>
          </ul>

          <h3>Data &amp; settings</h3>
          <ul>
            <li>Your player list and theme preference are saved automatically in the browser and persist across sessions.</li>
            <li>Use <strong>Export</strong> (↓) to back up your player list and <strong>Import</strong> (↑) to restore it on another device.</li>
            <li>The <strong>☀️ / 🌙</strong> button in the top-right toggles between light and dark mode.</li>
          </ul>

        </div>
      </div>
    </div>
  );
}
