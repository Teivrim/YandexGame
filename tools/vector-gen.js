// Генератор уровней NEON//VECTOR.
//
// Маршрут строится так: из каждой уже достижимой клетки вычисляются ВСЕ
// клетки, куда реально долетает прыжок (тем же симулятором, что и решатель),
// и новая платформа ставится только под одной из них. Поэтому маршрут
// корректен по построению, а tools/vector-reach.js подтверждает независимо.
//
// Запуск: node tools/vector-gen.js

const fs = require('fs');
const path = require('path');
const V = require('./vector-lib');

const K = V.loadGameConstants();
const T = V.T;
const TILE = K.TILE;

function rngFrom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const rint = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// ---------------- сетка ----------------
function newGrid(w, h) {
  const g = new Uint8Array(w * h).fill(T.WALL);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) g[y * w + x] = T.EMPTY;
  return g;
}
const get = (g, w, x, y) => (x < 0 || y < 0 || x >= w || y >= g.length / w ? T.WALL : g[y * w + x]);
const set = (g, w, x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < g.length / w) g[y * w + x] = v; };

function standable(g, w, x, y) {
  if (get(g, w, x, y) === T.WALL || get(g, w, x, y - 1) === T.WALL) return false;
  return get(g, w, x, y + 1) === T.WALL;
}
function free3(g, w, x, y) {
  return get(g, w, x, y) !== T.WALL && get(g, w, x, y - 1) !== T.WALL && get(g, w, x, y + 1) !== T.WALL;
}

const SPEEDS = [0, 0.45, 0.8, 1, 1.35].map((f) => f * K.MAX_RUN);
const HOLDS = [0.4, 0.7, 1.0, 999];

// Все клетки, куда можно приземлиться из клетки from (в текущей сетке)
function landingsFrom(g, w, from) {
  const lv = { w, h: g.length / w, grid: g, at: (x, y) => get(g, w, x, y) };
  const px = from.x * TILE + (TILE - K.P_W) / 2;
  const py = (from.y + 1) * TILE - K.P_H;
  const out = new Map();
  const add = (r) => {
    if (!r.ok) return;
    const tx = Math.floor((r.x + K.P_W / 2) / TILE);
    const ty = Math.floor((r.y + K.P_H - 1) / TILE);
    if (standable(g, w, tx, ty)) out.set(tx + ',' + ty, { x: tx, y: ty });
  };
  for (const sp of SPEEDS) {
    for (const dir of (sp === 0 ? [0] : [-1, 1])) {
      for (const hold of HOLDS) {
        const r = V.simulateJump(lv, K, px, py, sp * dir, hold);
        add(r);
        if (r.ok && r.wall !== 0) add(V.simulateJump(lv, K, r.x, r.y, -r.wall * K.WALL_JUMP_VX, 0.75));
      }
    }
  }
  for (const d of [-1, 1]) {
    const nx = from.x + d;
    if (standable(g, w, nx, from.y)) out.set(nx + ',' + from.y, { x: nx, y: from.y });
  }
  return Array.from(out.values());
}

// Достижим ли переход из клетки from на клетку to (платформа под to уже стоит)
function canJumpTo(g, w, from, to) {
  const lv = { w, h: g.length / w, grid: g, at: (x, y) => get(g, w, x, y) };
  const px = from.x * TILE + (TILE - K.P_W) / 2;
  const py = (from.y + 1) * TILE - K.P_H;
  for (const sp of SPEEDS) {
    for (const dir of (sp === 0 ? [0] : [-1, 1])) {
      for (const hold of HOLDS) {
        const r = V.simulateJump(lv, K, px, py, sp * dir, hold);
        if (!r.ok) continue;
        const tx = Math.floor((r.x + K.P_W / 2) / TILE);
        const ty = Math.floor((r.y + K.P_H - 1) / TILE);
        if (ty === to.y && Math.abs(tx - to.x) <= 1 && standable(g, w, tx, ty)) return true;
        if (r.wall !== 0) {
          const wj = V.simulateJump(lv, K, r.x, r.y, -r.wall * K.WALL_JUMP_VX, 0.75);
          if (wj.ok) {
            const wx = Math.floor((wj.x + K.P_W / 2) / TILE);
            const wy = Math.floor((wj.y + K.P_H - 1) / TILE);
            if (wy === to.y && Math.abs(wx - to.x) <= 1 && standable(g, w, wx, wy)) return true;
          }
        }
      }
    }
  }
  return false;
}

