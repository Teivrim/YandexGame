// Общая библиотека для NEON//VECTOR: физика из game.js, модель движения и решатель.
//
// Один источник правды: константы читаются из исходника игры, поэтому
// проверка не может разойтись с тем, что реально едет в браузере.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---------------- константы из игры ----------------
function readConstants(src) {
  const num = (name, fallback) => {
    const m = src.match(new RegExp('const\\s+' + name + '\\s*=\\s*(-?[\\d.]+)'));
    if (m) return Number(m[1]);
    if (fallback !== undefined) return fallback;
    throw new Error('не найдена константа ' + name);
  };
  return {
    TILE: num('TILE'),
    GRAVITY: num('GRAVITY'),
    MAX_RUN: num('MAX_RUN'),
    ACCEL_GROUND: num('ACCEL_GROUND'),
    ACCEL_AIR: num('ACCEL_AIR'),
    FRICTION_GROUND: num('FRICTION_GROUND', 2800),
    MAX_FALL: num('MAX_FALL'),
    JUMP_V: num('JUMP_V'),
    JUMP_CUT: num('JUMP_CUT'),
    FRICTION_SLIDE: num('FRICTION_SLIDE', 620),
    SLIDE_BOOST: num('SLIDE_BOOST'),
    SLIDE_MIN_SPEED: num('SLIDE_MIN_SPEED', 240),
    DASH_SPEED: num('DASH_SPEED'),
    DASH_TIME: num('DASH_TIME'),
    DASH_COOLDOWN: num('DASH_COOLDOWN'),
    WALL_JUMP_VX: num('WALL_JUMP_VX'),
    WALL_JUMP_VY: num('WALL_JUMP_VY'),
    WALL_SLIDE_SPEED: num('WALL_SLIDE_SPEED'),
    BOUNCE_V: num('BOUNCE_V'),
    COYOTE: num('COYOTE'),
    P_W: num('P_W'),
    P_H: num('P_H'),
    P_H_SLIDE: num('P_H_SLIDE')
  };
}

const DT = 1 / 120;

// TILE читается один раз из игры. Раньше hitsSolid брал его из объекта уровня
// (lv.TILE), которого там нет: деление на undefined давало NaN, циклы по
// столкновениям не выполнялись, и прыжок никогда не считался приземлением.
let TILE = 32;
try {
  TILE = readConstants(fs.readFileSync(path.join(ROOT, 'neon-vector', 'game.js'), 'utf8')).TILE;
} catch (e) { /* используем значение по умолчанию */ }

// ---------------- сетка ----------------
const T = {
  EMPTY: 0, WALL: 1, SPIKE_U: 2, SPIKE_D: 3, SPIKE_L: 4, SPIKE_R: 5,
  GOAL: 6, ACID: 7, CHECK: 8, DASH_PICK: 9
};
const CHAR_MAP = {
  '#': T.WALL, '.': T.EMPTY,
  '^': T.SPIKE_U, 'v': T.SPIKE_D, '<': T.SPIKE_L, '>': T.SPIKE_R,
  'E': T.GOAL, '~': T.ACID, 'C': T.CHECK, 'D': T.DASH_PICK
};
const LETHAL = new Set([T.SPIKE_U, T.SPIKE_D, T.SPIKE_L, T.SPIKE_R, T.ACID]);

// Разбирает массив строк в сетку, выкидывая служебные символы
function buildGrid(rows) {
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const h = rows.length;
  const grid = new Uint8Array(w * h);
  const shards = [];
  const pads = [];
  const movers = [];
  let spawn = { x: 1, y: 1 };
  let goal = { x: w - 2, y: h - 2 };
  let dashAt = null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = x < rows[y].length ? rows[y][x] : '.';
      if (ch === 'S') { spawn = { x, y }; grid[y * w + x] = T.EMPTY; continue; }
      if (ch === 'o') { shards.push({ x, y }); grid[y * w + x] = T.EMPTY; continue; }
      if (ch === 'B') { pads.push({ x, y }); grid[y * w + x] = T.EMPTY; continue; }
      if (ch === '=') { movers.push({ x, y, axis: 'x', range: 3, phase: x * 0.7 + y * 0.4 }); grid[y * w + x] = T.EMPTY; continue; }
      if (ch === '|') { movers.push({ x, y, axis: 'y', range: 3, phase: x * 0.3 + y * 0.9 }); grid[y * w + x] = T.EMPTY; continue; }
      if (ch === 'D') { dashAt = { x, y }; grid[y * w + x] = T.EMPTY; continue; }
      grid[y * w + x] = CHAR_MAP[ch] !== undefined ? CHAR_MAP[ch] : T.WALL;
      if (ch === 'E') goal = { x, y };
    }
  }
  return {
    w, h, grid, shards, pads, movers, spawn, goal, dashAt,
    at(x, y) { return (x < 0 || y < 0 || x >= w || y >= h) ? T.WALL : grid[y * w + x]; }
  };
}

