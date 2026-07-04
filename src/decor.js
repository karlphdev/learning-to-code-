// ═══════════════════════════════════════════════════════════════════
// DECOR — la vie du monde : créatures volantes, NPCs pingouins,
// Sisyphe miniature, murmures de l'absurde, chèvres de montagne.
// ═══════════════════════════════════════════════════════════════════
import { W, GROUND_Y, PS, MOUNTAIN_START } from './config.js';
import { ctx, G } from './state.js';
import { groundY } from './world.js';
import { drawSprite, SPR_SIDE } from './player.js';

// ── Créatures volantes psychédéliques ─────────────────────────────────
const fliers = [
  { x: 30,  y: 38, vx: 0.25,  amp: 6, ph: 0 },
  { x: 95,  y: 26, vx: -0.18, amp: 9, ph: 2 },
  { x: 140, y: 52, vx: 0.32,  amp: 5, ph: 4 },
];
export function updateFliers() {
  for (let f of fliers) {
    f.x += f.vx;
    if (f.x > W + 12) f.x = -12;
    if (f.x < -12)    f.x = W + 12;
  }
}
function drawFlier(f) {
  const tick = G.tick;
  let y = Math.round(f.y + Math.sin(tick * 0.08 + f.ph) * f.amp);
  let x = Math.round(f.x);
  let hue = (tick * 3 + f.ph * 60) % 360;
  let wing = ((tick >> 2) % 2) ? 3 : 1;
  // ailes
  ctx.fillStyle = `hsl(${(hue + 180) % 360},95%,70%)`;
  ctx.fillRect(x - 3, y + (wing === 3 ? 0 : 1), 3, wing);
  ctx.fillRect(x + 6, y + (wing === 3 ? 0 : 1), 3, wing);
  // corps
  ctx.fillStyle = `hsl(${hue},90%,58%)`; ctx.fillRect(x, y, 6, 4);
  ctx.fillStyle = `hsl(${(hue + 60) % 360},90%,64%)`; ctx.fillRect(x + 1, y - 2, 4, 2);
  // yeux
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 1, 2, 1); ctx.fillRect(x + 4, y + 1, 1, 1);
  ctx.fillStyle = '#000000'; ctx.fillRect(x + 2, y + 1, 1, 1); ctx.fillRect(x + 4, y + 1, 1, 1);
  // antennes
  ctx.fillStyle = `hsl(${(hue + 120) % 360},95%,75%)`;
  ctx.fillRect(x + 1, y - 3, 1, 1); ctx.fillRect(x + 4, y - 3, 1, 1);
}
export function drawFliers() { for (let f of fliers) drawFlier(f); }

