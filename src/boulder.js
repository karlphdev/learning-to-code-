// ═══════════════════════════════════════════════════════════════════
// BOULDER — la balle (rocher de Sisyphe) : poussée, saut, élan, dévale.
// ═══════════════════════════════════════════════════════════════════
import { W, GRAVITY, BOULDER_R, BOULDER_FOOT, SUMMIT_X } from './config.js';
import { ctx, G } from './state.js';
import { groundY } from './world.js';
import { currentPush, applyPowerUp } from './progression.js';
import { activeRocks } from './obstacles.js';

// dx = déplacement du pingouin ce pas
export function updateBoulder(dx) {
  const player = G.player;
  // physique verticale de la balle (saut avec la balle, niv 2)
  if (G.boulderLift > 0 || G.boulderVy !== 0) {
    G.boulderVy += GRAVITY; G.boulderLift -= G.boulderVy;
    if (G.boulderLift <= 0) { G.boulderLift = 0; G.boulderVy = 0; }
  }
  if (G.boulderTumbling) {                     // elle dévale seule jusqu'au pied
    G.isPushing = false;
    G.boulderWx -= 3.4; G.boulderRoll -= 0.22;
    if (G.boulderWx <= BOULDER_FOOT) { G.boulderWx = BOULDER_FOOT; G.boulderTumbling = false; }
    return;
  }
  let near = Math.abs(player.wx - G.boulderWx) < BOULDER_R + 10;
  // on peut pousser au sol, OU en l'air pendant le saut commun (niv 2) : le duo reste collé
  let pushing = near && dx > 0 && player.wx < G.boulderWx && (player.onGround || G.boulderLift > 0);
  G.isPushing = near && player.wx < G.boulderWx;   // « avec la balle » : collé juste derrière elle
  if (Math.abs(G.boulderKickVx) > 0.15) {              // élan propre : coup de lame (E, +) ou tacle de poisson (-)
    G.boulderWx += G.boulderKickVx; G.boulderRoll += G.boulderKickVx * 0.04;
    G.boulderKickVx *= 0.94;
  } else if (pushing) {
    G.boulderKickVx = 0;
    G.boulderWx += currentPush(); G.boulderRoll += 0.12;   // la lame avant pousse (de plus en plus fort)
    player.wx = G.boulderWx - (BOULDER_R + 6);             // le pingouin reste collé derrière la lame
  } else if (G.boulderLift <= 0) {                         // pas de recul quand elle est en l'air
    G.boulderKickVx = 0;
    G.boulderWx -= 0.9; G.boulderRoll -= 0.06;             // sinon la pente la ramène en bas
  }
  for (let r of activeRocks()) {                       // la glace bloque la balle (sauf si elle saute)
    if (G.boulderLift > r.h - 4) continue;             // tolérant : le bas de la balle est rond
    let half = r.w / 2 + BOULDER_R - 4;
    if (Math.abs(G.boulderWx - r.x) < half) {
      G.boulderWx = G.boulderWx < r.x ? r.x - half : r.x + half;
      G.boulderKickVx = 0;
    }
  }
  if (G.boulderWx <= BOULDER_FOOT) G.boulderWx = BOULDER_FOOT;   // ne redescend pas dans la jungle
  if (G.boulderWx >= SUMMIT_X - 4) {                          // SOMMET ATTEINT
    applyPowerUp();                                           // le pingouin et le vélo montent en puissance
    G.boulderTumbling = true;                                 // et la balle repart en bas : on recommence
  }
}

export function drawBoulder() {
  let sx = Math.round(G.boulderWx - G.camX); if (sx < -BOULDER_R * 2 || sx > W + BOULDER_R * 2) return;
  let gy = Math.round(groundY(G.boulderWx));
  let sy = gy - BOULDER_R - Math.round(G.boulderLift);
  ctx.fillStyle = 'rgba(40,60,90,0.22)'; ctx.fillRect(sx - BOULDER_R, gy, BOULDER_R * 2, 3); // ombre (reste au sol)
  for (let y = -BOULDER_R; y <= BOULDER_R; y++) {                 // disque de pierre
    let half = Math.round(Math.sqrt(BOULDER_R * BOULDER_R - y * y));
    ctx.fillStyle = y < -BOULDER_R / 2 ? '#9296a0' : '#7d7d86';   // dégradé haut clair / bas sombre
    ctx.fillRect(sx - half, sy + y, half * 2, 1);
  }
  ctx.fillStyle = '#a6a6b0'; ctx.fillRect(sx - 6, sy - 9, 4, 3);  // reflet en haut à gauche
  // taches & fissures qui pivotent → impression de roulement
  for (let s of [[0, 0], [7, -4], [-5, 4], [4, 7], [-8, -3], [9, 5], [-3, -8]]) {
    let a = G.boulderRoll;
    let rx = Math.round(s[0] * Math.cos(a) - s[1] * Math.sin(a));
    let ry = Math.round(s[0] * Math.sin(a) + s[1] * Math.cos(a));
    ctx.fillStyle = '#5f5f68'; ctx.fillRect(sx + rx, sy + ry, 2, 2);
  }
}
