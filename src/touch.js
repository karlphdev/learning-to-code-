// ═══════════════════════════════════════════════════════════════════
// TOUCH — commandes tactiles pour le mode application mobile.
// On réutilise EXACTEMENT la même logique que le clavier :
//  · boutons « maintenus » → on écrit dans le même objet `keys` que input.js
//    (gauche/droite, saut, salto, fontaine) ;
//  · boutons « appui » → on appelle directement les fonctions de skills.js
//    (coup de lame, missile, SBAM, appel du gang), avec leurs propres gardes.
// Les boutons apparaissent au fur et à mesure que les paliers se débloquent.
// ═══════════════════════════════════════════════════════════════════
import { keys } from './input.js';
import { G } from './state.js';
import { initAudio, toggleMute } from './audio.js';
import { kickBoulder, fireMissile, startPound, callGang } from './skills.js';
import { powerLvl } from './progression.js';

// Chaque bouton : soit `hold` (nom de touche clavier), soit `tap` (fonction).
// `min` = palier de puissance à partir duquel le bouton s'affiche.
const BUTTONS = [
  // ── manette directionnelle (gauche) ──
  { id: 'left',    label: '◀', cls: 'dpad',            hold: 'q',     min: 0, side: 'L' },
  { id: 'right',   label: '▶', cls: 'dpad',            hold: 'd',     min: 0, side: 'L' },
  // ── actions (droite) ──
  { id: 'jump',    label: '▲', sub: 'SAUT',  cls: 'act primary', hold: 'z',   min: 0, side: 'R' },
  { id: 'kick',    label: '🥾', sub: 'LAME',  cls: 'act',  tap: kickBoulder,   min: 3, side: 'R' },
  { id: 'sbam',    label: '💥', sub: 'SBAM',  cls: 'act',  tap: startPound,    min: 6, side: 'R' },
  { id: 'missile', label: '🚀', sub: 'TIR',   cls: 'act',  tap: fireMissile,   min: 11, side: 'R' },
  { id: 'geyser',  label: '⛲', sub: 'JET',   cls: 'act',  hold: 'u',          min: 12, side: 'R' },
  { id: 'flip',    label: '🔄', sub: 'SALTO', cls: 'act',  hold: 'enter',      min: 15, side: 'R' },
  { id: 'gang',    label: '📞', sub: 'GANG',  cls: 'act',  tap: callGang,      min: 17, side: 'R' },
];

const NAMES = ['Cruiser', 'BMX', 'VTT', 'Course', 'Néon'];

function build() {
  const wrap = document.querySelector('.wrap');
  if (!wrap || document.getElementById('touch')) return;

  const root = document.createElement('div');
  root.id = 'touch';

  // ── barre du haut : vélos + son ──
  const top = document.createElement('div');
  top.className = 'tbar';
  const bikeBtn = mkTap('🚲', 'tbtn', () => { initAudio(); G.invOpen = !G.invOpen; });
  const muteBtn = mkTap('🔊', 'tbtn', () => { initAudio(); toggleMute(); muteBtn.classList.toggle('off'); });
  top.append(bikeBtn, muteBtn);

  // ── colonnes gauche / droite ──
  const colL = document.createElement('div'); colL.className = 'tcol tleft';
  const colR = document.createElement('div'); colR.className = 'tcol tright';

  const els = {};
  for (const b of BUTTONS) {
    const el = document.createElement('button');
    el.className = 'tkey ' + (b.cls || '');
    el.type = 'button';
    el.innerHTML = `<span class="tk-ic">${b.label}</span>` + (b.sub ? `<span class="tk-sub">${b.sub}</span>` : '');
    if (b.hold) bindHold(el, b.hold);
    else if (b.tap) bindTap(el, b.tap);
    els[b.id] = { el, min: b.min };
    (b.side === 'L' ? colL : colR).appendChild(el);
  }

  // ── sélecteur de vélo (affiché quand l'inventaire est ouvert) ──
  const inv = document.createElement('div');
  inv.className = 'tinv';
  for (let i = 0; i < 5; i++) {
    const el = mkTap(`${i + 1}`, 'tbike', () => { G.equippedBike = i; G.invOpen = false; });
    el.innerHTML = `<span class="tk-ic">${i + 1}</span><span class="tk-sub">${NAMES[i]}</span>`;
    inv.appendChild(el);
  }

  root.append(top, colL, colR, inv);
  wrap.appendChild(root);

  // ── met à jour l'affichage des boutons selon le palier / l'inventaire ──
  let lastLvl = -1, lastInv = null;
  (function refresh() {
    const lvl = powerLvl(), open = G.invOpen;
    if (lvl !== lastLvl) {
      for (const b of BUTTONS) els[b.id].el.classList.toggle('locked', lvl < els[b.id].min);
      lastLvl = lvl;
    }
    if (open !== lastInv) {
      root.classList.toggle('inv-open', open);
      lastInv = open;
    }
    requestAnimationFrame(refresh);
  })();
}

// ── câblage : bouton maintenu → écrit dans `keys` (comme une vraie touche) ──
function bindHold(el, key) {
  const press = e => { e.preventDefault(); initAudio(); keys[key] = true;
    try { el.setPointerCapture(e.pointerId); } catch {} el.classList.add('down'); };
  const release = e => { e.preventDefault(); keys[key] = false; el.classList.remove('down'); };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', release);
}

// ── câblage : bouton d'appui → déclenche l'action une fois ──
function bindTap(el, fn) {
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); initAudio();
    if (!G.invOpen) fn();
    el.classList.add('down');
  });
  const up = e => { e.preventDefault(); el.classList.remove('down'); };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

function mkTap(label, cls, fn) {
  const el = document.createElement('button');
  el.type = 'button'; el.className = cls; el.innerHTML = `<span class="tk-ic">${label}</span>`;
  el.addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
  return el;
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', build);
else
  build();