function serializeGrid(lv) {
  const out = [];
  for (let y = 0; y < lv.h; y++) {
    let row = '';
    for (let x = 0; x < lv.w; x++) {
      const t = lv.grid[y * lv.w + x];
      if (t === T.WALL) row += '#';
      else if (t === T.SPIKE_U) row += '^';
      else if (t === T.SPIKE_D) row += 'v';
      else if (t === T.SPIKE_L) row += '<';
      else if (t === T.SPIKE_R) row += '>';
      else if (t === T.GOAL) row += 'E';
      else if (t === T.ACID) row += '~';
      else if (t === T.CHECK) row += 'C';
      else if (t === T.DASH_PICK) row += 'D';
      else row += '.';
    }
    out.push(row);
  }
  // ставим служебные символы обратно
  const put = (x, y, ch) => { if (y >= 0 && y < lv.h && x >= 0 && x < lv.w) out[y] = out[y].substring(0, x) + ch + out[y].substring(x + 1); };
  lv.spawn && put(lv.spawn.x, lv.spawn.y, 'S');
  lv.shards.forEach((s) => put(s.x, s.y, 'o'));
  lv.pads.forEach((p) => put(p.x, p.y, 'B'));
  lv.movers.forEach((m) => put(m.x, m.y, m.axis === 'x' ? '=' : '|'));
  if (lv.dashAt) put(lv.dashAt.x, lv.dashAt.y, 'D');
  return out;
}

// ---------------- геометрия ----------------
function hitsSolid(lv, x, y, pw, ph) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + pw - 0.001) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + ph - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (lv.at(tx, ty) === T.WALL) return true;
    }
  }
  return false;
}

function hitsLethal(lv, x, y, pw, ph) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + pw - 0.001) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + ph - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (LETHAL.has(lv.at(tx, ty))) return true;
    }
  }
  return false;
}

// Игрок стоит: под ним опора, и две клетки над ним свободны (рост 44 > 32)
function standable(lv, x, y) {
  if (lv.at(x, y) === T.WALL || lv.at(x, y - 1) === T.WALL) return false;
  return lv.at(x, y + 1) === T.WALL;
}
function slidable(lv, x, y) {
  if (lv.at(x, y) === T.WALL) return false;
  return lv.at(x, y + 1) === T.WALL;
}

// ---------------- симуляция дуг ----------------
function simulateJump(lv, K, sx, sy, vx0, hold) {
  let x = sx, y = sy, vx = vx0, vy = -K.JUMP_V;
  const cutFrame = Math.pow(K.JUMP_CUT, DT * 60 / 12);
  let wall = 0;
  for (let s = 0; s < 900; s++) {
    if (s > 0) {
      vy = (vy < 0 && hold <= 0) ? vy * cutFrame : vy + K.GRAVITY * DT;
      if (vy > K.MAX_FALL) vy = K.MAX_FALL;
    }
    if (hold > 0) hold -= DT;
    const ny = y + vy * DT;
    const nx = x + vx * DT;
    if (hitsSolid(lv, nx, y, K.P_W, K.P_H)) {
      wall = vx > 0 ? 1 : -1;
      x = vx > 0 ? Math.floor((nx + K.P_W) / K.TILE) * K.TILE - K.P_W - 0.01
        : Math.floor(nx / K.TILE) * K.TILE + K.TILE + 0.01;
      vx = 0;
    } else x = nx;
    if (hitsSolid(lv, x, ny, K.P_W, K.P_H)) {
      if (ny > y) return { ok: true, x, y, wall };
      y = Math.floor(ny / K.TILE) * K.TILE + K.TILE + 0.01;
      vy = 0;
    } else y = ny;
    if (hitsLethal(lv, x, y, K.P_W, K.P_H)) return { ok: false, reason: 'смерть' };
    if (y > lv.h * K.TILE + 80 || x < -40 || x > lv.w * K.TILE + 40) return { ok: false, reason: 'за пределами' };
  }
  return { ok: false, reason: 'вис' };
}

function simulateSlide(lv, K, sx, sy, dir) {
  let x = sx, y = sy, vx = dir * (K.MAX_RUN + K.SLIDE_BOOST);
  for (let s = 0; s < 400; s++) {
    if (Math.abs(vx) <= K.FRICTION_SLIDE * DT) vx = 0;
    else vx -= Math.sign(vx) * K.FRICTION_SLIDE * DT;
    const nx = x + vx * DT;
    if (hitsSolid(lv, nx, y, K.P_W, K.P_H_SLIDE)) return { x, y };
    x = nx;
    if (hitsLethal(lv, x, y, K.P_W, K.P_H_SLIDE)) return { x, y, dead: true };
  }
  return { x, y };
}

// ---------------- решатель ----------------
const HOLDS = [0.35, 0.7, 1.1, 999];
const SPEEDS = [0, 140, 260, 1, 1.35].map((f) => f); // множители от MAX_RUN

