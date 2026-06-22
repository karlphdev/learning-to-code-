const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Résolution logique du jeu (basse résolution Game Boy)
const W = 160, H = 144;

// Le backing store du canvas matche exactement la taille CSS du conteneur,
// puis on scale le contexte pour dessiner en coordonnées logiques 160x144.
function fitCanvas() {
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  canvas.width = cssW;
  canvas.height = cssH;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(cssW / W, 0, 0, cssH / H, 0, 0);
}
window.addEventListener('resize', fitCanvas);

const GROUND_Y = 118, GRAVITY = 0.28, JUMP_F = -4.5;

// ── Arbres ────────────────────────────────────────────────────────────
const trees = [];
for (let i = -20; i <= 20; i++) {
  if (Math.abs(i) < 2) continue;
  let wx = i * 45 + ((i * 137) % 15);
  trees.push({ x: wx, h: 14 + ((i * 73) % 8) });
}
function drawTree(wx, th, camX) {
  let sx = wx - camX;
  if (sx < -20 || sx > W + 4) return;
  let ty = GROUND_Y - th;
  ctx.fillStyle = '#6a3c12'; ctx.fillRect(sx + 3, GROUND_Y - 5, 2, 5);
  ctx.fillStyle = '#0c3a06'; ctx.fillRect(sx,     ty + 4, 8, th - 4);
  ctx.fillStyle = '#1e6812'; ctx.fillRect(sx + 1, ty + 2, 6, th - 2);
  ctx.fillStyle = '#30a020'; ctx.fillRect(sx + 2, ty,     4, th - 1);
  ctx.fillStyle = '#44c030'; ctx.fillRect(sx + 3, ty,     2, 3);
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
];
function drawClouds() {
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

// ── Soleil ────────────────────────────────────────────────────────────
function drawSun(tick) {
  let sx = W - 24, sy = 8;
  ctx.fillStyle = 'rgba(255,230,80,0.22)'; ctx.fillRect(sx-3,sy-3,16,16);
  ctx.fillStyle = '#f8d820'; ctx.fillRect(sx,sy,10,10);
  ctx.fillStyle = '#ffffa0'; ctx.fillRect(sx+2,sy+2,6,6);
  ctx.fillStyle = '#f0be10';
  ctx.fillRect(sx+4,sy-3,2,2); ctx.fillRect(sx+4,sy+11,2,2);
  ctx.fillRect(sx-3,sy+4,2,2); ctx.fillRect(sx+11,sy+4,2,2);
  if ((tick >> 4) % 2 === 0) {
    ctx.fillRect(sx-2,sy-2,1,1); ctx.fillRect(sx+11,sy-2,1,1);
    ctx.fillRect(sx-2,sy+11,1,1); ctx.fillRect(sx+11,sy+11,1,1);
  }
}

// ── Pingouin ──────────────────────────────────────────────────────────
const SPR_SIDE = [
  [0,0,1,1,1,0,0,0],[0,1,1,1,1,1,0,0],
  [0,1,2,1,1,1,0,0],[0,1,1,3,0,0,0,0],
  [0,1,2,2,1,0,0,0],[0,1,2,2,1,0,0,0],
  [0,1,2,2,1,0,0,0],[0,1,1,1,1,0,0,0],
  [0,3,3,0,0,0,0,0],[0,0,3,3,0,0,0,0],
];
const PCOL = ['transparent','#08080f','#eceef8','#e87020'];
function drawSprite(spr, px, py, flipX) {
  for (let row = 0; row < spr.length; row++)
    for (let col = 0; col < 8; col++) {
      let p = spr[row][col]; if (!p) continue;
      ctx.fillStyle = PCOL[p];
      ctx.fillRect(flipX ? px + (7 - col) : px + col, py + row, 1, 1);
    }
}

// ── Player ────────────────────────────────────────────────────────────
let player = { wx: 0, wy: GROUND_Y - 10, vy: 0, dir: 'right', onGround: true, walkFrame: 0, walkTimer: 0 };
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
let camX = 0;

// ── Ciel ──────────────────────────────────────────────────────────────
let skyGrad;
function buildGradients() {
  skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, '#78c8ff');
  skyGrad.addColorStop(1, '#50a8e8');
}

