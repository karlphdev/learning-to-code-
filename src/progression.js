// ═══════════════════════════════════════════════════════════════════
// PROGRESSION — le niveau de puissance (= sommets atteints) et tout ce
// qui en découle : vitesse, saut, poussée, titres, level-up, triche.
// ═══════════════════════════════════════════════════════════════════
import { SPEED_BASE, JUMP_BASE, PUSH_BASE, TRANS_LEVEL } from './config.js';
import { G } from './state.js';
import { spawnEnemies } from './enemies.js';

export function powerLvl()     { return G.summitCount; }                 // = nombre de sommets atteints
// TRANSCENDANT DU BLOCK (niv 20) : stats abusées (poussée ×2, vitesse et saut boostés)
function trans() { return powerLvl() >= TRANS_LEVEL; }
export function currentSpeed() { return SPEED_BASE * (1 + 0.18 * powerLvl()) * (trans() ? 1.6 : 1); }
export function currentJump()  { return JUMP_BASE * (1 + 0.05 * powerLvl()) * (trans() ? 1.35 : 1); }
export function currentPush()  { return (PUSH_BASE + 0.30 * powerLvl()) * (trans() ? 2 : 1); }

// Titre affiché selon le palier (le vélo devient « Supersonic » en haut)
export function powerTitle() {
  let l = powerLvl();
  if (l === 0) return 'Pingouin';
  if (l < 3)   return 'Eveille';
  if (l < 6)   return 'Aura naissante';
  if (l < 9)   return 'Puissant';
  if (l < 12)  return 'HYPER FORT';
  if (l < TRANS_LEVEL) return 'TRANSCENDANT';
  return 'ROI DU BLOCK';
}
export function bikeIsSupersonic() { return powerLvl() >= 6; }

// Appelé à chaque sommet : monte d'un palier, affiche la bannière.
export function applyPowerUp() {
  G.summitCount++;
  G.won = true; G.wonTimer = G.tick;           // bannière « palier atteint » temporaire
  spawnEnemies();                              // plus de niveaux = plus de poissons
}

// Triche de test (touches P / O) : choisir directement son niveau
export function setLevel(l) {
  G.summitCount = Math.max(0, l);
  spawnEnemies();                              // le monde suit le nouveau niveau
  G.won = true; G.wonTimer = G.tick;           // affiche la bannière du niveau
}
