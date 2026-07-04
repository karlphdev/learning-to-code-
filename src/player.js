// ═══════════════════════════════════════════════════════════════════
// PLAYER — le pingouin : sprite, palettes, physique, saut, salto, dessin.
// ═══════════════════════════════════════════════════════════════════
import { W, GRAVITY, PS, RIDE_LIFT, FLIP_LEVEL, WORLD_LEFT, SUMMIT_X,
         DOUBLE_JUMP_LEVEL, TRANS_LEVEL } from './config.js';
import { ctx, G } from './state.js';
import { keys } from './input.js';
import { groundY } from './world.js';
import { powerLvl, currentSpeed, currentJump, bikeIsSupersonic } from './progression.js';
import { collidePlayerRocks } from './obstacles.js';
import { drawAura } from './aura.js';
import { drawEquippedBike } from './bikes.js';
import { sbamImpact } from './skills.js';

// ── Sprite pingouin (8×10, vu de côté) ────────────────────────────────
export const SPR_SIDE = [
  [0,0,1,1,1,0,0,0],[0,1,1,1,1,1,0,0],
  [0,1,2,1,1,1,0,0],[0,1,1,3,0,0,0,0],
  [0,1,2,2,1,0,0,0],[0,1,2,2,1,0,0,0],
  [0,1,2,2,1,0,0,0],[0,1,1,1,1,0,0,0],
  [0,3,3,0,0,0,0,0],[0,0,3,3,0,0,0,0],
];
export const PCOL = ['transparent', '#08080f', '#eceef8', '#e87020'];
const PCOL_RED   = ['transparent', '#c81018', '#ffd6c8', '#ff9020'];   // niv 14 : pingouin ROUGE
const PCOL_TRANS = ['transparent', '#fff6d8', '#ffffff', '#ffc010'];   // niv 20 : lumineux, ROI DU BLOCK
export function playerPal() {
  if (powerLvl() >= TRANS_LEVEL) return PCOL_TRANS;
  return powerLvl() >= 14 ? PCOL_RED : PCOL;
}

export function drawSprite(spr, px, py, flipX, pal) {
  let colors = pal || PCOL;
  for (let row = 0; row < spr.length; row++)
    for (let col = 0; col < 8; col++) {
      let p = spr[row][col]; if (!p) continue;
      ctx.fillStyle = colors[p];
      ctx.fillRect(flipX ? px + (7 - col) : px + col, py + row, 1, 1);
    }
}

// Dessine un sprite pingouin agrandi ×PS, ancré sur les pieds (bas-centre)
export function drawPenguinScaled(spr, px, py, flip, pal) {
  let pvx = px + 4, pvy = py + 10;
  ctx.save();
  ctx.translate(pvx, pvy); ctx.scale(PS, PS); ctx.translate(-pvx, -pvy);
  drawSprite(spr, px, py, flip, pal);
  ctx.restore();
}