// ── NPC pingouins (3 skins) ───────────────────────────────────────────
const npcs = [
  { wx: 60,  dir: 1,  skin: 'mil',   x0: 10,   x1: 180, f: 0, t: 0 },
  { wx: -90, dir: 1,  skin: 'rasta', x0: -160, x1: -20, f: 0, t: 0 },
  { wx: 260, dir: -1, skin: 'dbz',   x0: 150,  x1: 340, f: 0, t: 0 },
];
export function updateNPCs() {
  for (let n of npcs) {
    n.wx += n.dir * 0.4;
    if (n.wx < n.x0) { n.wx = n.x0; n.dir = 1; }
    if (n.wx > n.x1) { n.wx = n.x1; n.dir = -1; }
    if (++n.t >= 12) { n.t = 0; n.f = (n.f + 1) % 2; }
  }
}
function drawNPC(n) {
  let sx = Math.round(n.wx - G.camX); if (sx < -24 || sx > W + 24) return;
  let py = GROUND_Y - 10 + ((n.f === 1) ? 1 : 0);
  let flip = n.dir < 0;
  // ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(sx - 3, GROUND_Y, 14, 2);
  // mise à l'échelle ×2, ancrée sur les pieds (bas-centre du sprite 8×10)
  let pvx = sx + 4, pvy = py + 10;
  ctx.save();
  ctx.translate(pvx, pvy); ctx.scale(PS, PS); ctx.translate(-pvx, -pvy);
  // cape DBZ (derrière le corps)
  if (n.skin === 'dbz') {
    let cx = flip ? sx + 5 : sx - 1;
    ctx.fillStyle = '#e87000'; ctx.fillRect(cx, py + 2, 2, 7);
    ctx.fillStyle = '#c85a00'; ctx.fillRect(cx, py + 7, 2, 2);
  }
  // corps pingouin (réutilise le sprite du joueur)
  drawSprite(SPR_SIDE, sx, py, flip);
  // overlays par skin
  if (n.skin === 'mil') {
    // camo sur le ventre
    ctx.fillStyle = '#4a6a20'; ctx.fillRect(sx + 2, py + 4, 1, 1); ctx.fillRect(sx + 3, py + 6, 1, 1);
    ctx.fillStyle = '#2a4a10'; ctx.fillRect(sx + 3, py + 5, 1, 1);
    // béret
    ctx.fillStyle = '#2a5a1a'; ctx.fillRect(sx + 2, py - 1, 4, 2); ctx.fillRect(sx + 1, py, 2, 1);
    ctx.fillStyle = '#3a7a24'; ctx.fillRect(sx + 2, py - 1, 3, 1);
    ctx.fillStyle = '#1a3a0a'; ctx.fillRect(sx + 5, py - 2, 1, 1);
  } else if (n.skin === 'rasta') {
    // bonnet rouge/jaune/vert
    ctx.fillStyle = '#e01010'; ctx.fillRect(sx + 2, py - 2, 4, 1);
    ctx.fillStyle = '#f0d000'; ctx.fillRect(sx + 2, py - 1, 4, 1);
    ctx.fillStyle = '#10a010'; ctx.fillRect(sx + 2, py, 4, 1);
    // dreads
    ctx.fillStyle = '#3a2a10';
    ctx.fillRect(sx + 1, py + 1, 1, 4); ctx.fillRect(sx + 6, py + 1, 1, 4); ctx.fillRect(sx + 2, py + 1, 1, 2);
  } else if (n.skin === 'dbz') {
    // cheveux Saiyan jaunes
    ctx.fillStyle = '#f0d000';
    ctx.fillRect(sx + 1, py - 3, 6, 2);
    ctx.fillRect(sx + 1, py - 5, 1, 3); ctx.fillRect(sx + 3, py - 6, 1, 4);
    ctx.fillRect(sx + 5, py - 5, 1, 3); ctx.fillRect(sx + 6, py - 4, 1, 2);
    ctx.fillStyle = '#fff060'; ctx.fillRect(sx + 3, py - 6, 1, 2);
  }
  ctx.restore();
}
export function drawNPCs() { for (let n of npcs) drawNPC(n); }

// ── Sisyphe sur la surface ────────────────────────────────────────────
// Une petite silhouette pousse éternellement un rocher sur une butte ;
// arrivé en haut, il dévale, et tout recommence. Le mythe, en miniature.
const SISYPHE_X = 470;         // position monde de la butte
let sisypheT = 0;              // cycle 0→1 : pousse, puis le rocher retombe
export function updateSisyphe() {
  sisypheT += 0.004;
  if (sisypheT >= 1) sisypheT = 0;
}
export function drawSisyphe() {
  let sx = Math.round(SISYPHE_X - G.camX); if (sx < -30 || sx > W + 30) return;
  let baseY = GROUND_Y, top = 14, hw = 13;                 // butte de terre
  for (let y = 0; y < top; y++) {
    let half = Math.round(hw * (1 - y / top));
    ctx.fillStyle = '#5a3414'; ctx.fillRect(sx - half, baseY - y, half * 2, 1);
  }
  ctx.fillStyle = '#6a3c18'; ctx.fillRect(sx - hw, baseY - 1, hw * 2, 1);
  // progression : monte lentement (0→0.85) puis dévale vite (0.85→1)
  let p = sisypheT < 0.85 ? sisypheT / 0.85 : 1 - (sisypheT - 0.85) / 0.15;
  let rx = Math.round(sx - hw + (hw - 1) * p);              // rocher sur la face gauche
  let ry = Math.round(baseY - 1 - top * p);
  let fx = rx - 4;                                          // silhouette juste derrière
  ctx.fillStyle = '#13131c';                                // corps penché qui pousse
  ctx.fillRect(fx, ry - 5, 3, 5); ctx.fillRect(fx - 1, ry - 2, 1, 2); ctx.fillRect(fx + 1, ry - 6, 2, 2);
  ctx.fillStyle = '#7d7d86'; ctx.fillRect(rx, ry - 3, 3, 3); // le rocher
  ctx.fillStyle = '#9a9aa3'; ctx.fillRect(rx, ry - 3, 1, 1);
}