let tick = 0;
function update() {
  let dx = 0;
  if (keys['q'] || keys['arrowleft'])  { dx = -1.2; player.dir = 'left'; }
  if (keys['d'] || keys['arrowright']) { dx =  1.2; player.dir = 'right'; }
  player.wx += dx;
  if ((keys['z'] || keys['arrowup'] || keys[' ']) && player.onGround) {
    player.vy = JUMP_F; player.onGround = false;
  }
  player.vy += GRAVITY; player.wy += player.vy;
  if (player.wy >= GROUND_Y - 10) { player.wy = GROUND_Y - 10; player.vy = 0; player.onGround = true; }
  if (dx && player.onGround) {
    if (++player.walkTimer >= 10) { player.walkTimer = 0; player.walkFrame = (player.walkFrame + 1) % 2; }
  } else { player.walkFrame = 0; player.walkTimer = 0; }
  camX = player.wx - W / 2 + 4;
  updateAdditions();
}

function draw() {
  if (world === 'underground') { drawUnderground(); return; }
  // Ciel
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, GROUND_Y);
  // Sol
  ctx.fillStyle = '#2ab810'; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#3cd820'; ctx.fillRect(0, GROUND_Y, W, 1);
  ctx.fillStyle = '#7a4820'; ctx.fillRect(0, GROUND_Y + 4, W, H - GROUND_Y - 4);
  ctx.fillStyle = '#6a3c18'; ctx.fillRect(0, GROUND_Y + 7, W, H - GROUND_Y - 7);

  drawSun(tick);
  drawClouds();
  drawJungleBack(camX);
  for (let t of trees) drawTree(t.x, t.h, camX);
  drawJungleMid(camX);
  for (let c of caves) drawCaveEntrance(c.x, camX);
  for (let pp of poisonPlants) drawPoisonPlant(pp.x, camX);
  for (let n of npcs) drawNPC(n, camX);

  let px = Math.round(player.wx - camX), py = Math.round(player.wy);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + 1, GROUND_Y, 6, 2);
  let bob = (player.walkFrame === 1 && player.onGround) ? 1 : 0;
  drawSprite(SPR_SIDE, px, py + bob, player.dir === 'left');

  for (let f of fliers) drawFlier(f);
  drawForegroundGrass(camX);
}

function loop() { tick++; update(); draw(); requestAnimationFrame(loop); }

/* ════════════════════════════════════════════════════════════════════
   AJOUTS — jungle, plantes, créatures, souterrain, NPCs
   (ajoutés par-dessus, sans toucher au code existant)
   ════════════════════════════════════════════════════════════════════ */

// ── État monde / souterrain ───────────────────────────────────────────
let world = 'surface';
let enterX = 0;
let canToggle = true;

const caves = [ { x: 70 }, { x: 360 }, { x: -200 } ];

function updateZones() {
  let down = keys['s'] || keys['arrowdown'];
  let up   = keys['z'] || keys['arrowup'];
  if (world === 'surface') {
    if (down && canToggle) {
      for (let c of caves) {
        if (Math.abs(player.wx - (c.x + 4)) < 9) {
          world = 'underground'; enterX = c.x;
          player.wx = c.x + 3; player.vy = 0; canToggle = false; break;
        }
      }
    }
  } else {
    if (up && canToggle && Math.abs(player.wx - (enterX + 3)) < 10) {
      world = 'surface'; player.wx = enterX + 4; player.vy = 0; canToggle = false;
    }
  }
  if (!down && !up) canToggle = true;
}

