// ═══════════════════════════════════════════════════════════════════
// WORLD — le profil du terrain : LA fonction groundY qui définit tout
// le relief (jungle plate → montagne), et les helpers géométriques.
// ═══════════════════════════════════════════════════════════════════
import { GROUND_Y, MOUNTAIN_START, SUMMIT_X, SUMMIT_H } from './config.js';
import { G } from './state.js';

// Interpolation douce (smoothstep) entre a et b, bornée 0..1.
export function smooth(x, a, b) {
  let t = (x - a) / (b - a);
  if (t < 0) t = 0; if (t > 1) t = 1;
  return t * t * (3 - 2 * t);
}

// Hauteur (y monde) du sol à la colonne wx : plat dans la jungle, puis monte en montagne.
// Plus petit = plus haut. C'est LE profil unique du monde (jungle + montagne d'un seul tenant).
export function groundY(wx) {
  if (wx <= MOUNTAIN_START) return GROUND_Y;
  let t = (wx - MOUNTAIN_START) / (SUMMIT_X - MOUNTAIN_START); if (t > 1) t = 1;
  let ease = t * t * (3 - 2 * t);                        // smoothstep : départ doux, sommet doux
  let h = SUMMIT_H * ease;
  h += (Math.sin(wx * 0.013) * 7 + Math.sin(wx * 0.041) * 3) * (1 - t);  // bosses qui s'aplanissent en haut
  return GROUND_Y - h;
}

// Fraction d'altitude 0 (sol de la jungle) → 1 (sommet), d'après la position du pingouin
export function climbFrac() {
  let f = (GROUND_Y - groundY(G.player.wx)) / SUMMIT_H;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}
