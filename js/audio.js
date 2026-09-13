// ============================================================
//  audio.js — tiny Web Audio chiptune engine (no assets needed)
//  All sound effects and music are synthesized: square, triangle,
//  sawtooth waves + white noise, just like a 1980s console.
// ============================================================
window.Audio8 = (() => {
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let musicOn = true, sfxOn = true;

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(n);
    if (!m) return 0;
    const s = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (s - 69) / 12);
  }

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // Must be called from a user gesture (tap) — unlocks audio on iOS.
  function unlock() {
    init();
    if (ctx.state === 'suspended') ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  }

  // Generic oscillator blip with an envelope and optional pitch slide.
  function tone(o) {
    if (!ctx) return;
    const { type = 'square', f0 = 440, f1 = null, t = ctx.currentTime, dur = 0.1, vol = 0.3, bus = sfxBus, attack = 0.004 } = o;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(o) {
    if (!ctx) return;
    const { t = ctx.currentTime, dur = 0.1, vol = 0.3, bus = sfxBus, hp = 0, lp = 8000 } = o;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = src;
    if (hp > 0) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
    if (lp < 8000) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
    node.connect(g); g.connect(bus);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ---------------- Sound effects ----------------
  const SFX = {
    jump()   { tone({ f0: 180, f1: 620, dur: 0.14, vol: 0.25 }); },
    candle() { const t = ctx.currentTime; tone({ f0: 1046, dur: 0.07, vol: 0.22, t }); tone({ f0: 1568, dur: 0.18, vol: 0.22, t: t + 0.07 }); },
    stomp()  { const t = ctx.currentTime; noise({ dur: 0.08, vol: 0.25, t }); tone({ f0: 220, f1: 50, dur: 0.16, vol: 0.3, t }); },
    bonk()   { const t = ctx.currentTime; tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.22, vol: 0.28, t }); noise({ dur: 0.1, vol: 0.15, t, lp: 1200 }); },
    fall()   { tone({ type: 'square', f0: 700, f1: 90, dur: 0.5, vol: 0.2 }); },
    respawn(){ const t = ctx.currentTime; tone({ f0: 330, dur: 0.08, vol: 0.2, t }); tone({ f0: 440, dur: 0.08, vol: 0.2, t: t + 0.08 }); tone({ f0: 660, dur: 0.16, vol: 0.2, t: t + 0.16 }); },
    checkpoint(){ const t = ctx.currentTime; ['E5','G5','C6'].forEach((n, i) => tone({ f0: freq(n), dur: 0.12, vol: 0.2, t: t + i * 0.09 })); },
    flap()   { tone({ f0: 420, f1: 760, dur: 0.07, vol: 0.18 }); },
    gate()   { const t = ctx.currentTime; tone({ f0: freq('E6'), dur: 0.06, vol: 0.18, t }); tone({ f0: freq('B6'), dur: 0.14, vol: 0.18, t: t + 0.06 }); },
    hurt()   { const t = ctx.currentTime; tone({ f0: 300, f1: 120, dur: 0.18, vol: 0.28, t }); tone({ f0: 250, f1: 90, dur: 0.22, vol: 0.2, t: t + 0.1 }); },
    crash()  { const t = ctx.currentTime; noise({ dur: 0.5, vol: 0.35, t, lp: 2500 }); tone({ type: 'sawtooth', f0: 160, f1: 40, dur: 0.6, vol: 0.3, t }); },
    ui()     { tone({ f0: 880, dur: 0.05, vol: 0.15 }); },
    start()  { const t = ctx.currentTime; ['C5','E5','G5','C6'].forEach((n, i) => tone({ f0: freq(n), dur: 0.1, vol: 0.2, t: t + i * 0.07 })); },
    fanfare(){ const t = ctx.currentTime; ['C5','E5','G5','C6','E6'].forEach((n, i) => tone({ f0: freq(n), dur: 0.12, vol: 0.22, t: t + i * 0.09 })); tone({ f0: freq('G6'), dur: 0.7, vol: 0.22, t: t + 0.45 }); },
    glitch() { const t = ctx.currentTime; for (let i = 0; i < 14; i++) tone({ type: i % 2 ? 'sawtooth' : 'square', f0: 120 + Math.random() * 1800, dur: 0.05, vol: 0.18, t: t + i * 0.045 }); noise({ dur: 0.6, vol: 0.12, t, hp: 2000 }); },
    unlock() { const t = ctx.currentTime; ['G4','C5','E5','G5','C6','E6','G6'].forEach((n, i) => tone({ f0: freq(n), dur: 0.09, vol: 0.2, t: t + i * 0.06 })); tone({ f0: freq('C7'), dur: 0.8, vol: 0.22, t: t + 0.42 }); },
    open()   { const t = ctx.currentTime; for (let i = 0; i < 10; i++) tone({ f0: 300 + i * 120, dur: 0.08, vol: 0.18, t: t + i * 0.05 }); },
    shake()  { noise({ dur: 0.05, vol: 0.12, lp: 900 }); },
    land()   { noise({ dur: 0.05, vol: 0.12, lp: 600 }); },
    step()   { tone({ type: 'triangle', f0: 200, f1: 90, dur: 0.05, vol: 0.28 }); },
    taunt()  { const t = ctx.currentTime; ['G5','E5','G5','E5','C5'].forEach((n, i) => tone({ f0: freq(n), dur: 0.1, vol: 0.16, t: t + i * 0.09 })); },
    vroom()  { const t = ctx.currentTime; tone({ type: 'sawtooth', f0: 50, f1: 260, dur: 0.7, vol: 0.25, t }); noise({ dur: 0.5, vol: 0.08, t, lp: 800 }); },
    screech(){ const t = ctx.currentTime; noise({ dur: 0.35, vol: 0.22, t, hp: 1500 }); tone({ type: 'square', f0: 1900, f1: 900, dur: 0.3, vol: 0.1, t }); },
    trombone(){ const t = ctx.currentTime; [['D4', 0.32], ['C#4', 0.32], ['C4', 0.32], ['B3', 0.9]].forEach(([n, d], i) => tone({ type: 'sawtooth', f0: freq(n) * 1.03, f1: freq(n) * 0.96, dur: d, vol: 0.2, t: t + i * 0.36, attack: 0.04 })); },
    register(){ const t = ctx.currentTime; tone({ f0: 2100, dur: 0.05, vol: 0.14, t }); tone({ f0: 2700, dur: 0.28, vol: 0.18, t: t + 0.06 }); noise({ dur: 0.08, vol: 0.1, t, hp: 3000 }); },
    acquire(){ const t = ctx.currentTime; ['C5','E5','G5','C6','E6','G6'].forEach((n, i) => tone({ f0: freq(n), dur: 0.1, vol: 0.2, t: t + i * 0.07 })); tone({ f0: freq('C7'), dur: 0.6, vol: 0.2, t: t + 0.42 }); },
  };
  function sfx(name) { if (sfxOn && ctx && SFX[name]) SFX[name](); }

  // ---------------- Music sequencer ----------------
  // A song = { bpm, tracks: [{ wave, vol, notes: [[note|'-'|'x', beats], ...] }] }
  // Every track should have the same total number of beats so they loop in sync.
  let song = null, timer = null, trackState = [], songStart = 0;
  const LOOKAHEAD = 0.3, TICK = 60;

  function scheduleNote(tr, note, beats, t) {
    const dur = beats * 60 / song.bpm;
    if (note === '-') return;
    if (tr.wave === 'noise') {
      noise({ t, dur: Math.min(dur * 0.5, note === 'X' ? 0.12 : 0.05), vol: tr.vol * (note === 'X' ? 1.4 : 1), bus: musicBus, hp: note === 'X' ? 100 : 4000, lp: note === 'X' ? 900 : 8000 });
      return;
    }
    tone({ type: tr.wave, f0: freq(note), t, dur: dur * (tr.legato || 0.85), vol: tr.vol, bus: musicBus, attack: 0.01 });
  }

  function tick() {
    if (!song || !ctx) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    song.tracks.forEach((tr, i) => {
      const st = trackState[i];
      while (st.t < horizon) {
        const [note, beats] = tr.notes[st.i];
        scheduleNote(tr, note, beats, st.t);
        st.t += beats * 60 / song.bpm;
        st.i = (st.i + 1) % tr.notes.length;
        if (st.i === 0 && !song.loop) { st.done = true; break; }
      }
    });
  }

  function play(s) {
    if (!ctx) return;
    stop();
    song = s;
    songStart = ctx.currentTime + 0.05;
    trackState = s.tracks.map(() => ({ i: 0, t: songStart }));
    if (musicOn) { tick(); timer = setInterval(tick, TICK); }
  }
  function stop() { if (timer) clearInterval(timer); timer = null; song = null; }
  function setMusic(on) { musicOn = on; if (!on) { if (timer) clearInterval(timer); timer = null; if (musicBus) musicBus.gain.value = 0; } else { if (musicBus) musicBus.gain.value = 0.32; if (song && !timer) { trackState = song.tracks.map(() => ({ i: 0, t: ctx.currentTime + 0.05 })); tick(); timer = setInterval(tick, TICK); } } }
  function isMusicOn() { return musicOn; }
  function ready() { return !!ctx && ctx.state === 'running'; }

  // ---------------- Songs ----------------
  // Helper: turn "C5:1 E5:.5 -:.5" strings into note arrays.
  function seq(str) { return str.trim().split(/\s+/).map(tok => { const [n, b] = tok.split(':'); return [n, parseFloat(b || '1')]; }); }

  // Level 1 — "Birthday Boulevard" (bright, bouncy, C major, 8 bars)
  const SONG_LEVEL1 = {
    bpm: 150, loop: true,
    tracks: [
      { wave: 'square', vol: 0.16, notes: seq(`
        C5:1 E5:1 G5:1 E5:1   A5:.5 G5:.5 E5:1 D5:1 C5:1
        D5:1 F5:1 A5:1 F5:1   G5:.5 F5:.5 E5:1 D5:2
        E5:1 G5:1 C6:1 B5:.5 A5:.5   G5:1 E5:1 C5:1 D5:1
        F5:.5 F5:.5 A5:1 G5:.5 G5:.5 E5:1   C5:1 D5:.5 E5:.5 C5:2`) },
      { wave: 'triangle', vol: 0.3, legato: 0.6, notes: seq(`
        C3:1 G3:1 C3:1 G3:1   C3:1 G3:1 C3:1 G3:1
        F3:1 C4:1 F3:1 C4:1   G3:1 D4:1 G3:1 D4:1
        C3:1 G3:1 C3:1 G3:1   A2:1 E3:1 A2:1 E3:1
        F3:1 C4:1 F3:1 C4:1   G3:1 D4:1 G3:1 B3:1`) },
      { wave: 'noise', vol: 0.09, notes: seq(('X:.5 x:.5 x:.5 x:.5 X:.5 x:.5 x:.5 x:.5 ').repeat(8)) },
    ],
  };

  // Title — same tune, lazier tempo.
  const SONG_TITLE = { bpm: 112, loop: true, tracks: SONG_LEVEL1.tracks.map(t => ({ ...t, vol: t.vol * 0.9 })) };

  // Bonus round — "Flight School" (A minor, urgent + fun)
  const SONG_BONUS = {
    bpm: 172, loop: true,
    tracks: [
      { wave: 'square', vol: 0.15, notes: seq(`
        A4:.5 A4:.5 C5:.5 A4:.5 E5:.5 D5:.5 C5:.5 D5:.5   E5:1 C5:.5 A4:.5 G4:1 A4:1
        F4:.5 F4:.5 A4:.5 F4:.5 C5:.5 B4:.5 A4:.5 B4:.5   C5:1 A4:.5 F4:.5 E4:1 -:1
        A4:.5 A4:.5 C5:.5 A4:.5 E5:.5 D5:.5 C5:.5 D5:.5   E5:.5 E5:.5 G5:1 E5:.5 D5:.5 C5:1
        D5:1 F5:1 E5:1 D5:1   C5:.5 B4:.5 A4:2 -:1`) },
      { wave: 'triangle', vol: 0.3, legato: 0.6, notes: seq(`
        A2:.5 A2:.5 E3:.5 A2:.5 A2:.5 A2:.5 E3:.5 A2:.5   A2:.5 A2:.5 E3:.5 A2:.5 A2:.5 A2:.5 E3:.5 A2:.5
        F2:.5 F2:.5 C3:.5 F2:.5 F2:.5 F2:.5 C3:.5 F2:.5   E2:.5 E2:.5 B2:.5 E2:.5 E2:.5 E2:.5 B2:.5 E2:.5
        A2:.5 A2:.5 E3:.5 A2:.5 A2:.5 A2:.5 E3:.5 A2:.5   C3:.5 C3:.5 G3:.5 C3:.5 C3:.5 C3:.5 G3:.5 C3:.5
        D3:.5 D3:.5 A3:.5 D3:.5 D3:.5 D3:.5 A3:.5 D3:.5   E2:.5 E2:.5 B2:.5 E2:.5 E2:.5 E2:.5 B2:.5 E2:.5`) },
      { wave: 'noise', vol: 0.09, notes: seq(('X:.5 x:.5 x:.25 x:.25 x:.5 X:.5 x:.5 x:.5 x:.5 ').repeat(8)) },
    ],
  };

  // "Happy Birthday to You" — public domain melody, 8-bit style (plays once at the reveal)
  const SONG_BIRTHDAY = {
    bpm: 190, loop: false,
    tracks: [
      { wave: 'square', vol: 0.18, notes: seq(`
        G4:.75 G4:.25 A4:1 G4:1 C5:1 B4:2
        G4:.75 G4:.25 A4:1 G4:1 D5:1 C5:2
        G4:.75 G4:.25 G5:1 E5:1 C5:1 B4:1 A4:1
        F5:.75 F5:.25 E5:1 C5:1 D5:1 C5:2 -:1`) },
      { wave: 'triangle', vol: 0.28, legato: 0.7, notes: seq(`
        -:1 C3:1 E3:1 G3:1 G2:1 B2:1 D3:1
        -:1 G2:1 B2:1 D3:1 C3:1 E3:1 G3:1
        -:1 C3:1 E3:1 G3:1 F2:1 A2:1 C3:1
        -:1 F2:1 A2:1 C3:1 G2:1 C3:1 E3:1 -:1`) },
    ],
  };

  // Victory loop — celebratory, loops under the reveal screens
  const SONG_WIN = {
    bpm: 140, loop: true,
    tracks: [
      { wave: 'square', vol: 0.14, notes: seq(`
        C5:.5 E5:.5 G5:.5 C6:.5 G5:.5 E5:.5 C5:.5 E5:.5   F5:.5 A5:.5 C6:.5 F6:.5 C6:.5 A5:.5 F5:.5 A5:.5
        G5:.5 B5:.5 D6:.5 G6:.5 D6:.5 B5:.5 G5:.5 B5:.5   C6:1 -:.5 G5:.5 C6:2`) },
      { wave: 'triangle', vol: 0.28, legato: 0.6, notes: seq(`C3:1 G3:1 C3:1 G3:1  F3:1 C4:1 F3:1 C4:1  G3:1 D4:1 G3:1 D4:1  C3:1 G3:1 C3:2`) },
      { wave: 'noise', vol: 0.08, notes: seq(('X:.5 x:.5 x:.5 x:.5 ').repeat(4)) },
    ],
  };

  // Level 2 — "Hot Pursuit" (E minor, fast, 4 bars)
  const SONG_CHASE = {
    bpm: 176, loop: true,
    tracks: [
      { wave: 'square', vol: 0.15, notes: seq(`
        E5:.5 E5:.5 G5:.5 E5:.5 B5:.5 A5:.5 G5:.5 A5:.5   E5:.5 E5:.5 G5:.5 E5:.5 D6:.5 B5:.5 A5:.5 G5:.5
        C5:.5 C5:.5 E5:.5 C5:.5 G5:.5 F5:.5 E5:.5 F5:.5   B4:.5 B4:.5 D5:.5 B4:.5 F#5:.5 E5:.5 D5:.5 B4:.5`) },
      { wave: 'triangle', vol: 0.3, legato: 0.6, notes: seq(`
        E2:.5 E2:.5 E3:.5 E2:.5 E2:.5 E2:.5 E3:.5 E2:.5   E2:.5 E2:.5 E3:.5 E2:.5 E2:.5 E2:.5 E3:.5 E2:.5
        C2:.5 C2:.5 C3:.5 C2:.5 C2:.5 C2:.5 C3:.5 C2:.5   B1:.5 B1:.5 B2:.5 B1:.5 B1:.5 B1:.5 B2:.5 B1:.5`) },
      { wave: 'noise', vol: 0.09, notes: seq(('X:.5 x:.5 x:.5 x:.5 ').repeat(8)) },
    ],
  };
  // Apple Store — soft elevator chiptune (C major, slow)
  const SONG_STORE = {
    bpm: 104, loop: true,
    tracks: [
      { wave: 'triangle', vol: 0.22, legato: 0.9, notes: seq(`
        C5:.5 E5:.5 G5:.5 B5:.5 C6:1 B5:.5 G5:.5   A4:.5 C5:.5 E5:.5 G5:.5 A5:1 G5:.5 E5:.5
        F4:.5 A4:.5 C5:.5 E5:.5 F5:1 E5:.5 C5:.5   G4:.5 B4:.5 D5:.5 F5:.5 G5:1 F5:.5 D5:.5`) },
      { wave: 'triangle', vol: 0.22, legato: 0.9, notes: seq(`C3:2 G3:2  A2:2 E3:2  F2:2 C3:2  G2:2 D3:2`) },
    ],
  };

  return { init, unlock, ready, sfx, play, stop, setMusic, isMusicOn, freq,
           songs: { title: SONG_TITLE, level1: SONG_LEVEL1, bonus: SONG_BONUS, birthday: SONG_BIRTHDAY, win: SONG_WIN, chase: SONG_CHASE, store: SONG_STORE } };
})();