// Поставить опору под (tx,ty), не сломав уже достижимые клетки
function tryPlatform(g, w, route, tx, ty, len, protectedCells) {
  if (tx < 2 || tx + len - 1 > w - 3 || ty < 2 || ty > g.length / w - 3) return false;
  for (let i = 0; i < len; i++) {
    if (protectedCells && protectedCells.has((tx + i) + ',' + (ty + 1))) return false;
    if (!free3(g, w, tx + i, ty)) return false;
    // нельзя закрывать голову уже стоящему игроку
    for (const c of route) {
      if (c.x === tx + i && (c.y === ty - 1 || c.y === ty)) return false;
      if (c.x === tx + i && c.y + 1 === ty) return false;
    }
  }
  const before = [];
  for (let i = 0; i < len; i++) { before.push(get(g, w, tx + i, ty + 1)); set(g, w, tx + i, ty + 1, T.WALL); }
  if (!standable(g, w, tx, ty)) {
    for (let i = 0; i < len; i++) set(g, w, tx + i, ty + 1, before[i]);
    return false;
  }
  return true;
}

// ---------------- темы ----------------
const THEMES = [
  { key: 'first', name: 'ПЕРВЫЙ ШАГ', w: 68, h: 20, steps: 14, shards: 5, hazard: 0, gapRate: 0.5,
    note: 'Без опасностей: учимся прыгать и падать.' },
  { key: 'slide', name: 'СКОЛЬЗИ', w: 76, h: 22, steps: 18, shards: 6, hazard: 0.12, gapRate: 0.35, ceilings: true, tunnels: 4,
    note: 'Низкие туннели: в щель высотой в клетку проходим только скольжением.' },
  { key: 'walls', name: 'СТЕНЫ', w: 70, h: 24, steps: 22, shards: 6, hazard: 0.14, gapRate: 0.5,
    note: 'Высокие ступени: учимся отталкиваться от стен.' },
  { key: 'dash', name: 'РЫВОК', w: 76, h: 22, steps: 20, shards: 7, hazard: 0.2, gapRate: 0.8, dash: true,
    note: 'Открываем рывок — он переносит через пропасти, не взятые прыжком.' },
  { key: 'momentum', name: 'ИНЕРЦИЯ', w: 80, h: 24, steps: 24, shards: 8, hazard: 0.24, gapRate: 0.9, long: true,
    note: 'Длинные прогоны: набираем скорость и не тормозим.' },
  { key: 'precision', name: 'ТОЧНОСТЬ', w: 78, h: 24, steps: 26, shards: 8, hazard: 0.34, gapRate: 0.7,
    note: 'Узкие уступы и шипы. Ошибка в метре — смерть.' },
  { key: 'chaos', name: 'ХАОС', w: 84, h: 24, steps: 28, shards: 9, hazard: 0.46, gapRate: 0.8, movers: 5,
    note: 'Движущиеся платформы и плотные шипы.' },
  { key: 'vector', name: 'ВЕКТОР', w: 90, h: 26, steps: 32, shards: 11, hazard: 0.55, gapRate: 0.9, movers: 7, long: true,
    note: 'Финал: инерция, стены, рывок и движущиеся платформы сразу.' }
];

