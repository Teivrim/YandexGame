(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), timeValue: $('timeValue'), bestValue: $('bestValue'),
    levelValue: $('levelValue'), shardValue: $('shardValue'), deathValue: $('deathValue'),
    dashWrap: $('dashWrap'), dashIcon: $('dashIcon'), dashFill: $('dashFill'),
    hint: $('hint'), soundButton: $('soundButton'), pauseButton: $('pauseButton'),
    menu: $('menu'), playButton: $('playButton'), levelsButton: $('levelsButton'),
    recordsButton: $('recordsButton'), levelsProgress: $('levelsProgress'), recordCount: $('recordCount'),
    levelSelect: $('levelSelect'), levelGrid: $('levelGrid'), closeLevelsButton: $('closeLevelsButton'),
    levelsBackButton: $('levelsBackButton'), unlockedValue: $('unlockedValue'), totalValue: $('totalValue'),
    records: $('records'), recordList: $('recordList'), closeRecordsButton: $('closeRecordsButton'),
    recordsBackButton: $('recordsBackButton'), totalShards: $('totalShards'),
    pauseScreen: $('pauseScreen'), pauseStats: $('pauseStats'), resumeButton: $('resumeButton'),
    retryButton: $('retryButton'), pauseLevelsButton: $('pauseLevelsButton'),
    clearScreen: $('clearScreen'), clearTime: $('clearTime'), clearShards: $('clearShards'),
    clearDeaths: $('clearDeaths'), clearBest: $('clearBest'), clearDelta: $('clearDelta'),
    clearRecord: $('clearRecord'), clearUnlock: $('clearUnlock'), nextButton: $('nextButton'),
    clearRetryButton: $('clearRetryButton'), clearLevelsButton: $('clearLevelsButton'),
    toast: $('toast')
  };

  // ==================================================================
  // ФИЗИКА
  // Значения подобраны расчётом, а не на глаз — см. tools/vector-reach.js
  //   высота прыжка = jumpV^2 / (2 * gravity) = 700^2 / 4200 = 116.7 px = 3.6 клетки
  //   полёт на ту же высоту = 2 * (700 / 2100) = 0.667 c, на 340 px/c это 226 px = 7 клеток
  // ==================================================================
  const TILE = 32;
  const P_W = 22;          // ширина игрока
  const P_H = 44;          // рост стоя — в щель в одну клетку не проходит
  const P_H_SLIDE = 24;    // рост в скольжении — проходит
  const GRAVITY = 2100;
  const MAX_FALL = 1150;
  const MAX_RUN = 340;
  const ACCEL_GROUND = 2600;
  const ACCEL_AIR = 1500;
  const FRICTION_GROUND = 2800;
  const FRICTION_SLIDE = 620;
  const FRICTION_AIR = 260;
  const JUMP_V = 700;
  const JUMP_CUT = 0.42;     // отпустил пробел — умножаем вертикальную скорость
  const COYOTE = 0.10;       // можно прыгнуть чуть после края
  const JUMP_BUFFER = 0.12;  // можно нажать чуть до приземления
  const WALL_SLIDE_SPEED = 130;
  const WALL_JUMP_VX = 390;
  const WALL_JUMP_VY = 650;
  const WALL_STICK = 0.12;
  const SLIDE_BOOST = 70;    // резкое ускорение в начале скольжения
  const SLIDE_MIN_SPEED = 240;
  const DASH_SPEED = 720;
  const DASH_TIME = 0.15;
  const DASH_COOLDOWN = 0.55;
  const BOUNCE_V = 900;
  const STUCK_SPEED = 90;    // максимум скорости стены прилипания

  const C = {
    cyan: '#63e7ff', cyanBright: '#c4f8ff', pink: '#ff3d9a', lime: '#b6ff3d',
    orange: '#ff9f2e', violet: '#9d7bff', red: '#ff4757', muted: '#7d8aa8',
    white: '#eaf7ff'
  };

  const T = { EMPTY: 0, WALL: 1, SPIKE_U: 2, SPIKE_D: 3, SPIKE_L: 4, SPIKE_R: 5, GOAL: 6, ACID: 7, CHECK: 8, DASH_PICK: 9 };
  const SOLID = new Set([T.WALL]);
  const LETHAL = new Set([T.SPIKE_U, T.SPIKE_D, T.SPIKE_L, T.SPIKE_R, T.ACID]);

  // ==================================================================
  // УРОВНИ
  // # стена   . пусто   S старт   E выход   o осколок   C чекпоинт
  // ^ шипы вверх   v шипы вниз   < шипы слева   > шипы справа
  // B батут   = платформа по горизонтали   | платформа по вертикали
  // ~ яд   D разблокировка рывка
  // ==================================================================
  // Уровни генерирует tools/vector-gen.js и кладёт в levels.js: маршрут каждого
  // уровня построен расширением достижимого фронтира и проверен решателем
  // tools/vector-reach.js, так что до выхода можно дойти на каждом.
  const LEVELS = (typeof window !== 'undefined' && window.VECTOR_LEVELS) || [];;

  // ==================================================================
  // ПРОФИЛЬ
  // ==================================================================
  const STORAGE_KEY = 'neon-vector-profile-v1';
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadProfile() {
    const base = { levels: {}, dash: false };
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return base;
    const levels = {};
    LEVELS.forEach((lv, i) => {
      const rec = raw.levels ? raw.levels[i] : null;
      if (rec && typeof rec === 'object' && isFinite(Number(rec.best))) {
        levels[i] = {
          best: Math.max(0, Number(rec.best)),
          shards: Math.max(0, Math.min(999, Math.floor(Number(rec.shards) || 0))),
          deaths: Math.max(0, Math.floor(Number(rec.deaths) || 0)),
          clears: Math.max(0, Math.floor(Number(rec.clears) || 0))
        };
      }
    });
    return { levels, dash: !!raw.dash };
  }

  function saveProfile() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) { /* приватный режим */ }
  }

  let profile = loadProfile();
  const recOf = (i) => profile.levels[i] || null;
  // Уровень открыт, если он первый или предыдущий пройден
  const levelUnlocked = (i) => i === 0 || !!(recOf(i - 1) && recOf(i - 1).best > 0);

  // ==================================================================
  // СОСТОЯНИЕ
  // ==================================================================
  let viewport = { w: 800, h: 600 };
  let dpr = 1;
  let lastFrame = performance.now();
  let ambient = 0;
  let toastTimer = 0;
  let soundOn = true;
  let hintTimer = 0;

  const audio = { ctx: null, master: null };
  const keys = { left: false, right: false, jump: false, jumpPressed: false, slide: false, dash: false, dashPressed: false };
  const touch = { left: false, right: false, jump: false, jumpPressed: false, slide: false, dash: false, dashPressed: false };

  // Замена padStart: на старых WebView (Chrome 37 и т.п.) метода нет,
  // а Android minSdk 21 — это именно такой движок.
  function padStartCompat(value, len) {
    let out = String(value);
    while (out.length < len) out = '0' + out;
    return out;
  }

  let mode = 'menu'; // menu | levels | records | playing | paused | clear
  let level = null;  // разобранный уровень
  let levelIndex = 0;
  let run = null;   // игрок и прогресс текущего забега
  let listReturn = 'menu';

  // ==================================================================
  // ЗВУК
  // ==================================================================
  function ensureAudio() {
    if (!soundOn) return;
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        audio.ctx = new AC();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = 0.4;
        audio.master.connect(audio.ctx.destination);
      } catch (e) { audio.ctx = null; audio.master = null; }
    }
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!soundOn || !audio.ctx || !audio.master) return;
    const now = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(Math.max(30, freq), now);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + (slideTo || 0)), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol || 0.025), now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(audio.master);
    o.start(now); o.stop(now + dur + 0.02);
  }

  const sfxJump = () => tone(340, 0.1, 'square', 0.022, 300);
  const sfxLand = () => tone(160, 0.07, 'square', 0.018, -60);
  const sfxSlide = () => tone(220, 0.2, 'sawtooth', 0.014, -120);
  const sfxDash = () => tone(560, 0.14, 'sawtooth', 0.026, -380);
  const sfxShard = () => tone(880, 0.09, 'triangle', 0.026, 420);
  const sfxDeath = () => tone(200, 0.4, 'sawtooth', 0.034, -150);
  const sfxClear = () => tone(520, 0.16, 'triangle', 0.03, 260);
  const sfxCheck = () => tone(430, 0.12, 'sine', 0.022, 300);

  // ==================================================================
  // РАЗБОР УРОВНЯ
  // ==================================================================
  const CHAR_MAP = {
    '#': T.WALL, '.': T.EMPTY, ' ': T.EMPTY,
    '^': T.SPIKE_U, 'v': T.SPIKE_D, '<': T.SPIKE_L, '>': T.SPIKE_R,
    'E': T.GOAL, '~': T.ACID, 'C': T.CHECK, 'D': T.DASH_PICK
  };

  function parseLevel(def) {
    const rows = def.rows;
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const h = rows.length;
    const grid = new Uint8Array(w * h);
    const shards = [];
    const platforms = [];
    const pads = [];
    let spawn = { x: 2, y: 2 };
    let goal = { x: w - 3, y: h - 3 };

    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = x < row.length ? row[x] : '.';
        if (ch === 'S') { spawn = { x, y }; grid[y * w + x] = T.EMPTY; continue; }
        if (ch === 'o') { shards.push({ x, y, got: false, phase: x * 0.7 + y * 0.3 }); grid[y * w + x] = T.EMPTY; continue; }
        if (ch === 'B') { pads.push({ x, y }); grid[y * w + x] = T.EMPTY; continue; }
        if (ch === '=') {
          // горизонтальная платформа: едет между соседними опорами
          const dir = (x + y) % 2 === 0 ? 1 : -1;
          platforms.push({ x, y, axis: 'x', dir, range: 4, phase: (x * 0.6 + y * 0.4) });
          grid[y * w + x] = T.EMPTY;
          continue;
        }
        if (ch === '|') {
          const dir = (x * 0.5 + y) % 2 < 1 ? 1 : -1;
          platforms.push({ x, y, axis: 'y', dir, range: 3, phase: (x * 0.4 + y * 0.8) });
          grid[y * w + x] = T.EMPTY;
          continue;
        }
        grid[y * w + x] = CHAR_MAP[ch] !== undefined ? CHAR_MAP[ch] : T.WALL;
        if (ch === 'E') goal = { x, y };
      }
    }

    return {
      name: def.name, w, h, grid, shards, platforms, pads, spawn, goal,
      totalShards: shards.length
    };
  }

  const at = (lv, tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= lv.w || ty >= lv.h) return T.WALL;
    return lv.grid[ty * lv.w + tx];
  };
  const isSolid = (lv, tx, ty) => SOLID.has(at(lv, tx, ty));
  const isLethal = (lv, tx, ty) => LETHAL.has(at(lv, tx, ty));

  // ==================================================================
  // ИГРОК
  // ==================================================================
  function makePlayer(spawn) {
    return {
      x: spawn.x * TILE + (TILE - P_W) / 2,
      y: (spawn.y + 1) * TILE - P_H,
      vx: 0, vy: 0,
      onGround: false, wasGround: false,
      facing: 1,
      sliding: false,
      coyote: 0, buffer: 0, wallStick: 0, wallDir: 0,
      dashing: 0, dashCd: 0, dashDir: 1,
      height: P_H,
      dead: false, checkX: spawn.x, checkY: spawn.y
    };
  }

  // Прямоугольник игрока с учётом текущей высоты (скольжение меняет хитбокс)
  function box(p) {
    return {
      x: p.x, y: p.y + (P_H - p.height),
      w: P_W, h: p.height,
      // при скольжении центр сохраняем, чтобы не проваливаться в пол
      cy: p.y + (P_H - p.height)
    };
  }

  function rectHitsSolid(lv, x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(lv, tx, ty)) return true;
      }
    }
    return false;
  }

  function moveX(lv, p, dx) {
    const b = box(p);
    if (dx === 0) return false;
    let nx = p.x + dx;
    if (rectHitsSolid(lv, nx, b.y, P_W, p.height)) {
      // прижимаем к границе клетки, чтобы не тонуть в стене
      if (dx > 0) nx = Math.floor((nx + P_W) / TILE) * TILE - P_W - 0.01;
      else nx = Math.floor(nx / TILE) * TILE + TILE + 0.01;
      p.vx = 0;
      p.wallDir = dx > 0 ? 1 : -1;
      return true;
    }
    p.x = nx;
    p.wallDir = 0;
    return false;
  }

  function moveY(lv, p, dy) {
    const b = box(p);
    let ny = p.y + dy;
    if (rectHitsSolid(lv, p.x, ny, P_W, p.height)) {
      let landed = false;
      if (dy > 0) { ny = Math.floor((ny + p.height) / TILE) * TILE - p.height - 0.01; landed = true; }
      else ny = Math.floor(ny / TILE) * TILE + TILE + 0.01;
      const impact = p.vy;
      p.vy = 0;
      p.onGround = landed;
      if (landed && impact > 400) sfxLand();
      return true;
    }
    p.y = ny;
    p.onGround = false;
    return false;
  }

  // Проверка, стоит ли игрок на твёрдой поверхности (стена или платформа)
  function probeGround(lv, p) {
    const b = box(p);
    const footY = b.y + p.height + 1;
    const ty = Math.floor(footY / TILE);
    const x0 = Math.floor((b.x + 1) / TILE);
    const x1 = Math.floor((b.x + P_W - 1) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(lv, tx, ty)) return true;
    }
    for (const pl of lv.platforms) {
      if (!pl._rect) continue;
      if (b.x + P_W > pl._rect.x && b.x < pl._rect.x + pl._rect.w
        && footY >= pl._rect.y - 2 && footY <= pl._rect.y + 4) return true;
    }
    return false;
  }

  function updatePlatforms(lv, dt) {
    for (const pl of lv.platforms) {
      pl._t = (pl._t || pl.phase) + dt;
      const speed = pl.axis === 'x' ? 1.6 : 1.1;
      const off = Math.sin(pl._t * speed) * pl.range;
      const bx = pl.axis === 'x' ? pl.x * TILE + off * TILE : pl.x * TILE;
      const by = pl.axis === 'y' ? pl.y * TILE + off * TILE : pl.y * TILE;
      const prev = pl._rect;
      const rect = { x: bx, y: by, w: TILE, h: 10 };
      pl._rect = rect;
      pl._solid = true;
      pl._dx = prev ? rect.x - prev.x : 0;
      pl._dy = prev ? rect.y - prev.y : 0;
    }
  }

  function playerUpdate(lv, p, dt) {
    p.wasGround = p.onGround;
    p.coyote = p.onGround ? COYOTE : Math.max(0, p.coyote - dt);
    p.wallStick = Math.max(0, p.wallStick - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);

    const wantLeft = keys.left || touch.left;
    const wantRight = keys.right || touch.right;
    const wantJump = keys.jump || touch.jump;
    const wantSlide = keys.slide || touch.slide;
    // Одноразовые флаги читаем здесь и сбрасываем в конце кадра.
    // Раньше они не сбрасывались, и буфер прыжка постоянно был полон —
    // игрок прыгал бы сам при касании земли.
    const jumpEdge = keys.jumpPressed || touch.jumpPressed;
    const dashEdge = keys.dashPressed || touch.dashPressed;
    keys.jumpPressed = false;
    keys.dashPressed = false;
    touch.jumpPressed = false;
    touch.dashPressed = false;

    if (jumpEdge) p.buffer = JUMP_BUFFER;
    else p.buffer = Math.max(0, p.buffer - dt);

    // --- скольжение ---
    // Присесть можно с любой скоростью, иначе игрок, упёршийся в стену у входа
    // в щель, уже не смог бы начать скользить и проехать её.
    const speed = Math.abs(p.vx);
    const wantsDir = wantRight !== wantLeft;
    p.sliding = p.onGround && wantSlide;
    if (p.sliding) {
      p.height = P_H_SLIDE;
      // при входе в скольжение даём короткий толчок, чтобы инерция ощущалась
      if (!p._wasSliding && speed < MAX_RUN + SLIDE_BOOST && (speed > 40 || wantsDir)) {
        const dir = p.vx >= 0 ? 1 : (p.vx < 0 ? -1 : p.facing);
        p.vx = dir * Math.min(MAX_RUN + SLIDE_BOOST, Math.max(speed, SLIDE_MIN_SPEED) + SLIDE_BOOST);
      }
      sfxSlideOnce(p);
    } else {
      p.height = P_H;
    }
    p._wasSliding = p.sliding;

    // --- рывок ---
    if (dashEdge && p.dashing <= 0 && p.dashCd <= 0 && profile.dash) {
      p.dashing = DASH_TIME;
      p.dashCd = DASH_COOLDOWN;
      p.dashDir = wantRight ? 1 : (wantLeft ? -1 : p.facing);
      p.facing = p.dashDir;
      p.sliding = false;
      p.height = P_H;
      sfxDash();
      spawnTrail(p);
    }
    if (p.dashing > 0) {
      p.dashing -= dt;
      p.vx = p.dashDir * DASH_SPEED;
      p.vy = 0;
    }

    // --- горизонталь ---
    if (p.dashing <= 0) {
      const dir = (wantRight ? 1 : 0) - (wantLeft ? 1 : 0);
      if (dir !== 0) p.facing = dir;
      const accel = p.onGround ? ACCEL_GROUND : ACCEL_AIR;
      if (dir !== 0) {
        p.vx += dir * accel * dt;
        if (!p.sliding && p.vx * dir > MAX_RUN) p.vx = dir * MAX_RUN;
        if (p.sliding && p.vx * dir > MAX_RUN + SLIDE_BOOST) p.vx = dir * (MAX_RUN + SLIDE_BOOST);
      } else {
        const fr = p.sliding ? FRICTION_SLIDE : (p.onGround ? FRICTION_GROUND : FRICTION_AIR);
        if (Math.abs(p.vx) <= fr * dt) p.vx = 0;
        else p.vx -= Math.sign(p.vx) * fr * dt;
      }
      // прилипание к стене
      if (!p.onGround && p.wallStick > 0 && dir !== 0 && dir === p.wallDir) {
        p.vx = dir * Math.min(Math.abs(p.vx), STUCK_SPEED);
      }
    }

    // --- прыжок ---
    const onWall = !p.onGround && p.wallStick > 0 && dirWall(lv, p) !== 0;
    if (p.buffer > 0) {
      if (p.coyote > 0 || p.onGround) {
        p.vy = -JUMP_V;
        if (p.sliding) {
          // прыжок из скольжения: сохраняем и усиливаем горизонталь
          p.vx = (p.vx >= 0 ? 1 : -1) * Math.max(Math.abs(p.vx), MAX_RUN + SLIDE_BOOST);
        }
        p.onGround = false;
        p.coyote = 0;
        p.buffer = 0;
        p.sliding = false;
        p.height = P_H;
        sfxJump();
        burst(p.x + P_W / 2, p.y + p.height, 5, C.cyan);
      } else if (onWall) {
        const wd = dirWall(lv, p);
        p.vx = -wd * WALL_JUMP_VX;
        p.vy = -WALL_JUMP_VY;
        p.facing = -wd;
        p.wallStick = 0;
        p.buffer = 0;
        p.sliding = false;
        p.height = P_H;
        sfxJump();
        burst(p.x + P_W / 2, p.y + p.height, 6, C.pink);
      }
    }
    // отпустил прыжок — срезаем высоту
    if (p.vy < 0 && !wantJump) p.vy *= Math.pow(JUMP_CUT, dt * 60 / 12);

    // --- гравитация ---
    if (p.dashing <= 0) {
      p.vy += GRAVITY * dt;
      if (p.vy > MAX_FALL) p.vy = MAX_FALL;
    }

    // --- скольжение по стене ---
    const wd = dirWall(lv, p);
    if (wd !== 0 && !p.onGround && p.vy > 0 && Math.abs(p.vx) < 60) {
      p.vy = Math.min(p.vy, WALL_SLIDE_SPEED);
      p.wallStick = WALL_STICK;
    }

    // --- перемещение ---
    moveX(lv, p, p.vx * dt);
    // едем вместе с платформой
    for (const pl of lv.platforms) {
      if (!pl._rect) continue;
      const b = box(p);
      if (b.x + P_W > pl._rect.x && b.x < pl._rect.x + pl._rect.w
        && b.y + p.height >= pl._rect.y - 3 && b.y + p.height <= pl._rect.y + 12) {
        p.x += (pl._dx || 0);
        p.y += (pl._dy || 0);
      }
    }
    moveY(lv, p, p.vy * dt);

    // приземление на платформу сверху
    if (p.vy >= 0) {
      const b = box(p);
      for (const pl of lv.platforms) {
        if (!pl._rect) continue;
        const prevBottom = b.y + p.height - p.vy * dt;
        if (b.x + P_W > pl._rect.x && b.x < pl._rect.x + pl._rect.w
          && prevBottom <= pl._rect.y + 1 && b.y + p.height >= pl._rect.y
          && b.y + p.height <= pl._rect.y + 14) {
          p.y = pl._rect.y - p.height;
          p.vy = 0;
          p.onGround = true;
        }
      }
    }
  }

  function dirWall(lv, p) {
    const b = box(p);
    if (rectHitsSolid(lv, b.x - 2, b.y, 2, p.height)) return -1;
    if (rectHitsSolid(lv, b.x + P_W, b.y, 2, p.height)) return 1;
    return 0;
  }

  const sfxState = { slide: false };
  function sfxSlideOnce(p) {
    if (sfxState.slide) return;
    if (Math.abs(p.vx) > 200) sfxSlide();
    sfxState.slide = true;
  }

  // ==================================================================
  // ЧАСТИЦЫ И ЭФФЕКТЫ
  // ==================================================================
  function burst(x, y, n, color) {
    if (!run) return;
    if (reducedMotion) n = Math.min(n, 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 220;
      run.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.4 + Math.random() * 0.3, max: 0.7, color, r: 1.5 + Math.random() * 2.5 });
    }
    if (run.particles.length > 260) run.particles.splice(0, run.particles.length - 260);
  }

  function spawnTrail(p) {
    for (let i = 0; i < 10; i++) {
      run.particles.push({
        x: p.x + P_W / 2, y: p.y + p.height / 2,
        vx: -p.dashDir * (120 + Math.random() * 200) + (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 120,
        life: 0.28, max: 0.28, color: C.pink, r: 2 + Math.random() * 3
      });
    }
  }

  // ==================================================================
  // ПРОВЕРКИ В ЗАБЕГЕ
  // ==================================================================
  function checkPickups(lv) {
    const p = run.p;
    const b = box(p);
    const cx = b.x + P_W / 2, cy = b.y + p.height / 2;
    // осколки
    for (const s of lv.shards) {
      if (s.got) continue;
      const sx = s.x * TILE + TILE / 2, sy = s.y * TILE + TILE / 2;
      if (Math.abs(cx - sx) < TILE * 0.6 && Math.abs(cy - sy) < TILE * 0.6) {
        s.got = true;
        run.shards++;
        sfxShard();
        burst(sx, sy, 10, C.cyanBright);
        flashHud();
      }
    }
    // чекпоинт
    if (at(lv, Math.floor(cx / TILE), Math.floor(cy / TILE)) === T.CHECK) {
      if (run.checkIndex !== Math.floor(p.x / TILE) + ',' + Math.floor(p.y / TILE)) {
        run.checkIndex = Math.floor(p.x / TILE) + ',' + Math.floor(p.y / TILE);
        p.checkX = p.x; p.checkY = p.y;
        run.checkpointTaken = true;
        sfxCheck();
        burst(cx, cy, 12, C.lime);
        showHint('ЧЕКПОИНТ');
      }
    }
    // рывок
    if (at(lv, Math.floor(cx / TILE), Math.floor(cy / TILE)) === T.DASH_PICK && !profile.dash) {
      profile.dash = true;
      saveProfile();
      sfxClear();
      burst(cx, cy, 20, C.pink);
      showHint('РЫВОК ОТКРЫТ — J или свайп вправо');
      updateDashUi();
    }
    // батут
    for (const pad of lv.pads) {
      const px = pad.x * TILE, py = pad.y * TILE;
      if (b.x + P_W > px && b.x < px + TILE && b.y + p.height > py && b.y + p.height < py + TILE + 6) {
        p.vy = -BOUNCE_V;
        p.onGround = false;
        sfxJump();
        burst(px + TILE / 2, py, 8, C.orange);
      }
    }
  }

  function checkDeath(lv) {
    const p = run.p;
    const b = box(p);
    const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + P_W - 1) / TILE);
    const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + p.height - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isLethal(lv, tx, ty)) return true;
      }
    }
    return false;
  }

  function checkGoal(lv) {
    const p = run.p;
    const b = box(p);
    const cx = b.x + P_W / 2, cy = b.y + p.height / 2;
    return at(lv, Math.floor(cx / TILE), Math.floor(cy / TILE)) === T.GOAL;
  }

  // ==================================================================
  // КАМЕРА
  // ==================================================================
  function camTarget() {
    const p = run.p;
    const look = p.facing * 46 + p.vx * 0.09;
    let tx = p.x + P_W / 2 + look - viewport.w / 2;
    let ty = p.y + p.height / 2 - viewport.h * 0.56;
    const maxX = level.w * TILE - viewport.w;
    const maxY = level.h * TILE - viewport.h;
    return {
      x: maxX <= 0 ? maxX / 2 : Math.max(0, Math.min(maxX, tx)),
      y: maxY <= 0 ? maxY / 2 : Math.max(0, Math.min(maxY, ty))
    };
  }

  // ==================================================================
  // ОТРИСОВКА
  // ==================================================================
  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewport.w = Math.max(320, rect.width);
    viewport.h = Math.max(320, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(viewport.w * dpr);
    canvas.height = Math.round(viewport.h * dpr);
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, viewport.h);
    g.addColorStop(0, '#080b1a');
    g.addColorStop(1, '#03040a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewport.w, viewport.h);
  }

  // Фоновая сетка с параллаксом — даёт ощущение скорости
  function drawGrid(cam) {
    const step = TILE * 4;
    const ox = -((cam.x * 0.35) % step), oy = -((cam.y * 0.35) % step);
    ctx.strokeStyle = 'rgba(99,231,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox; x < viewport.w; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, viewport.h); }
    for (let y = oy; y < viewport.h; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(viewport.w, y + 0.5); }
    ctx.stroke();
  }

  function drawTiles(lv, cam) {
    const x0 = Math.max(0, Math.floor(cam.x / TILE));
    const x1 = Math.min(lv.w - 1, Math.ceil((cam.x + viewport.w) / TILE));
    const y0 = Math.max(0, Math.floor(cam.y / TILE));
    const y1 = Math.min(lv.h - 1, Math.ceil((cam.y + viewport.h) / TILE));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = lv.grid[ty * lv.w + tx];
        const px = Math.floor(tx * TILE - cam.x), py = Math.floor(ty * TILE - cam.y);
        if (t === T.WALL) drawWall(px, py, tx, ty);
        else if (t === T.SPIKE_U) drawSpikes(px, py, 1, 0, C.red);
        else if (t === T.SPIKE_D) drawSpikes(px, py, -1, 0, C.red);
        else if (t === T.SPIKE_L) drawSpikes(px, py, 0, 1, C.red);
        else if (t === T.SPIKE_R) drawSpikes(px, py, 0, -1, C.red);
        else if (t === T.ACID) drawAcid(px, py);
        else if (t === T.GOAL) drawGoal(px, py);
        else if (t === T.CHECK) drawCheck(px, py);
        else if (t === T.DASH_PICK) drawDashPick(px, py);
      }
    }
  }

  function drawWall(px, py, tx, ty) {
    // тело кладки — светлее фона, иначе стена сливается с пустотой
    ctx.fillStyle = '#1c2749';
    ctx.fillRect(px, py, TILE, TILE);
    // внутренние швы: кладка читается как масса, а не как заливка
    ctx.fillStyle = 'rgba(8,12,28,0.55)';
    ctx.fillRect(px, py + TILE - 1, TILE, 1);
    ctx.fillRect(px + TILE - 1, py, 1, TILE);
    if (((tx + ty) & 1) === 0) {
      ctx.fillStyle = 'rgba(8,12,28,0.3)';
      ctx.fillRect(px + 7, py + 7, 3, 3);
      ctx.fillRect(px + TILE - 12, py + TILE - 12, 3, 3);
    }
    // верхняя грань — самая читаемая, именно на неё встают
    if (!isSolid(level, tx, ty - 1)) {
      ctx.fillStyle = '#384f86';
      ctx.fillRect(px, py, TILE, 8);
      ctx.fillStyle = 'rgba(99,231,255,0.85)';
      ctx.fillRect(px, py, TILE, 3);
      ctx.shadowColor = 'rgba(99,231,255,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillRect(px, py, TILE, 2);
      ctx.shadowBlur = 0;
    }
    // боковые кромки
    if (!isSolid(level, tx - 1, ty)) {
      ctx.fillStyle = 'rgba(99,231,255,0.2)';
      ctx.fillRect(px, py, 2, TILE);
    }
    if (!isSolid(level, tx + 1, ty)) {
      ctx.fillStyle = 'rgba(8,12,28,0.6)';
      ctx.fillRect(px + TILE - 2, py, 2, TILE);
    }
  }

  function drawSpikes(px, py, dx, dy, color) {
    ctx.save();
    ctx.translate(px + TILE / 2, py + TILE / 2);
    ctx.rotate(dx !== 0 ? Math.PI / 2 : (dy > 0 ? Math.PI : 0));
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    const n = 3, bw = TILE / n;
    for (let i = 0; i < n; i++) {
      const x0 = -TILE / 2 + i * bw;
      ctx.beginPath();
      ctx.moveTo(x0, TILE / 2);
      ctx.lineTo(x0 + bw / 2, -TILE / 2);
      ctx.lineTo(x0 + bw, TILE / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAcid(px, py) {
    const wave = Math.sin(ambient * 2 + px * 0.05) * 3;
    ctx.fillStyle = 'rgba(255,61,154,0.28)';
    ctx.fillRect(px, py + wave, TILE, TILE);
    ctx.strokeStyle = C.pink;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.pink;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(px, py + wave);
    for (let i = 0; i <= 4; i++) {
      ctx.lineTo(px + (i * TILE) / 4, py + wave + Math.sin(ambient * 3 + i) * 2);
    }
    ctx.stroke();
  }

  function drawGoal(px, py) {
    const cx = px + TILE / 2, cy = py + TILE / 2;
    ctx.save();
    ctx.strokeStyle = C.lime;
    ctx.shadowColor = C.lime;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    const r = 9 + Math.sin(ambient * 3) * 2;
    ctx.strokeRect(px + 4, py + 3, TILE - 8, TILE - 6);
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.restore();
  }

  function drawCheck(px, py) {
    const on = run && run.checkpointTaken;
    ctx.fillStyle = on ? 'rgba(182,255,61,0.18)' : 'rgba(182,255,61,0.07)';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = on ? C.lime : 'rgba(182,255,61,0.45)';
    ctx.lineWidth = 2;
    ctx.shadowColor = C.lime;
    ctx.shadowBlur = on ? 16 : 0;
    ctx.beginPath();
    ctx.moveTo(px + 7, py + TILE / 2);
    ctx.lineTo(px + 13, py + TILE - 8);
    ctx.lineTo(px + TILE - 7, py + 8);
    ctx.stroke();
  }

  function drawDashPick(px, py) {
    const cx = px + TILE / 2, cy = py + TILE / 2 + Math.sin(ambient * 3) * 3;
    ctx.save();
    ctx.strokeStyle = profile.dash ? 'rgba(255,61,154,0.3)' : C.pink;
    ctx.shadowColor = C.pink;
    ctx.shadowBlur = profile.dash ? 0 : 18;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const x0 = cx - 9 + i * 6, y0 = cy - 7 + i * 5;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 6, y0);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPlatforms(lv, cam) {
    for (const pl of lv.platforms) {
      if (!pl._rect) continue;
      const px = pl._rect.x - cam.x, py = pl._rect.y - cam.y;
      ctx.fillStyle = 'rgba(157,123,255,0.28)';
      ctx.fillRect(px, py, pl._rect.w, pl._rect.h);
      ctx.strokeStyle = C.violet;
      ctx.shadowColor = C.violet;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 0.5, py + 0.5, pl._rect.w - 1, pl._rect.h - 1);
      ctx.shadowBlur = 0;
      // хвост движения показывает направление
      ctx.fillStyle = 'rgba(157,123,255,0.5)';
      const d = pl.axis === 'x' ? (pl._dx || 0) : (pl._dy || 0);
      if (Math.abs(d) > 0.01) ctx.fillRect(px, py + 1, pl._rect.w, 1.5);
    }
  }

  function drawPads(lv, cam) {
    for (const pad of lv.pads) {
      const px = pad.x * TILE - cam.x, py = pad.y * TILE - cam.y;
      ctx.fillStyle = 'rgba(255,159,46,0.3)';
      ctx.fillRect(px, py + TILE - 8, TILE, 8);
      ctx.strokeStyle = C.orange;
      ctx.shadowColor = C.orange;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 5, py + TILE - 8);
      ctx.lineTo(px + TILE / 2, py + TILE - 20);
      ctx.lineTo(px + TILE - 5, py + TILE - 8);
      ctx.stroke();
    }
  }

  function drawShards(lv, cam) {
    for (const s of lv.shards) {
      if (s.got) continue;
      const px = s.x * TILE + TILE / 2 - cam.x;
      const py = s.y * TILE + TILE / 2 - cam.y + Math.sin(ambient * 2.6 + s.phase) * 4;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ambient * 1.6 + s.phase);
      ctx.fillStyle = C.cyanBright;
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur = 14;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  }

  function drawPlayer(p, cam) {
    const b = box(p);
    const px = b.x - cam.x, py = b.y - cam.y;
    const squash = p.sliding ? 1 : 1;
    ctx.save();
    // след от рывка
    if (p.dashing > 0) {
      ctx.fillStyle = 'rgba(255,61,154,0.35)';
      ctx.fillRect(px - p.facing * 16, py, P_W, p.height);
    }
    ctx.fillStyle = C.white;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 16;
    if (p.sliding) {
      ctx.fillRect(px, py + p.height - 12, P_W, 12);
      ctx.fillStyle = C.cyan;
      ctx.fillRect(px + p.facing * 2, py + p.height - 12, P_W - 4, 12);
    } else {
      ctx.fillRect(px, py + 6, P_W, p.height - 6);
      ctx.fillStyle = C.cyan;
      ctx.fillRect(px + 1, py + 7, P_W - 2, p.height - 8);
    }
    // «глаз» — направление взгляда
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#04121a';
    ctx.fillRect(px + (p.facing > 0 ? P_W - 10 : 4), py + (p.sliding ? p.height - 9 : 11), 6, 5);
    ctx.restore();
    void squash;
  }

  function drawParticles(cam) {
    ctx.save();
    for (const q of run.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.r / 2 - cam.x, q.y - q.r / 2 - cam.y, q.r, q.r);
    }
    ctx.restore();
  }

  // Линии скорости — появляются на большой скорости
  function drawSpeedLines(p) {
    const sp = Math.abs(p.vx);
    if (sp < 300) return;
    const dir = p.vx > 0 ? -1 : 1;
    ctx.save();
    ctx.strokeStyle = 'rgba(99,231,255,0.18)';
    ctx.lineWidth = 2;
    const n = Math.min(12, Math.floor((sp - 300) / 40));
    for (let i = 0; i < n; i++) {
      const y = (i * 97) % viewport.h;
      const len = 30 + (i % 4) * 22;
      const x = ((ambient * 900 + i * 130) % (viewport.w + 200)) - 100;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dir * len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground();
    if (level && run && (mode === 'playing' || mode === 'paused' || mode === 'clear')) {
      const cam = run.cam;
      drawGrid(cam);
      drawTiles(level, cam);
      drawPads(level, cam);
      drawPlatforms(level, cam);
      drawShards(level, cam);
      drawSpeedLines(run.p);
      drawParticles(cam);
      drawPlayer(run.p, cam);
    }
  }

  // ==================================================================
  // ЦИКЛ
  // ==================================================================
  function frame(now) {
    const dt = Math.min(1 / 30, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    ambient += dt;
    if (hintTimer > 0) {
      hintTimer -= dt;
      if (hintTimer <= 0) els.hint.classList.add('is-hidden');
    }
    if (level && run && (mode === 'playing' || mode === 'paused' || mode === 'clear')) {
      updatePlatforms(level, mode === 'playing' ? dt : 0);
      if (mode === 'playing') step(dt);
      // камера
      const target = camTarget();
      const k = mode === 'playing' ? 1 - Math.pow(0.0008, dt) : 1;
      run.cam.x += (target.x - run.cam.x) * k;
      run.cam.y += (target.y - run.cam.y) * k;
      run.shake = Math.max(0, run.shake - dt * 40);
      if (run.shake > 0) {
        run.cam.x += (Math.random() - 0.5) * run.shake;
        run.cam.y += (Math.random() - 0.5) * run.shake;
      }
      for (let i = 0; i < run.particles.length; i++) {
        const q = run.particles[i];
        q.life -= dt;
        q.vy += 700 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
      run.particles = run.particles.filter((q) => q.life > 0);
    }
    render();
    requestAnimationFrame(frame);
  }

  function step(dt) {
    const p = run.p;
    run.time += dt;
    playerUpdate(level, p, dt);
    sfxState.slide = p.sliding;

    if (checkDeath(level)) { killPlayer(); return; }
    checkPickups(level);
    if (checkGoal(level)) { finishLevel(); return; }

    // игрок ушёл за пределы уровня
    const b = box(p);
    if (b.y > level.h * TILE + 120 || b.x < -60 || b.x > level.w * TILE + 60) { killPlayer(); return; }

    updateHud();
  }

  function killPlayer() {
    const p = run.p;
    run.deaths++;
    run.shake = 12;
    burst(p.x + P_W / 2, p.y + p.height / 2, 26, C.red);
    sfxDeath();
    const cx = p.x, cy = p.y;
    p.x = p.checkX; p.y = p.checkY;
    p.vx = 0; p.vy = 0;
    p.sliding = false;
    p.height = P_H;
    p.dashing = 0;
    p.dashCd = 0;
    // короткая пауза после смерти, чтобы увидеть взрыв
    run.deadTimer = 0.16;
    run.deadFrom = { x: cx, y: cy };
    updateHud();
  }

  function finishLevel() {
    if (mode !== 'playing') return;
    mode = 'clear';
    sfxClear();
    const i = levelIndex;
    const prev = recOf(i);
    const isRecord = !prev || run.time < prev.best;
    if (isRecord) {
      profile.levels[i] = {
        best: run.time,
        shards: Math.max(run.shards, prev ? prev.shards : 0),
        deaths: run.deaths,
        clears: (prev ? prev.clears : 0) + 1
      };
    } else {
      profile.levels[i].shards = Math.max(run.shards, prev.shards);
      profile.levels[i].deaths = prev.deaths;
    }
    saveProfile();

    els.clearTime.textContent = fmtTime(run.time);
    els.clearShards.textContent = run.shards + '/' + level.totalShards;
    els.clearDeaths.textContent = String(run.deaths);
    els.clearBest.textContent = prev ? fmtTime(prev.best) : fmtTime(run.time);
    const delta = prev ? run.time - prev.best : 0;
    if (!prev) {
      els.clearDelta.textContent = 'первый проход';
      els.clearDelta.className = '';
    } else {
      const faster = delta < 0;
      els.clearDelta.textContent = (faster ? '−' : '+') + fmtTime(Math.abs(delta));
      els.clearDelta.className = faster ? 'faster' : 'slower';
    }
    els.clearRecord.classList.toggle('is-hidden', !isRecord);
    const nextIdx = i + 1;
    const unlocked = nextIdx < LEVELS.length && !levelUnlocked(nextIdx);
    els.clearUnlock.classList.toggle('is-hidden', !unlocked);
    if (unlocked) els.clearUnlock.textContent = 'ОТКРЫТ УРОВЕНЬ: ' + LEVELS[nextIdx].name;
    els.nextButton.style.display = nextIdx < LEVELS.length ? '' : 'none';
    hideAll();
    els.clearScreen.classList.remove('is-hidden');
    updateProfileUi();
  }

  const fmtTime = (s) => (s < 60
    ? s.toFixed(2)
    : Math.floor(s / 60) + ':' + padStartCompat((s % 60).toFixed(2), 5));

  // ==================================================================
  // HUD
  // ==================================================================
  function updateHud() {
    if (!run) return;
    els.timeValue.textContent = fmtTime(run.time);
    els.shardValue.textContent = run.shards + '/' + level.totalShards;
    els.deathValue.textContent = 'падений ' + run.deaths;
    const rec = recOf(levelIndex);
    els.bestValue.textContent = rec ? 'рекорд ' + fmtTime(rec.best) : 'рекорд —';
    const ready = 1 - Math.min(1, run.p.dashCd / DASH_COOLDOWN);
    els.dashFill.style.transform = 'scaleX(' + ready + ')';
  }

  function updateDashUi() {
    const locked = !profile.dash;
    els.dashWrap.classList.toggle('locked', locked);
    els.dashIcon.textContent = locked ? '×' : '»';
  }

  function flashHud() {
    els.shardValue.style.transform = 'scale(1.25)';
    setTimeout(() => { els.shardValue.style.transform = ''; }, 130);
  }

  function showHint(text, ms) {
    els.hint.textContent = text;
    els.hint.classList.remove('is-hidden');
    hintTimer = (ms || 2600) / 1000;
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('visible'), 1800);
  }

  // ==================================================================
  // ЭКРАНЫ
  // ==================================================================
  function hideAll() {
    [els.menu, els.levelSelect, els.records, els.pauseScreen, els.clearScreen]
      .forEach((s) => s.classList.add('is-hidden'));
  }

  function startLevel(i) {
    levelIndex = i;
    level = parseLevel(LEVELS[i]);
    run = {
      p: makePlayer(level.spawn),
      time: 0, shards: 0, deaths: 0,
      particles: [], cam: { x: 0, y: 0 },
      shake: 0, checkpointTaken: false, checkIndex: '', deadTimer: 0, deadFrom: null
    };
    // камера сразу на игрока, без проскальзывания
    const t = camTarget();
    run.cam.x = t.x; run.cam.y = t.y;
    updatePlatforms(level, 0);
    mode = 'playing';
    hideAll();
    els.hud.classList.remove('is-hidden');
    updateDashUi();
    updateHud();
    // подсказка темы уровня — объясняет, что проверяет этот этаж
    const def = LEVELS[i];
    if (def && def.note) showHint(def.note, 7000);
    else if (i === 0) showHint('A и D — движение, <b>Пробел</b> — прыжок, <b>Shift</b> — скользить', 6000);
  }

  function pauseGame() {
    if (mode !== 'playing') return;
    mode = 'paused';
    els.pauseStats.innerHTML =
      '<div class="pause-stat"><span>ВРЕМЯ</span><b>' + fmtTime(run.time) + '</b></div>' +
      '<div class="pause-stat"><span>ОСКОЛКИ</span><b>' + run.shards + '/' + level.totalShards + '</b></div>' +
      '<div class="pause-stat"><span>ПАДЕНИЙ</span><b>' + run.deaths + '</b></div>' +
      '<div class="pause-stat"><span>УРОВЕНЬ</span><b>' + (levelIndex + 1) + '</b></div>';
    hideAll();
    els.pauseScreen.classList.remove('is-hidden');
  }

  function resumeGame() {
    if (mode !== 'paused') return;
    mode = 'playing';
    hideAll();
  }

  function openLevels(from) {
    listReturn = from || 'menu';
    renderLevelGrid();
    mode = 'levels';
    hideAll();
    els.levelSelect.classList.remove('is-hidden');
  }

  function openRecords(from) {
    listReturn = from || 'menu';
    renderRecords();
    mode = 'records';
    hideAll();
    els.records.classList.remove('is-hidden');
  }

  function renderLevelGrid() {
    const total = LEVELS.length;
    const unlocked = LEVELS.filter((_, i) => levelUnlocked(i)).length;
    els.levelsProgress.textContent = unlocked + '/' + total;
    els.unlockedValue.textContent = String(unlocked);
    els.totalValue.textContent = String(total);
    els.levelGrid.innerHTML = LEVELS.map((lv, i) => {
      const rec = recOf(i);
      const open = levelUnlocked(i);
      return '<article class="level-card' + (open ? '' : ' locked') + (rec ? ' cleared' : '') + '" data-level="' + i + '" title="' + (lv.note || lv.name) + '">' +
        (open ? '' : '<span class="lc-lock">ЗАКРЫТ</span>') +
        '<div class="lc-num">' + padStartCompat(i + 1, 2) + '</div>' +
        '<div class="lc-name">' + lv.name + '</div>' +
        '<div class="lc-meta"><span class="lc-time">' + (rec ? fmtTime(rec.best) : '—') + '</span>' +
        '<span>' + (rec ? rec.shards + '◆' : '◆ ?') + '</span></div>' +
        '</article>';
    }).join('');
  }

  function renderRecords() {
    const rows = [];
    let cleared = 0, shards = 0;
    LEVELS.forEach((lv, i) => {
      const rec = recOf(i);
      if (rec) cleared++;
      shards += rec ? rec.shards : 0;
    });
    LEVELS.forEach((lv, i) => {
      const rec = recOf(i);
      rows.push('<div class="record-row">' +
        '<span class="rr-num">' + padStartCompat(i + 1, 2) + '</span>' +
        '<span class="rr-name">' + lv.name + '</span>' +
        '<span class="rr-time">' + (rec ? fmtTime(rec.best) : '—') + '</span>' +
        '<span class="rr-shards">' + (rec ? rec.shards + '◆' : '') + '</span>' +
        '</div>');
    });
    els.recordList.innerHTML = rows.join('');
    els.recordCount.textContent = String(cleared);
    els.totalShards.textContent = String(shards);
  }

  function updateProfileUi() {
    const cleared = LEVELS.filter((_, i) => recOf(i)).length;
    els.recordCount.textContent = String(cleared);
    const unlocked = LEVELS.filter((_, i) => levelUnlocked(i)).length;
    els.levelsProgress.textContent = unlocked + '/' + LEVELS.length;
  }

  // ==================================================================
  // ВВОД
  // ==================================================================
  function bindInput() {
    const setKey = (code, down) => {
      switch (code) {
        case 'KeyA': case 'ArrowLeft': keys.left = down; break;
        case 'KeyD': case 'ArrowRight': keys.right = down; break;
        case 'Space': case 'KeyW': case 'ArrowUp': case 'KeyZ':
          if (down && !keys.jump) keys.jumpPressed = true;
          keys.jump = down;
          break;
        case 'ShiftLeft': case 'ShiftRight': case 'KeyS': case 'ArrowDown': keys.slide = down; break;
        case 'KeyJ': case 'KeyL': case 'KeyK':
          if (down && !keys.dash) keys.dashPressed = true;
          keys.dash = down;
          break;
        case 'Escape': case 'KeyP': if (down) { if (mode === 'playing') pauseGame(); else if (mode === 'paused') resumeGame(); } break;
        case 'KeyR': if (down && mode === 'playing') startLevel(levelIndex); break;
        default: break;
      }
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      ensureAudio();
      setKey(e.code, true);
    });
    window.addEventListener('keyup', (e) => setKey(e.code, false));
    window.addEventListener('blur', () => {
      keys.left = keys.right = keys.jump = keys.slide = keys.dash = false;
      if (mode === 'playing') pauseGame();
    });

    // сенсор: свайп влево/вправо — движение, вниз — скольжение,
  // быстрый свайп по горизонтали без смещения — рывок, тап — прыжок
    let tStart = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (mode !== 'playing') return;
      ensureAudio();
      tStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!tStart || mode !== 'playing') { tStart = null; return; }
      const dx = e.clientX - tStart.x, dy = e.clientY - tStart.y;
      const dt = performance.now() - tStart.t;
      tStart = null;
      if (Math.hypot(dx, dy) < 22 && dt < 260) {
        touch.jumpPressed = true; touch.jump = true;
        setTimeout(() => { touch.jump = false; }, 90);
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 26) { touch.right = true; setTimeout(() => { touch.right = false; }, 130); }
        else if (dx < -26) { touch.left = true; setTimeout(() => { touch.left = false; }, 130); }
        else { touch.dashPressed = true; touch.dash = true; setTimeout(() => { touch.dash = false; }, 90); }
      } else if (dy < -20) {
        touch.jumpPressed = true; touch.jump = true;
        setTimeout(() => { touch.jump = false; }, 110);
      } else {
        touch.slide = true;
        setTimeout(() => { touch.slide = false; }, 220);
      }
    });
  }

  function bindUi() {
    els.playButton.addEventListener('click', () => {
      ensureAudio();
      // идём на первый непройденный уровень
      let target = 0;
      for (let i = 0; i < LEVELS.length; i++) { if (!recOf(i)) { target = i; break; } target = i; }
      startLevel(Math.min(target, LEVELS.length - 1));
    });
    els.levelsButton.addEventListener('click', () => openLevels('menu'));
    els.recordsButton.addEventListener('click', () => openRecords('menu'));
    els.closeLevelsButton.addEventListener('click', () => { mode = 'menu'; hideAll(); els.menu.classList.remove('is-hidden'); });
    els.levelsBackButton.addEventListener('click', () => { mode = 'menu'; hideAll(); els.menu.classList.remove('is-hidden'); });
    els.closeRecordsButton.addEventListener('click', () => { mode = 'menu'; hideAll(); els.menu.classList.remove('is-hidden'); });
    els.recordsBackButton.addEventListener('click', () => { mode = 'menu'; hideAll(); els.menu.classList.remove('is-hidden'); });
    els.levelGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const i = Number(card.dataset.level);
      if (!levelUnlocked(i)) { showToast('УРОВЕНЬ ЗАКРЫТ'); return; }
      ensureAudio();
      startLevel(i);
    });
    els.pauseButton.addEventListener('click', () => { if (mode === 'playing') pauseGame(); });
    els.resumeButton.addEventListener('click', resumeGame);
    els.retryButton.addEventListener('click', () => startLevel(levelIndex));
    els.pauseLevelsButton.addEventListener('click', () => openLevels('paused'));
    els.nextButton.addEventListener('click', () => { const n = levelIndex + 1; if (n < LEVELS.length) startLevel(n); else openLevels('clear'); });
    els.clearRetryButton.addEventListener('click', () => startLevel(levelIndex));
    els.clearLevelsButton.addEventListener('click', () => openLevels('clear'));
    els.soundButton.addEventListener('click', () => {
      soundOn = !soundOn;
      els.soundButton.classList.toggle('muted', !soundOn);
      if (soundOn) { ensureAudio(); tone(520, 0.08, 'triangle', 0.026, 160); }
    });
  }

  // ==================================================================
  // СТАРТ
  // ==================================================================
  function init() {
    bindInput();
    bindUi();
    resize();
    window.addEventListener('resize', resize);
    updateProfileUi();
    updateDashUi();
    requestAnimationFrame(frame);

    if (/[?&]debug\b/.test(window.location.search)) {
      window.__vector = {
        state: () => (run ? {
          mode, level: levelIndex + 1, x: Math.round(run.p.x), y: Math.round(run.p.y),
          vx: Math.round(run.p.vx), vy: Math.round(run.p.vy),
          onGround: run.p.onGround, sliding: run.p.sliding, height: run.p.height,
          time: +run.time.toFixed(2), shards: run.shards + '/' + (level ? level.totalShards : 0),
          deaths: run.deaths, dash: profile.dash
        } : { mode }),
        levelInfo: (i) => {
          const lv = parseLevel(LEVELS[i]);
          return { name: lv.name, w: lv.w, h: lv.h, shards: lv.totalShards, spawn: lv.spawn, goal: lv.goal, platforms: lv.platforms.length, pads: lv.pads.length };
        },
        start: (i) => startLevel(i || 0),
        kill: () => killPlayer(),
        setPos: (x, y) => { run.p.x = x; run.p.y = y; run.p.vx = 0; run.p.vy = 0; },
        // ровная площадка без опасностей: на ней удобно мерить физику,
        // потому что игрок не убегает в пропасть и не умирает
        flat: () => {
          const w = 60, h = 20;
          const grid = new Uint8Array(w * h).fill(T.WALL);
          for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) grid[y * w + x] = T.EMPTY;
          const lv = {
            name: 'ПЛОЩАДКА', w, h, grid,
            shards: [], platforms: [], pads: [], spawn: { x: 2, y: h - 2 },
            goal: { x: w - 3, y: h - 2 }, totalShards: 0
          };
          level = lv;
          run = {
            p: makePlayer(lv.spawn),
            time: 0, shards: 0, deaths: 0,
            particles: [], cam: { x: 0, y: 0 },
            shake: 0, checkpointTaken: false, checkIndex: '', deadTimer: 0, deadFrom: null
          };
          updatePlatforms(lv, 0);
          const t = camTarget();
          run.cam.x = t.x; run.cam.y = t.y;
          mode = 'playing';
          hideAll();
          els.hud.classList.remove('is-hidden');
          updateDashUi();
          updateHud();
          return { w, h, spawn: lv.spawn };
        },
        // перенос без обнуления скорости — для замеров
        moveTo: (x, y) => { if (y === undefined) run.p.x = x; else { run.p.x = x; run.p.y = y; } },
        profile: () => profile,
        physics: {
          TILE, GRAVITY, JUMP_V, MAX_RUN, ACCEL_GROUND, ACCEL_AIR,
          FRICTION_GROUND, FRICTION_SLIDE, SLIDE_BOOST, SLIDE_MIN_SPEED,
          DASH_SPEED, DASH_TIME, DASH_COOLDOWN, P_W, P_H, P_H_SLIDE,
          COYOTE, JUMP_BUFFER, WALL_JUMP_VX, WALL_JUMP_VY, WALL_SLIDE_SPEED, BOUNCE_V
        }
      };
    }
  }

  init();
})();
