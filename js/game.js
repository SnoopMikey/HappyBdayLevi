// ============================================================
//  game.js — "Happy Birthday Levi" · an 8-bit birthday present delivery system
//  Level 1: side-scrolling platformer (Birthday Boulevard)
//  Bonus:   flappy flying-car round (Flight School)
// ============================================================
(() => {
'use strict';
const CFG = window.LEVI_CONFIG || {};
const A = window.Audio8;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
function seeded(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------
//  Canvas: a low logical resolution, stretched with crisp pixels
// ------------------------------------------------------------
const canvas = $('game'), ctx = canvas.getContext('2d');
let W = 152, H = 330, portrait = true, safeBottom = 0, viewH = 330;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  portrait = vh >= vw * 1.05;
  if (portrait) { W = 152; H = Math.round(152 * vh / vw); }
  else { H = 224; W = Math.round(224 * vw / vh); if (W > 480) { W = 480; H = Math.round(480 * vh / vw); } }
  canvas.width = W; canvas.height = H;
  canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
  ctx.imageSmoothingEnabled = false;
  safeBottom = portrait ? Math.round(H * 0.14) : 0;   // strip reserved for the touch buttons
  viewH = H - safeBottom;
  document.documentElement.style.setProperty('--ctrl-h', portrait ? '20vh' : '38vh');
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------
//  Pixel art helpers
// ------------------------------------------------------------
const PAL = { '.': null, b: '#3b7dd8', B: '#2a5fb0', s: '#f1c27d', p: '#2c2c54', k: '#111', w: '#fff', o: '#ff8c1a', O: '#c96400',
  y: '#ffe23a', r: '#e3342f', R: '#a51f1b', h: '#2b2b3d', H: '#15151f', v: '#b03a4a', g: '#3ac04d', G: '#238a33', d: '#8a5a2b', D: '#5e3d1c', c: '#9ad7ff', m: '#ff9ccf', M: '#e0609f', x: '#555', l: '#ffd166' };
function sprite(rows, scale = 1) {
  const h = rows.length, w = rows[0].length, c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale; const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = PAL[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x * scale, y * scale, scale, scale); } }
  return c;
}
function flipH(c) { const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const g = f.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return f; }

const TORSO = ['......bbbbbbbb......', '....bbbbbbbbbbbb....', '...bbbbBbbbbBbbbb...', '..ssbbbbbbbbbbbbss..', '..ssbbbbbbbbbbbbss..', '..ss.bbbbbbbbbb.ss..',
  '.....bbbbbbbbbb.....', '.....bbbbbbbbbb.....', '.....bbbbbbbbbb.....', '.....pppppppppp.....', '.....pppppppppp.....'];
const CANDLE_BODY = ['..mmmmmmmm..', '..mmwwmmmm..', '..mmmmmmmm..', '..mmmmwwmm..', '..mmmmmmmm..', '..mmwwmmmm..', '..mmmmmmmm..', '..mmmmwwmm..', '..mmmmmmmm..', '..MMMMMMMM..'];
const CAR_ROWS = [
    '............rrrrrrrrrrrrrrrr............',
    '...........rrccccccccrrcccccccrr........',
    '..........rrcccccccccrrccccccccrr.......',
    '.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..',
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrry',
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrry',
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrry',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.',
    '....kkkkkk......................kkkkkk..',
    '...kkkkkkkk....................kkkkkkkk.',
    '...kkkwwkkk....................kkkwwkkk.',
    '...kkkwwkkk....................kkkwwkkk.',
    '...kkkkkkkk....................kkkkkkkk.',
    '....kkkkkk......................kkkkkk..'];
const SPR = {
  stand: sprite([...TORSO, '.....pppp..pppp.....', '.....pppp..pppp.....', '.....pppp..pppp.....', '.....pppp..pppp.....', '.....pppp..pppp.....', '....kkkkk..kkkkk....', '...kkkkkk..kkkkkk...']),
  walk: sprite([...TORSO, '....pppp....pppp....', '...pppp......pppp...', '..pppp........pppp..', '..pppp........pppp..', '..pppp........pppp..', '.kkkkk........kkkkk.', 'kkkkkk........kkkkkk']),
  jump: sprite([
    '..s...bbbbbbbb...s..', '..s.bbbbbbbbbbbb.s..', '..ssbbbbBbbbbBbbss..', '...bbbbbbbbbbbbbb...', '....bbbbbbbbbbbb....', '.....bbbbbbbbbb.....', '.....bbbbbbbbbb.....',
    '.....bbbbbbbbbb.....', '.....pppppppppp.....', '.....pppppppppp.....', '....pppp....pppp....', '...pppp......pppp...', '..pppp........pppp..', '.kkkkk........kkkkk.',
    'kkkkkk........kkkkkk', '....................', '....................', '....................']),
  cone: sprite([
    '.....oo.....', '.....oo.....', '....oooo....', '....oooo....', '...wwwwww...', '...wkwwkw...', '...oooooo...', '..oooooooo..',
    '..oooooooo..', '..oOOOOOOo..', '.oooooooooo.', '.oooooooooo.', 'kkkkkkkkkkkk', 'kkkkkkkkkkkk']),
  coneSquish: sprite(['..wwkwwkww..', '.oooooooooo.', 'kkkkkkkkkkkk', 'kkkkkkkkkkkk']),
  candle0: sprite(['.....yy.....', '....yyyy....', '....yyoo....', '...yyoooo...', '...yooooo...', '....oooo....', '.....oo.....', '.....kk.....', ...CANDLE_BODY]),
  candle1: sprite(['......yy....', '.....yyyy...', '....ooyy....', '...ooooyy...', '...oooooy...', '....oooo....', '.....oo.....', '.....kk.....', ...CANDLE_BODY]),
  heart: sprite(['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']),
  heartOff: sprite(['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...']),
  car: sprite(CAR_ROWS),
  wingUp: sprite(['..............wwww', '..........wwwwwwww', '......wwwwwwwwwwww', '..wwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwxx', '.xxxxxxxxxxxxxxxx.', '..................', '..................']),
  wingDown: sprite(['..................', '..................', '.xxxxxxxxxxxxxxxx.', 'wwwwwwwwwwwwwwwwxx', '..wwwwwwwwwwwwwwww', '......wwwwwwwwwwww', '..........wwwwwwww', '..............wwww']),
};
SPR.standL = flipH(SPR.stand); SPR.walkL = flipH(SPR.walk); SPR.jumpL = flipH(SPR.jump);

// Levi's head: downscale the photo with smoothing, then harden the alpha and add an outline
// so it reads like a chunky sprite when the canvas is scaled up.
const headImg = new Image(); let heads = null;
function makeHead(w, img = headImg) {
  let src = img, cw = img.width, ch = img.height;
  while (cw / 2 >= w) { const c = document.createElement('canvas'); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2); const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, c.width, c.height); src = c; cw = c.width; ch = c.height; }
  const h = Math.round(img.height * w / img.width), c = document.createElement('canvas');
  c.width = w + 2; c.height = h + 2; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(src, 1, 1, w, h);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, q = CFG.pixelHeadLevels | 0;
  for (let i = 0; i < d.length; i += 4) {
    d[i + 3] = d[i + 3] < 120 ? 0 : 255;
    if (q > 1) { const s = 255 / (q - 1); d[i] = Math.round(d[i] / s) * s; d[i + 1] = Math.round(d[i + 1] / s) * s; d[i + 2] = Math.round(d[i + 2] / s) * s; }
  }
  if (CFG.headOutline !== false) {
    const cw2 = c.width, mask = new Uint8Array(cw2 * c.height);
    for (let i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3] ? 1 : 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < cw2; x++) {
      const i = y * cw2 + x; if (mask[i]) continue;
      if ((x > 0 && mask[i - 1]) || (x < cw2 - 1 && mask[i + 1]) || (y > 0 && mask[i - cw2]) || (y < c.height - 1 && mask[i + cw2])) { d[i * 4] = 20; d[i * 4 + 1] = 16; d[i * 4 + 2] = 28; d[i * 4 + 3] = 255; }
    }
  }
  g.putImageData(id, 0, 0); return c;
}
headImg.onload = () => { const r = makeHead(40); heads = { r, l: flipH(r), car: makeHead(40) }; };
headImg.src = 'assets/levi-head.png';
const frontImg = new Image();
frontImg.onload = () => { const c = makeHead(64, frontImg), t = $('title-head'); t.width = c.width; t.height = c.height; t.getContext('2d').drawImage(c, 0, 0); };
frontImg.src = 'assets/levi-front.png';
const mikeImg = new Image();
mikeImg.onload = () => { const c = makeHead(56, mikeImg), t = $('mike-head'); t.width = c.width; t.height = c.height; t.getContext('2d').drawImage(c, 0, 0); };
mikeImg.src = 'assets/mike-head.png';