// ---------------- генерация ----------------
function generate(theme, seed) {
  const r = rngFrom(seed);
  const w = theme.w, h = theme.h;
  const g = newGrid(w, h);

  // Земля с провалами. Провалы заполняем шипами, а не пустотой:
  // игрок должен туда падать смертельно, и решатель тоже должен это видеть.
  const groundY = h - 1;
  let cx = 0;
  while (cx < w - 1) {
    const segLen = rint(r, 6, 12);
    for (let i = 0; i < segLen && cx + i < w - 1; i++) set(g, w, cx + i, groundY, T.WALL);
    cx += segLen;
    if (cx < w - 9 && r() < theme.gapRate) {
      const gapLen = Math.min(rint(r, 2, 3), w - 2 - cx);
      for (let i = 0; i < gapLen; i++) set(g, w, cx + i, groundY, T.SPIKE_U);
      cx += gapLen;
    }
  }
  // Рамка: бока и верх. НИЖНЮЮ строку не перетираем — там земля и провалы.
  for (let y = 0; y < h; y++) { set(g, w, 0, y, T.WALL); set(g, w, w - 1, y, T.WALL); }
  for (let x = 0; x < w; x++) set(g, w, x, 0, T.WALL);

  const spawn = { x: 2, y: h - 2 };

  // Щели высотой в клетку строим на земле ДО маршрута: они заменяют часть
  // прохода по земле, и игрок обязан проехать их скольжением. Клетки прохода и
  // выходы помечаем защищёнными, чтобы платформы потом их не запечатали.
  const protectedCells = new Set();
  let tunnels = 0;
  if (theme.ceilings) {
    const passRow = h - 2;          // ряд прохода
    const ceilRow = h - 3;          // ряд потолка
    let x = 4;
    while (x < w - 6 && tunnels < (theme.tunnels || 4)) {
      if (get(g, w, x, groundY) !== T.WALL) { x++; continue; }
      // ищем максимальный сплошной участок земли
      let run = 0;
      while (x + run < w - 2 && get(g, w, x + run, groundY) === T.WALL) run++;
      if (run >= 8) {
        const k = Math.min(7, run - 3);
        const start = x + 2;
        let ok = true;
        for (let i = 0; i < k; i++) {
          const cx = start + i;
          if (get(g, w, cx, passRow) !== T.EMPTY) { ok = false; break; }
          if (get(g, w, cx, ceilRow) !== T.EMPTY) { ok = false; break; }
          if (get(g, w, cx - 1, ceilRow) !== T.EMPTY) { ok = false; break; }
          if (get(g, w, cx + k, ceilRow) !== T.EMPTY) { ok = false; break; }
        }
        if (ok) {
          for (let i = 0; i < k; i++) {
            set(g, w, start + i, ceilRow, T.WALL);
            protectedCells.add((start + i) + ',' + passRow);
            protectedCells.add((start + i) + ',' + ceilRow);
          }
          protectedCells.add((start - 1) + ',' + passRow);
          protectedCells.add((start - 1) + ',' + ceilRow);
          protectedCells.add((start + k) + ',' + passRow);
          protectedCells.add((start + k) + ',' + ceilRow);
          tunnels++;
        }
        x += k + 5;   // сдвигаемся на длину щели, иначе следующая не влезет
      } else {
        x += run;
      }
    }
    if (tunnels < (theme.tunnels || 4)) {
      return { fail: 'щелей получилось ' + tunnels + ' из ' + (theme.tunnels || 4) };
    }
  }
  if (!standable(g, w, spawn.x, spawn.y)) return { fail: 'старт без опоры' };

  const goalX = w - 7;
  const route = [{ x: spawn.x, y: spawn.y }];
  const used = new Set([spawn.x + ',' + spawn.y]);

  // Маршрут: каждый шаг — платформа под клеткой, на которую реально долетает
  // прыжок. Смещения перебираются, а не выбираются случайно: дальности прыжка
  // дискретны, и наугад подобранное смещение чаще всего физически недостижимо.
  const DX_TRY = [2, 3, 4, 5, 6, 7, 1];
  const DY_TRY = [-2, -1, -3, 0];
  const LEN_TRY = [2, 3, 1, 4];
  let guard = 0;
  while (route.length < theme.steps && guard++ < theme.steps * 20) {
    let placed = false;
    // перебираем источники от последних к предыдущим: маршрут остаётся связным
    const maxBack = Math.min(route.length, 6);
    for (let back = 0; back < maxBack && !placed; back++) {
      const from = route[route.length - 1 - back];
      outer:
      for (const dy of DY_TRY) {
        for (const dx of DX_TRY) {
          const c = { x: from.x + dx, y: from.y + dy };
          if (c.x > w - 3 || c.x < 2 || c.y < 2 || c.y > h - 3) continue;
          if (used.has(c.x + ',' + c.y)) continue;
          // на уровне земли ставим площадку только над провалом, иначе она лишняя
          if (dy === 0 && get(g, w, c.x, c.y + 1) === T.WALL) continue;
          for (const len of LEN_TRY) {
            if (theme.long && len < 3) continue;
            if (!tryPlatform(g, w, route, c.x, c.y, len, protectedCells)) continue;
            if (canJumpTo(g, w, from, c)) {
              used.add(c.x + ',' + c.y);
              route.push(c);
              placed = true;
              break outer;
            }
            for (let i = 0; i < len; i++) set(g, w, c.x + i, c.y + 1, T.EMPTY);
          }
        }
      }
    }
    if (!placed) break;
  }

  // выход — на самой правой клетке маршрута
  let goalCell = route[0];
  for (const c of route) if (c.x > goalCell.x || (c.x === goalCell.x && c.y > goalCell.y)) goalCell = c;
  // если дошли до земли справа — ставим выход туда
  const groundGoal = { x: Math.min(w - 3, goalX + 2), y: h - 2 };
  if (standable(g, w, groundGoal.x, groundGoal.y) && groundGoal.x > goalCell.x) goalCell = groundGoal;

  // ---- декор: платформы рядом с маршрутом ----
  const decor = [];
  const decorWant = Math.floor(theme.steps * 0.9);
  for (let dg = 0; dg < 500 && decor.length < decorWant; dg++) {
    const from = pick(r, route);
    const lands = landingsFrom(g, w, from);
    if (!lands.length) continue;
    const c = pick(r, lands);
    const k = c.x + ',' + c.y;
    if (used.has(k)) continue;
    if (c.x === goalCell.x && c.y === goalCell.y) continue;
    const len = Math.max(1, rint(r, 1, 3));
    if (!tryPlatform(g, w, route, c.x, c.y, len, protectedCells)) continue;
    used.add(k);
    decor.push(c);
  }

  const lv = {
    w, h, grid: g, spawn,
    shards: [], pads: [], movers: [], dashAt: null,
    goal: { x: goalCell.x, y: goalCell.y }
  };

  // ---- осколки: на маршруте и на декоре, на уровень выше ----
  const pool = route.concat(decor).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  for (const c of pool) {
    if (lv.shards.length >= theme.shards) break;
    if (c.y - 1 < 1) continue;
    if (get(g, w, c.x, c.y - 1) !== T.EMPTY) continue;
    lv.shards.push({ x: c.x, y: c.y - 1 });
  }

  // ---- опасности: вне маршрута и не вплотную ----
  const routeSet = new Set();
  route.forEach((c) => { routeSet.add(c.x + ',' + c.y); routeSet.add(c.x + ',' + (c.y - 1)); });
  const nearRoute = (x, y) => {
    for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) if (routeSet.has((x + dx) + ',' + (y + dy))) return true;
    return false;
  };
  const wantHaz = Math.round(theme.shards * 3 * theme.hazard);
  let placedHaz = 0;
  for (let hg = 0; hg < 6000 && placedHaz < wantHaz; hg++) {
    const x = rint(r, 2, w - 3), y = rint(r, 2, h - 2);
    if (get(g, w, x, y) !== T.EMPTY || nearRoute(x, y)) continue;
    if (get(g, w, x, y + 1) === T.WALL) set(g, w, x, y, T.SPIKE_U);
    else if (get(g, w, x, y - 1) === T.WALL) set(g, w, x, y, T.SPIKE_D);
    else continue;
    placedHaz++;
  }

  // ---- рывок ----
  if (theme.dash) {
    const c = route[Math.max(1, Math.floor(route.length * 0.22))];
    if (c && c.y - 1 > 1 && get(g, w, c.x, c.y - 1) === T.EMPTY) lv.dashAt = { x: c.x, y: c.y - 1 };
  }

  // ---- чекпоинт в середине ----
  const mid = route[Math.floor(route.length * 0.5)];
  if (mid && mid.y - 1 > 1 && get(g, w, mid.x, mid.y - 1) === T.EMPTY
      && (!lv.dashAt || lv.dashAt.x !== mid.x)) {
    set(g, w, mid.x, mid.y - 1, T.CHECK);
  }

  // ---- движущиеся платформы ----
  for (let mg = 0; mg < 3000 && lv.movers.length < (theme.movers || 0); mg++) {
    const x = rint(r, 3, w - 4), y = rint(r, 3, h - 3);
    if (get(g, w, x, y) !== T.EMPTY) continue;
    if (get(g, w, x, y + 1) === T.EMPTY && get(g, w, x, y - 1) === T.EMPTY) {
      lv.movers.push({ x, y, axis: r() < 0.6 ? 'x' : 'y', range: rint(r, 2, 3), phase: r() * 6.28 });
    }
  }

  // ---- выход ----
  set(g, w, lv.goal.x, lv.goal.y, T.GOAL);
  if (get(g, w, lv.goal.x, lv.goal.y + 1) !== T.WALL) {
    for (let i = 0; i < 4; i++) set(g, w, lv.goal.x + i, lv.goal.y + 1, T.WALL);
  }
  // рамка
  for (let y = 0; y < h; y++) { set(g, w, 0, y, T.WALL); set(g, w, w - 1, y, T.WALL); }
  for (let x = 0; x < w; x++) set(g, w, x, 0, T.WALL);

  return { lv, route, decor };
}

