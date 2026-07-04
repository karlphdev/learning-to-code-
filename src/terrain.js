// ═══════════════════════════════════════════════════════════════════
// TERRAIN — le sol peint colonne par colonne (herbe → roche → neige),
// le drapeau du sommet, et toute la végétation de la jungle.
// ═══════════════════════════════════════════════════════════════════
import { W, H, GROUND_Y, SUMMIT_X, SUMMIT_H, MOUNTAIN_START } from './config.js';
import { ctx, G } from './state.js';
import { smooth, groundY } from './world.js';

// Sol continu, peint colonne par colonne. La couche dépend de l'ALTITUDE de la colonne :
// herbe en bas → roche nue → neige en haut, avec des lisières tramées (ligne de neige naturelle).
export function drawTerrain() {
  let bottom = G.camY + H + 2, top = G.camY - 2;     // bornes verticales de la vue, en monde
  for (let sx = 0; sx <= W; sx++) {
    let wx = sx + G.camX;
    let gy = groundY(wx);
    let sy = Math.round(gy);
    if (sy >= bottom) continue;
    let y = sy < top ? top : sy;
    let cf = (GROUND_Y - gy) / SUMMIT_H; if (cf < 0) cf = 0; if (cf > 1) cf = 1;   // altitude de CETTE colonne
    let h = (((wx * 374761) >>> 0) % 1000) / 1000;                                 // bruit déterministe par colonne
    let grassAmt = 1 - smooth(cf, 0.02, 0.14);     // l'herbe s'efface en montant
    let snowAmt = smooth(cf, 0.24, 0.58);          // la neige apparaît en altitude
    let rocky = h < smooth(cf, 0.05, 0.20);        // terre → roche (tramé)
    // masse souterraine : terre brune en bas, roche grise plus haut
    ctx.fillStyle = rocky ? '#888c98' : '#7a4820'; ctx.fillRect(sx, y, 1, bottom - y);
    ctx.fillStyle = rocky ? '#70737e' : '#6a3c18'; ctx.fillRect(sx, sy + 7, 1, bottom - sy - 7);
    if (rocky && ((wx * 13) & 7) === 0) { ctx.fillStyle = '#7c808b'; ctx.fillRect(sx, sy + 9, 1, bottom - sy - 9); }
    // couche de surface
    if (h < snowAmt) {                              // neige
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 1, 3);
      ctx.fillStyle = '#e2ecf7'; ctx.fillRect(sx, sy + 3, 1, 3);
      if (((wx * 7) & 15) === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy - 1, 1, 1); }
    } else if (h < grassAmt) {                      // herbe
      ctx.fillStyle = '#2ab810'; ctx.fillRect(sx, sy, 1, 4);
      ctx.fillStyle = '#3cd820'; ctx.fillRect(sx, sy, 1, 1);
    } else {                                        // roche nue (contreforts)
      ctx.fillStyle = '#9aa0ac'; ctx.fillRect(sx, sy, 1, 2);
    }
  }
  // drapeau au sommet
  let fxs = Math.round(SUMMIT_X - G.camX);
  if (fxs > -10 && fxs < W + 10) {
    let fy = Math.round(groundY(SUMMIT_X));
    ctx.fillStyle = '#6a4a28'; ctx.fillRect(fxs, fy - 15, 1, 15);
    ctx.fillStyle = ((G.tick >> 3) % 2) ? '#e02828' : '#ff4040'; ctx.fillRect(fxs + 1, fy - 15, 6, 4);
  }
}

// ── Arbres du premier plan ────────────────────────────────────────────
const trees = [];
for (let i = -20; i <= 20; i++) {
  if (Math.abs(i) < 2) continue;
  let wx = i * 45 + ((i * 137) % 15);
  if (wx >= 670) continue;                 // les arbres s'arrêtent au pied de la montagne
  trees.push({ x: wx, h: 14 + ((i * 73) % 8) });
}
function drawTree(wx, th) {
  let sx = wx - G.camX;
  if (sx < -20 || sx > W + 4) return;
  let ty = GROUND_Y - th;
  ctx.fillStyle = '#6a3c12'; ctx.fillRect(sx + 3, GROUND_Y - 5, 2, 5);
  ctx.fillStyle = '#0c3a06'; ctx.fillRect(sx,     ty + 4, 8, th - 4);
  ctx.fillStyle = '#1e6812'; ctx.fillRect(sx + 1, ty + 2, 6, th - 2);
  ctx.fillStyle = '#30a020'; ctx.fillRect(sx + 2, ty,     4, th - 1);
  ctx.fillStyle = '#44c030'; ctx.fillRect(sx + 3, ty,     2, 3);
}
export function drawTrees() { for (let t of trees) drawTree(t.x, t.h); }

