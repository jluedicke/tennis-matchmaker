import './HelpModal.css';

interface Props {
  onClose: () => void;
}

export default function SinglesHelpModal({ onClose }: Props) {
  return (
    <div className="help-backdrop" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-header">
          <h2 className="help-title">Tennis Match Maker — Singles Quick Guide</h2>
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
            <li><strong>Match by ranking</strong> — sorts players by USTA rating and pairs the closest ratings together: 1st vs 2nd, 3rd vs 4th, and so on.</li>
            <li><strong>Mixed by ranking</strong> — sorts men and women separately by rating and pairs the top-ranked man against the top-ranked woman, and so on. Any gender surplus falls back to the standard ranking algorithm.</li>
            <li><strong>Same gender by ranking</strong> — maximises same-gender courts (M vs M and W vs W). Men are paired by rating first, then women, with any odd remainder forming a mixed court.</li>
            <li><strong>Multiround match</strong> — generates several rounds. A small random jitter is applied to ratings each round so pairings vary while skill balance is preserved.</li>
            <li><strong>Multiround match mixed</strong> — multiround with jitter, plus the M vs W per-court constraint.</li>
            <li><strong>Multiround match same gender</strong> — multiround with jitter, maximising same-gender courts each round.</li>
            <li><strong>Multiround history aware</strong> — minimises rematches across rounds by tracking who has already faced whom.</li>
            <li><strong>Multiround history aware mixed</strong> — history-aware pairing with M vs W per court.</li>
            <li><strong>Multiround history aware same gender</strong> — history-aware pairing that maximises same-gender courts.</li>
            <li><strong>Match manually</strong> — drag players from the list on the left into the court slots on the right. Set the number of rounds with the − / + stepper.</li>
          </ul>

          <h3>Generating matches</h3>
          <ol>
            <li>Add at least 2 players. Multiples of 2 fill every court slot; any odd player out is listed as unmatched.</li>
            <li>Choose an algorithm from the dropdown.</li>
            <li>For multi-round modes, set the number of rounds with the <strong>−</strong> / <strong>+</strong> stepper.</li>
            <li>Click <strong>⚡ Match</strong> to generate pairings.</li>
          </ol>

          <h3>Match results</h3>
          <ul>
            <li>Each court card shows <strong>Player A vs Player B</strong> with their ratings and the skill spread for that match.</li>
            <li><strong>Swap players</strong> — tap any player name to select it (highlighted), then tap any other player name to swap their positions. Tap the same player again to deselect. Works across courts within the same round.</li>
            <li>Use the <strong>↓</strong> button in the Match Results title bar to export the current results as a PNG image.</li>
          </ul>

          <h3>Data &amp; settings</h3>
          <ul>
            <li>Your player list is shared with the Doubles mode and saved automatically in the browser.</li>
            <li>Use <strong>Export</strong> (↓) to back up your player list and <strong>Import</strong> (↑) to restore it on another device.</li>
            <li>The <strong>☀️ / 🌙</strong> button in the top-right toggles between light and dark mode.</li>
          </ul>

        </div>
      </div>
    </div>
  );
}