function text(s, x, y, color = '#fff', align = 'left', size = 8) {
  ctx.font = `${size}px "Press Start 2P", monospace`; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

// ------------------------------------------------------------
//  Input — with a safety net so a button can never get "stuck" down
// ------------------------------------------------------------
const keys = { left: false, right: false, jump: false, jumpBuf: 0 };
let flapQueued = false;
const held = new Map(); // pointerId -> release()
const BTN = { left: 'btn-left', right: 'btn-right', jump: 'btn-jump' };
function bindHold(id, on, off) {
  const el = $(id);
  const release = e => { el.classList.remove('active'); off(); if (e && e.pointerId != null) held.delete(e.pointerId); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} el.classList.add('active'); on(); held.set(e.pointerId, release); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, release));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
bindHold(BTN.left, () => keys.left = true, () => keys.left = false);
bindHold(BTN.right, () => keys.right = true, () => keys.right = false);
bindHold(BTN.jump, () => { keys.jump = true; keys.jumpBuf = 8; }, () => keys.jump = false);
function releaseAll() { held.forEach(r => r()); held.clear(); keys.left = keys.right = keys.jump = false; Object.values(BTN).forEach(i => $(i).classList.remove('active')); }
document.addEventListener('pointerup', e => { const r = held.get(e.pointerId); if (r) r(e); });
document.addEventListener('pointercancel', e => { const r = held.get(e.pointerId); if (r) r(e); });
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
document.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { keys.jump = true; keys.jumpBuf = 8; if (state === 'play2') flapQueued = true; e.preventDefault(); }
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
});
document.addEventListener('pointerdown', e => { if (state === 'play2' && !e.target.closest('button, a')) { flapQueued = true; e.preventDefault(); } });

// ------------------------------------------------------------
//  Screens, persistence, prizes
// ------------------------------------------------------------
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
function controls(on) { $('controls').classList.toggle('on', on); if (!on) releaseAll(); }
let save = {};
try { save = JSON.parse(localStorage.getItem('levi16') || '{}') || {}; } catch (_) { save = {}; }
function persist(k) { save[k] = true; try { localStorage.setItem('levi16', JSON.stringify(save)); } catch (_) {} }
function prizeUrl(p) { let u = (p && p.url) || '#'; if (u.startsWith('b64:')) { try { u = atob(u.slice(4)); } catch (_) {} } return u; }
function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
function cardHTML(kind, claimable, small, shown) {
  const p = (CFG.prizes || {})[kind] || {}, cls = `giftcard ${kind === 'chickfila' ? 'cfa' : 'ws'}${small ? ' small' : ''}${shown ? ' in' : ''}`;
  const inner = `<div class="gc-top"><div><div class="gc-brand">${esc(p.brand || '')}</div><div class="gc-type">E-GIFT CARD</div></div><div class="gc-chip"></div></div>` +
    `<div class="gc-amt">${esc(p.amount || '')}</div>` +
    `<div class="gc-bottom"><div class="gc-name">FOR: ${esc(CFG.name || 'LEVI')}</div>${claimable ? '<div class="gc-tap">TAP TO CLAIM</div>' : ''}</div>`;
  return claimable ? `<a class="${cls}" href="${esc(prizeUrl(p))}" target="_blank" rel="noopener">${inner}</a>` : `<div class="${cls}">${inner}</div>`;
}
function setupPrizes() {
  document.querySelectorAll('.name').forEach(el => el.textContent = CFG.name || 'LEVI');
  $('cards-1').innerHTML = cardHTML('chickfila', false, false, false);
  $('cards-2').innerHTML = cardHTML('wingstop', false, false, false);
  $('cards-final').innerHTML = cardHTML('chickfila', true, true, true) + cardHTML('wingstop', true, true, true);
  $('final-from').textContent = '— ' + (CFG.from || 'Your friend');
  document.title = `Happy Birthday ${CFG.name ? CFG.name[0] + CFG.name.slice(1).toLowerCase() : 'Levi'}!`;
  document.addEventListener('click', e => { if (e.target.closest('a.giftcard')) A.sfx('fanfare'); });
}
function refreshTitleButtons() { $('btn-prizes').hidden = !save.l1; $('btn-bonus').hidden = !(save.l1 && !save.l2); }
function showPrizes() {
  $('cards-wallet').innerHTML = (save.l1 ? cardHTML('chickfila', true, true, true) : '') + (save.l2 ? cardHTML('wingstop', true, true, true) : '');
  $('prizes-locked').hidden = !!save.l2;
  show('s-prizes');
}

// ------------------------------------------------------------
//  Level 1 — Birthday Boulevard
// ------------------------------------------------------------
const T = 16;
const L1 = {
  cols: 192, rows: 14,
  ground: [[0, 41], [44, 72], [75, 104], [107, 135], [138, 166], [168, 192]],
  platforms: [[18, 3, 9], [34, 2, 9], [37, 2, 7], [52, 3, 9], [79, 3, 9], [90, 2, 9], [112, 2, 9], [115, 2, 7], [118, 2, 5], [124, 3, 9], [150, 3, 9], [153, 3, 7], [156, 2, 5]],
  candles: [[6, 11], [10, 11], [14, 11], [19, 8], [35, 8], [38, 6], [53, 8], [62, 11], [80, 8], [91, 8], [98, 11], [119, 4], [125, 8], [146, 11], [157, 4], [172, 11]],
  cones: [24, 58, 86, 116, 143, 160],
  checkpoints: [46, 108, 140],
  goal: 184,
  bushes: [3, 12, 29, 48, 66, 82, 96, 120, 131, 148, 175, 186], trees: [9, 31, 57, 77, 101, 128, 156, 178],
};
const GRAV = 0.28, MOVE = 1.55, JUMP = -6.0, MAXFALL = 6.5;
let grid = [], levelW = 0, levelH = 0, candles = [], cones = [], flags = [], balloons = [], particles = [], confetti = [];
const player = { x: 0, y: 0, vx: 0, vy: 0, w: 16, h: 44, onGround: false, face: 1, anim: 0, inv: 0, coyote: 0, respawnT: 0, cp: { x: 0, y: 0 }, count: 0 };
let goalBox = null, endT = 0, camX = 0, camY = 0, frame = 0, fade = 0;

