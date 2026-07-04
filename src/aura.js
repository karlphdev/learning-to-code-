// ═══════════════════════════════════════════════════════════════════
// AURA — l'aura « Nen » du pingouin : une couleur par niveau, et des
// effets qui s'empilent niveau après niveau jusqu'au plein écran.
// ═══════════════════════════════════════════════════════════════════
import { W, H } from './config.js';
import { ctx, G } from './state.js';

// Palette d'aura : une couleur franche par niveau (cœur clair / bord saturé),
// puis à partir du niv 11 un arc-en-ciel qui tourne en continu.
function auraColors(lvl) {
  const TABLE = [
    ['140,240,255', '0,150,255'],    // 1  cyan électrique
    ['120,255,170', '0,200,90'],     // 2  vert émeraude
    ['255,240,120', '255,180,0'],    // 3  or
    ['255,160,80',  '255,90,0'],     // 4  orange braise
    ['255,110,110', '230,20,40'],    // 5  rouge
    ['255,120,220', '220,0,160'],    // 6  rose fuchsia
    ['200,120,255', '130,30,255'],   // 7  violet
    ['120,140,255', '40,60,255'],    // 8  indigo
    ['160,255,255', '40,220,220'],   // 9  turquoise
    ['255,255,255', '190,215,255'],  // 10 blanc pur
  ];
  if (lvl <= TABLE.length) return TABLE[lvl - 1];
  let h = (G.tick * 3 + lvl * 40) % 360;                // niv 11+ : arc-en-ciel animé
  return [hslRgb(h, 100, 78), hslRgb((h + 70) % 360, 100, 55)];
}
function hslRgb(h, s, l) {                              // hsl → 'r,g,b'
  s /= 100; l /= 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255);
  };
  return f(0) + ',' + f(8) + ',' + f(4);
}

// Aura SURPUISSANTE : l'intensité monte 4× plus vite que le niveau
// (l'aura du niv N = celle d'un ancien niv 4×N) et grossit niveau après
// niveau, sans plafond d'effets : halo géant → onde de choc → éclairs →
// colonne d'énergie → orbes tournants → pulsation plein écran.
export function drawAura(px, py, lvl) {
  if (lvl <= 0) return;
  const tick = G.tick;
  const p = lvl * 4;                                      // puissance effective
  let cx = px + 8, cy = py - 1;
  const pal = auraColors(lvl);
  const rgb = pal[0], rgb2 = pal[1];                      // bicolore : cœur / bord
  const flick = 0.75 + 0.25 * Math.sin(tick * 0.5 + cx * 0.3);
  const base = Math.min(10 + p * 1.6, 95) * flick;        // rayon du halo : vite énorme
  // ── halo : dégradé radial de plus en plus dense ──
  const inner = Math.min(0.35 + 0.02 * Math.min(p, 25), 0.85);
  let g = ctx.createRadialGradient(cx, cy, 1, cx, cy, base);
  g.addColorStop(0,    `rgba(${rgb},${inner.toFixed(3)})`);
  g.addColorStop(0.45, `rgba(${rgb2},${(inner * 0.45).toFixed(3)})`);
  g.addColorStop(1,    `rgba(${rgb2},0)`);
  ctx.fillStyle = g; ctx.fillRect(cx - base, cy - base, base * 2, base * 2);
  // ── colonne d'énergie qui monte vers le ciel (niv 4+) ──
  if (p >= 16) {
    let bw = 6 + Math.min(p - 16, 30) * 0.5;
    let bg = ctx.createLinearGradient(0, cy - 120, 0, cy);
    bg.addColorStop(0, `rgba(${rgb2},0)`);
    bg.addColorStop(1, `rgba(${rgb2},${(0.30 * flick).toFixed(3)})`);
    ctx.fillStyle = bg; ctx.fillRect(Math.round(cx - bw / 2), cy - 120, Math.round(bw), 120);
  }
  // ── volutes de flammes : nombreuses, hautes, de plus en plus grosses ──
  let nV = Math.min(6 + p, 46);
  for (let i = 0; i < nV; i++) {
    let fx = Math.round(cx + Math.sin(i * 1.7 + tick * 0.12) * base * 0.55);
    let span = base + 26;
    let fy = Math.round(cy - ((tick * (0.9 + (i % 3) * 0.3) + i * 11) % span));
    let sz = 1 + (i % 3 === 0 ? 1 : 0) + (p >= 20 && i % 5 === 0 ? 1 : 0);
    ctx.fillStyle = `rgba(${i % 2 ? rgb : rgb2},${(0.55 * flick).toFixed(3)})`;   // flammes bicolores
    ctx.fillRect(fx, fy, sz, sz + 1);
  }
  // ── onde de choc au sol : anneau qui s'élargit en boucle (niv 2+) ──
  if (p >= 8) {
    let ph = (tick % 46) / 46;
    let rw = Math.round(base * (0.4 + ph * 1.1));
    ctx.fillStyle = `rgba(${rgb2},${(0.5 * (1 - ph)).toFixed(3)})`;
    ctx.fillRect(cx - rw, py + 9, rw * 2, 1);
    ctx.fillRect(cx - Math.round(rw * 0.8), py + 10, Math.round(rw * 1.6), 1);
  }
  // ── éclairs en zigzag tout autour (niv 3+, de plus en plus nombreux) ──
  if (p >= 12) {
    let nE = Math.min(2 + ((p - 12) >> 2), 8);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let s = 0; s < nE; s++) {
      let ang = tick * 0.6 + s * (Math.PI * 2 / nE);
      let zx = cx + Math.cos(ang) * base * 0.7, zy = cy + Math.sin(ang) * base * 0.55;
      for (let k = 0; k < 4; k++) {
        ctx.fillRect(Math.round(zx), Math.round(zy), 1, 1);
        zx += Math.cos(ang) * 2 + ((tick + k * 7 + s * 13) % 3) - 1;
        zy += Math.sin(ang) * 2 + ((tick * 3 + k * 5 + s * 11) % 3) - 1;
      }
    }
  }
  // ── orbes blancs en orbite (niv 6+) ──
  if (p >= 24) {
    let orb = base * 1.1;
    for (let s = 0; s < 10; s++) {
      let ang = -tick * 0.15 + s * (Math.PI / 5);
      ctx.fillStyle = `rgba(255,255,255,${(0.35 + 0.25 * Math.sin(tick * 0.3 + s)).toFixed(3)})`;
      ctx.fillRect(Math.round(cx + Math.cos(ang) * orb), Math.round(cy + Math.sin(ang) * orb * 0.7), 2, 2);
    }
  }
  // ── niv 8+ : tout l'écran pulse à la couleur de l'aura ──
  if (p >= 32) {
    ctx.fillStyle = `rgba(${rgb2},${(0.05 + 0.04 * Math.sin(tick * 0.2)).toFixed(3)})`;
    ctx.fillRect(0, G.camY, W, H);        // (repère monde : décalé de camY pour couvrir l'écran)
  }
}
