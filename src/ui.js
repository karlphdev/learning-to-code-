// ═══════════════════════════════════════════════════════════════════
// UI — le HUD, la bannière de sommet, et l'inventaire des vélos.
// ═══════════════════════════════════════════════════════════════════
import { W, H } from './config.js';
import { ctx, G } from './state.js';
import { powerLvl, powerTitle, bikeIsSupersonic } from './progression.js';
import { skillHints, SKILL_UNLOCKS } from './skills.js';
import { BIKES, drawBikeThumb } from './bikes.js';

// HUD : altitude, niveau de puissance, titre, tag SUPERSONIC, astuces.
export function drawHud(frac) {
  let hints = skillHints();
  let boxH = hints.length ? 28 : 20;
  ctx.fillStyle = 'rgba(12,24,46,0.55)'; ctx.fillRect(4, 4, 92, boxH);
  ctx.fillStyle = '#7c5cff'; ctx.fillRect(4, 4, 92, 1);
  ctx.font = '7px monospace'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff'; ctx.fillText('ALT ' + Math.round(frac * 100) + '%', 8, 7);
  if (bikeIsSupersonic()) { ctx.fillStyle = '#34f0ff'; ctx.fillText('SUPERSONIC', 48, 7); }
  ctx.fillStyle = '#ffe070'; ctx.fillText('Niv.' + powerLvl() + ' ' + powerTitle(), 8, 15);
  if (hints.length) { ctx.fillStyle = '#ff9cf0'; ctx.fillText(hints[(G.tick >> 7) % hints.length], 8, 23); }  // astuces en rotation
  ctx.textBaseline = 'alphabetic';
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

const ABSURD_QUOTES = [
  'Il faut imaginer le pingouin heureux.',
  'Le rocher roule. On recommence.',
  'La lutte vers le sommet suffit.',
  'Le sommet ? Un pretexte pour redescendre.',
  'Tout est bien, repond le pingouin.',
];

export function drawSummitBanner() {
  const tick = G.tick;
  ctx.fillStyle = 'rgba(10,20,40,0.74)'; ctx.fillRect(12, 40, W - 24, 54);
  ctx.fillStyle = '#7c5cff'; ctx.fillRect(12, 40, W - 24, 1); ctx.fillRect(12, 93, W - 24, 1);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffe070'; ctx.font = '8px monospace'; ctx.fillText('SOMMET ' + G.summitCount + ' - ' + powerTitle(), 22, 46);
  ctx.fillStyle = '#ffffff'; ctx.font = '6px monospace';
  wrapText(ABSURD_QUOTES[(tick >> 7) % ABSURD_QUOTES.length], 20, 58, W - 40, 8);  // citation qui défile
  if (SKILL_UNLOCKS[G.summitCount]) { ctx.fillStyle = '#7cf07c'; ctx.fillText('NOUVEAU : ' + SKILL_UNLOCKS[G.summitCount], 20, 72); }
  ctx.fillStyle = '#9cd0ff'; ctx.fillText('Le rocher redescend...', 20, 79);
  ctx.fillStyle = '#7fa8d6'; ctx.fillText('Redescends et recommence !', 20, 86);
  ctx.textBaseline = 'alphabetic';
}

// ── Panneau d'inventaire ──────────────────────────────────────────────
export function drawInventory() {
  ctx.fillStyle = 'rgba(8,6,18,0.84)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#7c5cff'; ctx.fillRect(8, 6, W - 16, 1); ctx.fillRect(8, H - 9, W - 16, 1);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffe070'; ctx.font = '8px monospace';
  ctx.fillText('INVENTAIRE - VELOS', 12, 9);
  for (let i = 0; i < BIKES.length; i++) {
    let ry = 22 + i * 22;
    let sel = (i === G.equippedBike);
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