function buildLevel1() {
  grid = Array.from({ length: L1.rows }, () => new Array(L1.cols).fill(0));
  L1.ground.forEach(([a, b]) => { for (let c = a; c < b; c++) { grid[12][c] = 1; grid[13][c] = 2; } });
  L1.platforms.forEach(([c, len, r]) => { for (let i = 0; i < len; i++) grid[r][c + i] = 3; });
  levelW = L1.cols * T; levelH = L1.rows * T;
  candles = L1.candles.map(([c, r], i) => ({ x: c * T + 2, y: r * T - 2, w: 12, h: 18, taken: false, ph: i * 0.7 }));
  cones = L1.cones.map(c => ({ x: c * T, y: 12 * T - 14, w: 12, h: 14, vx: -0.45, dead: 0 }));
  flags = L1.checkpoints.map(c => ({ x: c * T, y: 12 * T - 24, hit: false, raise: 0 }));
  goalBox = { x: L1.goal * T, y: 12 * T - 32, w: 32, h: 32, opened: false };
  balloons = [[177, 8, 'r'], [179, 7, 'y'], [181, 8, 'c'], [176, 6, 'm']].map(([c, r, col]) => ({ x: c * T, y: r * T, col: PAL[col], ph: Math.random() * 6 }));
  Object.assign(player, { x: 2 * T, y: 12 * T - player.h, vx: 0, vy: 0, onGround: false, face: 1, anim: 0, inv: 0, coyote: 0, respawnT: 0, count: 0, cp: { x: 2 * T, y: 12 * T - player.h } });
  particles = []; confetti = []; endT = 0; fade = 0; camX = 0;
}
function solid(r, c) { if (c < 0 || c >= L1.cols) return true; if (r < 0 || r >= L1.rows) return false; return grid[r][c] !== 0; }
function moveX(e, dx) {
  e.x += dx; const r0 = Math.floor(e.y / T), r1 = Math.floor((Math.ceil(e.y + e.h) - 1) / T);
  if (dx > 0) { const c = Math.floor((Math.ceil(e.x + e.w) - 1) / T); for (let r = r0; r <= r1; r++) if (solid(r, c)) { e.x = c * T - e.w; e.vx = 0; return true; } }
  else if (dx < 0) { const c = Math.floor(e.x / T); for (let r = r0; r <= r1; r++) if (solid(r, c)) { e.x = (c + 1) * T; e.vx = 0; return true; } }
  return false;
}
function moveY(e, dy) {
  e.y += dy; e.onGround = false; const c0 = Math.floor(e.x / T), c1 = Math.floor((Math.ceil(e.x + e.w) - 1) / T);
  if (dy > 0) { const r = Math.floor((Math.ceil(e.y + e.h) - 1) / T); for (let c = c0; c <= c1; c++) if (solid(r, c)) { e.y = r * T - e.h; e.vy = 0; e.onGround = true; return true; } }
  else if (dy < 0) { const r = Math.floor(e.y / T); for (let c = c0; c <= c1; c++) if (solid(r, c)) { e.y = (r + 1) * T; e.vy = 0; return true; } }
  return false;
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function spawnParticles(x, y, n, colors, spd = 2) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(0.5, spd); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: rnd(20, 40), c: colors[i % colors.length] }); } }
function spawnConfetti(n, sx, sy) { const cols = ['#e3342f', '#ffe23a', '#3ac04d', '#3b7dd8', '#ff9ccf', '#fff', '#ff8c1a']; for (let i = 0; i < n; i++) confetti.push({ x: sx == null ? rnd(0, W) : sx, y: sy == null ? rnd(-H, 0) : sy, vx: sx == null ? rnd(-0.5, 0.5) : rnd(-3.5, 3.5), vy: sx == null ? rnd(0.6, 1.6) : rnd(-6, -1), c: cols[i % cols.length], w: rnd(2, 4), ph: rnd(0, 6), life: 400 }); }
function updateParticles() {
  particles = particles.filter(p => (p.life-- > 0)); particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; });
  confetti = confetti.filter(p => p.y < H + 10 && p.life-- > 0); confetti.forEach(p => { p.x += p.vx + Math.sin(frame / 8 + p.ph) * 0.6; p.y += p.vy; p.vy = Math.min(p.vy + 0.12, 1.8); });
}
function respawn() { const P = player; P.x = P.cp.x; P.y = P.cp.y; P.vx = 0; P.vy = 0; P.inv = 60; fade = 30; A.sfx('respawn'); }
const isMoving = P => P.onGround && Math.abs(P.vx) > 0.3;

function updatePlay1() {
  const P = player; frame++;
  if (P.respawnT > 0) { if (--P.respawnT === 0) respawn(); updateParticles(); return; }
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  P.vx += (dir * MOVE - P.vx) * (P.onGround ? 0.45 : 0.18); if (Math.abs(P.vx) < 0.05) P.vx = 0;
  if (dir) P.face = dir;
  if (P.onGround) P.coyote = 6; else if (P.coyote > 0) P.coyote--;
  if (keys.jumpBuf > 0) { keys.jumpBuf--; if (P.coyote > 0) { P.vy = JUMP; P.onGround = false; P.coyote = 0; keys.jumpBuf = 0; A.sfx('jump'); } }
  if (!keys.jump && P.vy < -2.2) P.vy = -2.2;
  P.vy = Math.min(P.vy + GRAV, MAXFALL);
  const wasGround = P.onGround;
  moveX(P, P.vx); moveY(P, P.vy);
  if (P.onGround && !wasGround) { A.sfx('land'); spawnParticles(P.x + P.w / 2, P.y + P.h, 3, ['#c9a06a'], 1); }
  if (isMoving(P)) P.anim += Math.abs(P.vx) * 0.11; else P.anim = 0;
  if (P.inv > 0) P.inv--;
  // candles
  candles.forEach(c => { if (!c.taken && overlap(P, c)) { c.taken = true; P.count++; A.sfx('candle'); spawnParticles(c.x + 6, c.y + 6, 10, ['#ffe23a', '#fff', '#ff8c1a']); } });
  // cones
  cones.forEach(e => {
    if (e.dead) { e.dead++; return; }
    const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1, fc = Math.floor(ahead / T), fr = Math.floor((e.y + e.h + 1) / T);
    if (!solid(fr, fc) || solid(fr - 1, fc)) e.vx = -e.vx; else e.x += e.vx;
    if (overlap(P, e)) {
      if (P.vy > 0 && P.y + P.h - e.y < 12) { e.dead = 1; P.vy = -4; A.sfx('stomp'); spawnParticles(e.x + 6, e.y + 6, 8, ['#ff8c1a', '#fff']); }
      else if (P.inv === 0) { P.inv = 70; P.vx = P.x + P.w / 2 < e.x + e.w / 2 ? -3 : 3; P.vy = -3.2; A.sfx('bonk'); }
    }
  });
  // checkpoints
  flags.forEach(f => { if (!f.hit && P.x + P.w / 2 > f.x) { f.hit = true; P.cp = { x: f.x - 4, y: 12 * T - P.h }; A.sfx('checkpoint'); spawnParticles(f.x + 4, f.y, 10, ['#3ac04d', '#fff']); } if (f.hit && f.raise < 12) f.raise++; });
  // fell in a hole
  if (P.y > levelH + 48) { P.respawnT = 40; A.sfx('fall'); }
  // reached the present
  if (overlap(P, goalBox)) { state = 'end1'; endT = 0; controls(false); A.stop(); persist('l1'); }
  if (fade > 0) fade--;
  updateParticles();
}

function updateEnd1() {
  const P = player; frame++; endT++;
  const tx = goalBox.x - 24;
  if (endT < 60) { P.face = 1; P.vx = P.x < tx ? 1.2 : 0; P.vy = Math.min(P.vy + GRAV, MAXFALL); moveX(P, P.vx); moveY(P, P.vy); if (isMoving(P)) P.anim += 0.14; else P.anim = 0; }
  else { P.vx = 0; P.anim = 0; }
  if (endT === 60) A.sfx('start');
  if (endT > 60 && endT < 130 && endT % 6 === 0) A.sfx('shake');
  if (endT === 130) { goalBox.opened = true; A.sfx('open'); A.play(A.songs.birthday); spawnConfetti(140, goalBox.x + 16 - camX, goalBox.y + 8 - camY); setTimeout(() => { if (state === 'reveal1') A.play(A.songs.win); }, 8300); }
  if (endT > 130 && endT % 4 === 0) spawnConfetti(2, goalBox.x + 16 - camX, goalBox.y + 8 - camY);
  if (endT === 200) { state = 'reveal1'; show('s-reveal1'); setTimeout(() => $('cards-1').firstElementChild.classList.add('in'), 500); }
  updateParticles();
}

