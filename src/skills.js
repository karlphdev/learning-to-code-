// ═══════════════════════════════════════════════════════════════════
// SKILLS — l'arbre de pouvoirs débloqués sommet après sommet :
//   Niv 2  : sauter avec la balle (géré dans player.js / boulder.js)
//   Niv 3  : E = pousser la balle en avant (niv 4→10 : de plus en plus loin)
//   Niv 11 : R = lance-missile, la balle explose et réapparaît en bas
//   Niv 12 : U (maintenu) = geyser d'eau sur la tête
//   Niv 13 : bébé pingouin sur mini-vélo qui suit partout
//   Niv 14 : pingouin ROUGE (palette dans player.js)
// ═══════════════════════════════════════════════════════════════════
import { W, BOULDER_R, BOULDER_FOOT, RIDE_LIFT, FLIP_LEVEL, BABY_LAG,
         POUND_LEVEL, GANG_LEVEL, TRANS_LEVEL } from './config.js';
import { ctx, G } from './state.js';
import { keys } from './input.js';
import { groundY } from './world.js';
import { powerLvl } from './progression.js';
import { drawSprite, drawPenguinScaled, SPR_SIDE, PCOL, playerPal } from './player.js';
import { drawBike, drawBikeScaled, BIKES } from './bikes.js';
import { enemies, splat, stunEnemiesNear } from './enemies.js';

// ── Textes de déblocage (bannière de sommet + HUD) ────────────────────
export const SKILL_UNLOCKS = {
  2:  'Saut avec balle + POISSONS !',
  3:  'E : pousser la balle en avant',
  11: 'R : LANCE-MISSILE !',
  12: 'U : fontaine sur la tete',
  13: 'Bebe pingouin sur mini velo',
  14: 'Pingouin ROUGE',
  15: 'Entree : salto en l\'air',
  17: 'G : APPELER LE GANG !!!',
  20: 'TRANSCENDANT DU BLOCK',
};
for (let l = 4; l <= 10; l++) SKILL_UNLOCKS[l] = 'La balle se pousse plus loin';
SKILL_UNLOCKS[5] = 'La balle ECRASE les poissons';
SKILL_UNLOCKS[6] = 'DOUBLE SAUT + S : SBAM !';

export function skillHints() {
  let l = powerLvl(), h = [];
  if (l >= 2)  h.push('Poissons: saute-les !');
  if (l >= 3)  h.push('E: pousser la balle');
  if (l >= 5)  h.push('Balle = ecrase-poissons');
  if (l >= 6)  h.push('Z en l\'air: double saut');
  if (l >= 6)  h.push('S en l\'air: SBAM');
  if (l >= 11) h.push('R: missile');
  if (l >= 12) h.push('U: fontaine');
  if (l >= 13) h.push('Bebe pingouin te suit !');
  if (l >= FLIP_LEVEL) h.push('SALTO: Entree en saut');
  if (l >= GANG_LEVEL) h.push('G: appelle le gang');
  if (l >= TRANS_LEVEL) h.push('ROI DU BLOCK. Respect.');
  return h;
}

// ── Niv 6 : SBAM (ground pound) ───────────────────────────────────────
// S en l'air : plongée fulgurante ; à l'impact, cratère de poussière,
// écran qui tremble et poissons étourdis autour.
export function startPound() {
  if (powerLvl() < POUND_LEVEL || G.player.onGround || G.pounding) return;
  G.pounding = true;
  if (G.player.vy < 7) G.player.vy = 7;        // plongée
}
export function sbamImpact() {                 // appelé par player.js à l'atterrissage
  const wx = G.player.wx + 4;
  const gy = groundY(wx);
  G.shake = 7;                                 // l'écran tremble
  G.sbamT = 24; G.sbamX = wx;                  // onde de choc au sol
  for (let i = 0; i < 30; i++) {               // nuage de poussière des deux côtés
    let d = i % 2 ? 1 : -1;
    parts.push({ wx, wy: gy - 2, vx: d * (0.8 + Math.random() * 3.2), vy: -Math.random() * 2.4,
                 g: 0.12, life: 0, max: 40, big: i % 3 === 0,
                 col: ['#d8cfc0', '#ffffff', '#a89880'][i % 3] });
  }
  stunEnemiesNear(wx, 70);                     // les poissons voient des étoiles
}

// ── Niv 17 : APPELER LE GANG (G) ──────────────────────────────────────
// Le pingouin sort son téléphone... et 3 pingouins du gang traversent
// l'écran à toute vitesse en écrasant tous les poissons sur leur passage.
let gang = [], gangCool = 0;
export function callGang() {
  if (powerLvl() < GANG_LEVEL || gangCool > 0 || G.calling > 0 || gang.length) return;
  G.calling = 45;          // le pingouin passe l'appel
  gangCool = 900;          // recharge ~15 s
}

