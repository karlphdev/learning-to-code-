// ═══════════════════════════════════════════════════════════════════
// AUDIO — musique 8-bit acid + drum & bass (Web Audio API, procédurale).
// Boucle de 64 pas (4 mesures) qui évolue progressivement.
// ═══════════════════════════════════════════════════════════════════
let audio = null, muted = false, schedTimer = null;
const BPM = 168;
const STEP = 60 / BPM / 4;            // durée d'une double-croche
const STEPS = 64;                     // 4 mesures
let step = 0, nextNoteTime = 0, loopCount = 0;

function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function makeDist(amount) {
  const n = 1024, curve = new Float32Array(n), k = amount;
  for (let i = 0; i < n; i++) {
    let x = i * 2 / n - 1;
    curve[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ── Séquences 64 pas, construites par mesure avec montée progressive ──
const BASS    = new Array(STEPS).fill(null);
const ACC     = new Array(STEPS).fill(0);
const LEAD    = new Array(STEPS).fill(null);
const KICK    = new Array(STEPS).fill(0);
const SNARE   = new Array(STEPS).fill(0);
const HAT     = new Array(STEPS).fill(0);
const OPENHAT = new Array(STEPS).fill(0);
const RIDE    = new Array(STEPS).fill(0);
const CRASH   = new Array(STEPS).fill(0);

const bassFig = [33,33,45,33, 36,33,40,45, 33,45,33,44, 36,40,45,32];
const leadFig = [57,null,60,null, 64,null,60,57, null,69,null,67, 64,null,60,null];

for (let bar = 0; bar < 4; bar++) {
  const o = bar * 16;
  // ── Drums drum&bass (snare sur les temps 2 et 4 = pas 4 et 12) ──
  KICK[o + 0] = 1; KICK[o + 10] = 1;
  if (bar >= 1) KICK[o + 6] = 1;
  if (bar >= 2) KICK[o + 11] = 1;
  SNARE[o + 4] = 1; SNARE[o + 12] = 1;
  if (bar >= 1) SNARE[o + 7] = 1;       // ghost syncopé
  if (bar >= 2) SNARE[o + 14] = 1;
  if (bar === 3) { SNARE[o + 13] = 1; SNARE[o + 15] = 1; } // fill fin de boucle
  // Cymbales : ride en nappe sur tous les pas + hats qui s'ajoutent
  for (let i = 0; i < 16; i++) RIDE[o + i] = 1;
  if (bar >= 1) { for (let i = 0; i < 16; i++) HAT[o + i] = 1; }
  else { for (let i = 0; i < 16; i += 2) HAT[o + i] = 1; }
  if (bar >= 2) { OPENHAT[o + 2] = 1; OPENHAT[o + 6] = 1; OPENHAT[o + 10] = 1; OPENHAT[o + 14] = 1; }
  if (bar === 0 || bar === 2) CRASH[o + 0] = 1;
  // ── Basse acid (densité croissante) ──
  for (let i = 0; i < 16; i++) {
    let play = bar === 0 ? (i % 4 === 0) : bar === 1 ? (i % 2 === 0) : true;
    if (play) { BASS[o + i] = bassFig[i] - (bar === 3 ? 2 : 0); ACC[o + i] = (i % 4 === 0) ? 1 : 0; }
  }
  // ── Lead (entre à partir de la 3e mesure) ──
  if (bar >= 2) for (let i = 0; i < 16; i++) { if (leadFig[i] != null) LEAD[o + i] = leadFig[i] + (bar === 3 ? 12 : 0); }
  else if (bar === 1) { LEAD[o + 0] = 57; LEAD[o + 8] = 64; }
}

// Percussions additionnelles, basse profonde, mélodie aiguë lointaine
const SHAKER = new Array(STEPS).fill(0);
for (let i = 0; i < STEPS; i++) if (i % 2 === 1) SHAKER[i] = 1;       // texture sur les contretemps
const CLAP = new Array(STEPS).fill(0);
for (let b = 0; b < 4; b++) { CLAP[b * 16 + 4] = 1; CLAP[b * 16 + 12] = 1; } // double le snare
const TOM = new Array(STEPS).fill(0);
TOM[56] = 60; TOM[58] = 57; TOM[60] = 55; TOM[62] = 52;               // roulement de toms (fill)
const SUBHIT = new Array(STEPS).fill(0);
SUBHIT[0] = 1; SUBHIT[32] = 1;                                        // coups de basse profonde
const HIGHMEL = new Array(STEPS).fill(null);
const hmNotes = [86, 82, 84, 79, 82, 77, 79, 74];                    // motif aigu en Gm
for (let k = 0; k < 8; k++) HIGHMEL[k * 8] = hmNotes[k];

// Pad triste — progression Sol mineur : Gm – Eb – Bb – D (i – VI – III – V)
const PAD_CHORDS = [
  [43, 55, 58, 62],   // Gm : G2 G3 Bb3 D4
  [39, 51, 55, 58],   // Eb : Eb2 Eb3 G3 Bb3
  [46, 58, 62, 65],   // Bb : Bb2 Bb3 D4 F4
  [38, 50, 54, 57],   // D  : D2 D3 F#3 A3  (majeur dramatique)
];

export function initAudio() {
  if (audio) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctxA = new AC();
  const master = ctxA.createGain(); master.gain.value = 0.0001;
  const glitch = ctxA.createGain(); glitch.gain.value = 1.0;   // bus pour gater le volume (glitch)
  master.connect(glitch); glitch.connect(ctxA.destination);
  const dist = ctxA.createWaveShaper(); dist.curve = makeDist(55); dist.oversample = '4x';
  const distGain = ctxA.createGain(); distGain.gain.value = 0.5;
  dist.connect(distGain); distGain.connect(master);
  // buffer de bruit 1 s (pour cymbales longues)
  const nb = ctxA.createBuffer(1, ctxA.sampleRate * 1.0, ctxA.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (((i * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;
  audio = { ctx: ctxA, master, glitch, dist, noise: nb };
  master.gain.setValueAtTime(0.0001, ctxA.currentTime);
  master.gain.exponentialRampToValueAtTime(0.30, ctxA.currentTime + 0.7);
  nextNoteTime = ctxA.currentTime + 0.08;
  scheduler();
}

function playBass(t, midi, accent, intensity) {
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = accent ? 20 : 13;
  const base = accent ? 320 : 200;
  const peak = (accent ? 2200 : 1300) + intensity * 1400;   // s'ouvre au fil des mesures
  f.frequency.setValueAtTime(peak, t);
  f.frequency.exponentialRampToValueAtTime(base, t + STEP * 0.9);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(accent ? 0.55 : 0.34, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.95);
  o.connect(f); f.connect(g); g.connect(audio.dist);
  o.start(t); o.stop(t + STEP);
}

function playLead(t, midi) {
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = mtof(midi);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.15, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.6);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + STEP * 1.7);
}

function playKick(t) {
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
  const g = c.createGain();
  g.gain.setValueAtTime(0.7, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + 0.17);
}

function playSnare(t) {
  const c = audio.ctx;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  s.connect(hp); hp.connect(ng); ng.connect(audio.master);
  s.start(t); s.stop(t + 0.14);
  const o = c.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  const og = c.createGain();
  og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(og); og.connect(audio.master);
  o.start(t); o.stop(t + 0.11);
}

function playHat(t, open) {
  const c = audio.ctx;
  const dur = open ? 0.14 : 0.035;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8500;
  const g = c.createGain();
  g.gain.setValueAtTime(open ? 0.1 : 0.085, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(hp); hp.connect(g); g.connect(audio.master);
  s.start(t); s.stop(t + dur + 0.02);
}

function playRide(t) {
  const c = audio.ctx;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 9000; bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.045, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  s.connect(bp); bp.connect(g); g.connect(audio.master);
  s.start(t); s.stop(t + 0.2);
}

function playCrash(t) {
  const c = audio.ctx;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  s.connect(hp); hp.connect(g); g.connect(audio.master);
  s.start(t); s.stop(t + 0.65);
}

function playPad(t, notes) {
  const c = audio.ctx;
  const dur = 16 * STEP;            // une mesure
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.5);              // attaque douce
  g.gain.setValueAtTime(0.18, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.7); // release longue
  f.connect(g); g.connect(audio.master);
  for (const m of notes) {
    const o1 = c.createOscillator(); o1.type = 'triangle'; o1.frequency.value = mtof(m);
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = mtof(m); o2.detune.value = 7;
    o1.connect(f); o2.connect(f);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.8); o2.stop(t + dur + 0.8);
  }
}

function playShaker(t) {
  const c = audio.ctx;
  const s = c.createBufferSource(); s.buffer = audio.noise;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 9500;
  const g = c.createGain(); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  s.connect(hp); hp.connect(g); g.connect(audio.master);
  s.start(t); s.stop(t + 0.04);
}

function playClap(t) {
  const c = audio.ctx;
  for (let i = 0; i < 3; i++) {                       // 3 micro-bouffées = clap
    const tt = t + i * 0.012;
    const s = c.createBufferSource(); s.buffer = audio.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.5;
    const g = c.createGain(); g.gain.setValueAtTime(0.18, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
    s.connect(bp); bp.connect(g); g.connect(audio.master);
    s.start(tt); s.stop(tt + 0.06);
  }
}

function playTom(t, midi) {
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(mtof(midi), t);
  o.frequency.exponentialRampToValueAtTime(mtof(midi) * 0.6, t + 0.18);
  const g = c.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + 0.22);
}

function playSubHit(t) {                              // coup de basse profonde
  const c = audio.ctx;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(mtof(31), t);
  o.frequency.exponentialRampToValueAtTime(mtof(31) * 0.5, t + 0.05);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + 0.5);
}

function playHigh(t, midi) {                          // mélodie aiguë lointaine et douce
  const c = audio.ctx;
  const dur = 8 * STEP;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 4000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g); g.connect(audio.master);
  const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = mtof(midi);
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtof(midi); o2.detune.value = 5;
  o1.connect(f); o2.connect(f);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
}

function glitchBurst(t) {                             // gate de volume = glitch/stutter
  const g = audio.glitch.gain;
  const n = 8, seg = STEP * 2 / n;
  g.cancelScheduledValues(t);
  for (let i = 0; i < n; i++) g.setValueAtTime(i % 2 ? 0.12 : 1.0, t + i * seg);
  g.setValueAtTime(1.0, t + n * seg);
}

function drumGlitch(t) {                              // retrigger drums = distorsion de temps
  const c = audio.ctx;
  const n = 6, seg = STEP * 2 / n;
  for (let i = 0; i < n; i++) {
    const tt = t + i * seg;
    const s = c.createBufferSource(); s.buffer = audio.noise; s.playbackRate.value = 0.8 + i * 0.3;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = c.createGain(); g.gain.setValueAtTime(0.12, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + seg * 0.9);
    s.connect(hp); hp.connect(g); g.connect(audio.master);
    s.start(tt); s.stop(tt + seg);
  }
}

function melodyGlitch(t, midi) {                      // bégaiement de la mélodie
  const c = audio.ctx;
  const n = 5, seg = STEP * 1.5 / n;
  for (let i = 0; i < n; i++) {
    const tt = t + i * seg;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = mtof(midi + (i % 2 ? 7 : 0) + i * 2);
    const g = c.createGain(); g.gain.setValueAtTime(0.13, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + seg * 0.8);
    o.connect(g); g.connect(audio.master);
    o.start(tt); o.stop(tt + seg);
  }
}

function scheduleStep(s, t) {
  const bar = Math.floor(s / 16);
  const intensity = bar / 3;
  if (s % 16 === 0) playPad(t, PAD_CHORDS[bar]);
  if (BASS[s] != null) playBass(t, BASS[s], ACC[s], intensity);
  if (LEAD[s] != null) playLead(t, LEAD[s]);
  if (KICK[s])    playKick(t);
  if (SNARE[s])   playSnare(t);
  if (RIDE[s])    playRide(t);
  if (HAT[s])     playHat(t, false);
  if (OPENHAT[s]) playHat(t, true);
  if (CRASH[s])   playCrash(t);
  // percussions additionnelles
  if (SHAKER[s])  playShaker(t);
  if (CLAP[s] && bar >= 1) playClap(t);
  if (TOM[s])     playTom(t, TOM[s]);
  // coups de basse profonde
  if (SUBHIT[s])  playSubHit(t);
  if (s === 48 && loopCount % 2 === 1) playSubHit(t);
  // mélodie aiguë lointaine
  if (HIGHMEL[s] != null) playHigh(t, HIGHMEL[s]);
  // glitches "à certains moments"
  if (s === 60) { glitchBurst(t); drumGlitch(t); }            // chaque boucle, pendant le fill
  if (s === 30 && loopCount % 2 === 0) glitchBurst(t);        // une boucle sur deux
  if (s === 24 && loopCount % 2 === 1) melodyGlitch(t, 64);   // bégaiement mélodie
}

function scheduler() {
  if (!audio) return;
  while (nextNoteTime < audio.ctx.currentTime + 0.1) {
    scheduleStep(step, nextNoteTime);
    nextNoteTime += STEP;
    step = (step + 1) % STEPS;
    if (step === 0) loopCount++;
  }
  schedTimer = setTimeout(scheduler, 25);
}

export function toggleMute() {
  if (!audio) return;
  muted = !muted;
  const now = audio.ctx.currentTime;
  audio.master.gain.cancelScheduledValues(now);
  audio.master.gain.setValueAtTime(audio.master.gain.value, now);
  audio.master.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 0.30, now + 0.15);
}
