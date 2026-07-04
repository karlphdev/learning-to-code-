const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Résolution logique du jeu (pixel-art 16:9)
const W = 256, H = 144;

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
const SPEED = 3.0;             // vitesse du vélo (bien plus rapide qu'avant)

// ── Arbres ────────────────────────────────────────────────────────────
const trees = [];
for (let i = -20; i <= 20; i++) {
  if (Math.abs(i) < 2) continue;
  let wx = i * 45 + ((i * 137) % 15);
  if (wx >= 670) continue;                 // les arbres s'arrêtent au pied de la montagne
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
  { x:175, y:18, shape:1, speed:0.08 },
  { x:215, y:44, shape:0, speed:0.12 },
  { x:245, y:32, shape:1, speed:0.06 },
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
  let sx = W - 40, sy = 10;
  // halo doux (rendu moderne)
  let cx2 = sx + 5, cy2 = sy + 5;
  let glow = ctx.createRadialGradient(cx2, cy2, 2, cx2, cy2, 36);
  glow.addColorStop(0,    'rgba(255,240,170,0.85)');
  glow.addColorStop(0.35, 'rgba(255,220,110,0.28)');
  glow.addColorStop(1,    'rgba(255,220,110,0)');
  ctx.fillStyle = glow; ctx.fillRect(cx2 - 36, cy2 - 36, 72, 72);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(sx,sy,10,10);
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(sx+2,sy+2,6,6);
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
function drawSprite(spr, px, py, flipX, pal) {
  let colors = pal || PCOL;
  for (let row = 0; row < spr.length; row++)
    for (let col = 0; col < 8; col++) {
      let p = spr[row][col]; if (!p) continue;
      ctx.fillStyle = colors[p];
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
let playerDx = 0;              // déplacement horizontal du dernier frame (pour les traînées)
let flipAngle = 0;            // angle du salto avant (radians) ; 0 = debout
const FLIP_LEVEL = 15;        // palier où le salto avant se débloque

// ── Ciel ──────────────────────────────────────────────────────────────
let skyGrad;
function buildGradients() {
  skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0,    '#2e6fd8');   // bleu profond au zénith
  skyGrad.addColorStop(0.45, '#58aef0');
  skyGrad.addColorStop(0.8,  '#8fd4f8');
  skyGrad.addColorStop(1,    '#c9edff');   // horizon pâle
}

let tick = 0;
function update() {
  let dx = 0;
  if (!invOpen) {
    let spd = currentSpeed();
    if (keys['q'] || keys['arrowleft'])  { dx = -spd; player.dir = 'left'; }
    if (keys['d'] || keys['arrowright']) { dx =  spd; player.dir = 'right'; }
    player.wx += dx;
    if (player.wx < WORLD_LEFT) player.wx = WORLD_LEFT;
    if (player.wx > SUMMIT_X)   player.wx = SUMMIT_X;
    collidePlayerRocks();                    // les pics de glace bloquent (sauf en sautant)
    bikeRoll += dx * 0.45;          // les roues tournent selon la distance parcourue
    if ((keys['z'] || keys['arrowup'] || keys[' ']) && player.onGround) {
      if (isPushing) {                       // collé derrière la balle
        if (powerLvl() >= 2) {               // Niv 2 : sauter AVEC la balle (moins haut)
          player.vy = currentJump() * 0.6; player.onGround = false;
          boulderVy = currentJump() * 0.6;   // la balle saute avec le pingouin
        }
      } else { player.vy = currentJump(); player.onGround = false; }
    }
  }
  player.vy += GRAVITY; player.wy += player.vy;
  // Salto avant (débloqué au palier FLIP_LEVEL) : Entrée en l'air → tourne ; maintenir → plusieurs tours
  if (!invOpen && powerLvl() >= FLIP_LEVEL && !player.onGround && keys['enter']) {
    flipAngle += 0.26 * (player.dir === 'left' ? -1 : 1);   // sens du salto = sens de marche
  }
  let gy = groundY(player.wx) - 10;                 // le sol unique : jungle plat → montagne
  if (player.wy >= gy) { player.wy = gy; player.vy = 0; player.onGround = true; flipAngle = 0; }  // retombe debout
  if (dx && player.onGround) {
    if (++player.walkTimer >= 10) { player.walkTimer = 0; player.walkFrame = (player.walkFrame + 1) % 2; }
  } else { player.walkFrame = 0; player.walkTimer = 0; }
  updateBoulder(dx);
  updateGoats();
  playerDx = dx;
  camX = player.wx - W / 2 + 4;
  camY = groundY(player.wx) - GROUND_Y;             // caméra verticale : 0 jungle, négatif en montagne
  updateAdditions();
}

function draw() {
  let frac = climbFrac();
  // ── Ciel : bleu jungle, qui pâlit en altitude ──
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
  if (frac > 0) { ctx.fillStyle = 'rgba(238,245,255,' + (0.55 * frac).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  drawSun(tick);
  drawClouds();
  drawMtnRidges();                          // crêtes lointaines (parallaxe, en fond)

  ctx.save();
  ctx.translate(0, -camY);                  // ↓↓ tout ce qui suit est en coordonnées MONDE ↓↓
  drawTerrain(frac);
  drawJungleBack(camX);
  for (let t of trees) drawTree(t.x, t.h, camX);
  drawJungleMid(camX);
  for (let pp of poisonPlants) drawPoisonPlant(pp.x, camX);
  for (let n of npcs) drawNPC(n, camX);
  drawSisyphe(camX);
  for (let g of goats) drawGoat(g);
  for (let r of activeRocks()) drawRock(r);      // pics de glace (obstacles)
  for (let en of enemies) drawEnemy(en);         // poissons à baskets
  drawBoulder();
  drawBaby();                               // niv 13 : le bébé pingouin suit (derrière le joueur)
  // pingouin + vélo + aura
  let px = Math.round(player.wx - camX), py = Math.round(player.wy);
  let gsy = Math.round(groundY(player.wx));
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(px - 3, gsy, 14, 2);
  let bob = (player.walkFrame === 1 && player.onGround) ? 1 : 0;
  if (bikeIsSupersonic() && playerDx !== 0) {              // traînées de vitesse Supersonic
    let behind = player.dir === 'right' ? -1 : 1;
    for (let i = 0; i < 7; i++) {
      let ly = py + ((i * 5 + tick * 2) % 14);
      let len = 5 + ((i * 7 + tick) % 11);
      let a = 0.55 - i * 0.06; if (a < 0.06) a = 0.06;
      ctx.fillStyle = 'rgba(52,240,255,' + a.toFixed(2) + ')';
      ctx.fillRect(behind < 0 ? px - len : px + 16, ly, len, 1);
    }
  }
  drawAura(px, py, powerLvl());
  let flipping = flipAngle !== 0;
  if (flipping) { ctx.save(); ctx.translate(px + 8, py - 2); ctx.rotate(flipAngle); ctx.translate(-(px + 8), -(py - 2)); }
  drawEquippedBike(px + 4, py + 10, player.dir === 'left', bikeRoll);
  drawPenguinScaled(SPR_SIDE, px, py + bob - RIDE_LIFT, player.dir === 'left', playerPal());
  if (flipping) ctx.restore();
  drawSkillFx();                            // missile, explosion, fontaine (coordonnées monde)
  drawForegroundGrass(camX);
  ctx.restore();                            // ↑↑ retour en coordonnées ÉCRAN ↑↑

  if (frac < 0.45) for (let f of fliers) drawFlier(f);   // bestioles de jungle, pas en altitude
  if (frac > 0) { drawMtnSnowfall(); drawMtnFog(frac); }
  drawWhispers();
  drawVignette();                           // assombrit doucement les bords (rendu moderne)
  drawHud(frac);
  if (won && tick - wonTimer < 200) drawSummitBanner();   // bannière qui s'efface au bout de ~3s
  else won = false;
}

// Interpolation douce (smoothstep) entre a et b, bornée 0..1.
function smooth(x, a, b) { let t = (x - a) / (b - a); if (t < 0) t = 0; if (t > 1) t = 1; return t * t * (3 - 2 * t); }

// Sol continu, peint colonne par colonne. La couche dépend de l'ALTITUDE de la colonne :
// herbe en bas → roche nue → neige en haut, avec des lisières tramées (ligne de neige naturelle).
function drawTerrain(frac) {
  let bottom = camY + H + 2, top = camY - 2;     // bornes verticales de la vue, en monde
  for (let sx = 0; sx <= W; sx++) {
    let wx = sx + camX;
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
  let fxs = Math.round(SUMMIT_X - camX);
  if (fxs > -10 && fxs < W + 10) {
    let fy = Math.round(groundY(SUMMIT_X));
    ctx.fillStyle = '#6a4a28'; ctx.fillRect(fxs, fy - 15, 1, 15);
    ctx.fillStyle = ((tick >> 3) % 2) ? '#e02828' : '#ff4040'; ctx.fillRect(fxs + 1, fy - 15, 6, 4);
  }
}

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
  let h = (tick * 3 + lvl * 40) % 360;                  // niv 11+ : arc-en-ciel animé
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

// Aura « Nen » SURPUISSANTE : l'intensité monte 4× plus vite qu'avant
// (l'aura du niv N = l'ancienne aura du niv 4×N) et grossit niveau après
// niveau, sans plafond d'effets : halo géant → onde de choc → éclairs →
// colonne d'énergie → orbes tournants → pulsation plein écran.
function drawAura(px, py, lvl) {
  if (lvl <= 0) return;
  const p = lvl * 4;                                      // puissance effective
  let cx = px + 8, cy = py - 1;
  const pal = auraColors(lvl);
  const rgb = pal[0], rgb2 = pal[1];                    // bicolore : cœur / bord
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
    ctx.fillRect(0, camY, W, H);          // (repère monde : décalé de camY pour couvrir l'écran)
  }
}

// HUD : altitude, niveau de puissance, titre, et tag SUPERSONIC.
function drawHud(frac) {
  let hints = skillHints();
  let boxH = hints.length ? 28 : 20;
  ctx.fillStyle = 'rgba(12,24,46,0.55)'; ctx.fillRect(4, 4, 92, boxH);
  ctx.fillStyle = '#7c5cff'; ctx.fillRect(4, 4, 92, 1);
  ctx.font = '7px monospace'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff'; ctx.fillText('ALT ' + Math.round(frac * 100) + '%', 8, 7);
  if (bikeIsSupersonic()) { ctx.fillStyle = '#34f0ff'; ctx.fillText('SUPERSONIC', 48, 7); }
  ctx.fillStyle = '#ffe070'; ctx.fillText('Niv.' + powerLvl() + ' ' + powerTitle(), 8, 15);
  if (hints.length) { ctx.fillStyle = '#ff9cf0'; ctx.fillText(hints[(tick >> 7) % hints.length], 8, 23); }  // astuces en rotation
  ctx.textBaseline = 'alphabetic';
}

function loop() { tick++; update(); draw(); if (invOpen) drawInventory(); requestAnimationFrame(loop); }

/* ════════════════════════════════════════════════════════════════════
   AJOUTS — jungle, plantes, créatures, souterrain, NPCs
   (ajoutés par-dessus, sans toucher au code existant)
   ════════════════════════════════════════════════════════════════════ */

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
  let sx = Math.round(n.wx - camX); if (sx < -24 || sx > W + 24) return;
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
  ctx.restore();
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
    let wx = i * 6 - 700; if (wx >= MOUNTAIN_START) break;   // l'herbe s'arrête au pied de la montagne
    let sx = wx - camX; if (sx < -2 || sx > W + 2) continue;
    let hh = 4 + ((i * 17) % 7);
    let sway = Math.round(Math.sin(tick * 0.05 + i) * 1);
    ctx.fillStyle = (i % 2) ? '#1c9a2c' : '#23b034';
    ctx.fillRect(sx + sway, GROUND_Y - hh, 1, hh);
    ctx.fillStyle = '#2fcf44'; ctx.fillRect(sx + sway, GROUND_Y - hh, 1, 1);
  }
}

// ── Sisyphe sur la surface ────────────────────────────────────────────
// Une petite silhouette pousse éternellement un rocher sur une butte ;
// arrivé en haut, il dévale, et tout recommence. Le mythe, en miniature.
const SISYPHE_X = 470;         // position monde de la butte
let sisypheT = 0;              // cycle 0→1 : pousse, puis le rocher retombe
function updateSisyphe() {
  sisypheT += 0.004;
  if (sisypheT >= 1) sisypheT = 0;
}
function drawSisyphe(camX) {
  let sx = Math.round(SISYPHE_X - camX); if (sx < -30 || sx > W + 30) return;
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
function updateWhispers() {
  if (++whisperTimer >= 140) {
    whisperTimer = 0; whisperN++;
    whispers.push({ text: WHISPER_LINES[whisperN % WHISPER_LINES.length],
                    x: 16 + (whisperN * 53) % (W - 50), y: 28 + (whisperN * 37) % 56, life: 0 });
  }
  for (let w of whispers) w.life++;
  whispers = whispers.filter(w => w.life < 130);
}
function drawWhispers() {
  ctx.textBaseline = 'top'; ctx.font = '6px monospace';
  for (let w of whispers) {
    let a = Math.sin(Math.PI * w.life / 130) * 0.55;        // apparition puis effacement
    ctx.fillStyle = 'rgba(232,232,255,' + a.toFixed(3) + ')';
    ctx.fillText(w.text, w.x, Math.round(w.y - w.life * 0.12));  // dérive vers le haut
  }
  ctx.textBaseline = 'alphabetic';
}

// ── Update global des ajouts ──────────────────────────────────────────
function updateAdditions() {
  updateFliers();
  updateNPCs();
  updateSisyphe();
  updateWhispers();
  updateSkills();
  updateEnemies();
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

/* ════════════════════════════════════════════════════════════════════
   PINGOUINS ×2, VÉLO DU JOUEUR & INVENTAIRE (touche I)
   ════════════════════════════════════════════════════════════════════ */

// Échelle des pingouins (joueur + NPCs) : ×2
const PS = 2;

// Dessine un sprite pingouin agrandi ×PS, ancré sur les pieds (bas-centre)
function drawPenguinScaled(spr, px, py, flip, pal) {
  let pvx = px + 4, pvy = py + 10;
  ctx.save();
  ctx.translate(pvx, pvy); ctx.scale(PS, PS); ctx.translate(-pvx, -pvy);
  drawSprite(spr, px, py, flip, pal);
  ctx.restore();
}

// ── Les 5 vélos de l'inventaire ───────────────────────────────────────
const BIKES = [
  { name: 'Cruiser rouge', frame: '#e02828', accent: '#ffd020', tire: '#101010' },
  { name: 'BMX bleu',      frame: '#1c80ff', accent: '#ffffff', tire: '#101010' },
  { name: 'VTT vert',      frame: '#1ca838', accent: '#c8ff60', tire: '#1c1c1c' },
  { name: 'Course or',     frame: '#f0b410', accent: '#fff088', tire: '#101010' },
  { name: 'Neon violet',   frame: '#a428f0', accent: '#34f0ff', tire: '#150515' },
];
let equippedBike = 0;          // le pingouin commence avec le vélo 1
let invOpen = false;
let bikeRoll = 0;              // angle de rotation des roues (avance/recule)
const RIDE_LIFT = 11;         // hauteur de la selle : remonte le pingouin dessus

// Une roue pixel : pneu (anneau) + jante + moyeu + rayons qui tournent
function drawWheel(cx, cy, tire, spin) {
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      const d = dx * dx + dy * dy;
      if (d <= 9 && d >= 5)      { ctx.fillStyle = tire;     ctx.fillRect(cx + dx, cy + dy, 1, 1); }
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
function drawBike(x0, y0, b, spin) {
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

// Le vélo équipé : agrandi ×PS, orienté selon le sens de marche, roues qui tournent.
// baseY suit la verticale du pingouin (le vélo saute avec lui).
function drawEquippedBike(cx, baseY, flip, spin) {
  const b = BIKES[equippedBike];
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(flip ? -PS : PS, PS);        // miroir horizontal quand on va à gauche
  ctx.translate(-cx, -baseY);
  drawBike(cx - 8, baseY - 8, b, spin);  // roues posées sur baseY
  ctx.restore();
}

// Vignette de vélo pour l'inventaire (échelle ×1.6)
function drawBikeThumb(x, y, b) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(1.6, 1.6); ctx.translate(-x, -y);
  drawBike(x, y, b);
  ctx.restore();
}

// ── Panneau d'inventaire ──────────────────────────────────────────────
function drawInventory() {
  ctx.fillStyle = 'rgba(8,6,18,0.84)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#7c5cff'; ctx.fillRect(8, 6, W - 16, 1); ctx.fillRect(8, H - 9, W - 16, 1);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffe070'; ctx.font = '8px monospace';
  ctx.fillText('INVENTAIRE - VELOS', 12, 9);
  for (let i = 0; i < BIKES.length; i++) {
    let ry = 22 + i * 22;
    let sel = (i === equippedBike);
    if (sel) {
      ctx.fillStyle = 'rgba(124,92,255,0.35)'; ctx.fillRect(10, ry - 2, W - 20, 20);
      ctx.fillStyle = '#a888ff'; ctx.fillRect(10, ry - 2, 1, 20);
    }
    ctx.fillStyle = sel ? '#ffffff' : '#a89cc0'; ctx.font = '7px monospace';
    ctx.fillText(String(i + 1), 14, ry + 5);
    drawBikeThumb(26, ry + 1, BIKES[i]);
    ctx.fillStyle = sel ? '#ffffff' : '#d0c8e4'; ctx.font = '7px monospace';
    ctx.fillText(BIKES[i].name, 66, ry + 3);
    if (sel) { ctx.fillStyle = '#7cf07c'; ctx.font = '6px monospace'; ctx.fillText('EQUIPE', 66, ry + 11); }
  }
  ctx.fillStyle = '#9088a8'; ctx.font = '6px monospace';
  ctx.fillText('1-5 : equiper   I : fermer', 12, H - 8);
  ctx.textBaseline = 'alphabetic';
}

// I = ouvrir/fermer ; 1-5 = équiper un vélo (quand l'inventaire est ouvert)
document.addEventListener('keydown', e => {
  let k = e.key.toLowerCase();
  if (k === 'i' && !e.repeat) invOpen = !invOpen;
  if (invOpen && k >= '1' && k <= '5') equippedBike = (+k) - 1;
});

/* ════════════════════════════════════════════════════════════════════
   LA MONTAGNE ENNEIGÉE — but du jeu : atteindre le sommet 🏔
   Pente qu'on gravit, caméra X+Y, brouillard croissant, chèvres.
   ════════════════════════════════════════════════════════════════════ */

let camY = 0;                  // caméra verticale (suit l'altitude du sol)
let won = false;               // sommet atteint (bannière)
let wonTimer = 0;              // tick où le dernier sommet a été atteint

const MOUNTAIN_START = 700;    // x où la jungle plate devient la montagne
const SUMMIT_X = 2800;         // x du sommet
const SUMMIT_H = 620;          // hauteur totale à gravir (px monde)
const WORLD_LEFT = -900;       // bord gauche de la jungle

// ── Le rocher de Sisyphe ──────────────────────────────────────────────
// On pousse le rocher vers le sommet. Si on lâche, la pente le ramène.
// Arrivé en haut, il dévale tout seul : il faut tout recommencer.
let boulderWx = MOUNTAIN_START + 40;  // position monde du rocher (au pied de la montagne)
let boulderRoll = 0;           // angle cumulé (fait tourner la texture)
let boulderTumbling = false;   // true = il dévale seul après le sommet
let summitCount = 0;           // combien de fois le rocher a atteint le sommet
const BOULDER_R = 14;          // rayon du rocher (bien plus gros)
const ABSURD_QUOTES = [
  'Il faut imaginer le pingouin heureux.',
  'Le rocher roule. On recommence.',
  'La lutte vers le sommet suffit.',
  'Le sommet ? Un pretexte pour redescendre.',
  'Tout est bien, repond le pingouin.',
];

// Hauteur (y monde) du sol à la colonne wx : plat dans la jungle, puis monte en montagne.
// Plus petit = plus haut. C'est LE profil unique du monde (jungle + montagne d'un seul tenant).
function groundY(wx) {
  if (wx <= MOUNTAIN_START) return GROUND_Y;
  let t = (wx - MOUNTAIN_START) / (SUMMIT_X - MOUNTAIN_START); if (t > 1) t = 1;
  let ease = t * t * (3 - 2 * t);                        // smoothstep : départ doux, sommet doux
  let h = SUMMIT_H * ease;
  h += (Math.sin(wx * 0.013) * 7 + Math.sin(wx * 0.041) * 3) * (1 - t);  // bosses qui s'aplanissent en haut
  return GROUND_Y - h;
}
// Fraction d'altitude 0 (sol de la jungle) → 1 (sommet), d'après la position du pingouin
function climbFrac() {
  let f = (GROUND_Y - groundY(player.wx)) / SUMMIT_H;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

// ── Puissance : grandit à CHAQUE sommet, sans plafond ─────────────────
const SPEED_BASE = 3.0, JUMP_BASE = -4.5, PUSH_BASE = 1.7;
function powerLvl()    { return summitCount; }                       // = nombre de sommets atteints
function currentSpeed() { return SPEED_BASE * (1 + 0.18 * powerLvl()); }
function currentJump()  { return JUMP_BASE * (1 + 0.05 * powerLvl()); }
function currentPush()  { return PUSH_BASE + 0.30 * powerLvl(); }
// Titre affiché selon le palier (le vélo devient « Supersonic » en haut)
function powerTitle() {
  let l = powerLvl();
  if (l === 0) return 'Pingouin';
  if (l < 3)   return 'Eveille';
  if (l < 6)   return 'Aura naissante';
  if (l < 9)   return 'Puissant';
  if (l < 12)  return 'HYPER FORT';
  return 'TRANSCENDANT';
}
function bikeIsSupersonic() { return powerLvl() >= 6; }

// ── Chèvres de montagne ───────────────────────────────────────────────
const goats = [];
for (let i = 0; i < 9; i++) {
  let cx = MOUNTAIN_START + 120 + i * 210 + ((i * 71) % 60);   // réparties le long de la montagne
  goats.push({ wx: cx, x0: cx - 55, x1: cx + 55, dir: (i % 2 ? 1 : -1), t: 0, f: 0, c: i % 3 });
}
function updateGoats() {
  for (let g of goats) {
    g.wx += g.dir * 0.22;
    if (g.wx < g.x0) { g.wx = g.x0; g.dir = 1; }
    if (g.wx > g.x1) { g.wx = g.x1; g.dir = -1; }
    if (++g.t >= 16) { g.t = 0; g.f = (g.f + 1) % 2; }
  }
}
function drawGoat(g) {
  let sx = Math.round(g.wx - camX); if (sx < -14 || sx > W + 14) return;
  let fy = Math.round(groundY(g.wx));
  let flip = g.dir < 0;
  const body = ['#f4f1e8', '#eae3d4', '#dcd3c2'][g.c];
  const GW = 12;
  const P = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect((flip ? sx + (GW - x - w) : sx + x), fy + y, w, h); };
  // pattes (animées)
  P(2, -2, 1, 2, '#5a4a38'); P(8, -2, 1, 2, '#5a4a38');
  if (g.f) P(4, -2, 1, 2, '#5a4a38'); else P(6, -2, 1, 2, '#5a4a38');
  P(1, -6, 1, 1, body);                       // queue
  P(2, -7, 7, 5, body);                        // corps
  P(2, -8, 6, 1, body);
  P(9, -9, 2, 3, body);                        // cou/tête (avant = droite)
  P(10, -10, 2, 2, body);
  P(10, -7, 1, 2, '#dcd4c4');                  // barbiche
  P(10, -10, 1, 1, '#161616');                 // œil
  P(11, -12, 1, 2, '#3a2c1c'); P(10, -12, 1, 1, '#3a2c1c'); P(11, -13, 1, 1, '#2a1f12'); // cornes recourbées
}

// dx = déplacement du pingouin ce frame (-SPEED, 0 ou +SPEED)
const BOULDER_FOOT = MOUNTAIN_START + 40;      // le rocher attend au pied de la montagne
function updateBoulder(dx) {
  // physique verticale de la balle (saut avec la balle, niv 2)
  if (boulderLift > 0 || boulderVy !== 0) {
    boulderVy += GRAVITY; boulderLift -= boulderVy;
    if (boulderLift <= 0) { boulderLift = 0; boulderVy = 0; }
  }
  if (boulderTumbling) {                       // il dévale seul jusqu'au pied
    isPushing = false;
    boulderWx -= 3.4; boulderRoll -= 0.22;
    if (boulderWx <= BOULDER_FOOT) { boulderWx = BOULDER_FOOT; boulderTumbling = false; }
    return;
  }
  let near = Math.abs(player.wx - boulderWx) < BOULDER_R + 10;
  // on peut pousser au sol, OU en l'air pendant le saut commun (niv 2) : le duo reste collé
  let pushing = near && dx > 0 && player.wx < boulderWx && (player.onGround || boulderLift > 0);
  isPushing = near && player.wx < boulderWx;   // « avec la balle » : collé juste derrière elle
  if (Math.abs(boulderKickVx) > 0.15) {                // élan propre : coup de lame (E, +) ou tacle de poisson (-)
    boulderWx += boulderKickVx; boulderRoll += boulderKickVx * 0.04;
    boulderKickVx *= 0.94;
  } else if (pushing) {
    boulderKickVx = 0;
    boulderWx += currentPush(); boulderRoll += 0.12;   // la lame avant pousse (de plus en plus fort)
    player.wx = boulderWx - (BOULDER_R + 6);           // le pingouin reste collé derrière la lame
  } else if (boulderLift <= 0) {                       // pas de recul quand elle est en l'air
    boulderKickVx = 0;
    boulderWx -= 0.9; boulderRoll -= 0.06;             // sinon la pente la ramène en bas
  }
  for (let r of activeRocks()) {                       // la glace bloque la balle (sauf si elle saute)
    if (boulderLift > r.h - 4) continue;               // tolérant : le bas de la balle est rond
    let half = r.w / 2 + BOULDER_R - 4;
    if (Math.abs(boulderWx - r.x) < half) {
      boulderWx = boulderWx < r.x ? r.x - half : r.x + half;
      boulderKickVx = 0;
    }
  }
  if (boulderWx <= BOULDER_FOOT) boulderWx = BOULDER_FOOT;   // ne redescend pas dans la jungle
  if (boulderWx >= SUMMIT_X - 4) {                          // SOMMET ATTEINT
    applyPowerUp();                                         // le pingouin et le vélo montent en puissance
    boulderTumbling = true;                                // et le rocher repart en bas : on recommence
  }
}
// Appelé à chaque sommet : monte d'un palier, déclenche un flash d'aura, affiche la bannière.
function applyPowerUp() {
  summitCount++;
  won = true; wonTimer = tick;                 // bannière « palier atteint » temporaire
  spawnEnemies();                              // plus de niveaux = plus de poissons
}
function drawBoulder() {
  let sx = Math.round(boulderWx - camX); if (sx < -BOULDER_R * 2 || sx > W + BOULDER_R * 2) return;
  let gy = Math.round(groundY(boulderWx));
  let sy = gy - BOULDER_R - Math.round(boulderLift);
  ctx.fillStyle = 'rgba(40,60,90,0.22)'; ctx.fillRect(sx - BOULDER_R, gy, BOULDER_R * 2, 3); // ombre (reste au sol)
  for (let y = -BOULDER_R; y <= BOULDER_R; y++) {                 // disque de pierre
    let half = Math.round(Math.sqrt(BOULDER_R * BOULDER_R - y * y));
    ctx.fillStyle = y < -BOULDER_R / 2 ? '#9296a0' : '#7d7d86';   // dégradé haut clair / bas sombre
    ctx.fillRect(sx - half, sy + y, half * 2, 1);
  }
  ctx.fillStyle = '#a6a6b0'; ctx.fillRect(sx - 6, sy - 9, 4, 3);  // reflet en haut à gauche
  // taches & fissures qui pivotent → impression de roulement
  for (let s of [[0, 0], [7, -4], [-5, 4], [4, 7], [-8, -3], [9, 5], [-3, -8]]) {
    let a = boulderRoll;
    let rx = Math.round(s[0] * Math.cos(a) - s[1] * Math.sin(a));
    let ry = Math.round(s[0] * Math.sin(a) + s[1] * Math.cos(a));
    ctx.fillStyle = '#5f5f68'; ctx.fillRect(sx + rx, sy + ry, 2, 2);
  }
}

// ── Décor de montagne ─────────────────────────────────────────────────
function drawMtnRidges() {
  for (let sx = 0; sx <= W; sx++) {                 // crête lointaine
    let wx = sx + camX * 0.25;
    let ry = Math.round(60 - camY * 0.12 + Math.sin(wx * 0.013) * 18 + Math.sin(wx * 0.05) * 5);
    if (ry < H) { ctx.fillStyle = '#cfe0f2'; ctx.fillRect(sx, ry, 1, H - ry); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, ry, 1, 2); }
  }
  for (let sx = 0; sx <= W; sx++) {                 // crête médiane (plus proche, plus sombre)
    let wx = sx + camX * 0.45;
    let ry = Math.round(86 - camY * 0.28 + Math.sin(wx * 0.02) * 15 + Math.sin(wx * 0.07) * 4);
    if (ry < H) { ctx.fillStyle = '#b7cde6'; ctx.fillRect(sx, ry, 1, H - ry); ctx.fillStyle = '#eef5fc'; ctx.fillRect(sx, ry, 1, 2); }
  }
}
function drawMtnSnowfall() {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 46; i++) {
    let x = (i * 37 + tick * 0.7 + Math.sin(i * 1.7 + tick * 0.03) * 6) % W;
    let y = (i * 53 + tick * 1.3) % H;
    ctx.fillRect(x | 0, y | 0, 1, 1);
  }
}
function drawMtnFog(frac) {
  for (let i = 0; i < 4; i++) {                        // nappes de brouillard qui dérivent
    let a = (0.06 + 0.17 * frac) * (0.6 + 0.4 * Math.sin(tick * 0.01 + i * 1.7));
    let y = ((i * 34 + tick * 0.2 * (i + 1)) % (H + 40)) - 20;
    ctx.fillStyle = `rgba(238,244,252,${a})`; ctx.fillRect(0, y | 0, W, 15);
  }
  ctx.fillStyle = `rgba(240,246,253,${0.07 + 0.42 * frac})`; ctx.fillRect(0, 0, W, H); // voile global plus dense en altitude
}
// Découpe un texte en lignes qui tiennent dans maxW (police déjà choisie)
function wrapText(text, x, y, maxW, lh) {
  let line = '', yy = y;
  for (let w of text.split(' ')) {
    let test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}
function drawSummitBanner() {
  ctx.fillStyle = 'rgba(10,20,40,0.74)'; ctx.fillRect(12, 40, W - 24, 54);
  ctx.fillStyle = '#7c5cff'; ctx.fillRect(12, 40, W - 24, 1); ctx.fillRect(12, 93, W - 24, 1);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffe070'; ctx.font = '8px monospace'; ctx.fillText('SOMMET ' + summitCount + ' - ' + powerTitle(), 22, 46);
  ctx.fillStyle = '#ffffff'; ctx.font = '6px monospace';
  wrapText(ABSURD_QUOTES[(tick >> 7) % ABSURD_QUOTES.length], 20, 58, W - 40, 8);  // citation qui défile
  if (SKILL_UNLOCKS[summitCount]) { ctx.fillStyle = '#7cf07c'; ctx.fillText('NOUVEAU : ' + SKILL_UNLOCKS[summitCount], 20, 72); }
  ctx.fillStyle = '#9cd0ff'; ctx.fillText('Le rocher redescend...', 20, 79);
  ctx.fillStyle = '#7fa8d6'; ctx.fillText('Redescends et recommence !', 20, 86);
  ctx.textBaseline = 'alphabetic';
}

fitCanvas();
buildGradients();
requestAnimationFrame(loop);

/* ════════════════════════════════════════════════════════════════════
   ARBRE DE SKILLS — un nouveau pouvoir à chaque niveau (= sommet)
   Niv 2  : sauter avec la balle (moins haut)
   Niv 3  : E = pousser la balle en avant (niv 4→10 : de plus en plus loin)
   Niv 11 : R = lance-missile, la balle explose et réapparaît en bas
   Niv 12 : U (maintenu) = fontaine d'eau sur la tête
   Niv 13 : bébé pingouin sur mini-vélo qui suit partout
   Niv 14 : le pingouin devient ROUGE
   ════════════════════════════════════════════════════════════════════ */

// ── État partagé avec le code du dessus ───────────────────────────────
let isPushing = false;         // le pingouin est collé derrière la balle
let boulderVy = 0;             // vitesse verticale de la balle (saut niv 2)
let boulderLift = 0;           // hauteur de la balle au-dessus du sol
let boulderKickVx = 0;         // élan de la balle après un coup de lame (E)

// ── Textes de déblocage (bannière de sommet + HUD) ────────────────────
const SKILL_UNLOCKS = {
  2:  'Saut avec balle + POISSONS !',
  3:  'E : pousser la balle en avant',
  11: 'R : LANCE-MISSILE !',
  12: 'U : fontaine sur la tete',
  13: 'Bebe pingouin sur mini velo',
  14: 'Pingouin ROUGE',
  15: 'Entree : salto en l\'air',
};
for (let l = 4; l <= 10; l++) SKILL_UNLOCKS[l] = 'La balle se pousse plus loin';
SKILL_UNLOCKS[5] = 'La balle ECRASE les poissons';

function skillHints() {
  let l = powerLvl(), h = [];
  if (l >= 2)  h.push('Poissons: saute-les !');
  if (l >= 3)  h.push('E: pousser la balle');
  if (l >= 5)  h.push('Balle = ecrase-poissons');
  if (l >= 11) h.push('R: missile');
  if (l >= 12) h.push('U: fontaine');
  if (l >= 13) h.push('Bebe pingouin te suit !');
  if (l >= FLIP_LEVEL) h.push('SALTO: Entree en saut');
  return h;
}

// ── Niv 14 : palette rouge du joueur (le bébé la suit aussi) ─────────
const PCOL_RED = ['transparent', '#c81018', '#ffd6c8', '#ff9020'];
function playerPal() { return powerLvl() >= 14 ? PCOL_RED : PCOL; }

// ── Niv 3-10 : coup de lame (E) — la balle part rouler en avant ──────
function kickBoulder() {
  if (powerLvl() < 3 || boulderTumbling) return;
  if (!(Math.abs(player.wx - boulderWx) < BOULDER_R + 18 && player.wx < boulderWx)) return;
  let p = Math.min(powerLvl(), 10);
  boulderKickVx = 2.0 + 0.6 * (p - 3);      // niv 4→10 : de plus en plus loin
}

// ── Niv 11 : lance-missile (R) ────────────────────────────────────────
let missile = null;
let parts = [];                // particules : explosion + fumée du missile
function fireMissile() {
  if (powerLvl() < 11 || missile) return;
  let d = player.dir === 'left' ? -1 : 1;
  missile = { wx: player.wx + 4 + d * 12, wy: player.wy - 2, vx: d * 5, dist: 0 };
}
function explodeBoulder() {
  for (let i = 0; i < 32; i++) {
    let a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 2.6;
    parts.push({ wx: boulderWx, wy: groundY(boulderWx) - BOULDER_R,
                 vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
                 g: 0.08, life: 0, max: 45, big: true,
                 col: ['#ffd040', '#ff7020', '#ffffff', '#7d7d86'][i % 4] });
  }
  missile = null;
  // une nouvelle balle réapparaît direct, au pied de la montagne
  boulderWx = BOULDER_FOOT; boulderRoll = 0; boulderTumbling = false;
  boulderKickVx = 0; boulderLift = 0; boulderVy = 0;
}

// ── Niv 12 : fontaine (U maintenu) ────────────────────────────────────
let drops = [];                // gouttes d'eau qui jaillissent de la tête

// ── Niv 13 : bébé pingouin qui suit avec du retard ────────────────────
const BABY_LAG = 26;           // frames de retard sur le joueur
let babyTrail = [];            // positions récentes du joueur

function updateSkills() {
  // missile en vol
  if (missile) {
    missile.wx += missile.vx; missile.dist += Math.abs(missile.vx);
    if ((tick & 1) === 0)      // traînée de fumée
      parts.push({ wx: missile.wx - missile.vx * 1.5, wy: missile.wy + (Math.random() - 0.5) * 2,
                   vx: 0, vy: -0.08, g: 0, life: 0, max: 26, big: false, col: '#c8ccd4' });
    let by = groundY(boulderWx) - BOULDER_R - boulderLift;
    if (Math.abs(missile.wx - boulderWx) < BOULDER_R + 3 && Math.abs(missile.wy - by) < BOULDER_R + 8) explodeBoulder();
    else if (missile.dist > 280) missile = null;    // raté : le missile s'éteint
  }
  // particules (explosion + fumée)
  for (let p of parts) { p.vy += p.g; p.wx += p.vx; p.wy += p.vy; p.life++; }
  parts = parts.filter(p => p.life < p.max);
  // fontaine — GEYSER : dense, haut, large, avec éclaboussures à l'impact
  if (powerLvl() >= 12 && keys['u'] && !invOpen)
    for (let i = 0; i < 8; i++)
      drops.push({ wx: player.wx + 4 + (Math.random() - 0.5) * 3, wy: player.wy - RIDE_LIFT - 12,
                   vx: (Math.random() - 0.5) * 2.6, vy: -2.2 - Math.random() * 1.8,
                   life: 0, big: i % 3 === 0 });
  for (let d of drops) { d.vy += 0.11; d.wx += d.vx; d.wy += d.vy; d.life++; }
  drops = drops.filter(d => {
    if (d.life >= 140) return false;
    if (d.wy >= groundY(d.wx)) {                        // éclaboussure au sol
      parts.push({ wx: d.wx, wy: groundY(d.wx) - 1, vx: (Math.random() - 0.5) * 1.4,
                   vy: -0.5 - Math.random() * 0.7, g: 0.09, life: 0, max: 14, big: false, col: '#bfe9ff' });
      return false;
    }
    return true;
  });
  // trace du joueur pour le bébé
  babyTrail.push({ wx: player.wx, wy: player.wy, dir: player.dir });
  if (babyTrail.length > BABY_LAG) babyTrail.shift();
}

function drawBaby() {
  if (powerLvl() < 13 || babyTrail.length < BABY_LAG) return;
  const b = babyTrail[0];                             // état du joueur il y a BABY_LAG frames
  let sx = Math.round(b.wx - camX); if (sx < -20 || sx > W + 20) return;
  let fy = Math.round(b.wy) + 10;                     // pieds du bébé (il saute aussi, en retard)
  let flip = b.dir === 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(sx - 5, Math.round(groundY(b.wx)), 10, 1);
  ctx.save();
  if (flip) { ctx.translate(sx, 0); ctx.scale(-1, 1); ctx.translate(-sx, 0); }
  drawBike(sx - 8, fy - 8, BIKES[equippedBike], bikeRoll);   // mini-vélo assorti (échelle ×1)
  ctx.restore();
  drawSprite(SPR_SIDE, sx - 4, fy - 17, flip, playerPal());  // bébé = sprite ×1, assis sur la selle
}

function drawSkillFx() {
  for (let p of parts) {
    ctx.fillStyle = p.col;
    let s = p.big ? 2 : 1;
    ctx.fillRect(Math.round(p.wx - camX), Math.round(p.wy), s, s);
  }
  if (powerLvl() >= 12 && keys['u'] && !invOpen) {      // cœur lumineux du geyser
    let jx = Math.round(player.wx + 4 - camX), jy = Math.round(player.wy - RIDE_LIFT - 11);
    let jg = ctx.createRadialGradient(jx, jy, 1, jx, jy, 15);
    jg.addColorStop(0, 'rgba(190,235,255,0.55)'); jg.addColorStop(1, 'rgba(190,235,255,0)');
    ctx.fillStyle = jg; ctx.fillRect(jx - 15, jy - 15, 30, 30);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(jx - 1, jy - 4, 2, 6);
  }
  for (let i = 0; i < drops.length; i++) {
    let d = drops[i];
    ctx.fillStyle = d.big ? '#eaf9ff' : (i % 3 ? '#4db4ff' : '#9fe0ff');   // eau bleue bien visible
    ctx.fillRect(Math.round(d.wx - camX), Math.round(d.wy), d.big ? 2 : 1, d.big ? 3 : 2);
  }
  if (missile) {
    let sx = Math.round(missile.wx - camX), sy = Math.round(missile.wy);
    let d = missile.vx > 0 ? 1 : -1;
    ctx.fillStyle = '#c8ccd8'; ctx.fillRect(sx - 3, sy, 6, 2);                                   // corps
    ctx.fillStyle = '#e02828'; ctx.fillRect(d > 0 ? sx + 3 : sx - 4, sy, 1, 2);                  // ogive
    ctx.fillStyle = (tick & 2) ? '#ffb020' : '#ff6010';
    ctx.fillRect(d > 0 ? sx - 5 : sx + 3, sy, 2, 2);                                             // flamme
  }
}

// E = coup de lame ; R = missile
document.addEventListener('keydown', e => {
  if (e.repeat || invOpen) return;
  let k = e.key.toLowerCase();
  if (k === 'e') kickBoulder();
  if (k === 'r') fireMissile();
});

/* ════════════════════════════════════════════════════════════════════
   OBSTACLES & ENNEMIS (à partir du niv 2)
   - Pics de glace : bloquent le pingouin ET la balle → saute par-dessus
   - Poissons à pattes en Air Force 1 : ils foncent tacler la balle pour
     la faire redescendre. Saute par-dessus avec la balle pour les éviter.
     Dès le niv 5, la balle poussée/lancée les ÉCRASE.
   ════════════════════════════════════════════════════════════════════ */

const CRUSH_LEVEL = 5;         // niveau où la balle devient une arme anti-poisson

// ── Pics de glace sur la pente ────────────────────────────────────────
const ROCKS = [
  { x: 1050, w: 10, h: 8 }, { x: 1420, w: 12, h: 9 }, { x: 1780, w: 10, h: 8 },
  { x: 2120, w: 12, h: 9 }, { x: 2450, w: 10, h: 8 }, { x: 2650, w: 12, h: 9 },
];
// De plus en plus de pics actifs en montant de niveau (aucun avant le niv 2)
function activeRocks() {
  return powerLvl() < 2 ? [] : ROCKS.slice(0, Math.min(powerLvl(), ROCKS.length));
}
function collidePlayerRocks() {
  for (let r of activeRocks()) {
    if (player.wy + 10 <= groundY(r.x) - r.h + 1) continue;   // assez haut : passe au-dessus
    let cx = player.wx + 4, half = r.w / 2 + 6;
    if (Math.abs(cx - r.x) < half)
      player.wx = (cx < r.x ? r.x - half : r.x + half) - 4;
  }
}
function drawRock(r) {
  let sx = Math.round(r.x - camX); if (sx < -16 || sx > W + 16) return;
  let gy = Math.round(groundY(r.x));
  for (let y = 0; y < r.h; y++) {                    // pointe de glace translucide
    let half = Math.round((r.w / 2) * (y / r.h)) + 1;
    ctx.fillStyle = y < 2 ? '#eaf6ff' : (y % 2 ? '#7cc4e8' : '#5aaad8');
    ctx.fillRect(sx - half, gy - r.h + y, half * 2, 1);
  }
  ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, gy - r.h + 1, 1, 3);   // reflet
  ctx.fillStyle = 'rgba(90,140,190,0.3)'; ctx.fillRect(sx - r.w / 2, gy, r.w, 2); // ombre bleutée
}

// ── Poissons à pattes (Air Force 1 aux pieds) ─────────────────────────
let enemies = [];
function spawnEnemies() {
  enemies = [];
  if (powerLvl() < 2) return;
  let n = Math.min(powerLvl(), 12);                  // + de niveaux = + de poissons
  for (let i = 0; i < n; i++) {
    let t = (i + 1) / (n + 1);
    let wx = MOUNTAIN_START + 140 + t * (SUMMIT_X - MOUNTAIN_START - 380) + ((i * 97) % 80);
    enemies.push({ wx, home: wx, dir: 1, t: 0, f: 0, cool: 0, dead: false, deadT: 0 });
  }
}
function splat(en) {                                 // le poisson explose en confettis
  for (let i = 0; i < 14; i++)
    parts.push({ wx: en.wx, wy: groundY(en.wx) - 8,
                 vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.2,
                 g: 0.1, life: 0, max: 35, big: i % 2 === 0,
                 col: ['#3ec8e8', '#ffffff', '#e02828'][i % 3] });
}
function updateEnemies() {
  for (let en of enemies) {
    if (en.dead) { en.deadT++; continue; }
    if (++en.t >= 8) { en.t = 0; en.f = (en.f + 1) % 2; }
    if (en.cool > 0) en.cool--;
    let distB = boulderWx - en.wx;
    let spd = 0.9 + 0.06 * powerLvl();
    if (Math.abs(distB) < 110 && en.cool === 0) {    // il fonce sur la balle
      en.dir = distB > 0 ? 1 : -1;
      en.wx += en.dir * spd;
    } else {                                          // patrouille autour de chez lui
      en.wx += en.dir * 0.35;
      if (en.wx > en.home + 45) en.dir = -1;
      if (en.wx < en.home - 45) en.dir = 1;
    }
    // contact avec la balle (raté si elle est en l'air : saute par-dessus !)
    if (Math.abs(en.wx - boulderWx) < BOULDER_R + 5 && boulderLift < 12) {
      let ballAttacks = boulderTumbling ||
        (powerLvl() >= CRUSH_LEVEL && ((isPushing && playerDx > 0) || boulderKickVx > 0.5));
      if (ballAttacks) { en.dead = true; en.deadT = 0; splat(en); }
      else if (en.cool === 0) {
        boulderKickVx = -3.8;                        // TACLE : la balle repart en arrière
        en.cool = 140;                               // puis il souffle un moment
        en.wx -= en.dir * 6;
      }
    }
  }
  enemies = enemies.filter(en => !en.dead || en.deadT < 50);
}
function drawEnemy(en) {
  let sx = Math.round(en.wx - camX); if (sx < -20 || sx > W + 20) return;
  let gy = Math.round(groundY(en.wx));
  let oy = en.dead ? Math.round(-2.4 * en.deadT + 0.07 * en.deadT * en.deadT) : 0;
  let flip = en.dir < 0;
  const EW = 16;
  const P = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(flip ? sx + EW - x - w : sx + x, gy + y + oy, w, h); };
  if (!en.dead) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(sx + 2, gy, 12, 2); }
  if (en.dead) {                                     // K.O. : il s'envole à l'envers
    ctx.save();
    let rcx = sx + 8, rcy = gy + oy - 8;
    ctx.translate(rcx, rcy); ctx.rotate(Math.PI); ctx.translate(-rcx, -rcy);
  }
  // pattes animées
  let l1 = en.f ? 0 : 1, l2 = en.f ? 1 : 0;
  P(5 + l1, -4, 2, 3, '#1a6a80');
  P(9 + l2, -4, 2, 3, '#1a6a80');
  // Air Force 1 : corps blanc, semelle grise, swoosh rouge
  P(4 + l1, -2, 4, 1, '#ffffff'); P(4 + l1, -1, 4, 1, '#d8d8e0'); P(6 + l1, -2, 1, 1, '#e02828');
  P(8 + l2, -2, 4, 1, '#ffffff'); P(8 + l2, -1, 4, 1, '#d8d8e0'); P(10 + l2, -2, 1, 1, '#e02828');
  // corps de poisson (tête à l'avant)
  P(0, -10, 2, 4, '#2090b0');                        // queue
  P(1, -9, 2, 2, '#28a8c8');
  P(3, -11, 10, 6, '#30b8d8');                       // corps
  P(4, -8, 8, 2, '#a8e8f4');                         // ventre clair
  P(4, -11, 8, 1, '#58d0ec');                        // reflet du dos
  P(6, -13, 4, 2, '#2090b0');                        // nageoire dorsale
  P(7, -9, 2, 2, '#28a8c8');                         // petite nageoire
  // œil + bouche
  P(11, -10, 2, 2, '#ffffff'); P(12, -10, 1, 1, '#101018');
  P(13, -8, 2, 1, '#801020');
  if (en.dead) ctx.restore();
}
spawnEnemies();

// ── Triche de test : P = niveau +1, O = niveau -1 ─────────────────────
function setLevel(l) {
  summitCount = Math.max(0, l);
  spawnEnemies();                              // le monde suit le nouveau niveau
  won = true; wonTimer = tick;                 // affiche la bannière du niveau
}
document.addEventListener('keydown', e => {   // e.repeat autorisé : maintenir P pour grimper vite
  let k = e.key.toLowerCase();
  if (k === 'p') setLevel(summitCount + 1);
  if (k === 'o') setLevel(summitCount - 1);
});

// ── Vignette écran (rendu moderne) ────────────────────────────────────
function drawVignette() {
  let g = ctx.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, W * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,12,30,0.38)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