// ── Niv 3-10 : coup de lame (E) — la balle part rouler en avant ──────
export function kickBoulder() {
  if (powerLvl() < 3 || G.boulderTumbling) return;
  if (!(Math.abs(G.player.wx - G.boulderWx) < BOULDER_R + 18 && G.player.wx < G.boulderWx)) return;
  let p = Math.min(powerLvl(), 10);
  G.boulderKickVx = 2.0 + 0.6 * (p - 3);      // niv 4→10 : de plus en plus loin
}

// ── Niv 11 : lance-missile (R) ────────────────────────────────────────
let missile = null;
export let parts = [];         // particules : explosions + fumée + éclaboussures
export function fireMissile() {
  if (powerLvl() < 11 || missile) return;
  let d = G.player.dir === 'left' ? -1 : 1;
  missile = { wx: G.player.wx + 4 + d * 12, wy: G.player.wy - 2, vx: d * 5, dist: 0 };
}
function explodeBoulder() {
  for (let i = 0; i < 32; i++) {
    let a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 2.6;
    parts.push({ wx: G.boulderWx, wy: groundY(G.boulderWx) - BOULDER_R,
                 vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
                 g: 0.08, life: 0, max: 45, big: true,
                 col: ['#ffd040', '#ff7020', '#ffffff', '#7d7d86'][i % 4] });
  }
  missile = null;
  // une nouvelle balle réapparaît direct, au pied de la montagne
  G.boulderWx = BOULDER_FOOT; G.boulderRoll = 0; G.boulderTumbling = false;
  G.boulderKickVx = 0; G.boulderLift = 0; G.boulderVy = 0;
}

// ── Niv 12 : geyser (U maintenu) ──────────────────────────────────────
let drops = [];                // gouttes d'eau qui jaillissent de la tête

// ── Niv 13 : bébé pingouin qui suit avec du retard ────────────────────
let babyTrail = [];            // positions récentes du joueur

export function updateSkills() {
  const player = G.player, tick = G.tick;
  // missile en vol
  if (missile) {
    missile.wx += missile.vx; missile.dist += Math.abs(missile.vx);
    if ((tick & 1) === 0)      // traînée de fumée
      parts.push({ wx: missile.wx - missile.vx * 1.5, wy: missile.wy + (Math.random() - 0.5) * 2,
                   vx: 0, vy: -0.08, g: 0, life: 0, max: 26, big: false, col: '#c8ccd4' });
    let by = groundY(G.boulderWx) - BOULDER_R - G.boulderLift;
    if (Math.abs(missile.wx - G.boulderWx) < BOULDER_R + 3 && Math.abs(missile.wy - by) < BOULDER_R + 8) explodeBoulder();
    else if (missile.dist > 280) missile = null;    // raté : le missile s'éteint
  }
  // particules (explosions + fumée + éclaboussures)
  for (let p of parts) { p.vy += p.g; p.wx += p.vx; p.wy += p.vy; p.life++; }
  parts = parts.filter(p => p.life < p.max);
  // geyser : dense, haut, large, avec éclaboussures à l'impact
  if (powerLvl() >= 12 && keys['u'] && !G.invOpen)
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
  // onde de choc du SBAM qui s'estompe
  if (G.sbamT > 0) G.sbamT--;
  // le gang
  if (gangCool > 0) gangCool--;
  if (G.calling > 0 && --G.calling === 0) {           // fin de l'appel : le gang débarque
    for (let i = 0; i < 3; i++)
      gang.push({ wx: G.camX - 24 - i * 30, vx: 5 + (i % 2) * 0.6, bike: [0, 3, 4][i] });
  }
  for (let g2 of gang) {
    g2.wx += g2.vx;
    for (let en of enemies)                           // drive-by : tout poisson croisé est écrasé
      if (!en.dead && Math.abs(en.wx - g2.wx) < 12) { en.dead = true; en.deadT = 0; splat(en); }
  }
  gang = gang.filter(g2 => g2.wx < G.camX + W + 80);
}

export function drawBaby() {
  if (powerLvl() < 13 || babyTrail.length < BABY_LAG) return;
  const b = babyTrail[0];                             // état du joueur il y a BABY_LAG pas
  let sx = Math.round(b.wx - G.camX); if (sx < -20 || sx > W + 20) return;
  let fy = Math.round(b.wy) + 10;                     // pieds du bébé (il saute aussi, en retard)
  let flip = b.dir === 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(sx - 5, Math.round(groundY(b.wx)), 10, 1);
  ctx.save();
  if (flip) { ctx.translate(sx, 0); ctx.scale(-1, 1); ctx.translate(-sx, 0); }
  drawBike(sx - 8, fy - 8, BIKES[G.equippedBike], G.bikeRoll);   // mini-vélo assorti (échelle ×1)
  ctx.restore();
  drawSprite(SPR_SIDE, sx - 4, fy - 17, flip, playerPal());      // bébé = sprite ×1, assis sur la selle
}