// ── Jungle : arrière-plan (parallax) ──────────────────────────────────
const bgTrees = [];
for (let i = -15; i <= 15; i++) bgTrees.push({ x: i * 60 + ((i * 91) % 20), h: 42 + ((i * 53) % 24) });
export function drawJungleBack() {
  // brume verte à l'horizon
  ctx.fillStyle = 'rgba(20,120,40,0.22)'; ctx.fillRect(0, GROUND_Y - 30, W, 30);
  for (let t of bgTrees) {
    let sx = Math.round(t.x - G.camX * 0.5); if (sx < -30 || sx > W + 30) continue;
    let ty = GROUND_Y - t.h;
    ctx.fillStyle = '#1e5028'; ctx.fillRect(sx + 5, ty + t.h - 22, 3, 22);
    ctx.fillStyle = '#15662a'; ctx.fillRect(sx - 2, ty, 18, t.h - 12);
    ctx.fillStyle = '#1d7a32'; ctx.fillRect(sx, ty - 3, 14, t.h - 16);
    ctx.fillStyle = '#249040'; ctx.fillRect(sx + 2, ty - 5, 10, 8);
  }
}

// ── Jungle : plan médian (lianes + buissons) ──────────────────────────
const vines = [];
for (let i = -20; i <= 20; i++) vines.push({ x: i * 37 + ((i * 61) % 15), len: 18 + ((i * 43) % 22) });
const bushes = [];
for (let i = -25; i <= 25; i++) { if (((i * 7) % 3) !== 0) continue; bushes.push({ x: i * 30 + ((i * 51) % 17) }); }
function drawBush(sx) {
  let b = GROUND_Y;
  ctx.fillStyle = '#147a24'; ctx.fillRect(sx, b - 6, 12, 6);
  ctx.fillStyle = '#1c9a30'; ctx.fillRect(sx + 1, b - 8, 10, 4);
  ctx.fillStyle = '#28b840'; ctx.fillRect(sx + 3, b - 9, 6, 3);
  ctx.fillStyle = '#f04040'; ctx.fillRect(sx + 2, b - 4, 1, 1); ctx.fillRect(sx + 8, b - 5, 1, 1);
}
export function drawJungleMid() {
  const tick = G.tick;
  // lianes pendantes depuis la canopée
  for (let v of vines) {
    let sx = Math.round(v.x - G.camX); if (sx < -4 || sx > W + 4) continue;
    let sway = Math.round(Math.sin(tick * 0.04 + v.x) * 1.5);
    ctx.fillStyle = '#1c6e2c';
    for (let y = 0; y < v.len; y++) {
      let off = Math.round(Math.sin(y * 0.4) * 1) + (y > v.len - 6 ? sway : 0);
      ctx.fillRect(sx + off, y, 1, 1);
    }
    ctx.fillStyle = '#2a9a3e'; ctx.fillRect(sx - 1 + sway, v.len, 3, 2);
  }
  // buissons
  for (let bu of bushes) { let sx = bu.x - G.camX; if (sx < -14 || sx > W + 8) continue; drawBush(sx); }
}

// ── Plantes venimeuses rouges ─────────────────────────────────────────
const poisonPlants = [];
for (let i = -18; i <= 18; i++) {
  if (((i * 5 + 2) % 4) !== 0) continue;
  poisonPlants.push({ x: i * 40 + ((i * 67) % 21) });
}
function drawPoisonPlant(wx) {
  const tick = G.tick;
  let sx = wx - G.camX; if (sx < -12 || sx > W + 4) return;
  let b = GROUND_Y;
  // tige
  ctx.fillStyle = '#0a4a0a'; ctx.fillRect(sx + 3, b - 9, 2, 9);
  // feuilles
  ctx.fillStyle = '#0c5e0c'; ctx.fillRect(sx + 1, b - 6, 2, 1); ctx.fillRect(sx + 5, b - 7, 2, 1);
  // bulbe rouge
  ctx.fillStyle = '#a00808'; ctx.fillRect(sx + 1, b - 13, 6, 4);
  ctx.fillStyle = '#e81818'; ctx.fillRect(sx + 2, b - 13, 4, 2);
  ctx.fillStyle = '#ff5050'; ctx.fillRect(sx + 2, b - 13, 1, 1);
  // gueule sombre + crochets
  ctx.fillStyle = '#350000'; ctx.fillRect(sx + 3, b - 11, 2, 1);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 2, b - 10, 1, 1); ctx.fillRect(sx + 5, b - 10, 1, 1);
  // goutte de venin
  ctx.fillStyle = '#8cf000';
  if ((tick >> 4) % 3 === 0) ctx.fillRect(sx + 4, b - 8, 1, 2);
}
export function drawPoisonPlants() { for (let pp of poisonPlants) drawPoisonPlant(pp.x); }

// ── Herbes hautes au premier plan ─────────────────────────────────────
export function drawForegroundGrass() {
  const tick = G.tick;
  for (let i = 0; i < 240; i++) {
    let wx = i * 6 - 700; if (wx >= MOUNTAIN_START) break;   // l'herbe s'arrête au pied de la montagne
    let sx = wx - G.camX; if (sx < -2 || sx > W + 2) continue;
    let hh = 4 + ((i * 17) % 7);
    let sway = Math.round(Math.sin(tick * 0.05 + i) * 1);
    ctx.fillStyle = (i % 2) ? '#1c9a2c' : '#23b034';
    ctx.fillRect(sx + sway, GROUND_Y - hh, 1, hh);
    ctx.fillStyle = '#2fcf44'; ctx.fillRect(sx + sway, GROUND_Y - hh, 1, 1);
  }
}
