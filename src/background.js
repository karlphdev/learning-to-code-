// ═══════════════════════════════════════════════════════════════════
// BACKGROUND — tout ce qui se dessine derrière ou devant le monde :
// ciel, soleil, nuages, crêtes lointaines, neige, brouillard, vignette.
// ═══════════════════════════════════════════════════════════════════
import { W, H, GROUND_Y } from './config.js';
import { ctx, G } from './state.js';

// ── Ciel ──────────────────────────────────────────────────────────────
let skyGrad;
export function buildGradients() {
  skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0,    '#2e6fd8');   // bleu profond au zénith
  skyGrad.addColorStop(0.45, '#58aef0');
  skyGrad.addColorStop(0.8,  '#8fd4f8');
  skyGrad.addColorStop(1,    '#c9edff');   // horizon pâle
}
export function drawSky(frac) {
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
  // le ciel pâlit en altitude
  if (frac > 0) { ctx.fillStyle = 'rgba(238,245,255,' + (0.55 * frac).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
}

// ── Soleil ────────────────────────────────────────────────────────────
export function drawSun() {
  const tick = G.tick;
  let sx = W - 40, sy = 10;
  // halo doux (rendu moderne)
  let cx2 = sx + 5, cy2 = sy + 5;
  let glow = ctx.createRadialGradient(cx2, cy2, 2, cx2, cy2, 36);
  glow.addColorStop(0,    'rgba(255,240,170,0.85)');
  glow.addColorStop(0.35, 'rgba(255,220,110,0.28)');
  glow.addColorStop(1,    'rgba(255,220,110,0)');
  ctx.fillStyle = glow; ctx.fillRect(cx2 - 36, cy2 - 36, 72, 72);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(sx, sy, 10, 10);
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(sx + 2, sy + 2, 6, 6);
  ctx.fillStyle = '#f0be10';
  ctx.fillRect(sx + 4, sy - 3, 2, 2); ctx.fillRect(sx + 4, sy + 11, 2, 2);
  ctx.fillRect(sx - 3, sy + 4, 2, 2); ctx.fillRect(sx + 11, sy + 4, 2, 2);
  if ((tick >> 4) % 2 === 0) {
    ctx.fillRect(sx - 2, sy - 2, 1, 1); ctx.fillRect(sx + 11, sy - 2, 1, 1);
    ctx.fillRect(sx - 2, sy + 11, 1, 1); ctx.fillRect(sx + 11, sy + 11, 1, 1);
  }
}

// ── Nuages ────────────────────────────────────────────────────────────
const CLOUD_SHAPES = [
  [[0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
   [0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0],
   [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
   [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
   [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
   [0,0,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0]],
  [[0,0,0,1,1,1,0,0,0,0,0,0],
   [0,0,1,1,1,1,1,1,0,0,0,0],
   [0,1,1,1,1,1,1,1,1,1,0,0],
   [0,1,1,1,1,1,1,1,1,0,0,0],
   [0,0,2,2,2,2,2,2,0,0,0,0]],
];
const clouds = [
  { x:10,  y:14, shape:0, speed:0.10 },
  { x:90,  y:28, shape:1, speed:0.07 },
  { x:130, y:10, shape:0, speed:0.16 },
  { x:50,  y:40, shape:1, speed:0.05 },
  { x:-20, y:22, shape:0, speed:0.13 },
  { x:175, y:18, shape:1, speed:0.08 },
  { x:215, y:44, shape:0, speed:0.12 },
  { x:245, y:32, shape:1, speed:0.06 },
];
export function drawClouds() {
  for (let c of clouds) {
    c.x += c.speed;
    let maxW = CLOUD_SHAPES[c.shape][0].length;
    if (c.x > W + maxW) c.x = -maxW;
    let spr = CLOUD_SHAPES[c.shape], cx = Math.round(c.x);
    for (let row = 0; row < spr.length; row++)
      for (let col = 0; col < spr[row].length; col++) {
        let p = spr[row][col]; if (!p) continue;
        ctx.fillStyle = p === 1 ? '#f8fdff' : '#b8d0e8';
        ctx.fillRect(cx + col, c.y + row, 1, 1);
      }
  }
}

// ── Crêtes de montagnes lointaines (parallaxe) ────────────────────────
export function drawMtnRidges() {
  for (let sx = 0; sx <= W; sx++) {                 // crête lointaine
    let wx = sx + G.camX * 0.25;
    let ry = Math.round(60 - G.camY * 0.12 + Math.sin(wx * 0.013) * 18 + Math.sin(wx * 0.05) * 5);
    if (ry < H) { ctx.fillStyle = '#cfe0f2'; ctx.fillRect(sx, ry, 1, H - ry); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, ry, 1, 2); }
  }
  for (let sx = 0; sx <= W; sx++) {                 // crête médiane (plus proche, plus sombre)
    let wx = sx + G.camX * 0.45;
    let ry = Math.round(86 - G.camY * 0.28 + Math.sin(wx * 0.02) * 15 + Math.sin(wx * 0.07) * 4);
    if (ry < H) { ctx.fillStyle = '#b7cde6'; ctx.fillRect(sx, ry, 1, H - ry); ctx.fillStyle = '#eef5fc'; ctx.fillRect(sx, ry, 1, 2); }
  }
}

// ── Météo de montagne ─────────────────────────────────────────────────
export function drawMtnSnowfall() {
  const tick = G.tick;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 46; i++) {
    let x = (i * 37 + tick * 0.7 + Math.sin(i * 1.7 + tick * 0.03) * 6) % W;
    let y = (i * 53 + tick * 1.3) % H;
    ctx.fillRect(x | 0, y | 0, 1, 1);
  }
}
export function drawMtnFog(frac) {
  const tick = G.tick;
  for (let i = 0; i < 4; i++) {                        // nappes de brouillard qui dérivent
    let a = (0.06 + 0.17 * frac) * (0.6 + 0.4 * Math.sin(tick * 0.01 + i * 1.7));
    let y = ((i * 34 + tick * 0.2 * (i + 1)) % (H + 40)) - 20;
    ctx.fillStyle = `rgba(238,244,252,${a})`; ctx.fillRect(0, y | 0, W, 15);
  }
  ctx.fillStyle = `rgba(240,246,253,${0.07 + 0.42 * frac})`; ctx.fillRect(0, 0, W, H); // voile global plus dense en altitude
}

// ── Vignette écran (rendu moderne) ────────────────────────────────────
export function drawVignette() {
  let g = ctx.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, W * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,12,30,0.38)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