export function drawSkillFx() {
  const tick = G.tick;
  if (powerLvl() >= 12 && keys['u'] && !G.invOpen) {  // cœur lumineux du geyser
    let jx = Math.round(G.player.wx + 4 - G.camX), jy = Math.round(G.player.wy - RIDE_LIFT - 11);
    let jg = ctx.createRadialGradient(jx, jy, 1, jx, jy, 15);
    jg.addColorStop(0, 'rgba(190,235,255,0.55)'); jg.addColorStop(1, 'rgba(190,235,255,0)');
    ctx.fillStyle = jg; ctx.fillRect(jx - 15, jy - 15, 30, 30);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(jx - 1, jy - 4, 2, 6);
  }
  for (let p of parts) {
    ctx.fillStyle = p.col;
    let s = p.big ? 2 : 1;
    ctx.fillRect(Math.round(p.wx - G.camX), Math.round(p.wy), s, s);
  }
  for (let i = 0; i < drops.length; i++) {
    let d = drops[i];
    ctx.fillStyle = d.big ? '#eaf9ff' : (i % 3 ? '#4db4ff' : '#9fe0ff');   // eau bleue bien visible
    ctx.fillRect(Math.round(d.wx - G.camX), Math.round(d.wy), d.big ? 2 : 1, d.big ? 3 : 2);
  }
  if (missile) {
    let sx = Math.round(missile.wx - G.camX), sy = Math.round(missile.wy);
    let d = missile.vx > 0 ? 1 : -1;
    ctx.fillStyle = '#c8ccd8'; ctx.fillRect(sx - 3, sy, 6, 2);                                   // corps
    ctx.fillStyle = '#e02828'; ctx.fillRect(d > 0 ? sx + 3 : sx - 4, sy, 1, 2);                  // ogive
    ctx.fillStyle = (tick & 2) ? '#ffb020' : '#ff6010';
    ctx.fillRect(d > 0 ? sx - 5 : sx + 3, sy, 2, 2);                                             // flamme
  }
  // onde de choc du SBAM : anneau blanc qui s'élargit au sol
  if (G.sbamT > 0) {
    let t = 1 - G.sbamT / 24;
    let rw = Math.round(8 + t * 55);
    let gy = Math.round(groundY(G.sbamX));
    let cx2 = Math.round(G.sbamX - G.camX);
    ctx.fillStyle = `rgba(255,255,255,${(0.7 * (1 - t)).toFixed(3)})`;
    ctx.fillRect(cx2 - rw, gy - 1, rw * 2, 2);
    ctx.fillStyle = `rgba(216,207,192,${(0.5 * (1 - t)).toFixed(3)})`;
    ctx.fillRect(cx2 - Math.round(rw * 0.7), gy - 3, Math.round(rw * 1.4), 1);
  }
  // le téléphone pixel pendant l'appel du gang
  if (G.calling > 0) {
    let px = Math.round(G.player.wx - G.camX), py = Math.round(G.player.wy);
    let d = G.player.dir === 'left' ? -1 : 1;
    let hx = px + 4 + d * 8, hy = py - RIDE_LIFT - 6;
    ctx.fillStyle = '#181820'; ctx.fillRect(hx, hy, 3, 6);                 // le téléphone
    ctx.fillStyle = '#7cf0ff'; ctx.fillRect(hx + 1, hy + 1, 2, 3);         // écran allumé
    ctx.fillStyle = '#ffffff';                                             // « ... » de l'appel
    let dots = Math.min(3, 1 + (((45 - G.calling) / 12) | 0));
    for (let k = 0; k < dots; k++) ctx.fillRect(hx - 1 + k * 3, hy - 5, 1, 1);
  }
  // les riders du gang : lunettes noires, chaîne en or, plein gaz
  for (let g2 of gang) {
    let sx = Math.round(g2.wx - G.camX);
    let gy = Math.round(groundY(g2.wx));
    let py = gy - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(sx - 3, gy, 14, 2);
    drawBikeScaled(sx + 4, gy, BIKES[g2.bike], false, tick * 0.5);
    drawPenguinScaled(SPR_SIDE, sx, py - RIDE_LIFT, false, PCOL);
    // accessoires, dessinés dans le même repère ×2 ancré sur les pieds
    let ax = sx + 4, ay = py - RIDE_LIFT + 10, ry = py - RIDE_LIFT;
    ctx.save();
    ctx.translate(ax, ay); ctx.scale(2, 2); ctx.translate(-ax, -ay);
    ctx.fillStyle = '#101014'; ctx.fillRect(sx + 1, ry + 2, 5, 1);         // lunettes noires
    ctx.fillStyle = '#ffd020'; ctx.fillRect(sx + 2, ry + 4, 3, 1);         // chaîne en or
    ctx.fillRect(sx + 3, ry + 5, 1, 1);                                    // pendentif
    ctx.restore();
    // traînée de vitesse
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let k = 0; k < 3; k++) ctx.fillRect(sx - 8 - k * 5, py + 2 + k * 3, 4, 1);
  }
}