// ── Plantes venimeuses rouges ─────────────────────────────────────────
const poisonPlants = [];
for (let i = -18; i <= 18; i++) {
  if (((i * 5 + 2) % 4) !== 0) continue;
  poisonPlants.push({ x: i * 40 + ((i * 67) % 21) });
}
function drawPoisonPlant(wx, camX) {
  let sx = wx - camX; if (sx < -12 || sx > W + 4) return;
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

// ── Créatures volantes psychédéliques ─────────────────────────────────
const fliers = [
  { x: 30,  y: 38, vx: 0.25,  amp: 6, ph: 0 },
  { x: 95,  y: 26, vx: -0.18, amp: 9, ph: 2 },
  { x: 140, y: 52, vx: 0.32,  amp: 5, ph: 4 },
];
function updateFliers() {
  for (let f of fliers) {
    f.x += f.vx;
    if (f.x > W + 12) f.x = -12;
    if (f.x < -12)   f.x = W + 12;
  }
}
function drawFlier(f) {
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

// ── NPC pingouins (3 skins) ───────────────────────────────────────────
const npcs = [
  { wx: 60,  dir: 1,  skin: 'mil',   x0: 10,   x1: 180, f: 0, t: 0 },
  { wx: -90, dir: 1,  skin: 'rasta', x0: -160, x1: -20, f: 0, t: 0 },
  { wx: 260, dir: -1, skin: 'dbz',   x0: 150,  x1: 340, f: 0, t: 0 },
];
function updateNPCs() {
  for (let n of npcs) {
    n.wx += n.dir * 0.4;
    if (n.wx < n.x0) { n.wx = n.x0; n.dir = 1; }
    if (n.wx > n.x1) { n.wx = n.x1; n.dir = -1; }
    if (++n.t >= 12) { n.t = 0; n.f = (n.f + 1) % 2; }
  }
}
function drawNPC(n, camX) {
  let sx = Math.round(n.wx - camX); if (sx < -14 || sx > W + 14) return;
  let py = GROUND_Y - 10 + ((n.f === 1) ? 1 : 0);
  let flip = n.dir < 0;
  // cape DBZ (derrière le corps)
  if (n.skin === 'dbz') {
    let cx = flip ? sx + 5 : sx - 1;
    ctx.fillStyle = '#e87000'; ctx.fillRect(cx, py + 2, 2, 7);
    ctx.fillStyle = '#c85a00'; ctx.fillRect(cx, py + 7, 2, 2);
  }
  // corps pingouin (réutilise le sprite existant)
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
}

// ── Jungle : arrière-plan (parallax) ──────────────────────────────────
const bgTrees = [];
for (let i = -15; i <= 15; i++) bgTrees.push({ x: i * 60 + ((i * 91) % 20), h: 42 + ((i * 53) % 24) });
function drawJungleBack(camX) {
  // brume verte à l'horizon
  ctx.fillStyle = 'rgba(20,120,40,0.22)'; ctx.fillRect(0, GROUND_Y - 30, W, 30);
  for (let t of bgTrees) {
    let sx = Math.round(t.x - camX * 0.5); if (sx < -30 || sx > W + 30) continue;
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
function drawJungleMid(camX) {
  // lianes pendantes depuis la canopée
  for (let v of vines) {
    let sx = Math.round(v.x - camX); if (sx < -4 || sx > W + 4) continue;
    let sway = Math.round(Math.sin(tick * 0.04 + v.x) * 1.5);
    ctx.fillStyle = '#1c6e2c';
    for (let y = 0; y < v.len; y++) {
      let off = Math.round(Math.sin(y * 0.4) * 1) + (y > v.len - 6 ? sway : 0);
      ctx.fillRect(sx + off, y, 1, 1);
    }
    ctx.fillStyle = '#2a9a3e'; ctx.fillRect(sx - 1 + sway, v.len, 3, 2);
  }
  // buissons
  for (let bu of bushes) { let sx = bu.x - camX; if (sx < -14 || sx > W + 8) continue; drawBush(sx); }
}

// ── Jungle : herbes hautes au premier plan ────────────────────────────
function drawForegroundGrass(camX) {
  for (let i = 0; i < 240; i++) {
    let wx = i * 6 - 700; let sx = wx - camX; if (sx < -2 || sx > W + 2) continue;
    let hh = 4 + ((i * 17) % 7);
    let sway = Math.round(Math.sin(tick * 0.05 + i) * 1);
    ctx.fillStyle = (i % 2) ? '#1c9a2c' : '#23b034';
    ctx.fillRect(sx + sway, GROUND_Y - hh, 1, hh);
    ctx.fillStyle = '#2fcf44'; ctx.fillRect(sx + sway, GROUND_Y - hh, 1, 1);
  }
}

// ── Entrées de grotte (surface) ───────────────────────────────────────
function drawCaveEntrance(wx, camX) {
  let sx = wx - camX; if (sx < -16 || sx > W + 8) return;
  ctx.fillStyle = '#1a0e06'; ctx.fillRect(sx, GROUND_Y, 14, H - GROUND_Y);
  ctx.fillStyle = '#0a0603'; ctx.fillRect(sx + 2, GROUND_Y, 10, H - GROUND_Y);
  // échelle
  ctx.fillStyle = '#7a5a2a'; ctx.fillRect(sx + 6, GROUND_Y, 1, 12); ctx.fillRect(sx + 9, GROUND_Y, 1, 12);
  for (let y = GROUND_Y + 2; y < GROUND_Y + 12; y += 3) ctx.fillRect(sx + 6, y, 4, 1);
  // flèche (descendre)
  if ((tick >> 4) % 2 === 0) {
    ctx.fillStyle = '#f0e040';
    ctx.fillRect(sx + 5, GROUND_Y - 5, 5, 1); ctx.fillRect(sx + 6, GROUND_Y - 4, 3, 1); ctx.fillRect(sx + 7, GROUND_Y - 3, 1, 1);
  }
}

// ── Niveau souterrain ─────────────────────────────────────────────────
const caveCrystals = [];
for (let i = 0; i < 90; i++) caveCrystals.push({ x: i * 19 - 400, h: 4 + ((i * 37) % 9), c: ['#34f0c8','#c84cf4','#4ca8f4','#f4d030'][i % 4] });
const caveSpikes = [];
for (let i = 0; i < 90; i++) caveSpikes.push({ x: i * 23 - 400, h: 3 + ((i * 29) % 7) });
function drawUnderground() {
  ctx.fillStyle = '#0c0a16'; ctx.fillRect(0, 0, W, H);
  // plafond
  ctx.fillStyle = '#241526'; ctx.fillRect(0, 0, W, 16);
  ctx.fillStyle = '#160c18'; ctx.fillRect(0, 13, W, 3);
  // stalactites
  for (let s of caveSpikes) {
    let sx = s.x - camX; if (sx < -6 || sx > W + 6) continue;
    ctx.fillStyle = '#1c1020'; ctx.fillRect(sx, 16, 3, s.h);
    ctx.fillStyle = '#2c1c34'; ctx.fillRect(sx, 16, 1, s.h - 1);
  }
  // sol
  ctx.fillStyle = '#3a2418'; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#241409'; ctx.fillRect(0, GROUND_Y + 5, W, H - GROUND_Y - 5);
  ctx.fillStyle = '#4a3020'; ctx.fillRect(0, GROUND_Y, W, 1);
  // cristaux lumineux
  for (let cr of caveCrystals) {
    let sx = cr.x - camX; if (sx < -6 || sx > W + 6) continue;
    if (((tick >> 3) + (cr.x | 0)) % 5 === 0) {
      ctx.globalAlpha = 0.3; ctx.fillStyle = cr.c;
      ctx.fillRect(sx - 1, GROUND_Y - cr.h - 1, 4, cr.h + 2); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = cr.c; ctx.fillRect(sx, GROUND_Y - cr.h, 2, cr.h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, GROUND_Y - cr.h, 1, 1);
  }
  // échelle de sortie
  let ex = enterX - camX;
  ctx.fillStyle = '#7a5a2a'; ctx.fillRect(ex + 6, 16, 1, GROUND_Y - 16); ctx.fillRect(ex + 9, 16, 1, GROUND_Y - 16);
  for (let y = 20; y < GROUND_Y; y += 4) ctx.fillRect(ex + 6, y, 4, 1);
  // pingouin
  let px = Math.round(player.wx - camX), py = Math.round(player.wy);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(px + 1, GROUND_Y, 6, 2);
  let bob = (player.walkFrame === 1 && player.onGround) ? 1 : 0;
  drawSprite(SPR_SIDE, px, py + bob, player.dir === 'left');
  // flèche (remonter) si sur l'échelle
  if (Math.abs(player.wx - (enterX + 3)) < 10 && (tick >> 4) % 2 === 0) {
    ctx.fillStyle = '#f0e040';
    ctx.fillRect(px + 1, py - 4, 5, 1); ctx.fillRect(px + 2, py - 5, 3, 1); ctx.fillRect(px + 3, py - 6, 1, 1);
  }
}

// ── Update global des ajouts ──────────────────────────────────────────
function updateAdditions() {
  updateFliers();
  updateNPCs();
  updateZones();
}

/* ════════════════════════════════════════════════════════════════════
   MUSIQUE 8-bit acid + drum & bass (Web Audio API, procédurale)
   Boucle de 64 pas (4 mesures) qui évolue progressivement.
   ════════════════════════════════════════════════════════════════════ */
let audio = null, muted = false, schedTimer = null;
const BPM = 168;
const STEP = 60 / BPM / 4;            // durée d'une double-croche
const STEPS = 64;                     // 4 mesures
let step = 0, nextNoteTime = 0, loopCount = 0;

function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function makeDist(amount) {
  const n = 1024, curve = new Float32Array(n), k = amount;
  for (let i = 0; i < n; i++) {
    let x = i * 2 / n - 1;
    curve[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ── Séquences 64 pas, construites par mesure avec montée progressive ──
const BASS    = new Array(STEPS).fill(null);
const ACC     = new Array(STEPS).fill(0);
const LEAD    = new Array(STEPS).fill(null);
const KICK    = new Array(STEPS).fill(0);
const SNARE   = new Array(STEPS).fill(0);
const HAT     = new Array(STEPS).fill(0);
const OPENHAT = new Array(STEPS).fill(0);
const RIDE    = new Array(STEPS).fill(0);
const CRASH   = new Array(STEPS).fill(0);

const bassFig = [33,33,45,33, 36,33,40,45, 33,45,33,44, 36,40,45,32];
const leadFig = [57,null,60,null, 64,null,60,57, null,69,null,67, 64,null,60,null];

for (let bar = 0; bar < 4; bar++) {
  const o = bar * 16;
  // ── Drums drum&bass (snare sur les temps 2 et 4 = pas 4 et 12) ──
  KICK[o + 0] = 1; KICK[o + 10] = 1;
  if (bar >= 1) KICK[o + 6] = 1;
  if (bar >= 2) KICK[o + 11] = 1;
  SNARE[o + 4] = 1; SNARE[o + 12] = 1;
  if (bar >= 1) SNARE[o + 7] = 1;       // ghost syncopé
  if (bar >= 2) SNARE[o + 14] = 1;
  if (bar === 3) { SNARE[o + 13] = 1; SNARE[o + 15] = 1; } // fill fin de boucle
  // Cymbales : ride en nappe sur tous les pas + hats qui s'ajoutent
  for (let i = 0; i < 16; i++) RIDE[o + i] = 1;
  if (bar >= 1) { for (let i = 0; i < 16; i++) HAT[o + i] = 1; }
  else { for (let i = 0; i < 16; i += 2) HAT[o + i] = 1; }
  if (bar >= 2) { OPENHAT[o + 2] = 1; OPENHAT[o + 6] = 1; OPENHAT[o + 10] = 1; OPENHAT[o + 14] = 1; }
  if (bar === 0 || bar === 2) CRASH[o + 0] = 1;
  // ── Basse acid (densité croissante) ──
  for (let i = 0; i < 16; i++) {
    let play = bar === 0 ? (i % 4 === 0) : bar === 1 ? (i % 2 === 0) : true;
    if (play) { BASS[o + i] = bassFig[i] - (bar === 3 ? 2 : 0); ACC[o + i] = (i % 4 === 0) ? 1 : 0; }
  }
  // ── Lead (entre à partir de la 3e mesure) ──
  if (bar >= 2) for (let i = 0; i < 16; i++) { if (leadFig[i] != null) LEAD[o + i] = leadFig[i] + (bar === 3 ? 12 : 0); }
  else if (bar === 1) { LEAD[o + 0] = 57; LEAD[o + 8] = 64; }
}

// Percussions additionnelles, basse profonde, mélodie aiguë lointaine
const SHAKER = new Array(STEPS).fill(0);
for (let i = 0; i < STEPS; i++) if (i % 2 === 1) SHAKER[i] = 1;       // texture sur les contretemps
const CLAP = new Array(STEPS).fill(0);
for (let b = 0; b < 4; b++) { CLAP[b * 16 + 4] = 1; CLAP[b * 16 + 12] = 1; } // double le snare
const TOM = new Array(STEPS).fill(0);
TOM[56] = 60; TOM[58] = 57; TOM[60] = 55; TOM[62] = 52;               // roulement de toms (fill)
const SUBHIT = new Array(STEPS).fill(0);
SUBHIT[0] = 1; SUBHIT[32] = 1;                                        // coups de basse profonde
const HIGHMEL = new Array(STEPS).fill(null);
const hmNotes = [86, 82, 84, 79, 82, 77, 79, 74];                    // motif aigu en Gm
for (let k = 0; k < 8; k++) HIGHMEL[k * 8] = hmNotes[k];

// Pad triste — progression Sol mineur : Gm – Eb – Bb – D (i – VI – III – V)
const PAD_CHORDS = [
  [43, 55, 58, 62],   // Gm : G2 G3 Bb3 D4
  [39, 51, 55, 58],   // Eb : Eb2 Eb3 G3 Bb3
  [46, 58, 62, 65],   // Bb : Bb2 Bb3 D4 F4
  [38, 50, 54, 57],   // D  : D2 D3 F#3 A3  (majeur dramatique)
];

function initAudio() {
  if (audio) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctxA = new AC();
  const master = ctxA.createGain(); master.gain.value = 0.0001;
  const glitch = ctxA.createGain(); glitch.gain.value = 1.0;   // bus pour gater le volume (glitch)
  master.connect(glitch); glitch.connect(ctxA.destination);
  const dist = ctxA.createWaveShaper(); dist.curve = makeDist(55); dist.oversample = '4x';
  const distGain = ctxA.createGain(); distGain.gain.value = 0.5;
  dist.connect(distGain); distGain.connect(master);
  // buffer de bruit 1 s (pour cymbales longues)
  const nb = ctxA.createBuffer(1, ctxA.sampleRate * 1.0, ctxA.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (((i * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;
  audio = { ctx: ctxA, master, glitch, dist, noise: nb };
  master.gain.setValueAtTime(0.0001, ctxA.currentTime);
  master.gain.exponentialRampToValueAtTime(0.30, ctxA.currentTime + 0.7);
  nextNoteTime = ctxA.currentTime + 0.08;
  scheduler();
}

function playBass(t, midi, accent, intensity) {
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = accent ? 20 : 13;
  const base = accent ? 320 : 200;
  const peak = (accent ? 2200 : 1300) + intensity * 1400;   // s'ouvre au fil des mesures
  f.frequency.setValueAtTime(peak, t);
  f.frequency.exponentialRampToValueAtTime(base, t + STEP * 0.9);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(accent ? 0.55 : 0.34, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.95);
  o.connect(f); f.connect(g); g.connect(audio.dist);
  o.start(t); o.stop(t + STEP);
}

function playLead(t, midi) {
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = mtof(midi);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.15, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.6);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + STEP * 1.7);
}

function playKick(t) {
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
  const g = c.createGain();
  g.gain.setValueAtTime(0.7, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + 0.17);
}

function playSnare(t) {
  const c = audio.ctx;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  s.connect(hp); hp.connect(ng); ng.connect(audio.master);
  s.start(t); s.stop(t + 0.14);
  const o = c.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  const og = c.createGain();
  og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(og); og.connect(audio.master);
  o.start(t); o.stop(t + 0.11);
}

function playHat(t, open) {
  const c = audio.ctx;
  const dur = open ? 0.14 : 0.035;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8500;
  const g = c.createGain();
  g.gain.setValueAtTime(open ? 0.1 : 0.085, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(hp); hp.connect(g); g.connect(audio.master);
  s.start(t); s.stop(t + dur + 0.02);
}

function playRide(t) {
  const c = audio.ctx;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 9000; bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.045, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  s.connect(bp); bp.connect(g); g.connect(audio.master);
  s.start(t); s.stop(t + 0.2);
}

function playCrash(t) {
  const c = audio.ctx;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  s.connect(hp); hp.connect(g); g.connect(audio.master);
  s.start(t); s.stop(t + 0.65);
}

function playPad(t, notes) {
  const c = audio.ctx;
  const dur = 16 * STEP;            // une mesure
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.5);              // attaque douce
  g.gain.setValueAtTime(0.18, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.7); // release longue
  f.connect(g); g.connect(audio.master);
  for (const m of notes) {
    const o1 = c.createOscillator(); o1.type = 'triangle'; o1.frequency.value = mtof(m);
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = mtof(m); o2.detune.value = 7;
    o1.connect(f); o2.connect(f);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.8); o2.stop(t + dur + 0.8);
  }
}

function playShaker(t) {
  const c = audio.ctx;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 9500;
  const g = c.createGain(); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  s.connect(hp); hp.connect(g); g.connect(audio.master);
  s.start(t); s.stop(t + 0.04);
}

function playClap(t) {
  const c = audio.ctx;
  for (let i = 0; i < 3; i++) {                       // 3 micro-bouffées = clap
    const tt = t + i * 0.012;
    const s = c.createBufferSource(); s.buffer = audio.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.5;
    const g = c.createGain(); g.gain.setValueAtTime(0.18, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
    s.connect(bp); bp.connect(g); g.connect(audio.master);
    s.start(tt); s.stop(tt + 0.06);
  }
}

function playTom(t, midi) {
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(mtof(midi), t);
  o.frequency.exponentialRampToValueAtTime(mtof(midi) * 0.6, t + 0.18);
  const g = c.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + 0.22);
}

function playSubHit(t) {                              // coup de basse profonde
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(mtof(31), t);
  o.frequency.exponentialRampToValueAtTime(mtof(31) * 0.5, t + 0.05);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + 0.5);
}

function playHigh(t, midi) {                          // mélodie aiguë lointaine et douce
  const c = audio.ctx;
  const dur = 8 * STEP;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 4000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g); g.connect(audio.master);
  const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = mtof(midi);
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtof(midi); o2.detune.value = 5;
  o1.connect(f); o2.connect(f);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
}

function glitchBurst(t) {                             // gate de volume = glitch/stutter
  const g = audio.glitch.gain;
  const n = 8, seg = STEP * 2 / n;
  g.cancelScheduledValues(t);
  for (let i = 0; i < n; i++) g.setValueAtTime(i % 2 ? 0.12 : 1.0, t + i * seg);
  g.setValueAtTime(1.0, t + n * seg);
}

function drumGlitch(t) {                              // retrigger drums = distorsion de temps
  const c = audio.ctx;
  const n = 6, seg = STEP * 2 / n;
  for (let i = 0; i < n; i++) {
    const tt = t + i * seg;
    const s = c.createBufferSource(); s.buffer = audio.noise; s.playbackRate.value = 0.8 + i * 0.3;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = c.createGain(); g.gain.setValueAtTime(0.12, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + seg * 0.9);
    s.connect(hp); hp.connect(g); g.connect(audio.master);
    s.start(tt); s.stop(tt + seg);
  }
}

function melodyGlitch(t, midi) {                      // bégaiement de la mélodie
  const c = audio.ctx;
  const n = 5, seg = STEP * 1.5 / n;
  for (let i = 0; i < n; i++) {
    const tt = t + i * seg;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = mtof(midi + (i % 2 ? 7 : 0) + i * 2);
    const g = c.createGain(); g.gain.setValueAtTime(0.13, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + seg * 0.8);
    o.connect(g); g.connect(audio.master);
    o.start(tt); o.stop(tt + seg);
  }
}

function scheduleStep(s, t) {
  const bar = Math.floor(s / 16);
  const intensity = bar / 3;
  if (s % 16 === 0) playPad(t, PAD_CHORDS[bar]);
  if (BASS[s] != null) playBass(t, BASS[s], ACC[s], intensity);
  if (LEAD[s] != null) playLead(t, LEAD[s]);
  if (KICK[s])    playKick(t);
  if (SNARE[s])   playSnare(t);
  if (RIDE[s])    playRide(t);
  if (HAT[s])     playHat(t, false);
  if (OPENHAT[s]) playHat(t, true);
  if (CRASH[s])   playCrash(t);
  // percussions additionnelles
  if (SHAKER[s])  playShaker(t);
  if (CLAP[s] && bar >= 1) playClap(t);
  if (TOM[s])     playTom(t, TOM[s]);
  // coups de basse profonde
  if (SUBHIT[s])  playSubHit(t);
  if (s === 48 && loopCount % 2 === 1) playSubHit(t);
  // mélodie aiguë lointaine
  if (HIGHMEL[s] != null) playHigh(t, HIGHMEL[s]);
  // glitches "à certains moments"
  if (s === 60) { glitchBurst(t); drumGlitch(t); }            // chaque boucle, pendant le fill
  if (s === 30 && loopCount % 2 === 0) glitchBurst(t);        // une boucle sur deux
  if (s === 24 && loopCount % 2 === 1) melodyGlitch(t, 64);   // bégaiement mélodie
}

function scheduler() {
  if (!audio) return;
  while (nextNoteTime < audio.ctx.currentTime + 0.1) {
    scheduleStep(step, nextNoteTime);
    nextNoteTime += STEP;
    step = (step + 1) % STEPS;
    if (step === 0) loopCount++;
  }
  schedTimer = setTimeout(scheduler, 25);
}

function toggleMute() {
  if (!audio) return;
  muted = !muted;
  const now = audio.ctx.currentTime;
  audio.master.gain.cancelScheduledValues(now);
  audio.master.gain.setValueAtTime(audio.master.gain.value, now);
  audio.master.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 0.30, now + 0.15);
}

// Démarre l'audio au premier geste utilisateur ; M coupe/relance
document.addEventListener('keydown', e => {
  initAudio();
  if (e.key.toLowerCase() === 'm') toggleMute();
});
document.addEventListener('pointerdown', initAudio);

fitCanvas();
buildGradients();
requestAnimationFrame(loop);
