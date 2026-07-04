// ═══════════════════════════════════════════════════════════════════
// INPUT — clavier : état des touches + tous les raccourcis du jeu.
// ═══════════════════════════════════════════════════════════════════
import { G } from './state.js';
import { initAudio, toggleMute } from './audio.js';
import { kickBoulder, fireMissile } from './skills.js';
import { setLevel } from './progression.js';

export const keys = {};

document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Démarre l'audio au premier geste utilisateur ; M coupe/relance
document.addEventListener('keydown', e => {
  initAudio();
  if (e.key.toLowerCase() === 'm') toggleMute();
});
document.addEventListener('pointerdown', initAudio);

// I = ouvrir/fermer l'inventaire ; 1-5 = équiper un vélo (quand il est ouvert)
document.addEventListener('keydown', e => {
  let k = e.key.toLowerCase();
  if (k === 'i' && !e.repeat) G.invOpen = !G.invOpen;
  if (G.invOpen && k >= '1' && k <= '5') G.equippedBike = (+k) - 1;
});

// E = coup de lame ; R = missile
document.addEventListener('keydown', e => {
  if (e.repeat || G.invOpen) return;
  let k = e.key.toLowerCase();
  if (k === 'e') kickBoulder();
  if (k === 'r') fireMissile();
});

// Triche de test : P = niveau +1, O = niveau -1 (e.repeat autorisé : maintenir pour grimper vite)
document.addEventListener('keydown', e => {
  let k = e.key.toLowerCase();
  if (k === 'p') setLevel(G.summitCount + 1);
  if (k === 'o') setLevel(G.summitCount - 1);
});