function solve(lv, K) {
  const maxRun = K.MAX_RUN;
  const speeds = [0, 0.4 * maxRun, 0.75 * maxRun, maxRun, maxRun + K.SLIDE_BOOST];
  const seen = new Set();
  const startKey = lv.spawn.x + ',' + lv.spawn.y;
  seen.add(startKey);
  const queue = [{ x: lv.spawn.x, y: lv.spawn.y }];
  const reach = new Set();
  let goalOK = false;

  const push = (x, y) => {
    if (x < 1 || y < 1 || x > lv.w - 2 || y > lv.h - 2) return;
    const k = x + ',' + y;
    if (seen.has(k)) return;
    seen.add(k);
    queue.push({ x, y });
  };

  let guard = 0;
  while (queue.length && guard++ < 40000) {
    const node = queue.shift();
    const px = node.x * K.TILE + (K.TILE - K.P_W) / 2;
    const py = (node.y + 1) * K.TILE - K.P_H;

    for (const s of lv.shards) {
      if (!reach.has(s) && Math.abs(s.x - node.x) <= 1 && Math.abs(s.y - node.y) <= 1) reach.add(s);
    }
    if (lv.at(node.x, node.y) === T.GOAL || lv.at(node.x, node.y - 1) === T.GOAL) goalOK = true;

    // шаг и скольжение
    for (const d of [-1, 1]) {
      const nx = node.x + d;
      if (standable(lv, nx, node.y)) { push(nx, node.y); continue; }
      if (slidable(lv, nx, node.y)) {
        const r = simulateSlide(lv, K, px, py, d);
        const tx = Math.floor((r.x + K.P_W / 2) / K.TILE);
        if (!r.dead && standable(lv, tx, node.y)) push(tx, node.y);
      }
    }
    // прыжки
    for (const sp of speeds) {
      for (const dir of (sp === 0 ? [0] : [-1, 1])) {
        for (const hold of HOLDS) {
          const r = simulateJump(lv, K, px, py, sp * dir, hold);
          if (!r.ok) continue;
          const tx = Math.floor((r.x + K.P_W / 2) / K.TILE);
          const ty = Math.floor((r.y + K.P_H - 1) / K.TILE);
          if (standable(lv, tx, ty)) push(tx, ty);
          if (r.wall !== 0) {
            const wj = simulateJump(lv, K, r.x, r.y, -r.wall * K.WALL_JUMP_VX, 0.8);
            if (wj.ok) {
              const wx = Math.floor((wj.x + K.P_W / 2) / K.TILE);
              const wy = Math.floor((wj.y + K.P_H - 1) / K.TILE);
              if (standable(lv, wx, wy)) push(wx, wy);
            }
          }
        }
      }
    }
    // рывок
    for (const dir of [-1, 1]) {
      const r = simulateJump(lv, K, px, py, K.DASH_SPEED * dir, 999);
      if (r.ok) {
        const tx = Math.floor((r.x + K.P_W / 2) / K.TILE);
        const ty = Math.floor((r.y + K.P_H - 1) / K.TILE);
        if (standable(lv, tx, ty)) push(tx, ty);
      }
    }
  }

  const missed = lv.shards.filter((s) => !reach.has(s));
  return { goalOK, seen, reach, missed, nodes: seen.size };
}

// ---------------- обёртки ----------------
function loadGameConstants() {
  const src = fs.readFileSync(path.join(ROOT, 'neon-vector', 'game.js'), 'utf8');
  return readConstants(src);
}

function loadLevelsFromSource() {
  const file = path.join(ROOT, 'neon-vector', 'levels.js');
  const src = fs.readFileSync(file, 'utf8');
  // Уровни лежат литералами, поэтому читаем их текстом, а не eval:
  // так проверка не исполняет код игры.
  const levels = [];
  const objRe = /\{\s*theme:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*,\s*name:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')([\s\S]*?)\n  \}/g;
  let m;
  const unquote = (s) => {
    const q = s[0];
    const body = s.slice(1, -1);
    return body.replace(new RegExp('\\\\' + q, 'g'), q).replace(/\\\\/g, '\\');
  };
  while ((m = objRe.exec(src))) {
    const block = m[3];
    // Берём только содержимое rows: [...] — иначе в строки сетки попадала
    // строка note, и проверка шла по сетке с лишним рядом стен.
    const rowsMatch = block.match(/rows:\s*\[([\s\S]*?)\n\s*\]/);
    if (!rowsMatch) continue;
    const rows = [];
    const rowRe = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
    let r;
    while ((r = rowRe.exec(rowsMatch[1]))) rows.push(unquote('"' + (r[1] !== undefined ? r[1] : r[2]) + '"'));
    if (rows.length) levels.push({ theme: unquote(m[1]), name: unquote(m[2]), rows });
  }
  if (!levels.length) throw new Error('не удалось прочитать уровни из levels.js');
  return levels;
}

module.exports = {
  ROOT, T, CHAR_MAP, LETHAL, DT,
  get TILE() { return TILE; },
  readConstants, buildGrid, serializeGrid,
  hitsSolid, hitsLethal, standable, slidable,
  simulateJump, simulateSlide, solve,
  loadGameConstants, loadLevelsFromSource
};