function finalize(theme, seed) {
  const out = generate(theme, seed);
  if (out.fail) return { ok: false, reason: out.fail };
  const rows = V.serializeGrid(out.lv);
  const built = V.buildGrid(rows);
  if (built.goal.x < 5) return { ok: false, reason: 'выход слишком близко к старту' };
  if (!built.shards.length) return { ok: false, reason: 'нет осколков' };
  const res = V.solve(built, K);
  if (!res.goalOK) return { ok: false, reason: 'выход недостижим' };
  if (res.missed.length) return { ok: false, reason: 'недостижимых осколков ' + res.missed.length };
  return { ok: true, rows, nodes: res.nodes, shards: built.shards.length, goalX: built.goal.x, routeLen: out.route.length };
}

function buildLevel(theme) {
  for (let i = 0; i < 600; i++) {
    const seed = (i + 1) * 7919 + theme.name.length * 131 + theme.w;
    const r = finalize(theme, seed);
    if (r.ok) return Object.assign({ seed, theme }, r);
  }
  return null;
}

const results = [];
for (const theme of THEMES) {
  const t0 = Date.now();
  const r = buildLevel(theme);
  if (!r) { console.log('ФЕЙЛ ' + theme.name + ' — ни один вариант не подошёл'); results.push(null); continue; }
  results.push({ name: theme.name, note: theme.note, key: theme.key, rows: r.rows, seed: r.seed });
  console.log('ОК   ' + theme.name.padEnd(12) + ' ' + String(theme.w).padStart(2) + '×' + theme.h
    + '  маршрут ' + String(r.routeLen).padStart(2)
    + '  узлов ' + String(r.nodes).padStart(4)
    + '  осколков ' + String(r.shards).padStart(2)
    + '  выход x=' + String(r.goalX).padStart(2)
    + '  сид ' + r.seed
    + '  ' + (Date.now() - t0) + ' мс');
}

