// ═══════════════════════════════════════════════════════════════════
// BIKES — les 5 vélos : roues, cadre, lame pousse-rocher, vélo équipé.
// ═══════════════════════════════════════════════════════════════════
import { PS } from './config.js';
import { ctx, G } from './state.js';

export const BIKES = [
  { name: 'Cruiser rouge', frame: '#e02828', accent: '#ffd020', tire: '#101010' },
  { name: 'BMX bleu',      frame: '#1c80ff', accent: '#ffffff', tire: '#101010' },
  { name: 'VTT vert',      frame: '#1ca838', accent: '#c8ff60', tire: '#1c1c1c' },
  { name: 'Course or',     frame: '#f0b410', accent: '#fff088', tire: '#101010' },
  { name: 'Neon violet',   frame: '#a428f0', accent: '#34f0ff', tire: '#150515' },
];

// Une roue pixel : pneu (anneau) + jante + moyeu + rayons qui tournent
function drawWheel(cx, cy, tire, spin) {
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      const d = dx * dx + dy * dy;
      if (d <= 9 && d >= 5)      { ctx.fillStyle = tire;      ctx.fillRect(cx + dx, cy + dy, 1, 1); }
      else if (d <= 4 && d >= 2) { ctx.fillStyle = '#8a8a8a'; ctx.fillRect(cx + dx, cy + dy, 1, 1); }
    }
  // rayons : 4 marques à r≈2 qui pivotent avec `spin`
  ctx.fillStyle = '#d8d8d8';
  for (let a = 0; a < 4; a++) {
    const ang = spin + a * Math.PI / 2;
    ctx.fillRect(Math.round(cx + Math.cos(ang) * 2), Math.round(cy + Math.sin(ang) * 2), 1, 1);
  }
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(cx, cy, 1, 1);   // moyeu
}

// Un vélo dans une boîte de 16×9, coin haut-gauche en (x0,y0)
export function drawBike(x0, y0, b, spin) {
  spin = spin || 0;
  const wy = y0 + 5, w1 = x0 + 4, w2 = x0 + 12;
  drawWheel(w1, wy, b.tire, spin);
  drawWheel(w2, wy, b.tire, spin);
  ctx.fillStyle = b.frame;
  ctx.fillRect(x0 + 7,  y0 + 2, 1, 4);   // tube de selle
  ctx.fillRect(x0 + 7,  y0 + 2, 5, 1);   // tube horizontal (selle → guidon)
  ctx.fillRect(x0 + 11, y0 + 1, 1, 4);   // tube de direction / fourche
  ctx.fillRect(x0 + 4,  wy,     4, 1);   // base (roue arrière → pédalier)
  ctx.fillRect(x0 + 8,  y0 + 3, 4, 1);   // tube diagonal (pédalier → direction)
  ctx.fillRect(x0 + 8,  y0 + 4, 1, 1);
  ctx.fillStyle = b.accent; ctx.fillRect(x0 + 6, y0 + 1, 3, 1);  // selle
  ctx.fillRect(x0 + 10, y0, 4, 1); ctx.fillRect(x0 + 13, y0, 1, 2); // guidon
  ctx.fillStyle = '#5a5a5a'; ctx.fillRect(x0 + 8, wy, 1, 2);     // pédalier
  // ── Pousse-rocher : lame métallique montée à l'avant ──
  ctx.fillStyle = '#8a8e98'; ctx.fillRect(x0 + 12, y0 + 3, 4, 1);   // bras de support vers la fourche
  ctx.fillStyle = '#b8bcc8'; ctx.fillRect(x0 + 14, y0,     2, 9);   // lame verticale
  ctx.fillRect(x0 + 13, y0 + 7, 3, 2);                              // bas recourbé (racle le sol)
  ctx.fillStyle = b.accent; ctx.fillRect(x0 + 14, y0, 2, 1);        // liseré aux couleurs du vélo
}

// Un vélo agrandi ×PS, orienté selon le sens de marche, roues qui tournent.
// baseY suit la verticale du cycliste (le vélo saute avec lui).
export function drawBikeScaled(cx, baseY, b, flip, spin) {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(flip ? -PS : PS, PS);        // miroir horizontal quand on va à gauche
  ctx.translate(-cx, -baseY);
  drawBike(cx - 8, baseY - 8, b, spin);  // roues posées sur baseY
  ctx.restore();
}

// Le vélo équipé par le joueur
export function drawEquippedBike(cx, baseY, flip, spin) {
  drawBikeScaled(cx, baseY, BIKES[G.equippedBike], flip, spin);
}

// Vignette de vélo pour l'inventaire (échelle ×1.6)
export function drawBikeThumb(x, y, b) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(1.6, 1.6); ctx.translate(-x, -y);
  drawBike(x, y, b);
  ctx.restore();
}
