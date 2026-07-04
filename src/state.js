// ═══════════════════════════════════════════════════════════════════
// STATE — le canvas, son contexte, et TOUT l'état mutable du jeu (G).
// Les modules lisent et écrivent G.xxx ; aucun autre état partagé.
// ═══════════════════════════════════════════════════════════════════
import { W, H, GROUND_Y, BOULDER_FOOT } from './config.js';

export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');

// Le backing store du canvas matche exactement la taille CSS du conteneur,
// puis on scale le contexte pour dessiner en coordonnées logiques 256x144.
export function fitCanvas() {
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  canvas.width = cssW;
  canvas.height = cssH;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(cssW / W, 0, 0, cssH / H, 0, 0);
}
window.addEventListener('resize', fitCanvas);

// ── G : l'état global du jeu ──────────────────────────────────────────
export const G = {
  tick: 0,                       // compteur de pas de simulation (60/s garanti)
  camX: 0, camY: 0,              // caméra (suit le joueur ; camY < 0 en montagne)

  player: { wx: 0, wy: GROUND_Y - 10, vy: 0, dir: 'right', onGround: true, walkFrame: 0, walkTimer: 0 },
  playerDx: 0,                   // déplacement horizontal du dernier pas (pour les traînées)
  flipAngle: 0,                  // angle du salto avant (radians) ; 0 = debout
  doubleUsed: false,             // double saut déjà consommé pendant ce vol
  backflipLeft: 0,               // radians de backflip restant à jouer (double saut)
  backflipDir: 1,                // sens du backflip
  pounding: false,               // SBAM en cours (plongée vers le sol)
  sbamT: 0, sbamX: 0,            // onde de choc du SBAM (durée + position)
  shake: 0,                      // secousse d'écran (décroît à chaque pas)
  calling: 0,                    // le pingouin est au téléphone (appel du gang)

  summitCount: 0,                // nombre de sommets atteints = niveau de puissance
  won: false,                    // sommet atteint (bannière temporaire)
  wonTimer: 0,                   // tick du dernier sommet

  // La balle (rocher de Sisyphe)
  boulderWx: BOULDER_FOOT,       // position monde
  boulderRoll: 0,                // angle cumulé (fait tourner la texture)
  boulderTumbling: false,        // true = elle dévale seule après le sommet
  boulderVy: 0,                  // vitesse verticale (saut avec la balle, niv 2)
  boulderLift: 0,                // hauteur au-dessus du sol
  boulderKickVx: 0,              // élan propre : coup de lame (+) ou tacle de poisson (-)
  isPushing: false,              // le pingouin est collé derrière la balle

  // Vélos
  equippedBike: 0,               // index du vélo équipé
  invOpen: false,                // inventaire ouvert
  bikeRoll: 0,                   // angle de rotation des roues
};