if (results.some((x) => !x)) {
  console.log('\nЕсть несобранные уровни.');
  process.exitCode = 1;
} else {
  const body = results.map((r) => {
    const rows = r.rows.map((s) => "      '" + s.replace(/'/g, "\\'") + "'").join(',\n');
    return '  {\n    theme: ' + JSON.stringify(r.key)
      + ',\n    name: ' + JSON.stringify(r.name)
      + ',\n    note: ' + JSON.stringify(r.note)
      + ',\n    seed: ' + r.seed
      + ',\n    rows: [\n' + rows + '\n    ]\n  }';
  }).join(',\n');

  const out = '// Создано tools/vector-gen.js — правь генератор, а не этот файл.\n'
    + '// Маршрут каждого уровня построен расширением достижимого фронтира\n'
    + '// и подтверждён решателем tools/vector-reach.js.\n'
    + '(function (global) {\n  \'use strict\';\n  global.VECTOR_LEVELS = [\n' + body + '\n  ];\n'
    + '})(typeof window !== \'undefined\' ? window : globalThis);\n';

  fs.writeFileSync(path.join(V.ROOT, 'neon-vector', 'levels.js'), out, 'utf8');
  console.log('\nЗаписано neon-vector/levels.js: ' + results.length + ' уровней, все проходимы.');
}