// ── Murmures de l'absurde ─────────────────────────────────────────────
// Des fragments de pensée flottent et s'effacent au-dessus du monde.
const WHISPER_LINES = ['absurde', 'et pourtant...', 'recommence', 'pourquoi ?',
                       'heureux ?', 'rien', 'encore', 'le vide'];
let whispers = [], whisperTimer = 0, whisperN = 0;
export function updateWhispers() {
  if (++whisperTimer >= 140) {
    whisperTimer = 0; whisperN++;
    whispers.push({ text: WHISPER_LINES[whisperN % WHISPER_LINES.length],
                    x: 16 + (whisperN * 53) % (W - 50), y: 28 + (whisperN * 37) % 56, life: 0 });
  }
  for (let w of whispers) w.life++;
  whispers = whispers.filter(w => w.life < 130);
}
export function drawWhispers() {
  ctx.textBaseline = 'top'; ctx.font = '6px monospace';
  for (let w of whispers) {
    let a = Math.sin(Math.PI * w.life / 130) * 0.55;        // apparition puis effacement
    ctx.fillStyle = 'rgba(232,232,255,' + a.toFixed(3) + ')';
    ctx.fillText(w.text, w.x, Math.round(w.y - w.life * 0.12));  // dérive vers le haut
  }
  ctx.textBaseline = 'alphabetic';
}

// ── Chèvres de montagne ───────────────────────────────────────────────
const goats = [];
for (let i = 0; i < 9; i++) {
  let cx = MOUNTAIN_START + 120 + i * 210 + ((i * 71) % 60);   // réparties le long de la montagne
  goats.push({ wx: cx, x0: cx - 55, x1: cx + 55, dir: (i % 2 ? 1 : -1), t: 0, f: 0, c: i % 3 });
}
export function updateGoats() {
  for (let g of goats) {
    g.wx += g.dir * 0.22;
    if (g.wx < g.x0) { g.wx = g.x0; g.dir = 1; }
    if (g.wx > g.x1) { g.wx = g.x1; g.dir = -1; }
    if (++g.t >= 16) { g.t = 0; g.f = (g.f + 1) % 2; }
  }
}
function drawGoat(g) {
  let sx = Math.round(g.wx - G.camX); if (sx < -14 || sx > W + 14) return;
  let fy = Math.round(groundY(g.wx));
  let flip = g.dir < 0;
  const body = ['#f4f1e8', '#eae3d4', '#dcd3c2'][g.c];
  const GW = 12;
  const P = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect((flip ? sx + (GW - x - w) : sx + x), fy + y, w, h); };
  // pattes (animées)
  P(2, -2, 1, 2, '#5a4a38'); P(8, -2, 1, 2, '#5a4a38');
  if (g.f) P(4, -2, 1, 2, '#5a4a38'); else P(6, -2, 1, 2, '#5a4a38');
  P(1, -6, 1, 1, body);                        // queue
  P(2, -7, 7, 5, body);                        // corps
  P(2, -8, 6, 1, body);
  P(9, -9, 2, 3, body);                        // cou/tête (avant = droite)
  P(10, -10, 2, 2, body);
  P(10, -7, 1, 2, '#dcd4c4');                  // barbiche
  P(10, -10, 1, 1, '#161616');                 // œil
  P(11, -12, 1, 2, '#3a2c1c'); P(10, -12, 1, 1, '#3a2c1c'); P(11, -13, 1, 1, '#2a1f12'); // cornes recourbées
}
export function drawGoats() { for (let g of goats) drawGoat(g); }