// ---- drawing: level 1 ----
function drawSky(sunset) {
  const bands = sunset ? ['#2b1055', '#6b2a78', '#c4467a', '#f0855f', '#ffc46b'] : ['#3d79e6', '#5c94fc', '#7db2ff', '#a3ccff', '#c9e3ff'];
  const n = bands.length; for (let i = 0; i < n; i++) rect(0, Math.floor(H * i / n), W, Math.ceil(H / n) + 1, bands[i]);
}
function drawClouds(cx, top, bottom, rng) {
  for (let i = 0; i < 14; i++) {
    const bx = rng() * 1400, by = top + rng() * Math.max(20, bottom - top), s = 1 + Math.floor(rng() * 2);
    const x = ((bx - cx * 0.25) % 1400 + 1400) % 1400 - 100;
    rect(x, by, 24 * s, 6 * s, '#fff'); rect(x + 6 * s, by - 5 * s, 12 * s, 5 * s, '#fff'); rect(x - 4 * s, by + 3 * s, 32 * s, 4 * s, '#fff'); rect(x + 4 * s, by + 7 * s, 16 * s, 3 * s, '#e6f0ff');
  }
}
function drawHills(cx, groundY, rng) {
  for (let i = 0; i < 9; i++) {
    const bx = i * 180 + rng() * 60, hw = 60 + rng() * 60, hh = 28 + rng() * 30;
    const x = ((bx - cx * 0.45) % 1600 + 1600) % 1600 - 200;
    for (let s = 0; s < 6; s++) { const f = s / 6, w = hw * (1 - f * f); rect(x + (hw - w) / 2, groundY - hh * (s + 1) / 6, w, hh / 6 + 1, s % 2 ? '#2e9e42' : '#35ad4a'); }
  }
}
function drawTown(cx, groundY, rng) {
  const cols = ['#ffd6a5', '#caffbf', '#bdb2ff', '#ffadad', '#fdffb6', '#9bf6ff'];
  for (let i = 0; i < 12; i++) {
    const bx = i * 130 + rng() * 40, hw = 34 + rng() * 20, hh = 28 + rng() * 24, col = cols[i % cols.length];
    const x = ((bx - cx * 0.7) % 1560 + 1560) % 1560 - 150;
    rect(x, groundY - hh, hw, hh, col); rect(x - 3, groundY - hh - 2, hw + 6, 4, '#8a3b2b');
    for (let s = 1; s < 5; s++) rect(x + (hw - 8 - (s - 1) * 6) / 2 - 3 + s * 3, groundY - hh - 2 - s * 4, hw + 6 - s * 6, 4, '#a5482f');
    rect(x + 6, groundY - hh + 8, 8, 8, '#4a3b8a'); rect(x + hw - 14, groundY - hh + 8, 8, 8, '#4a3b8a'); rect(x + hw / 2 - 4, groundY - 12, 8, 12, '#5e3d1c');
  }
}
function drawBirds(cx, groundY) {
  const rng = seeded(21);
  for (let i = 0; i < 6; i++) { const bx = rng() * 900, by = 20 + rng() * Math.max(10, groundY - 170), sp = 0.4 + rng() * 0.4; const x = ((bx - cx * 0.35 - frame * sp) % 900 + 900) % 900 - 40, f = ((frame >> 3) + i) % 2; rect(x, by + f, 3, 1, '#1c1030'); rect(x + 3, by, 2, 1, '#1c1030'); rect(x + 5, by + f, 3, 1, '#1c1030'); }
}
function drawTile(t, x, y, c) {
  if (t === 1) { rect(x, y, T, T, '#8a5a2b'); rect(x, y, T, 5, '#3ac04d'); rect(x, y + 5, T, 1, '#238a33'); if ((c * 7) % 3 === 0) rect(x + 3, y + 1, 2, 2, '#7ee88c'); rect(x + (c * 5) % 12, y + 9, 3, 2, '#5e3d1c'); }
  else if (t === 2) { rect(x, y, T, T, '#7a4c22'); rect(x + (c * 3) % 10, y + 4, 3, 2, '#5e3d1c'); rect(x + (c * 11) % 12, y + 11, 2, 2, '#5e3d1c'); }
  else if (t === 3) { rect(x, y, T, T, '#c0603a'); rect(x, y, T, 1, '#e88a5c'); rect(x, y + 8, T, 1, '#7a3018'); rect(x + 7, y, 1, 8, '#7a3018'); rect(x + 3, y + 8, 1, 8, '#7a3018'); rect(x + 12, y + 8, 1, 8, '#7a3018'); }
}
function drawPresent(x, y, s, open, t) {
  const b = 24 * s;
  if (open) { rect(x + 2 * s, y + 8 * s, b - 4 * s, b - 8 * s, '#e3342f'); rect(x + 9 * s, y + 8 * s, 6 * s, b - 8 * s, '#ffe23a');
    const ly = y - 4 * s - Math.min(30, (t || 0) * 0.5) * s, la = Math.sin((t || 0) / 6) * 6; rect(x - 2 * s + la, ly, b + 4 * s, 7 * s, '#a51f1b'); rect(x + 9 * s + la, ly, 6 * s, 7 * s, '#ffe23a');
    for (let i = 0; i < 8; i++) { const a = (t || 0) / 20 + i * Math.PI / 4; ctx.fillStyle = 'rgba(255,240,120,0.35)'; ctx.beginPath(); ctx.moveTo(x + 12 * s, y + 8 * s); ctx.lineTo(x + 12 * s + Math.cos(a) * 90, y + 8 * s + Math.sin(a) * 90); ctx.lineTo(x + 12 * s + Math.cos(a + 0.18) * 90, y + 8 * s + Math.sin(a + 0.18) * 90); ctx.fill(); }
    return; }
  rect(x + 2 * s, y + 6 * s, b - 4 * s, b - 6 * s, '#e3342f'); rect(x, y + 6 * s, b, 6 * s, '#a51f1b');
  rect(x + 9 * s, y + 6 * s, 6 * s, b - 6 * s, '#ffe23a'); rect(x, y + 13 * s, b, 4 * s, '#ffe23a');
  rect(x + 4 * s, y, 6 * s, 6 * s, '#ffe23a'); rect(x + 14 * s, y, 6 * s, 6 * s, '#ffe23a'); rect(x + 10 * s, y + 3 * s, 4 * s, 4 * s, '#c9a227'); rect(x + 6 * s, y + 2 * s, 2 * s, 2 * s, '#fff7b0'); rect(x + 16 * s, y + 2 * s, 2 * s, 2 * s, '#fff7b0');
}
function drawPlayer(P, sx, sy) {
  if (P.inv > 0 && (frame >> 2) % 2 === 0) return;
  const R = P.face > 0, moving = isMoving(P); let body = R ? SPR.stand : SPR.standL;
  if (!P.onGround) body = R ? SPR.jump : SPR.jumpL; else if (moving && Math.floor(P.anim) % 2 === 1) body = R ? SPR.walk : SPR.walkL;
  const bx = Math.round(sx + P.w / 2 - 10), by = Math.round(sy + P.h - 18);
  ctx.drawImage(body, bx, by);
  if (heads) { const hd = R ? heads.r : heads.l; const bob = moving ? (Math.floor(P.anim) % 2) : 0; const hx = Math.round(sx + P.w / 2 - hd.width / 2 + (R ? 2 : -2)), hy = by - hd.height + 8 + bob; ctx.drawImage(hd, hx, hy); if (airpods) drawAirpod(R ? hx + EAR_X : hx + hd.width - EAR_X - 3, hy + EAR_Y); }
}
function drawBanner(x, y, w, label) {
  rect(x, y, 2, 40, '#5e3d1c'); rect(x + w - 2, y, 2, 40, '#5e3d1c'); rect(x, y + 4, w, 1, '#fff');
  const cols = ['#e3342f', '#ffe23a', '#3b7dd8', '#3ac04d', '#ff9ccf']; for (let i = 0; i < Math.floor(w / 10); i++) { const px = x + 3 + i * 10; rect(px, y + 5, 8, 3, cols[i % 5]); rect(px + 1, y + 8, 6, 3, cols[i % 5]); rect(px + 2, y + 11, 4, 2, cols[i % 5]); rect(px + 3, y + 13, 2, 1, cols[i % 5]); }
  text(label, x + w / 2, y - 10, '#ffe23a', 'center', 7);
}
function renderLevel1(showPlayer) {
  const groundY = 12 * T - camY;
  drawSky(false);
  { const sx = Math.round(W * 0.62), sy = 30 + (portrait ? 16 : 0); rect(sx, sy + 4, 20, 20, '#fff4a0'); rect(sx + 4, sy, 12, 28, '#fff4a0'); rect(sx - 4, sy + 8, 28, 12, '#fff4a0'); }
  const rng = seeded(7); drawClouds(camX, 4, Math.max(30, groundY - 130), rng); drawBirds(camX, groundY); drawHills(camX, groundY, rng); drawTown(camX, groundY, rng);
  // tiles
  const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(L1.cols - 1, Math.ceil((camX + W) / T));
  for (let r = 0; r < L1.rows; r++) for (let c = c0; c <= c1; c++) { const t = grid[r][c]; if (t) drawTile(t, c * T - camX, r * T - camY, c); }
  // ground continues under the controls area
  rect(0, levelH - camY, W, H, '#7a4c22');
  for (let c = c0; c <= c1; c++) if (grid[12][c] === 0) rect(c * T - camX, levelH - camY, T, H, '#1c1030');
  // decor
  L1.bushes.forEach(c => { const x = c * T - camX; if (x > -40 && x < W + 40) { rect(x, groundY - 8, 20, 8, '#2e9e42'); rect(x + 4, groundY - 13, 12, 6, '#3ac04d'); rect(x + 7, groundY - 11, 3, 2, '#7ee88c'); } });
  L1.trees.forEach(c => { const x = c * T - camX; if (x > -40 && x < W + 40) { rect(x + 6, groundY - 30, 6, 30, '#5e3d1c'); rect(x - 4, groundY - 50, 26, 22, '#238a33'); rect(x, groundY - 56, 18, 8, '#2e9e42'); rect(x + 4, groundY - 46, 6, 4, '#3ac04d'); } });
  drawBanner(1 * T - camX, 5 * T - camY, 7 * T, 'HAPPY BIRTHDAY!');
  drawBanner(173 * T - camX, 5 * T - camY, 8 * T, 'PARTY  →');
  { const x = 4 * T - camX, y = groundY - 30; rect(x + 5, y + 10, 3, 20, '#5e3d1c'); rect(x - 10, y, 34, 12, '#c9a227'); rect(x - 9, y + 1, 32, 10, '#f5d76e'); text('B-DAY →', x + 7, y + 2, '#3a2a00', 'center', 6); }
  balloons.forEach(b => { const x = b.x - camX, y = b.y - camY + Math.sin(frame / 30 + b.ph) * 3; if (x > -30 && x < W + 30) { rect(x + 3, y + 14, 1, 20, '#ddd'); rect(x, y, 12, 14, b.col); rect(x + 2, y - 2, 8, 2, b.col); rect(x + 2, y + 14, 8, 2, b.col); rect(x + 2, y + 2, 3, 4, 'rgba(255,255,255,.5)'); } });
  flags.forEach(f => { const x = f.x - camX, y = f.y - camY; if (x > -20 && x < W + 20) { rect(x + 3, y, 2, 24, '#888'); rect(x + 2, y - 1, 4, 2, '#ffe23a'); const fy = y + 14 - f.raise; rect(x + 5, fy, 9, 7, f.hit ? '#3ac04d' : '#e3342f'); rect(x + 5, fy + 2, 9, 1, '#fff'); } });
  candles.forEach((c, i) => { if (c.taken) return; const x = c.x - camX, y = c.y - camY + Math.round(Math.sin(frame / 12 + c.ph) * 2); if (x > -16 && x < W + 16) ctx.drawImage(((frame >> 3) + i) % 2 ? SPR.candle1 : SPR.candle0, Math.round(x), Math.round(y)); });
  cones.forEach(e => { const x = e.x - camX, y = e.y - camY; if (x < -20 || x > W + 20 || e.dead > 40) return; if (e.dead) ctx.drawImage(SPR.coneSquish, Math.round(x), Math.round(y + 10)); else ctx.drawImage(SPR.cone, Math.round(x), Math.round(y)); });
  if (goalBox) { const gx = goalBox.x - camX, gy = goalBox.y - camY - 8, shake = (state === 'end1' && endT > 60 && endT < 130) ? Math.round(Math.sin(endT * 1.7) * 2) : 0; drawPresent(gx + shake, gy, 1.33, goalBox.opened, endT - 130); if (!goalBox.opened && state === 'play1') text('?', gx + 16, gy - 14 + Math.sin(frame / 10) * 2, '#fff', 'center', 8); }
  if (showPlayer) drawPlayer(player, player.x - camX, player.y - camY);
  particles.forEach(p => rect(p.x - camX, p.y - camY, 2, 2, p.c));
  confetti.forEach(p => rect(p.x, p.y, p.w, p.w, p.c));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade / 30})`; ctx.fillRect(0, 0, W, H); }
}
function updateCamera1() {
  const P = player, tx = clamp(P.x + P.w / 2 - W * 0.42, 0, levelW - W);
  camX += (tx - camX) * 0.15; if (Math.abs(tx - camX) < 0.3) camX = tx;
  const maxCam = levelH - viewH;
  camY = maxCam <= 0 ? maxCam : clamp(P.y + 20 - viewH * 0.6, 0, maxCam);
}
const hudY = () => 8 + (portrait ? 20 : 0);
function drawHud1() {
  const y = hudY();
  ctx.drawImage(SPR.candle0, 6, y - 2); text(`${player.count}/16`, 20, y + 4, '#fff');
  text(CFG.name || 'LEVI', W - 8, y + 4, '#ffe23a', 'right');
}

// ------------------------------------------------------------
//  Bonus round — Flight School (flappy flying car)
// ------------------------------------------------------------
const F = { car: { x: 0, y: 0, vy: 0, w: 40, h: 14 }, gates: [], score: 0, hearts: 5, inv: 0, t: 0, dist: 0, speed: 1.7, spawned: 0, done: false, landed: false, flash: 0, crashT: 0, finishX: null, spin: 0 };
const GATE_W = 24, GOAL_GATES = 16, MAX_HEARTS = 5, GATE_EVERY = 105;
function resetBonus() {
  Object.assign(F, { gates: [], score: 0, hearts: MAX_HEARTS, inv: 0, t: 0, dist: 0, spawned: 0, done: false, landed: false, flash: 0, crashT: 0, finishX: null, spin: 0 });
  F.car.x = Math.round(W * 0.26); F.car.y = Math.round(H * 0.4); F.car.vy = 0; confetti = []; particles = [];
}
function roadY() { return H - 22; }
function spawnGate() {
  const gapH = clamp(Math.round(H * 0.38), 104, 180), prev = F.gates[F.gates.length - 1];
  let gy = rnd(24, roadY() - 24 - gapH); if (prev) gy = clamp(gy, prev.gapY - 80, prev.gapY + 80);
  F.gates.push({ x: W + 30, gapY: Math.round(gy), gapH, passed: false, seed: ++F.spawned });
}
function updatePlay2() {
  frame++; F.t++; const car = F.car, ry = roadY();
  if (F.crashT > 0) { F.crashT--; car.vy = Math.min(car.vy + 0.3, 6); car.y = Math.min(car.y + car.vy, ry - car.h); F.spin += 0.25; if (F.crashT === 1) { state = 'crash2'; show('s-crash'); } updateParticles(); return; }
  if (F.landed) { // all 16 gates done: glide down to the road and cross the finish line
    car.y += (ry - car.h - car.y) * 0.05; car.vy = 0; F.dist += F.speed;
    F.gates.forEach(g => g.x -= F.speed); F.finishX -= F.speed;
    if (F.finishX < car.x - 10 && state === 'play2') { state = 'end2'; endT = 0; A.stop(); A.sfx('fanfare'); spawnConfetti(160); persist('l2'); setTimeout(() => { if (state === 'end2' || state === 'reveal2') A.play(A.songs.win); }, 900); }
    updateParticles(); return;
  }
  if (flapQueued) { flapQueued = false; car.vy = -4.3; A.sfx('flap'); spawnParticles(car.x - 2, car.y + 8, 3, ['#ccc', '#fff'], 1); }
  car.vy = Math.min(car.vy + 0.26, 6); car.y += car.vy;
  if (car.y < 0) { car.y = 0; car.vy = 0; }
  if (F.t % GATE_EVERY === 40 && F.spawned < GOAL_GATES) spawnGate();
  F.dist += F.speed;
  F.gates.forEach(g => g.x -= F.speed);
  F.gates = F.gates.filter(g => g.x > -60);
  if (F.inv > 0) F.inv--;
  const hit = () => { if (F.inv > 0) return; F.hearts--; F.inv = 75; F.flash = 8; A.sfx('hurt'); spawnParticles(car.x + 20, car.y + 6, 12, ['#ff8c1a', '#fff', '#e3342f']); if (F.hearts <= 0) { F.crashT = 50; A.sfx('crash'); A.stop(); } else car.vy = -3.5; };
  const cb = { x: car.x + 4, y: car.y, w: car.w - 8, h: car.h };
  F.gates.forEach(g => {
    if (!g.passed && g.x + GATE_W < car.x) { g.passed = true; F.score++; A.sfx('gate'); if (F.score >= GOAL_GATES) { F.done = true; F.landed = true; F.finishX = W + 120; } }
    if (overlap(cb, { x: g.x, y: 0, w: GATE_W, h: g.gapY }) || overlap(cb, { x: g.x, y: g.gapY + g.gapH, w: GATE_W, h: ry })) hit();
  });
  if (car.y + car.h > ry) { car.y = ry - car.h; hit(); if (F.hearts > 0) car.vy = -4; }
  if (F.flash > 0) F.flash--;
  updateParticles();
}
function drawGiftPillar(x, y0, y1, seed) {
  const rng = seeded(seed * 31 + 7), cols = ['#e3342f', '#3b7dd8', '#3ac04d', '#ff9ccf', '#ff8c1a', '#9b5de5'];
  for (let y = y0; y < y1; y += 20) { const h = Math.min(20, y1 - y), col = cols[Math.floor(rng() * cols.length)]; rect(x, y, GATE_W, h, col); rect(x, y, GATE_W, 2, 'rgba(255,255,255,.35)'); rect(x + GATE_W / 2 - 2, y, 4, h, '#ffe23a'); if (h > 12) rect(x, y + 8, GATE_W, 3, '#ffe23a'); }
}
function drawCar(sx, sy, spin) {
  const car = F.car;
  ctx.save(); ctx.translate(Math.round(sx + car.w / 2), Math.round(sy + car.h / 2));
  ctx.rotate(spin ? spin : clamp(car.vy * 0.06, -0.35, 0.5));
  const up = (frame >> 2) % 2 === 0;
  ctx.drawImage(up ? SPR.wingUp : SPR.wingDown, -26, up ? -12 : -8);
  ctx.drawImage(SPR.car, -20, -7);
  if (heads) { const hy = -7 - heads.car.height + 9; ctx.drawImage(heads.car, -14, hy); if (airpods) drawAirpod(-14 + EAR_X, hy + EAR_Y); }
  ctx.restore();
}
function renderBonus() {
  drawSky(true);
  const ry = roadY(), rng = seeded(99);
  rect(W * 0.72, H * 0.18, 26, 26, '#ffd166'); rect(W * 0.72 + 4, H * 0.18 - 4, 18, 34, '#ffd166'); rect(W * 0.72 - 4, H * 0.18 + 4, 34, 18, '#ffd166');
  drawClouds(F.dist, 10, ry - 90, rng);
  for (let i = 0; i < 26; i++) { const bx = i * 46 + rng() * 20, bw = 22 + rng() * 22, bh = 30 + rng() * 70; const x = ((bx - F.dist * 0.3) % 1200 + 1200) % 1200 - 100; rect(x, ry - bh, bw, bh, '#3a2a5a'); for (let wy = ry - bh + 6; wy < ry - 8; wy += 9) for (let wx = x + 4; wx < x + bw - 5; wx += 8) if (((wx * 7 + wy * 13) | 0) % 5 !== 0) rect(wx, wy, 3, 4, '#ffe9a0'); }
  rect(0, ry, W, H - ry, '#444'); rect(0, ry, W, 3, '#777'); for (let x = -((F.dist * 1.5) % 40); x < W; x += 40) rect(x, ry + 10, 20, 3, '#ffe23a');
  F.gates.forEach(g => { drawGiftPillar(g.x, 0, g.gapY, g.seed); drawGiftPillar(g.x, g.gapY + g.gapH, ry, g.seed + 50); });
  if (F.finishX != null) { const x = F.finishX; rect(x, ry - 70, 3, 70, '#eee'); for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) rect(x + 3 + c * 5, ry - 70 + r * 5, 5, 5, (r + c) % 2 ? '#111' : '#fff'); text('FINISH', x + 2, ry - 84, '#fff', 'left', 7); }
  if (!(F.inv > 0 && (frame >> 2) % 2 === 0) || F.crashT) drawCar(F.car.x, F.car.y, F.crashT ? F.spin : 0);
  particles.forEach(p => rect(p.x, p.y, 2, 2, p.c));
  confetti.forEach(p => rect(p.x, p.y, p.w, p.w, p.c));
  if (F.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${F.flash / 12})`; ctx.fillRect(0, 0, W, H); }
  const y = hudY();
  for (let i = 0; i < MAX_HEARTS; i++) ctx.drawImage(i < F.hearts ? SPR.heart : SPR.heartOff, 6 + i * 9, y + 4);
  text(`${Math.min(F.score, GOAL_GATES)}/${GOAL_GATES}`, W - 8, y + 4, '#fff', 'right');
  if (state === 'play2' && F.t < 130 && !F.landed) text('TAP TO FLAP!', W / 2, H * 0.62, '#ffe23a', 'center', 8);
}

