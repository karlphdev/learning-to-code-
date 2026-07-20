// Génère les icônes PWA (PNG) sans aucune dépendance externe.
// Encodeur PNG minimal (truecolor + alpha, 8 bits) via zlib intégré à Node.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(OUT, { recursive: true });

// ── CRC32 (pour les chunks PNG) ──────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  // scanlines filtrées (filtre 0 par ligne)
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ── Dessin de la scène « Penguin World » ─────────────────────────────
function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  const disc = (cx, cy, rad, r, g, b, a = 255) => {
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++)
        if (x * x + y * y <= rad * rad) set(cx + x, cy + y, r, g, b, a);
  };

  // Fond : dégradé nuit (plein cadre → compatible maskable)
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = Math.round(8 + t * 20), g = Math.round(10 + t * 30), b = Math.round(40 + t * 55);
    for (let x = 0; x < size; x++) set(x, y, r, g, b, 255);
  }

  // Lune
  disc(size * 0.74 | 0, size * 0.26 | 0, size * 0.09 | 0, 235, 240, 255);

  // Montagne (triangle enneigé) — centrée dans la zone de sécurité maskable
  const baseY = size * 0.80 | 0;
  const peakX = size * 0.5 | 0;
  const peakY = size * 0.30 | 0;
  const half = size * 0.34 | 0;
  for (let y = peakY; y < baseY; y++) {
    const prog = (y - peakY) / (baseY - peakY);
    const spread = (half * prog) | 0;
    for (let x = peakX - spread; x <= peakX + spread; x++) {
      const snow = prog < 0.32;
      if (snow) set(x, y, 236, 244, 255);
      else set(x, y, 70, 96, 140);
    }
  }

  // Pingouin au pied de la montagne
  const pcx = size * 0.5 | 0, pcy = size * 0.72 | 0, pr = size * 0.11 | 0;
  disc(pcx, pcy, pr, 20, 22, 30);                       // corps noir
  disc(pcx, pcy + (pr * 0.15 | 0), (pr * 0.6) | 0, 245, 248, 255); // ventre blanc
  const eo = (pr * 0.38) | 0;
  disc(pcx - eo, pcy - (pr * 0.35 | 0), Math.max(1, pr * 0.13 | 0), 250, 250, 255); // yeux
  disc(pcx + eo, pcy - (pr * 0.35 | 0), Math.max(1, pr * 0.13 | 0), 250, 250, 255);
  disc(pcx - eo, pcy - (pr * 0.35 | 0), Math.max(1, pr * 0.06 | 0), 10, 10, 10);
  disc(pcx + eo, pcy - (pr * 0.35 | 0), Math.max(1, pr * 0.06 | 0), 10, 10, 10);
  disc(pcx, pcy - (pr * 0.12 | 0), Math.max(1, pr * 0.16 | 0), 255, 150, 40);        // bec orange

  return encodePNG(size, size, buf);
}

for (const s of [192, 512, 180, 32]) {
  const name = s === 180 ? 'apple-touch-icon.png' : s === 32 ? 'favicon-32.png' : `icon-${s}.png`;
  writeFileSync(join(OUT, name), draw(s));
  console.log('écrit', name, `(${s}×${s})`);
}
