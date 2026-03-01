#!/usr/bin/env node
/**
 * Generate PNG icons for the Tennis Match Maker PWA.
 * Uses only Node.js built-ins (zlib, fs, path) — no external dependencies.
 *
 * Outputs:
 *   public/icon-192.png   (192×192)
 *   public/icon-512.png   (512×512)
 *   public/apple-touch-icon.png (180×180)
 */

import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG chunk ──────────────────────────────────────────────────────────────
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

// ── PNG IHDR ───────────────────────────────────────────────────────────────
function ihdr(w, h) {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0);
  b.writeUInt32BE(h, 4);
  b[8] = 8;  // bit depth
  b[9] = 2;  // colour type: RGB
  b[10] = 0; b[11] = 0; b[12] = 0;
  return chunk('IHDR', b);
}

// ── Draw pixel canvas ──────────────────────────────────────────────────────
/**
 * Returns a Uint8Array of RGBA pixels (row-major).
 * Design: tennis-green circle, white S-curve seams, dark background.
 */
function drawTennisBall(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;       // ball radius (leaves small padding)
  const bgR = 0x1a, bgG = 0x1a, bgB = 0x2e;   // dark navy background

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > r + 1) {
        // Background
        pixels[idx]     = bgR;
        pixels[idx + 1] = bgG;
        pixels[idx + 2] = bgB;
        pixels[idx + 3] = 255;
        continue;
      }

      // Anti-alias edge
      const edgeAlpha = dist > r - 1 ? 1 - (dist - (r - 1)) : 1;

      // Tennis ball colour: yellow-green
      let pr = 0xb8, pg = 0xd4, pb = 0x00;

      // Seam: S-curve defined as x ≈ A*sin(π*y/size*freq)
      // Two seams — one centred left-of-middle, one right-of-middle
      const seamWidth = size * 0.045;
      const freq = 1.4;
      const amp = size * 0.18;

      // Seam 1: left half seam
      const s1x = cx - amp * 0.5 + amp * Math.sin(Math.PI * (y / size) * freq * 2 - Math.PI * 0.5);
      // Seam 2: right half (mirror)
      const s2x = cx + amp * 0.5 - amp * Math.sin(Math.PI * (y / size) * freq * 2 - Math.PI * 0.5);

      const onSeam1 = Math.abs(x - s1x) < seamWidth && dist < r;
      const onSeam2 = Math.abs(x - s2x) < seamWidth && dist < r;

      if (onSeam1 || onSeam2) {
        // Soft white seam with smooth edges
        const seamDist = onSeam1 ? Math.abs(x - s1x) : Math.abs(x - s2x);
        const seamStrength = Math.max(0, 1 - seamDist / seamWidth);
        pr = Math.round(pr + (255 - pr) * seamStrength);
        pg = Math.round(pg + (255 - pg) * seamStrength);
        pb = Math.round(pb + (255 - pb) * seamStrength);
      }

      // Simple radial highlight (top-left)
      const hlDist = Math.sqrt((dx + r * 0.3) ** 2 + (dy + r * 0.3) ** 2);
      const hl = Math.max(0, 1 - hlDist / (r * 0.55));
      pr = Math.min(255, Math.round(pr + hl * 40));
      pg = Math.min(255, Math.round(pg + hl * 40));
      pb = Math.min(255, Math.round(pb + hl * 20));

      pixels[idx]     = Math.round(pr * edgeAlpha + bgR * (1 - edgeAlpha));
      pixels[idx + 1] = Math.round(pg * edgeAlpha + bgG * (1 - edgeAlpha));
      pixels[idx + 2] = Math.round(pb * edgeAlpha + bgB * (1 - edgeAlpha));
      pixels[idx + 3] = 255;
    }
  }
  return pixels;
}

// ── Encode PNG ─────────────────────────────────────────────────────────────
function encodePng(size, pixels) {
  // Build raw image data: filter byte (0 = None) + RGB row
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * rowSize + 1 + x * 3;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, ihdr(size, size), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ── Main ───────────────────────────────────────────────────────────────────
const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

for (const { size, name } of sizes) {
  const pixels = drawTennisBall(size);
  const png = encodePng(size, pixels);
  const outPath = path.join(publicDir, name);
  fs.writeFileSync(outPath, png);
  console.log(`Written ${outPath} (${png.length} bytes)`);
}
