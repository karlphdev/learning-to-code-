// ═══════════════════════════════════════════════════════════════════
// MAIN — le point d'entrée : boucle de jeu à PAS DE TEMPS FIXE
// (la logique tourne à 60 pas/seconde quel que soit l'écran),
// et la composition de l'image, couche par couche.
// ═══════════════════════════════════════════════════════════════════
import { W, GROUND_Y } from './config.js';
import { ctx, G, fitCanvas } from './state.js';
import './input.js';                       // branche tous les écouteurs clavier
import './touch.js';                       // branche les commandes tactiles (mode mobile)
import { climbFrac, groundY } from './world.js';
import { buildGradients, drawSky, drawSun, drawClouds, drawMtnRidges,
         drawMtnSnowfall, drawMtnFog, drawVignette } from './background.js';
import { drawTerrain, drawTrees, drawJungleBack, drawJungleMid,
         drawPoisonPlants, drawForegroundGrass } from './terrain.js';
import { updateFliers, drawFliers, updateNPCs, drawNPCs, updateSisyphe, drawSisyphe,
         updateWhispers, drawWhispers, updateGoats, drawGoats } from './decor.js';
import { updatePlayer, drawPlayer } from './player.js';
import { updateBoulder, drawBoulder } from './boulder.js';
import { drawRocks } from './obstacles.js';
import { spawnEnemies, updateEnemies, drawEnemies } from './enemies.js';
import { updateSkills, drawSkillFx, drawBaby } from './skills.js';
import { drawHud, drawSummitBanner, drawInventory } from './ui.js';

// ── Un pas de simulation (1/60 s) ─────────────────────────────────────
function update() {
  const dx = updatePlayer();
  updateBoulder(dx);
  updateGoats();
  G.playerDx = dx;
  G.camX = G.player.wx - W / 2 + 4;
  G.camY = groundY(G.player.wx) - GROUND_Y; // caméra verticale : 0 jungle, négatif en montagne
  updateFliers();
  updateNPCs();
  updateSisyphe();
  updateWhispers();
  updateSkills();
  updateEnemies();
  if (G.shake > 0) { G.shake *= 0.86; if (G.shake < 0.2) G.shake = 0; }   // la secousse s'amortit
}

// ── Une image ─────────────────────────────────────────────────────────
function draw() {
  const frac = climbFrac();
  ctx.save();                               // secousse d'écran (SBAM, explosions)
  if (G.shake > 0)
    ctx.translate(Math.round((Math.random() - 0.5) * G.shake), Math.round((Math.random() - 0.5) * G.shake));
  drawSky(frac);
  drawSun();
  drawClouds();
  drawMtnRidges();                          // crêtes lointaines (parallaxe, en fond)

  ctx.save();
  ctx.translate(0, -G.camY);                // ↓↓ tout ce qui suit est en coordonnées MONDE ↓↓
  drawTerrain();
  drawJungleBack();
  drawTrees();
  drawJungleMid();
  drawPoisonPlants();
  drawNPCs();
  drawSisyphe();
  drawGoats();
  drawRocks();                              // pics de glace (obstacles)
  drawEnemies();                            // poissons à baskets
  drawBoulder();
  drawBaby();                               // niv 13 : le bébé pingouin suit (derrière le joueur)
  drawPlayer();                             // ombre + aura + vélo + pingouin + salto
  drawSkillFx();                            // missile, explosion, geyser
  drawForegroundGrass();
  ctx.restore();                            // ↑↑ retour en coordonnées ÉCRAN ↑↑

  if (frac < 0.45) drawFliers();            // bestioles de jungle, pas en altitude
  if (frac > 0) { drawMtnSnowfall(); drawMtnFog(frac); }
  drawWhispers();
  drawVignette();                           // assombrit doucement les bords (rendu moderne)
  drawHud(frac);
  if (G.won && G.tick - G.wonTimer < 200) drawSummitBanner();   // bannière qui s'efface au bout de ~3s
  else G.won = false;
  if (G.invOpen) drawInventory();
  ctx.restore();                            // fin de la secousse d'écran
}

// ── Boucle à pas de temps fixe ────────────────────────────────────────
// La simulation avance toujours par pas de 1/60 s : sur un écran 120 Hz
// on fait ~0,5 pas par image, sur un 60 Hz 1 pas — même vitesse partout.
const STEP_MS = 1000 / 60;
const MAX_LAG = 250;           // onglet mis en pause : on ne rattrape pas plus de 0,25 s
let last = performance.now(), acc = 0;

function frame(now) {
  acc += Math.min(now - last, MAX_LAG);
  last = now;
  while (acc >= STEP_MS) {
    G.tick++;
    update();
    acc -= STEP_MS;
  }
  draw();
  requestAnimationFrame(frame);
}

// ── Démarrage ─────────────────────────────────────────────────────────
fitCanvas();
buildGradients();
spawnEnemies();
requestAnimationFrame(frame);
