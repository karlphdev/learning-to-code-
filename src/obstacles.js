// ═══════════════════════════════════════════════════════════════════
// OBSTACLES — les pics de glace sur la pente : ils bloquent le pingouin
// ET la balle. Il faut sauter par-dessus (avec la balle : skill niv 2).
// ═══════════════════════════════════════════════════════════════════
import { W } from './config.js';
import { ctx, G } from './state.js';
import { groundY } from './world.js';
import { powerLvl } from './progression.js';

const ROCKS = [
  { x: 1050, w: 10, h: 8 }, { x: 1420, w: 12, h: 9 }, { x: 1780, w: 10, h: 8 },
  { x: 2120, w: 12, h: 9 }, { x: 2450, w: 10, h: 8 }, { x: 2650, w: 12, h: 9 },
];

// De plus en plus de pics actifs en montant de niveau (aucun avant le niv 2)
export function activeRocks() {
  return powerLvl() < 2 ? [] : ROCKS.slice(0, Math.min(powerLvl(), ROCKS.length));
}

export function collidePlayerRocks() {
  const player = G.player;
  for (let r of activeRocks()) {
    if (player.wy + 10 <= groundY(r.x) - r.h + 1) continue;   // assez haut : passe au-dessus
    let cx = player.wx + 4, half = r.w / 2 + 6;
    if (Math.abs(cx - r.x) < half)
      player.wx = (cx < r.x ? r.x - half : r.x + half) - 4;
  }
}

function drawRock(r) {
  let sx = Math.round(r.x - G.camX); if (sx < -16 || sx > W + 16) return;
  let gy = Math.round(groundY(r.x));
  for (let y = 0; y < r.h; y++) {                    // pointe de glace translucide
    let half = Math.round((r.w / 2) * (y / r.h)) + 1;
    ctx.fillStyle = y < 2 ? '#eaf6ff' : (y % 2 ? '#7cc4e8' : '#5aaad8');
    ctx.fillRect(sx - half, gy - r.h + y, half * 2, 1);
  }
  ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, gy - r.h + 1, 1, 3);            // reflet
  ctx.fillStyle = 'rgba(90,140,190,0.3)'; ctx.fillRect(sx - r.w / 2, gy, r.w, 2); // ombre bleutée
}
export function drawRocks() { for (let r of activeRocks()) drawRock(r); }