// ------------------------------------------------------------
//  Level 2 — The AirPods Incident (mash to run; the thief always gets away)
// ------------------------------------------------------------
const THIEF_TOP = ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhkkkkkkhh...', '...hhkwkkwkhh...', '...hhkkkkkkhh...', '....hhhhhhhh....',
  '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hh.hhhhhh.hh..', '..ss.hhhhhh.ss..', '.....hhhhhh.....', '.....pppppp.....', '.....pppppp.....'];
SPR.thiefA = sprite([...THIEF_TOP, '.....pp..pp.....', '.....pp..pp.....', '.....pp..pp.....', '....kkk..kkk....', '...kkkk..kkkk...']);
SPR.thiefB = sprite([...THIEF_TOP, '....ppp..ppp....', '...ppp....ppp...', '..ppp......ppp..', '.kkkk......kkkk.', 'kkkkk......kkkkk']);
SPR.getaway = sprite(CAR_ROWS.map(r => r.replace(/r/g, 'h').replace(/R/g, 'H').replace(/c/g, 'x')));
SPR.genius = sprite([...TORSO.map(r => r.replace(/b/g, 'v').replace(/B/g, 'R')), '.....pppp..pppp.....', '.....pppp..pppp.....', '.....pppp..pppp.....', '.....pppp..pppp.....', '.....pppp..pppp.....', '....kkkkk..kkkkk....', '...kkkkkk..kkkkkk...']);
SPR.geniusHead = sprite(['..kkkkkk..', '.kkkkkkkk.', '.kksssskk.', '.ssssssss.', '.skssssks.', '.ssssssss.', '..ssssss..', '...ssss...']);
const EAR_X = 14, EAR_Y = 24;   // ear canal on the 40px side-profile head (measured on a 5px grid)
function drawAirpod(x, y) { rect(x, y, 3, 3, '#fff'); rect(x + 1, y + 3, 1, 3, '#e6e6e6'); }
const C = { t: 0, lx: 0, boost: 0, anim: 0, speed: 0, tx: 0, tanim: 0, cam: 0, phase: 'run', carX: 0, carV: 0, thiefIn: false, hopT: 0, stopT: 0 };
let airpods = !!save.ap, storeStep = 0;
const chaseGround = () => H - 44;
function startChase() {
  Object.assign(C, { t: 0, lx: 30, boost: 0, anim: 0, speed: 0, tx: 96, tanim: 0, cam: 0, phase: 'run', carX: 0, carV: 0, thiefIn: false, hopT: 0, stopT: 0 });
  particles = []; confetti = []; flapQueued = false; state = 'play3'; show(null); controls(false); $('btn-music').classList.add('on'); A.play(A.songs.chase);
}
function updateChase() {
  frame++; C.t++; const gy = chaseGround();
  if (C.phase !== 'stop') {
    if (flapQueued) { flapQueued = false; C.boost = Math.min(3.0, C.boost + 1.1); A.sfx('step'); spawnParticles(C.lx - 2, gy, 2, ['#c9a06a', '#eee'], 1.2); }
    C.boost *= 0.94; C.speed = 1.2 + C.boost; C.lx += C.speed; C.anim += C.speed * 0.1;
  }
  const gap = C.tx - C.lx;
  if (C.phase === 'run') {
    let ts = 1.5; if (gap < 30) ts = 2.6 + C.boost * 0.5; else if (gap > W * 0.55) ts = 0.9;
    C.tx += ts; C.tanim += ts * 0.12;
    if (gap < 34 && C.t % 45 === 0) A.sfx('taunt');
    if (C.t === 470) { C.phase = 'car'; C.carX = C.lx - 130; C.carV = 5.5; A.sfx('vroom'); }
  } else if (C.phase === 'car') {
    C.tx += 1.5; C.tanim += 0.18; C.carX += C.carV;
    if (C.carX + 30 >= C.tx) { C.phase = 'hop'; C.hopT = 0; A.sfx('screech'); }
  } else if (C.phase === 'hop') {
    C.hopT++; C.carX += 1.5; C.tx = C.carX + 30;
    if (C.hopT === 14) C.thiefIn = true;
    if (C.hopT > 22) { C.phase = 'escape'; C.carV = 3; A.sfx('vroom'); }
  } else if (C.phase === 'escape') {
    C.carV = Math.min(9, C.carV + 0.15); C.carX += C.carV; C.tx = C.carX + 30;
    if (C.carX > C.lx + W + 40) { C.phase = 'stop'; C.stopT = 0; }
  } else if (C.phase === 'stop') {
    C.stopT++; C.speed *= 0.9; if (C.speed < 0.05) C.speed = 0; C.lx += C.speed; C.anim += C.speed * 0.1;
    if (C.stopT === 1) A.stop();
    if (C.stopT === 30) A.sfx('trombone');
    if (C.stopT === 110) { state = 'gotaway'; show('s-gotaway'); }
  }
  C.cam = C.lx - W * 0.2;
  updateParticles();
}
function renderChase() {
  const gy = chaseGround(), cam = C.cam;
  const bands = ['#070a1f', '#0e1440', '#182158', '#243070', '#33418a'], n = bands.length;
  for (let i = 0; i < n; i++) rect(0, Math.floor(H * i / n), W, Math.ceil(H / n) + 1, bands[i]);
  const rs = seeded(5);
  for (let i = 0; i < 40; i++) { const sx = rs() * 600, sy = rs() * Math.max(20, gy - 120), tw = ((frame >> 4) + i) % 3 === 0; const x = ((sx - cam * 0.05) % 600 + 600) % 600; rect(x, sy, tw ? 2 : 1, tw ? 2 : 1, '#fff'); }
  { const mx = Math.round(W * 0.74), my = hudY() + 56; rect(mx, my + 3, 16, 12, '#f6f1c9'); rect(mx + 3, my, 10, 18, '#f6f1c9'); rect(mx + 9, my + 3, 8, 12, bands[0]); rect(mx + 11, my + 1, 6, 16, bands[0]); }
  const rng = seeded(99);
  for (let i = 0; i < 26; i++) { const bx = i * 46 + rng() * 20, bw = 22 + rng() * 22, bh = 30 + rng() * 70; const x = ((bx - cam * 0.3) % 1200 + 1200) % 1200 - 100; rect(x, gy - bh, bw, bh, '#0b0d24'); for (let wy = gy - bh + 6; wy < gy - 8; wy += 9) for (let wx = x + 4; wx < x + bw - 5; wx += 8) if (((wx * 7 + wy * 13) | 0) % 4 !== 0) rect(wx, wy, 3, 4, '#ffe9a0'); }
  for (let lx = Math.floor((cam - 40) / 140) * 140; lx < cam + W + 40; lx += 140) { const x = lx - cam; ctx.fillStyle = 'rgba(255,230,120,0.10)'; ctx.beginPath(); ctx.moveTo(x + 6, gy - 60); ctx.lineTo(x - 26, gy); ctx.lineTo(x + 38, gy); ctx.fill(); rect(x + 4, gy - 62, 3, 62, '#555a6e'); rect(x + 2, gy - 66, 9, 5, '#ffe9a0'); }
  rect(0, gy, W, 12, '#8a8a99'); rect(0, gy, W, 2, '#b3b3c2'); for (let sx = -(cam % 24); sx < W; sx += 24) rect(sx, gy + 2, 1, 10, '#6e6e80');
  rect(0, gy + 12, W, H - gy - 12, '#23232e'); for (let sx = -(cam % 40); sx < W; sx += 40) rect(sx, gy + 26, 20, 3, '#ffe23a');
  if (C.phase !== 'run') {
    const x = Math.round(C.carX - cam); ctx.drawImage(SPR.getaway, x, gy - 14);
    if (C.thiefIn) ctx.drawImage(SPR.thiefA, 0, 0, 16, 7, x + 13, gy - 19, 16, 7);
    if (C.phase === 'escape') for (let k = 0; k < 3; k++) rect(x - 8 - k * 7, gy - 8 + k * 2, 5, 1, '#fff');
  }
  if (!C.thiefIn) {
    const x = C.tx - cam, hop = C.phase === 'hop' ? -Math.sin(Math.min(1, C.hopT / 14) * Math.PI) * 18 : 0;
    ctx.drawImage(Math.floor(C.tanim) % 2 ? SPR.thiefB : SPR.thiefA, Math.round(x), Math.round(gy - 20 + hop));
    const cx = Math.round(x + 13), cy = Math.round(gy - 11 + hop); rect(cx, cy, 6, 5, '#fff'); rect(cx, cy + 2, 6, 1, '#cfd3d8');
    if ((frame >> 3) % 2) { rect(cx + 7, cy - 4, 1, 3, '#fff'); rect(cx + 6, cy - 3, 3, 1, '#fff'); }
  }
  drawPlayer({ x: C.lx, y: gy - 44, w: 16, h: 44, onGround: true, vx: C.speed, face: 1, anim: C.anim, inv: 0 }, C.lx - cam, gy - 44);
  if (C.phase === 'stop') text('!!!', C.lx - cam + 8, gy - 100 + Math.sin(frame / 5) * 2, '#ffe23a', 'center', 8);
  particles.forEach(p => rect(p.x - cam, p.y, 2, 2, p.c));
  const y = hudY();
  if (C.phase === 'run' || C.phase === 'car') { text('GET THEM BACK!', W / 2, y + 2, '#ffe23a', 'center', 7); if ((frame >> 4) % 2) text('TAP TAP TAP!', W / 2, y + 16, '#fff', 'center', 8); }
  else if (C.phase !== 'stop') text('NO NO NO NO', W / 2, y + 2, '#ff8c1a', 'center', 8);
  const g = clamp(C.tx - C.lx, 20, W * 0.6), pct = 1 - (g - 20) / (W * 0.6 - 20);
  text('CATCH-O-METER', W / 2, y + 30, '#9ad7ff', 'center', 6); rect(12, y + 39, W - 24, 6, '#111'); rect(13, y + 40, Math.round((W - 26) * pct), 4, pct > 0.7 ? '#3ac04d' : '#ffe23a');
}
function storeLayout() { return { fy: Math.round(H * (portrait ? 0.6 : 0.82)), lx: Math.round(W * 0.2), gx: Math.round(W * 0.62) }; }
function startStore() {
  state = 'store'; storeStep = 0; show('s-store'); particles = [];
  $('store-text').innerHTML = 'GENIUS: Welcome in! Did you lose your AirPods?'; $('btn-store-next').textContent = 'THEY WERE STOLEN'; $('btn-store-next').disabled = false;
  A.play(A.songs.store);
}
function storeNext() {
  const price = CFG.airpodsPrice || '$179', btn = $('btn-store-next'), txt = $('store-text');
  storeStep++;
  if (storeStep === 1) { A.sfx('ui'); txt.innerHTML = `GENIUS: Oof. Sorry to hear that.<br><br>That will be <b>${esc(price)}</b>.`; btn.textContent = 'PAY ' + price + ' (SIGH)'; }
  else if (storeStep === 2) {
    btn.disabled = true; btn.textContent = '...'; txt.innerHTML = '(paying)'; A.stop(); A.sfx('trombone');
    setTimeout(() => A.sfx('register'), 1500);
    setTimeout(() => { if (state !== 'store') return; airpods = true; persist('ap'); A.sfx('acquire'); A.play(A.songs.store); const L = storeLayout(); spawnParticles(L.lx + 8, L.fy - 66, 18, ['#fff', '#ffe23a', '#9ad7ff'], 2.2);
      txt.innerHTML = '<b>NEW AIRPODS ACQUIRED!</b><br><br>(Guard these with your life.)'; btn.textContent = 'CONTINUE'; btn.disabled = false; }, 2300);
  }
  else startUnlock();
}
function renderStore() {
  const { fy, lx, gx } = storeLayout();
  rect(0, 0, W, H, '#eef0f4'); for (let x = 0; x < W; x += 32) rect(x, 0, 1, fy, '#d8dde6'); rect(0, 0, W, 10, '#dfe3ea');
  text('APPLE STORE', W / 2, 16 + (portrait ? 16 : 0), '#111', 'center', 8);
  const sy = fy - 70; rect(20, sy, W - 40, 3, '#c8cdd6'); for (let x = 26; x < W - 34; x += 16) { rect(x, sy - 10, 10, 10, '#fff'); rect(x, sy - 10, 10, 1, '#d0d4da'); rect(x + 2, sy - 6, 6, 2, '#9ad7ff'); }
  const tx = Math.round(W * 0.48), tw = Math.round(W * 0.46);
  ctx.drawImage(SPR.genius, gx, fy - 18); ctx.drawImage(SPR.geniusHead, gx + 5, fy - 26);
  rect(0, fy, W, H - fy, '#d5d8de'); rect(0, fy, W, 2, '#b9bec8'); for (let x = 0; x < W; x += 24) rect(x, fy + 2, 1, H - fy, '#c4c8d0');
  rect(tx, fy - 24, tw, 5, '#c8a06a'); rect(tx, fy - 19, tw, 2, '#9a7442'); rect(tx + 4, fy - 17, 4, 17, '#b08a55'); rect(tx + tw - 8, fy - 17, 4, 17, '#b08a55');
  for (let x = tx + 6; x < tx + tw - 12; x += 14) { rect(x, fy - 33, 10, 9, '#fff'); rect(x, fy - 33, 10, 1, '#d0d4da'); rect(x + 3, fy - 30, 4, 3, '#9ad7ff'); }
  drawPlayer({ x: lx, y: fy - 44, w: 16, h: 44, onGround: true, vx: 0, face: 1, anim: 0, inv: 0 }, lx, fy - 44);
  particles.forEach(p => rect(p.x, p.y, 2, 2, p.c));
}
function startUnlock() {
  A.sfx('ui'); state = 'unlock'; show('s-unlock'); $('unlock-fake').hidden = false; $('unlock-real').hidden = true; A.stop();
  setTimeout(() => { document.body.classList.add('glitching'); A.sfx('glitch'); }, 1700);
  setTimeout(() => { document.body.classList.remove('glitching'); $('unlock-fake').hidden = true; $('unlock-real').hidden = false; A.sfx('unlock'); }, 2600);
}

