// ═══════════════════════════════════════════════════════════════════
// ENEMIES — les poissons à pattes en Air Force 1. Ils patrouillent sur
// la pente et foncent tacler la balle pour la faire redescendre.
// Esquive : sauter par-dessus avec la balle. Dès CRUSH_LEVEL, la balle
// poussée / lancée / qui dévale les écrase.
// ═══════════════════════════════════════════════════════════════════
import { W, BOULDER_R, MOUNTAIN_START, SUMMIT_X, CRUSH_LEVEL } from './config.js';
import { ctx, G } from './state.js';
import { groundY } from './world.js';
import { powerLvl } from './progression.js';
import { parts } from './skills.js';

export let enemies = [];

export function spawnEnemies() {
  enemies = [];
  if (powerLvl() < 2) return;
  let n = Math.min(powerLvl(), 12);                  // + de niveaux = + de poissons
  for (let i = 0; i < n; i++) {
    let t = (i + 1) / (n + 1);
    let wx = MOUNTAIN_START + 140 + t * (SUMMIT_X - MOUNTAIN_START - 380) + ((i * 97) % 80);
    enemies.push({ wx, home: wx, dir: 1, t: 0, f: 0, cool: 0, stun: 0, dead: false, deadT: 0 });
  }
}

// SBAM : étourdit tous les poissons vivants dans un rayon autour de wx
export function stunEnemiesNear(wx, r) {
  for (let en of enemies)
    if (!en.dead && Math.abs(en.wx - wx) < r) { en.stun = 180; }
}

export function splat(en) {                          // le poisson explose en confettis
  for (let i = 0; i < 14; i++)
    parts.push({ wx: en.wx, wy: groundY(en.wx) - 8,
                 vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.2,
                 g: 0.1, life: 0, max: 35, big: i % 2 === 0,
                 col: ['#3ec8e8', '#ffffff', '#e02828'][i % 3] });
}

export function updateEnemies() {
  for (let en of enemies) {
    if (en.dead) { en.deadT++; continue; }
    if (en.stun > 0) {                               // sonné par un SBAM : il voit des étoiles
      en.stun--;
    } else {
      if (++en.t >= 8) { en.t = 0; en.f = (en.f + 1) % 2; }
      if (en.cool > 0) en.cool--;
      let distB = G.boulderWx - en.wx;
      let spd = 0.9 + 0.06 * powerLvl();
      if (Math.abs(distB) < 110 && en.cool === 0) {  // il fonce sur la balle
        en.dir = distB > 0 ? 1 : -1;
        en.wx += en.dir * spd;
      } else {                                        // patrouille autour de chez lui
        en.wx += en.dir * 0.35;
        if (en.wx > en.home + 45) en.dir = -1;
        if (en.wx < en.home - 45) en.dir = 1;
      }
    }
    // contact avec la balle (raté si elle est en l'air : saute par-dessus !)
    if (Math.abs(en.wx - G.boulderWx) < BOULDER_R + 5 && G.boulderLift < 12) {
      let ballAttacks = G.boulderTumbling ||
        (powerLvl() >= CRUSH_LEVEL && ((G.isPushing && G.playerDx > 0) || G.boulderKickVx > 0.5));
      if (ballAttacks) { en.dead = true; en.deadT = 0; splat(en); }
      else if (en.cool === 0 && en.stun <= 0) {      // un poisson sonné ne tacle pas
        G.boulderKickVx = -3.8;                      // TACLE : la balle repart en arrière
        en.cool = 140;                               // puis il souffle un moment
        en.wx -= en.dir * 6;
      }
    }
  }
  enemies = enemies.filter(en => !en.dead || en.deadT < 50);
}

function drawEnemy(en) {
  let sx = Math.round(en.wx - G.camX); if (sx < -20 || sx > W + 20) return;
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
  if (en.stun > 0 && !en.dead) {                     // étoiles qui tournent au-dessus de la tête
    ctx.fillStyle = '#ffe040';
    for (let k = 0; k < 3; k++) {
      let a = G.tick * 0.15 + k * 2.1;
      ctx.fillRect(sx + 8 + Math.round(Math.cos(a) * 6), gy - 17 + Math.round(Math.sin(a) * 2), 1, 1);
    }
  }
}
export function drawEnemies() { for (let en of enemies) drawEnemy(en); }