// ── Physique du joueur : renvoie dx (déplacement horizontal du pas) ──
let jumpWasDown = false;         // pour détecter un NOUVEL appui (double saut)
export function updatePlayer() {
  const player = G.player;
  const jumpDown = keys['z'] || keys['arrowup'] || keys[' '];
  const jumpPressed = jumpDown && !jumpWasDown;
  let dx = 0;
  if (!G.invOpen) {
    let spd = currentSpeed();
    if (keys['q'] || keys['arrowleft'])  { dx = -spd; player.dir = 'left'; }
    if (keys['d'] || keys['arrowright']) { dx =  spd; player.dir = 'right'; }
    player.wx += dx;
    if (player.wx < WORLD_LEFT) player.wx = WORLD_LEFT;
    if (player.wx > SUMMIT_X)   player.wx = SUMMIT_X;
    collidePlayerRocks();                    // les pics de glace bloquent (sauf en sautant)
    G.bikeRoll += dx * 0.45;                 // les roues tournent selon la distance parcourue
    if (jumpDown && player.onGround) {
      if (G.isPushing) {                     // collé derrière la balle
        if (powerLvl() >= 2) {               // Niv 2 : sauter AVEC la balle (moins haut)
          player.vy = currentJump() * 0.6; player.onGround = false;
          G.boulderVy = currentJump() * 0.6; // la balle saute avec le pingouin
        }
      } else { player.vy = currentJump(); player.onGround = false; }
    } else if (jumpPressed && !player.onGround && !G.doubleUsed && !G.pounding
               && powerLvl() >= DOUBLE_JUMP_LEVEL) {
      // Niv 6 : DOUBLE SAUT BACKFLIP — 2e impulsion en l'air + tour complet, pour le style
      player.vy = currentJump() * 0.85;
      G.doubleUsed = true;
      G.backflipLeft = Math.PI * 2;                        // un tour complet
      G.backflipDir = player.dir === 'left' ? 1 : -1;      // backflip = rotation inverse de la marche
    }
  }
  jumpWasDown = jumpDown;
  player.vy += GRAVITY; player.wy += player.vy;
  // animation du backflip (double saut)
  if (G.backflipLeft > 0) {
    let step = Math.min(0.38, G.backflipLeft);
    G.flipAngle += G.backflipDir * step;
    G.backflipLeft -= step;
  }
  // Salto avant (débloqué au palier FLIP_LEVEL) : Entrée en l'air → tourne ; maintenir → plusieurs tours
  if (!G.invOpen && powerLvl() >= FLIP_LEVEL && !player.onGround && keys['enter']) {
    G.flipAngle += 0.26 * (player.dir === 'left' ? -1 : 1);   // sens du salto = sens de marche
  }
  let gy = groundY(player.wx) - 10;                 // le sol unique : jungle plat → montagne
  if (player.wy >= gy) {                            // atterrissage
    player.wy = gy; player.vy = 0; player.onGround = true;
    G.flipAngle = 0; G.backflipLeft = 0; G.doubleUsed = false;   // retombe debout, saut rechargé
    if (G.pounding) { G.pounding = false; sbamImpact(); }        // SBAM !!!
  }
  if (dx && player.onGround) {
    if (++player.walkTimer >= 10) { player.walkTimer = 0; player.walkFrame = (player.walkFrame + 1) % 2; }
  } else { player.walkFrame = 0; player.walkTimer = 0; }
  return dx;
}

// ── Dessin : ombre, traînées Supersonic, aura, vélo, pingouin, salto ──
export function drawPlayer() {
  const player = G.player, tick = G.tick;
  let px = Math.round(player.wx - G.camX), py = Math.round(player.wy);
  let gsy = Math.round(groundY(player.wx));
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(px - 3, gsy, 14, 2);
  let bob = (player.walkFrame === 1 && player.onGround) ? 1 : 0;
  if (bikeIsSupersonic() && G.playerDx !== 0) {              // traînées de vitesse Supersonic
    let behind = player.dir === 'right' ? -1 : 1;
    for (let i = 0; i < 7; i++) {
      let ly = py + ((i * 5 + tick * 2) % 14);
      let len = 5 + ((i * 7 + tick) % 11);
      let a = 0.55 - i * 0.06; if (a < 0.06) a = 0.06;
      ctx.fillStyle = 'rgba(52,240,255,' + a.toFixed(2) + ')';
      ctx.fillRect(behind < 0 ? px - len : px + 16, ly, len, 1);
    }
  }
  if (G.pounding) {                                          // SBAM : lignes de plongée
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 4; i++) {
      let lx = px - 2 + i * 5;
      ctx.fillRect(lx, py - 18 - ((tick * 3 + i * 7) % 12), 1, 6);
    }
  }
  drawAura(px, py, powerLvl());
  let flipping = G.flipAngle !== 0;
  if (flipping) { ctx.save(); ctx.translate(px + 8, py - 2); ctx.rotate(G.flipAngle); ctx.translate(-(px + 8), -(py - 2)); }
  drawEquippedBike(px + 4, py + 10, player.dir === 'left', G.bikeRoll);
  drawPenguinScaled(SPR_SIDE, px, py + bob - RIDE_LIFT, player.dir === 'left', playerPal());
  if (powerLvl() >= TRANS_LEVEL) {                           // niv 20 : la couronne flottante du ROI
    let cy = py - RIDE_LIFT - 13 + Math.round(Math.sin(tick * 0.1) * 1.5);
    let cx0 = px + 1;
    ctx.fillStyle = '#ffd020'; ctx.fillRect(cx0, cy, 7, 2);                                              // bandeau
    ctx.fillRect(cx0, cy - 2, 1, 2); ctx.fillRect(cx0 + 3, cy - 3, 1, 3); ctx.fillRect(cx0 + 6, cy - 2, 1, 2); // pointes
    ctx.fillStyle = '#ff3050'; ctx.fillRect(cx0 + 1, cy, 1, 1);                                          // rubis
    ctx.fillStyle = '#40c8ff'; ctx.fillRect(cx0 + 5, cy, 1, 1);                                          // saphir
    if ((tick >> 3) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx0 + 3, cy - 4, 1, 1); }             // scintille
  }
  if (flipping) ctx.restore();
}