// ------------------------------------------------------------
//  State machine + main loop
// ------------------------------------------------------------
let state = 'title', titleT = 0;
function startLevel1() { buildLevel1(); updateCamera1(); camX = 0; state = 'play1'; show(null); controls(true); $('btn-music').classList.add('on'); A.play(A.songs.level1); }
function startBonus() { resetBonus(); state = 'play2'; show(null); controls(false); $('btn-music').classList.add('on'); A.play(A.songs.bonus); }
function goTitle() { state = 'title'; buildLevel1(); show('s-title'); controls(false); refreshTitleButtons(); startTaps = 0; if (audioArmed) { A.play(A.songs.title); $('btn-start').textContent = 'START'; } else $('btn-start').textContent = 'TAP TO START'; }

// Browsers only allow sound after the first tap, so the very first tap anywhere arms the audio and starts the title music.
let audioArmed = false, startTaps = 0;
function armAudio() {
  A.unlock();
  const check = () => { if (audioArmed || !A.ready()) return; audioArmed = true; if (state === 'title') { A.play(A.songs.title); $('btn-start').textContent = 'START'; } };
  check(); setTimeout(check, 120); setTimeout(check, 700);
}
['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (!audioArmed) armAudio(); }, true));

$('btn-start').addEventListener('click', () => { startTaps++; if (!audioArmed && startTaps < 2) { $('btn-start').textContent = 'START'; return; } A.sfx('start'); show('s-intro1'); });
$('btn-go1').addEventListener('click', () => { A.unlock(); startLevel1(); });
$('btn-cont1').addEventListener('click', () => { A.sfx('ui'); show('s-intro3'); });
$('btn-go3').addEventListener('click', () => { A.unlock(); startChase(); });
$('btn-store').addEventListener('click', () => { A.unlock(); startStore(); });
$('btn-store-next').addEventListener('click', storeNext);
$('btn-go2').addEventListener('click', () => { A.sfx('ui'); show('s-intro2'); });
$('btn-fly').addEventListener('click', () => { A.unlock(); startBonus(); });
$('btn-retry').addEventListener('click', () => { A.sfx('ui'); startBonus(); });
$('btn-cont2').addEventListener('click', () => { A.sfx('ui'); state = 'final'; show('s-final'); });
$('btn-again').addEventListener('click', () => { A.sfx('ui'); A.stop(); goTitle(); });
$('btn-prizes').addEventListener('click', () => { A.unlock(); A.sfx('ui'); showPrizes(); });
$('btn-prizes-back').addEventListener('click', () => { A.sfx('ui'); show('s-title'); });
$('btn-bonus').addEventListener('click', () => { A.unlock(); A.sfx('ui'); show('s-intro2'); });
$('btn-music').addEventListener('click', () => { const on = !A.isMusicOn(); A.setMusic(on); $('btn-music').classList.toggle('muted', !on); });

let last = 0, acc = 0; const STEP = 1000 / 60;
function update() {
  switch (state) {
    case 'title': titleT++; frame++; camX = (titleT * 0.6) % (levelW - W); camY = Math.min(0, levelH - viewH); updateParticles(); break;
    case 'play1': updatePlay1(); updateCamera1(); break;
    case 'end1': updateEnd1(); updateCamera1(); break;
    case 'reveal1': frame++; if (frame % 6 === 0) spawnConfetti(1); updateParticles(); break;
    case 'play3': updateChase(); break;
    case 'gotaway': case 'store': case 'unlock': frame++; updateParticles(); break;
    case 'play2': updatePlay2(); break;
    case 'crash2': break;
    case 'end2': frame++; endT++; if (endT % 3 === 0) spawnConfetti(2); F.dist += 1; if (endT === 110) { state = 'reveal2'; show('s-reveal2'); setTimeout(() => $('cards-2').firstElementChild.classList.add('in'), 500); } updateParticles(); break;
    case 'reveal2': case 'final': frame++; if (frame % 5 === 0) spawnConfetti(1); F.dist += 0.5; updateParticles(); break;
  }
}
function render() {
  ctx.clearRect(0, 0, W, H);
  switch (state) {
    case 'title': renderLevel1(false); break;
    case 'play1': renderLevel1(true); drawHud1(); break;
    case 'end1': case 'reveal1': renderLevel1(true); break;
    case 'play3': case 'gotaway': renderChase(); break;
    case 'store': case 'unlock': renderStore(); break;
    case 'play2': case 'crash2': case 'end2': case 'reveal2': case 'final': renderBonus(); break;
  }
}
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(100, ts - last); last = ts; acc += dt; let n = 0;
  while (acc >= STEP && n < 4) { update(); acc -= STEP; n++; }
  if (acc >= STEP) acc = 0;
  render();
}
setupPrizes(); goTitle();
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').catch(() => {});
requestAnimationFrame(ts => { last = ts; requestAnimationFrame(loop); });
if (location.hash === '#debug') window.__levi = { player, F, get state() { return state; }, set state(v) { state = v; }, startLevel1, startBonus, startChase, startStore, storeNext, C, show, goal: () => goalBox, cam: () => [camX, camY], keys };
})();
