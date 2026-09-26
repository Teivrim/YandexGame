(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), hpFill: $('hpFill'), hpText: $('hpText'), xpFill: $('xpFill'), xpText: $('xpText'),
    floorValue: $('floorValue'), scoreValue: $('scoreValue'), metaValue: $('metaValue'),
    logPanel: $('logPanel'), weaponName: $('weaponName'), armorName: $('armorName'),
    trinketName: $('trinketName'), abilityStrip: $('abilityStrip'), prompt: $('prompt'),
    menu: $('menu'), playButton: $('playButton'), arsenalButton: $('arsenalButton'),
    menuMetaValue: $('menuMetaValue'), bestValue: $('bestValue'),
    classScreen: $('classScreen'), classList: $('classList'), classBackButton: $('classBackButton'),
    arsenal: $('arsenal'), arsenalGrid: $('arsenalGrid'), arsenalMetaValue: $('arsenalMetaValue'),
    closeArsenalButton: $('closeArsenalButton'), runCountValue: $('runCountValue'), winCountValue: $('winCountValue'),
    inventory: $('inventory'), closeInventoryButton: $('closeInventoryButton'),
    backpackList: $('backpackList'), inventoryStats: $('inventoryStats'),
    slotWeapon: $('slotWeapon'), slotArmor: $('slotArmor'), slotTrinket: $('slotTrinket'),
    pauseScreen: $('pauseScreen'), pauseStats: $('pauseStats'), resumeButton: $('resumeButton'),
    pauseInventoryButton: $('pauseInventoryButton'), quitButton: $('quitButton'),
    deathScreen: $('deathScreen'), deathFloor: $('deathFloor'), deathCause: $('deathCause'),
    deathKills: $('deathKills'), deathLevel: $('deathLevel'), deathCrystals: $('deathCrystals'),
    newRecord: $('newRecord'), retryButton: $('retryButton'),
    deathArsenalButton: $('deathArsenalButton'), deathMenuButton: $('deathMenuButton'),
    winScreen: $('winScreen'), winCrystals: $('winCrystals'), winKills: $('winKills'),
    winLevel: $('winLevel'), winRetryButton: $('winRetryButton'),
    winArsenalButton: $('winArsenalButton'), winMenuButton: $('winMenuButton'),
    soundButton: $('soundButton'), menuButton: $('menuButton'), toast: $('toast')
  };

  // ================= константы =================
  const TILE = 40;
  const MAP_W = 48;
  const MAP_H = 34;
  const MAX_FLOORS = 10;
  const FOV_RADIUS = 8;
  const VIEW_RADIUS = 7;
  const TAU = Math.PI * 2;

  const FLOOR_TILE = 0;
  const WALL_TILE = 1;
  const DOOR_TILE = 2;
  const STAIRS_TILE = 3;

  const COLORS = {
    cyan: '#63e7ff', cyanBright: '#b5f7ff', pink: '#ff4fbd', orange: '#ffb44f',
    green: '#62f6bd', violet: '#9d7bff', red: '#ff5f6d', muted: '#8491b4',
    white: '#eff9ff', amber: '#ffd166'
  };

  const RARITY = [
    { name: 'обычное', color: '#8491b4', mult: 1.0 },
    { name: 'необычное', color: '#63e7ff', mult: 1.35 },
    { name: 'редкое', color: '#ffb44f', mult: 1.75 },
    { name: 'эпическое', color: '#ff4fbd', mult: 2.3 }
  ];

  const DIRS = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
    { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
  ];

  const CLASSES = {
    scout: {
      id: 'scout', name: 'Разведчик', glyph: '◤', role: 'МОБИЛЬНОСТЬ',
      desc: 'Быстрый и живучий. Уходит из боя быстрее, чем враги успевают ударить. Критический урон.',
      hp: 18, atk: 5, def: 1, crit: 0.18,
      ability: { key: 'q', name: 'рывок', glyph: '»', cost: 2, desc: 'Рывок на 4 клетки, неуязвимость на ход' },
      locked: false
    },
    juggernaut: {
      id: 'juggernaut', name: 'Тяжеловес', glyph: '▣', role: 'ТАНК',
      desc: 'Медленный, но держит удар. Разрубает врагов вблизи и оглушает всех рядом.',
      hp: 28, atk: 7, def: 3, crit: 0.05,
      ability: { key: 'q', name: 'расшиб', glyph: '✦', cost: 3, desc: 'Удар по всем врагам в радиусе 1' },
      locked: 'jugg'
    },
    technician: {
      id: 'technician', name: 'Техник', glyph: '◉', role: 'ДАЛЬНИЙ БОЙ',
      desc: 'Стреляет импульсами на расстоянии. Импульс пробивает броню и бьёт через препятствия.',
      hp: 20, atk: 6, def: 1, crit: 0.1,
      ability: { key: 'q', name: 'импульс', glyph: '⌁', cost: 2, desc: 'Выстрел на 6 клеток, игнорирует броню' },
      locked: 'tech'
    }
  };

  const ENEMY_TYPES = {
    grinder:  { name: 'Гриндер', hp: 12,  atk: 4,  def: 0, glyph: '☗', color: COLORS.pink,   speed: 0.85, range: 1, xp: 6,  ai: 'melee' },
    scoutbot: { name: 'Сканер',  hp: 9,   atk: 5,  def: 0, glyph: '☻', color: COLORS.cyan,   speed: 1.25, range: 5, xp: 8,  ai: 'ranged' },
    brute:    { name: 'Глыба',   hp: 26,  atk: 7,  def: 3, glyph: '⬟', color: COLORS.orange, speed: 0.6,  range: 1, xp: 16, ai: 'melee' },
    toxic:    { name: 'Токсин',  hp: 14,  atk: 3,  def: 1, glyph: '✹', color: COLORS.green,  speed: 0.95, range: 1, xp: 11, ai: 'melee', poison: 3 },
    bomber:   { name: 'Заряд',   hp: 10,  atk: 9,  def: 0, glyph: '✸', color: COLORS.red,    speed: 1.05, range: 1, xp: 9,  ai: 'melee', explode: 3 },
    warden:   { name: 'Страж',   hp: 40,  atk: 9,  def: 4, glyph: '✜', color: COLORS.violet, speed: 0.75, range: 1, xp: 34, ai: 'melee', boss: true }
  };

  const META_UPGRADES = {
    vitality: { name: 'Живучесть', icon: '❤', max: 5, costs: [40, 90, 180, 320, 520], desc: 'Плюс 3 к максимальному здоровью' },
    edge:     { name: 'Заточка',   icon: '✦', max: 5, costs: [45, 100, 200, 350, 560], desc: 'Плюс 1 к урону' },
    grace:    { name: 'Броня',     icon: '▣', max: 5, costs: [45, 100, 200, 350, 560], desc: 'Плюс 1 к защите' },
    greed:    { name: 'Жадность',  icon: '◈', max: 5, costs: [50, 110, 220, 380, 600], desc: 'Плюс 12 процентов кристаллов за спуск' },
    scout:    { name: 'Разведчик', icon: '◤', max: 1, costs: [0],   desc: 'Открывает класс Разведчик' },
    jugg:     { name: 'Тяжеловес', icon: '▣', max: 1, costs: [300], desc: 'Открывает класс Тяжеловес' },
    tech:     { name: 'Техник',    icon: '◉', max: 1, costs: [450], desc: 'Открывает класс Техник' }
  };

  const WEAPONS = [
    { name: 'Кулаки', glyph: '✊', dmg: 0, range: 1, ranged: false, rarity: 0 },
    { name: 'Трещотка', glyph: '⌁', dmg: 3, range: 4, ranged: true, rarity: 0 },
    { name: 'Пистолет', glyph: '▤', dmg: 5, range: 6, ranged: true, rarity: 1 },
    { name: 'Плазменный резак', glyph: '⌇', dmg: 8, range: 5, ranged: true, rarity: 2 },
    { name: 'Молот', glyph: '⬢', dmg: 9, range: 1, ranged: false, rarity: 2 },
    { name: 'Рельсотрон', glyph: '▥', dmg: 16, range: 8, ranged: true, rarity: 3 },
    { name: 'Тяжёлый блок', glyph: '◼', dmg: 13, range: 1, ranged: false, rarity: 3 }
  ];
  const ARMORS = [
    { name: 'Плащ', glyph: '◇', def: 1, rarity: 0 },
    { name: 'Куртка', glyph: '▣', def: 2, rarity: 1 },
    { name: 'Пластик', glyph: '◰', def: 3, rarity: 2 },
    { name: 'Экзоскелет', glyph: '⬢', def: 5, rarity: 3 }
  ];
  const TRINKETS = [
    { name: 'Реактор', glyph: '◎', desc: 'Плюс 15 процентов урона', dmgMul: 0.15, rarity: 1 },
    { name: 'Фильтр', glyph: '❖', desc: 'Плюс 15 процентов защиты', defMul: 0.15, rarity: 1 },
    { name: 'Сердце', glyph: '♥', desc: 'Плюс 8 к здоровью', hp: 8, rarity: 2 },
    { name: 'Компас', glyph: '✧', desc: 'Плюс 1 кристалл за этаж', crystal: 1, rarity: 2 },
    { name: 'Клинок', glyph: '✦', desc: 'Плюс 10 процентов скорости', speed: 0.1, rarity: 3 }
  ];
  const POTIONS = [
    { name: 'Аптечка', glyph: '✚', heal: 12, rarity: 0 },
    { name: 'Бодрость', glyph: '✸', heal: 30, rarity: 2 }
  ];

  const STORAGE_KEY = 'neon-descent-profile-v1';
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ================= состояние =================
  let viewport = { w: 800, h: 600 };
  let dpr = 1;
  let lastFrame = performance.now();
  let ambient = 0;
  let toastTimer = 0;
  let soundOn = true;
  let profile = loadProfile();
  let run = null;
  let uiMode = 'menu';
  let arsenalReturn = 'menu';
  let inventoryWasPlaying = false;
  const audio = { ctx: null, master: null };

  // ================= генератор случайных чисел =================
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rng = makeRng(1);
  const rand = () => rng();
  const randInt = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  // ================= профиль =================
  function loadProfile() {
    const base = { crystals: 0, upgrades: {}, bestFloor: 0, runs: 0, wins: 0 };
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return base;
    const up = {};
    Object.keys(META_UPGRADES).forEach((id) => {
      const max = META_UPGRADES[id].max;
      const v = Math.floor(Number(raw.upgrades ? raw.upgrades[id] : 0));
      up[id] = isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
    });
    return {
      crystals: Math.max(0, Math.floor(Number(raw.crystals) || 0)),
      upgrades: up,
      bestFloor: Math.max(0, Math.floor(Number(raw.bestFloor) || 0)),
      runs: Math.max(0, Math.floor(Number(raw.runs) || 0)),
      wins: Math.max(0, Math.floor(Number(raw.wins) || 0))
    };
  }

  function saveProfile() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) { /* приватный режим */ }
  }

  const meta = (id) => profile.upgrades[id] || 0;
  const classUnlocked = (id) => !CLASSES[id].locked || meta(CLASSES[id].locked) > 0;

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('visible'), 1900);
  }

  // ================= звук =================
  function ensureAudio() {
    if (!soundOn) return;
    if (!audio.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      try {
        audio.ctx = new C();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = 0.5;
        audio.master.connect(audio.ctx.destination);
      } catch (e) { audio.ctx = null; audio.master = null; }
    }
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slide) {
    if (!soundOn || !audio.ctx || !audio.master) return;
    const now = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(Math.max(30, freq), now);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + (slide || 0)), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol || 0.03), now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(audio.master);
    o.start(now); o.stop(now + dur + 0.02);
  }

  const sfxHit = () => tone(180, 0.07, 'square', 0.028, -70);
  const sfxHurt = () => tone(120, 0.16, 'sawtooth', 0.04, -50);
  const sfxKill = () => tone(320, 0.1, 'triangle', 0.03, 180);
  const sfxPick = () => tone(620, 0.08, 'triangle', 0.03, 220);
  const sfxLevel = () => tone(440, 0.22, 'triangle', 0.04, 420);
  const sfxStairs = () => tone(200, 0.3, 'sine', 0.045, 500);

  // ================= подземелье =================
  function carve(grid, x, y) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const px = x + i, py = y + j;
        if (px > 0 && py > 0 && px < MAP_W - 1 && py < MAP_H - 1 && grid[py * MAP_W + px] === WALL_TILE) {
          grid[py * MAP_W + px] = FLOOR_TILE;
        }
      }
    }
  }

  function makeFloor(level) {
    const grid = new Uint8Array(MAP_W * MAP_H).fill(WALL_TILE);
    const rooms = [];
    for (let i = 0; i < 220 && rooms.length < (level === MAX_FLOORS ? 10 : 16); i++) {
      const w = randInt(5, 11);
      const h = randInt(4, 8);
      const x = randInt(1, MAP_W - w - 2);
      const y = randInt(1, MAP_H - h - 2);
      const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
      const clash = rooms.some((r) => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y);
      if (!clash) rooms.push(room);
    }
    if (!rooms.length) rooms.push({ x: 4, y: 4, w: 10, h: 8, cx: 9, cy: 8 });

    rooms.forEach((r) => {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) grid[y * MAP_W + x] = FLOOR_TILE;
        }
      }
    });

    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i];
      let x = a.cx, y = a.cy;
      while (x !== b.cx) { carve(grid, x, y); x += b.cx > x ? 1 : -1; }
      while (y !== b.cy) { carve(grid, x, y); y += b.cy > y ? 1 : -1; }
      carve(grid, b.cx, b.cy);
    }

    const doorCount = Math.min(6, rooms.length - 1);
    for (let i = 0; i < doorCount; i++) {
      const r = rooms[randInt(1, rooms.length - 1)];
      if (!r) break;
      const side = randInt(0, 3);
      let dx = 0, dy = 0;
      if (side === 0) { dx = randInt(0, r.w - 1); dy = -1; }
      else if (side === 1) { dx = randInt(0, r.w - 1); dy = r.h; }
      else if (side === 2) { dx = -1; dy = randInt(0, r.h - 1); }
      else { dx = r.w; dy = randInt(0, r.h - 1); }
      const px = r.x + dx, py = r.y + dy;
      if (px > 0 && py > 0 && px < MAP_W - 1 && py < MAP_H - 1 && grid[py * MAP_W + px] === WALL_TILE) {
        const ox = px + (dx === 0 ? 0 : (dx < 0 ? 1 : -1));
        const oy = py + (dy === 0 ? 0 : (dy < 0 ? 1 : -1));
        if (ox > 0 && oy > 0 && ox < MAP_W - 1 && oy < MAP_H - 1 && grid[oy * MAP_W + ox] === FLOOR_TILE) {
          grid[py * MAP_W + px] = DOOR_TILE;
        }
      }
    }

    const floor = {
      level, grid, rooms,
      seen: new Uint8Array(MAP_W * MAP_H),
      visible: new Uint8Array(MAP_W * MAP_H),
      items: [], enemies: [], dist: new Int32Array(MAP_W * MAP_H)
    };

    const start = rooms[0];
    const target = rooms[rooms.length - 1];
    floor.startX = start.cx; floor.startY = start.cy;
    floor.exitX = target.cx; floor.exitY = target.cy;
    grid[floor.exitY * MAP_W + floor.exitX] = STAIRS_TILE;

    if (level === MAX_FLOORS) {
      floor.bossRoom = target;
      addEnemy(floor, 'warden', target.cx, target.cy - 1);
    } else {
      populate(floor, level, start, target);
    }
    addItems(floor, level);
    return floor;
  }

  function freeSpot(floor, nearX, nearY, minDist, maxDist, occupied) {
    for (let tries = 0; tries < 260; tries++) {
      const x = randInt(2, MAP_W - 3);
      const y = randInt(2, MAP_H - 3);
      if (floor.grid[y * MAP_W + x] !== FLOOR_TILE) continue;
      const d = Math.hypot(x - nearX, y - nearY);
      if (d < minDist || d > maxDist) continue;
      if (occupied && occupied.some((e) => e.x === x && e.y === y)) continue;
      return { x, y };
    }
    for (let tries = 0; tries < 400; tries++) {
      const x = randInt(2, MAP_W - 3);
      const y = randInt(2, MAP_H - 3);
      if (floor.grid[y * MAP_W + x] === FLOOR_TILE) return { x, y };
    }
    return { x: nearX, y: nearY };
  }

  function populate(floor, level, start, target) {
    const budget = 3 + level * 1.7;
    const pool = ['grinder'];
    if (level >= 2) pool.push('scoutbot');
    if (level >= 3) pool.push('bomber');
    if (level >= 4) pool.push('toxic');
    if (level >= 5) pool.push('brute');
    let spent = 0, guard = 0;
    while (spent < budget && guard++ < 200) {
      const type = pick(pool);
      const near = rand() < 0.7 ? target : start;
      const spot = freeSpot(floor, near.cx, near.cy, 4, 18, floor.enemies);
      addEnemy(floor, type, spot.x, spot.y);
      spent += 1 + level * 0.12;
    }
  }

  function addEnemy(floor, type, x, y) {
    const kind = ENEMY_TYPES[type];
    const scale = 1 + (floor.level - 1) * 0.22;
    const hp = Math.round(kind.hp * scale);
    floor.enemies.push({
      type, kind, x, y, hp, maxHp: hp,
      // def — это ЧИСЛО брони, описание типа лежит в kind
      def: kind.def,
      atk: Math.round(kind.atk * (1 + (floor.level - 1) * 0.16)),
      glyph: kind.glyph, color: kind.color,
      speed: kind.speed, range: kind.range, ai: kind.ai, xp: kind.xp,
      boss: !!kind.boss, alive: true,
      hitFlash: 0, poison: 0, poisonClock: 0
    });
  }

  // ================= предметы =================
  function rollRarity(depth) {
    const r = rand();
    const bias = Math.min(0.55, depth * 0.05);
    if (r < bias * 0.35) return 3;
    if (r < bias * 0.75) return 2;
    if (r < bias + 0.22) return 1;
    return 0;
  }

  function makeItem(kind, rarity, depth) {
    const mult = RARITY[rarity].mult;
    if (kind === 'weapon') {
      const pool = WEAPONS.filter((w) => w.rarity <= rarity && w.rarity >= Math.max(0, rarity - 1));
      const tpl = pool.length ? pool[Math.floor(rand() * pool.length)] : WEAPONS[0];
      const total = tpl.dmg + depth * 0.5;
      const dmg = Math.round(total * (tpl.dmg ? mult : 1));
      return { kind, glyph: tpl.glyph, name: tpl.name, rarity, dmg, range: tpl.range, ranged: tpl.ranged, desc: dmg ? 'урон ' + dmg : 'ближний бой' };
    }
    if (kind === 'armor') {
      const pool = ARMORS.filter((a) => a.rarity <= rarity);
      const tpl = pool.length ? pool[Math.floor(rand() * pool.length)] : ARMORS[0];
      const def = Math.round(tpl.def * (1 + depth * 0.06) * (1 + (rarity - tpl.rarity) * 0.15));
      return { kind, glyph: tpl.glyph, name: tpl.name, rarity, def, desc: 'защита ' + def };
    }
    if (kind === 'trinket') {
      const pool = TRINKETS.filter((t) => t.rarity <= rarity + 1);
      const tpl = pool[Math.floor(rand() * pool.length)];
      return Object.assign({ kind, glyph: tpl.glyph, name: tpl.name, rarity }, tpl);
    }
    const tpl = POTIONS[Math.floor(rand() * POTIONS.length)];
    return { kind: 'potion', glyph: tpl.glyph, name: tpl.name, rarity, heal: tpl.heal, desc: 'восстанавливает ' + tpl.heal + ' HP' };
  }

  function addItems(floor, level) {
    const count = 3 + Math.floor(level * 0.7);
    for (let i = 0; i < count; i++) {
      const spot = freeSpot(floor, floor.startX, floor.startY, 3, 999, floor.enemies);
      const r = rollRarity(level);
      const roll = rand();
      let kind = 'weapon';
      if (roll > 0.82) kind = 'potion';
      else if (roll > 0.62) kind = 'trinket';
      else if (roll > 0.34) kind = 'armor';
      floor.items.push(Object.assign(makeItem(kind, r, level), { x: spot.x, y: spot.y }));
    }
  }

  // ================= игрок =================
  function makePlayer(classId) {
    const c = CLASSES[classId];
    const maxHp = c.hp + meta('vitality') * 3 + (c.hp + meta('vitality') * 3 && 0);
    return {
      x: 0, y: 0, maxHp, hp: maxHp,
      atk: c.atk + meta('edge'),
      def: c.def + meta('grace'),
      crit: c.crit, speed: c.speed, classId,
      level: 1, xp: 0, xpNext: 18,
      weapon: { kind: 'weapon', name: 'Кулаки', glyph: '✊', dmg: 0, range: 1, ranged: false, rarity: 0, desc: 'ближний бой' },
      armor: null, trinket: null, bag: [],
      charges: c.ability.cost, maxCharges: c.ability.cost,
      invuln: 0, hitFlash: 0
    };
  }

  function totalDef(p) {
    let d = p.def + (p.armor ? p.armor.def : 0);
    if (p.trinket && p.trinket.defMul) d *= 1 + p.trinket.defMul;
    return d;
  }

  function playerDmgBonus(p) {
    return 1 + (p.trinket && p.trinket.dmgMul ? p.trinket.dmgMul : 0);
  }

  // ================= обзор =================
  function isBlocking(t) { return t === WALL_TILE; }

  function losClear(floor, x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0, guard = 0;
    while (guard++ < 200) {
      if (x === x1 && y === y1) return true;
      if (!(x === x0 && y === y0) && x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && isBlocking(floor.grid[y * MAP_W + x])) return false;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    }
    return false;
  }

  function computeFov(floor, px, py, radius) {
    floor.visible.fill(0);
    for (let y = py - radius; y <= py + radius; y++) {
      for (let x = px - radius; x <= px + radius; x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        if (Math.hypot(x - px, y - py) > radius) continue;
        if (losClear(floor, px, py, x, y)) {
          floor.visible[y * MAP_W + x] = 1;
          floor.seen[y * MAP_W + x] = 1;
        }
      }
    }
    floor.visible[py * MAP_W + px] = 1;
    floor.seen[py * MAP_W + px] = 1;
  }

  // Расстояние от произвольной точки: используется врагами и автопилотом.
  function bfsFrom(floor, sx, sy) {
    const d = new Int32Array(MAP_W * MAP_H).fill(-1);
    if (sx < 0 || sy < 0 || sx >= MAP_W || sy >= MAP_H) return d;
    const start = sy * MAP_W + sx;
    d[start] = 0;
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
      for (let i = 0; i < DIRS.length; i++) {
        const nx = cx + DIRS[i].x, ny = cy + DIRS[i].y;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const ni = ny * MAP_W + nx;
        if (d[ni] !== -1 || isBlocking(floor.grid[ni])) continue;
        d[ni] = d[cur] + 1;
        queue.push(ni);
      }
    }
    return d;
  }

  function computeDist(floor) {
    floor.dist = bfsFrom(floor, run.player.x, run.player.y);
  }

  function distTo(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 9999;
    const d = run.floor.dist[y * MAP_W + x];
    return d === -1 ? 9999 : d;
  }

  // ================= журнал =================
  function log(text, kind) {
    const line = document.createElement('div');
    line.className = 'log-line' + (kind ? ' ' + kind : '');
    line.textContent = text;
    els.logPanel.appendChild(line);
    while (els.logPanel.children.length > 7) els.logPanel.removeChild(els.logPanel.firstChild);
    setTimeout(() => line.classList.add('fade'), 4200);
  }

  // ================= бой =================
  function addFloat(tx, ty, text, color) {
    if (run.floats.length > 40) run.floats.shift();
    run.floats.push({ x: tx, y: ty, text, color, life: 0.9, maxLife: 0.9 });
  }

  function damagePlayer(amount, source) {
    const p = run.player;
    if (run.god) return 0;
    if (p.invuln > 0) return 0;
    const dealt = Math.max(1, amount - totalDef(p));
    p.hp -= dealt;
    p.hitFlash = 0.2;
    p.invuln = 0.45;
    run.shake = Math.max(run.shake, 7);
    sfxHurt();
    addFloat(p.x, p.y, '-' + dealt, COLORS.red);
    log('Получено ' + dealt + ' урона' + (source ? ' от ' + source : ''), 'bad');
    if (p.hp <= 0) { p.hp = 0; endRun(false, source || 'неизвестно'); }
    return dealt;
  }

  function attackPlayerTarget(target) {
    const p = run.player;
    if (target === p) return;
    // invuln — это защита САМОГО игрока от повторного урона,
    // собственные удары он глушить не должен
    let dmg = p.atk + (p.weapon ? p.weapon.dmg : 0);
    dmg = Math.round(dmg * playerDmgBonus(p));
    const crit = rand() < p.crit;
    if (crit) dmg = Math.round(dmg * 1.9);
    addFloat(target.x, target.y, (crit ? dmg + '!' : String(dmg)), crit ? COLORS.orange : COLORS.white);
    const dealt = Math.max(1, dmg - (target.def || 0));
    target.hp -= dealt;
    target.hitFlash = 0.15;
    sfxHit();
    if (target.hp <= 0) killEnemy(target);
  }

  function shootAt(target) {
    const p = run.player;
    let dmg = p.atk + (p.weapon ? p.weapon.dmg : 0);
    dmg = Math.round(dmg * playerDmgBonus(p));
    if (rand() < p.crit) dmg = Math.round(dmg * 1.9);
    addFloat(target.x, target.y, String(dmg), COLORS.cyanBright);
    target.hp -= Math.max(1, dmg - (target.def || 0));
    target.hitFlash = 0.15;
    run.shots.push({ x0: p.x, y0: p.y, x1: target.x, y1: target.y, life: 0.18, maxLife: 0.18 });
    tone(700, 0.05, 'square', 0.02, -300);
    if (target.hp <= 0) killEnemy(target);
  }

  function killEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    run.kills += 1;
    run.score += e.xp * 2;
    run.crystals += 1 + Math.floor((run.floorIndex + 1) / 4) + (e.boss ? 12 : 0);
    gainXp(e.xp);
    sfxKill();
    run.shake = Math.max(run.shake, 4);
    addFloat(e.x, e.y, '+' + e.xp, COLORS.green);
    if (e.kind.explode) {
      for (const other of run.floor.enemies) {
        if (other === e || !other.alive) continue;
        if (Math.hypot(other.x - e.x, other.y - e.y) <= e.kind.explode) {
          other.hp -= e.kind.atk;
          addFloat(other.x, other.y, String(e.kind.atk), COLORS.red);
          if (other.hp <= 0) killEnemy(other);
        }
      }
      run.shake = Math.max(run.shake, 10);
      tone(90, 0.3, 'sawtooth', 0.05, -30);
    }
  }

  function gainXp(amount) {
    const p = run.player;
    p.xp += amount;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext = Math.round(p.xpNext * 1.28);
      const heal = Math.round(p.maxHp * 0.18) + 2;
      p.maxHp += 3;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      p.atk += 1;
      p.charges = p.maxCharges;
      sfxLevel();
      log('Уровень ' + p.level + '! Плюс ' + heal + ' HP, плюс 1 урон', 'good');
    }
  }

  // ================= ход =================
  function enemyAt(x, y) {
    for (const e of run.floor.enemies) if (e.alive && e.x === x && e.y === y) return e;
    return null;
  }

  function itemAt(x, y) {
    return run.floor.items.find((it) => it.x === x && it.y === y);
  }

  function tryMove(dx, dy) {
    const p = run.player;
    const nx = p.x + dx, ny = p.y + dy;
    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return false;
    const enemy = enemyAt(nx, ny);
    if (enemy) {
      if (p.weapon && p.weapon.ranged) shootAt(enemy);
      else attackPlayerTarget(enemy);
      return true;
    }
    if (isBlocking(run.floor.grid[ny * MAP_W + nx])) return false;
    p.x = nx; p.y = ny;
    if (run.floor.grid[ny * MAP_W + nx] === STAIRS_TILE) {
      if (run.floor.level >= MAX_FLOORS && bossAlive()) showPrompt('Страж ещё жив — лестница заперта');
      else showPrompt('Нажми E чтобы спуститься');
    }
    checkPickup();
    return true;
  }

  function tryAttack() {
    const p = run.player;
    for (let i = 0; i < DIRS.length; i++) {
      const e = enemyAt(p.x + DIRS[i].x, p.y + DIRS[i].y);
      if (e) {
        if (p.weapon && p.weapon.ranged) shootAt(e);
        else attackPlayerTarget(e);
        return true;
      }
    }
    return false;
  }

  function checkPickup() {
    const p = run.player;
    const it = itemAt(p.x, p.y);
    if (!it) return;
    run.floor.items = run.floor.items.filter((i) => i !== it);
    if (it.kind === 'potion') {
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + it.heal);
      const got = p.hp - before;
      log(it.name + ': плюс ' + got + ' HP', 'loot');
      addFloat(p.x, p.y, '+' + got, COLORS.green);
    } else {
      p.bag.push(it);
      log('Найдено: ' + it.name + (it.desc ? ' (' + it.desc + ')' : ''), 'loot');
    }
    sfxPick();
    run.score += 5;
  }

  function bossAlive() {
    return run.floor.enemies.some((e) => e.alive && e.boss);
  }

  function descend() {
    sfxStairs();
    if (run.player.x !== run.floor.exitX || run.player.y !== run.floor.exitY) return;
    // на последнем этаже лестница заперта, пока жив страж
    if (run.floor.level >= MAX_FLOORS) {
      if (bossAlive()) {
        showPrompt('Страж ещё жив — лестница заперта');
        log('Лестница заперта: страж держит ядро.', 'bad');
        tone(140, 0.2, 'square', 0.03, -40);
        return;
      }
      endRun(true);
      return;
    }
    run.floorIndex += 1;
    buildFloor();
  }

  // ================= способность =================
  function useAbility() {
    const p = run.player;
    if (p.charges <= 0) { showToast('НЕТ ЗАРЯДА'); return; }
    const name = CLASSES[p.classId].ability.name;
    p.charges -= 1;

    if (name === 'рывок') {
      const order = DIRS.slice().sort((a, b) => distTo(p.x + b.x, p.y + b.y) - distTo(p.x + a.x, p.y + a.y));
      for (let i = 0; i < order.length; i++) {
        const d = order[i];
        let moved = 0;
        for (let s = 0; s < 4; s++) {
          const nx = p.x + d.x, ny = p.y + d.y;
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) break;
          if (isBlocking(run.floor.grid[ny * MAP_W + nx])) break;
          if (enemyAt(nx, ny)) break;
          p.x = nx; p.y = ny; moved += 1;
        }
        if (moved > 0) {
          p.invuln = Math.max(p.invuln, 1);
          log('Рывок: ' + moved + ' клетки, неуязвимость', 'good');
          tone(500, 0.14, 'triangle', 0.035, 300);
          checkPickup();
          break;
        }
      }
    } else if (name === 'расшиб') {
      let hits = 0;
      for (const e of run.floor.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= 1.6) {
          const dmg = Math.round((p.atk + 4) * 1.4);
          e.hp -= dmg;
          addFloat(e.x, e.y, String(dmg), COLORS.orange);
          hits += 1;
          if (e.hp <= 0) killEnemy(e);
        }
      }
      run.shake = Math.max(run.shake, 12);
      log('Расшиб! Затронуто врагов: ' + hits, 'good');
      tone(120, 0.3, 'sawtooth', 0.05, -40);
    } else if (name === 'импульс') {
      let best = null, bestD = 6.5;
      for (const e of run.floor.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < bestD && losClear(run.floor, p.x, p.y, e.x, e.y)) { bestD = d; best = e; }
      }
      if (best) {
        const dmg = Math.round((p.atk + 7) * 1.2);
        best.hp -= dmg; // импульс игнорирует броню
        best.hitFlash = 0.2;
        addFloat(best.x, best.y, String(dmg), COLORS.cyanBright);
        run.shots.push({ x0: p.x, y0: p.y, x1: best.x, y1: best.y, life: 0.2, maxLife: 0.2 });
        log('Импульс: ' + dmg + ' урона, броня пробита', 'good');
        tone(900, 0.12, 'sawtooth', 0.04, -500);
        if (best.hp <= 0) killEnemy(best);
      } else {
        log('Импульс: нет цели', 'bad');
      }
    }
  }

  // ================= ход врагов =================
  function stepToward(e) {
    const here = distTo(e.x, e.y);
    let best = null, bestD = here;
    for (let i = 0; i < DIRS.length; i++) {
      const nx = e.x + DIRS[i].x, ny = e.y + DIRS[i].y;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (isBlocking(run.floor.grid[ny * MAP_W + nx])) continue;
      if (run.player.x === nx && run.player.y === ny) continue;
      if (enemyAt(nx, ny)) continue;
      const d = distTo(nx, ny);
      if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
    }
    if (best) { e.x = best.x; e.y = best.y; }
  }

  function stepAway(e) {
    const p = run.player;
    let best = null, bestD = 0;
    for (let i = 0; i < DIRS.length; i++) {
      const nx = e.x + DIRS[i].x, ny = e.y + DIRS[i].y;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (isBlocking(run.floor.grid[ny * MAP_W + nx])) continue;
      if (enemyAt(nx, ny)) continue;
      if (p.x === nx && p.y === ny) continue;
      const d = Math.hypot(nx - p.x, ny - p.y);
      if (d > bestD) { bestD = d; best = { x: nx, y: ny }; }
    }
    if (best) { e.x = best.x; e.y = best.y; }
  }

  function enemyTurn() {
    const p = run.player;
    for (const e of run.floor.enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash -= 1;
      if (e.poison > 0) {
        e.poisonClock += 1;
        if (e.poisonClock >= 2) {
          e.poisonClock = 0;
          e.hp -= e.poison;
          addFloat(e.x, e.y, '-' + e.poison, COLORS.green);
          if (e.hp <= 0) { killEnemy(e); continue; }
        }
      }
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (e.ai === 'ranged') {
        if (d <= e.range && losClear(run.floor, e.x, e.y, p.x, p.y)) damagePlayer(e.atk, e.kind.name);
        else stepToward(e);
      } else {
        if (d <= e.range + 0.5) damagePlayer(e.atk, e.kind.name);
        else stepToward(e);
      }
      if (e.kind.poison && d <= 1.5 && p.hp > 0) {
        run.poisonPlayer = Math.max(run.poisonPlayer, e.kind.poison);
      }
    }
    if (run.poisonPlayer > 0 && p.hp > 0) {
      run.poisonTick += 1;
      if (run.poisonTick >= 2) {
        run.poisonTick = 0;
        const dealt = Math.max(1, run.poisonPlayer - Math.floor(totalDef(p) / 3));
        p.hp -= dealt;
        addFloat(p.x, p.y, '-' + dealt, COLORS.green);
        if (p.hp <= 0) { p.hp = 0; endRun(false, 'отравление'); }
      }
    }
    run.floor.enemies = run.floor.enemies.filter((e) => e.alive);
  }

  function playerAct(fn) {
    if (uiMode !== 'playing' || !run) return;
    if (!fn()) return;
    if (run.player.invuln > 0) run.player.invuln -= 1;
    computeDist(run.floor);
    enemyTurn();
    computeFov(run.floor, run.player.x, run.player.y, FOV_RADIUS);
    run.turns += 1;
    updateHud();
  }

  // ================= этаж =================
  function buildFloor() {
    const level = run.floorIndex + 1;
    const floor = makeFloor(level);
    run.floor = floor;
    run.player.x = floor.startX;
    run.player.y = floor.startY;
    computeDist(floor);
    computeFov(floor, floor.startX, floor.startY, FOV_RADIUS);
    clearPrompt();
    log('Этаж ' + level + (level === MAX_FLOORS ? ' — ядро' : ''), 'good');
    if (level > 1) {
      const bonus = 10 + level * 4 + (run.player.trinket && run.player.trinket.crystal ? run.player.trinket.crystal : 0);
      run.crystals += bonus;
      run.floorCrystals = bonus;
      log('Кристаллы за этаж: плюс ' + bonus, 'loot');
    }
    updateHud();
  }

  // ================= интерфейс =================
  function hideAllScreens() {
    [els.menu, els.classScreen, els.arsenal, els.inventory, els.pauseScreen, els.deathScreen, els.winScreen]
      .forEach((s) => s.classList.add('is-hidden'));
  }

  function clearPrompt() { els.prompt.classList.add('is-hidden'); }
  function showPrompt(text) { els.prompt.textContent = text; els.prompt.classList.remove('is-hidden'); }

  function updateHud() {
    if (!run) return;
    const p = run.player;
    els.hpFill.style.transform = 'scaleX(' + Math.max(0, p.hp / p.maxHp) + ')';
    els.hpText.textContent = p.hp + '/' + p.maxHp;
    els.xpFill.style.transform = 'scaleX(' + Math.max(0, p.xp / p.xpNext) + ')';
    els.xpText.textContent = 'УР ' + p.level;
    els.floorValue.textContent = String(run.floorIndex + 1);
    els.scoreValue.textContent = String(run.score);
    els.metaValue.textContent = String(run.crystals);
    els.weaponName.textContent = p.weapon ? p.weapon.name : 'кулаки';
    els.armorName.textContent = p.armor ? p.armor.name : 'нет';
    els.trinketName.textContent = p.trinket ? p.trinket.name : 'нет';
    renderAbilities();
  }

  function renderAbilities() {
    if (!run) return;
    const p = run.player;
    const a = CLASSES[p.classId].ability;
    const full = p.charges >= p.maxCharges;
    els.abilityStrip.innerHTML = '<div class="ability-slot' + (full ? '' : ' empty') + '" title="' +
      a.name + ': ' + a.desc + '"><span class="key">' + a.key.toUpperCase() + '</span>' +
      '<span class="glyph">' + a.glyph + '</span>' +
      '<span class="charges">' + p.charges + '/' + p.maxCharges + '</span></div>';
  }

  function updateProfileUi() {
    els.bestValue.textContent = String(profile.bestFloor);
    const txt = profile.crystals.toLocaleString('ru-RU');
    els.menuMetaValue.textContent = txt;
    els.arsenalMetaValue.textContent = txt;
    els.runCountValue.textContent = String(profile.runs);
    els.winCountValue.textContent = String(profile.wins);
  }

  function renderClasses() {
    els.classList.innerHTML = Object.keys(CLASSES).map((id) => {
      const c = CLASSES[id];
      const unlocked = classUnlocked(id);
      return '<article class="class-card' + (unlocked ? '' : ' locked') + '" data-class="' + id + '">' +
        (unlocked ? '' : '<span class="class-lock">ЗАКРЫТО</span>') +
        '<div class="class-glyph" style="color:' + COLORS.cyan + '">' + c.glyph + '</div>' +
        '<div class="class-name">' + c.name + '</div>' +
        '<div class="class-role">' + c.role + '</div>' +
        '<p class="class-desc">' + c.desc + '</p>' +
        '<div class="class-stats">' +
        '<div class="class-stat"><span>ЗДОРОВЬЕ</span><b>' + (c.hp + meta('vitality') * 3) + '</b></div>' +
        '<div class="class-stat"><span>УРОН</span><b>' + (c.atk + meta('edge')) + '</b></div>' +
        '<div class="class-stat"><span>ЗАЩИТА</span><b>' + (c.def + meta('grace')) + '</b></div>' +
        '<div class="class-stat"><span>СПОСОБНОСТЬ</span><b>' + c.ability.name + '</b></div>' +
        '</div></article>';
    }).join('');
  }

  function renderArsenal() {
    els.arsenalGrid.innerHTML = Object.keys(META_UPGRADES).map((id) => {
      const u = META_UPGRADES[id];
      const lvl = meta(id);
      const maxed = lvl >= u.max;
      const cost = maxed ? 0 : u.costs[lvl];
      const free = cost === 0;
      return '<article class="upgrade-card' + (maxed ? ' maxed' : '') + '" data-up="' + id + '">' +
        '<div class="upgrade-top"><span class="upgrade-icon">' + u.icon + '</span>' +
        '<span class="upgrade-level">' + (maxed ? 'МАКС' : 'УР ' + lvl + ' / ' + u.max) + '</span></div>' +
        '<h3>' + u.name + '</h3><p>' + u.desc + '</p>' +
        '<div class="upgrade-bottom"><div class="level-track">' +
        Array.from({ length: u.max }, function (_, i) { return '<i class="' + (i < lvl ? 'on' : '') + '"></i>'; }).join('') +
        '</div><button class="buy-button" data-buy="' + id + '"' +
        (maxed || (!free && profile.crystals < cost) ? ' disabled' : '') + '>' +
        (maxed ? 'ОТКРЫТО' : (free ? 'БЕСПЛАТНО' : cost)) + '</button></div></article>';
    }).join('');
  }

  function buyUpgrade(id) {
    const u = META_UPGRADES[id];
    if (!u) return;
    const lvl = meta(id);
    if (lvl >= u.max) return;
    const cost = u.costs[lvl];
    if (profile.crystals < cost) { showToast('НЕДОСТАТОЧНО КРИСТАЛЛОВ'); return; }
    profile.crystals -= cost;
    profile.upgrades[id] = lvl + 1;
    saveProfile();
    updateProfileUi();
    renderArsenal();
    renderClasses();
    showToast(u.name + ' улучшено');
    tone(640, 0.14, 'triangle', 0.04, 240);
  }

  function renderInventory() {
    if (!run) return;
    const p = run.player;
    const nodes = { weapon: els.slotWeapon, armor: els.slotArmor, trinket: els.slotTrinket };
    ['weapon', 'armor', 'trinket'].forEach((s) => {
      const node = nodes[s];
      const item = s === 'weapon' ? p.weapon : p[s];
      const span = node.querySelector('.slot-item');
      span.textContent = item ? item.name : 'пусто';
      span.className = 'slot-item' + (item ? '' : ' empty');
      node.classList.toggle('has-item', !!item);
    });
    els.backpackList.innerHTML = p.bag.length
      ? p.bag.map((it, i) => '<div class="bag-item r' + it.rarity + '" data-bag="' + i + '">' +
        '<span class="bi-name" style="color:' + RARITY[it.rarity].color + '">' + it.name + '</span>' +
        '<span class="bi-kind">' + it.kind + '</span>' +
        (it.desc ? '<span class="bi-stats">' + it.desc + '</span>' : '') + '</div>').join('')
      : '<div class="bag-empty">Рюкзак пуст</div>';
    els.inventoryStats.innerHTML =
      '<span>УРОН <b>' + (p.atk + (p.weapon ? p.weapon.dmg : 0)) + '</b></span>' +
      '<span>ЗАЩИТА <b>' + totalDef(p) + '</b></span>' +
      '<span>HP <b>' + p.hp + '/' + p.maxHp + '</b></span>' +
      '<span>КРИТ <b>' + Math.round(p.crit * 100) + '%</b></span>';
  }

  function equipFromBag(index) {
    const p = run.player;
    const it = p.bag[index];
    if (!it) return;
    p.bag.splice(index, 1);
    if (it.kind === 'weapon') {
      if (p.weapon && p.weapon.dmg) p.bag.push(p.weapon);
      p.weapon = it;
    } else if (it.kind === 'armor' || it.kind === 'trinket') {
      const old = p[it.kind];
      p[it.kind] = it;
      if (old) p.bag.push(old);
      if (it.hp) p.maxHp += it.hp;
    } else {
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + it.heal);
      log(it.name + ': плюс ' + (p.hp - before) + ' HP', 'loot');
      addFloat(p.x, p.y, '+' + (p.hp - before), COLORS.green);
      sfxPick();
    }
    renderInventory();
    updateHud();
    tone(500, 0.08, 'triangle', 0.025, 120);
  }

  // ================= конец спуска =================
  function endRun(won, cause) {
    if (uiMode === 'dead' || uiMode === 'won') return;
    const p = run.player;
    const reached = won ? MAX_FLOORS : run.floorIndex + 1;
    const greed = 1 + meta('greed') * 0.12;
    const earned = Math.round(run.crystals * greed);
    profile.crystals += earned;
    profile.runs += 1;
    if (won) profile.wins += 1;
    const isRecord = reached > profile.bestFloor;
    if (isRecord) profile.bestFloor = reached;
    saveProfile();
    updateProfileUi();

    if (won) {
      els.winCrystals.textContent = '+' + earned;
      els.winKills.textContent = String(run.kills);
      els.winLevel.textContent = String(p.level);
      uiMode = 'won';
      hideAllScreens();
      els.winScreen.classList.remove('is-hidden');
      tone(520, 0.4, 'triangle', 0.05, 420);
    } else {
      els.deathFloor.textContent = String(reached);
      els.deathCause.textContent = cause || 'рана';
      els.deathKills.textContent = String(run.kills);
      els.deathLevel.textContent = String(p.level);
      els.deathCrystals.textContent = '+' + earned;
      els.newRecord.classList.toggle('is-hidden', !isRecord);
      uiMode = 'dead';
      hideAllScreens();
      els.deathScreen.classList.remove('is-hidden');
      tone(160, 0.45, 'sawtooth', 0.05, -90);
    }
  }

  function startRun(classId) {
    ensureAudio();
    rng = makeRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    run = {
      player: makePlayer(classId), floor: null, floorIndex: 0, turns: 0,
      kills: 0, score: 0, crystals: 0, floorCrystals: 0,
      floats: [], shots: [], shake: 0, god: false,
      poisonPlayer: 0, poisonTick: 0
    };
    uiMode = 'playing';
    hideAllScreens();
    els.hud.classList.remove('is-hidden');
    els.logPanel.innerHTML = '';
    buildFloor();
    log('Ты в подземелье. Найди лестницу вниз.', 'good');
    updateHud();
  }

  function returnToMenu() {
    run = null;
    uiMode = 'menu';
    els.hud.classList.add('is-hidden');
    clearPrompt();
    hideAllScreens();
    els.menu.classList.remove('is-hidden');
    updateProfileUi();
  }

  // ================= ввод =================
  function onAct(fn) { ensureAudio(); playerAct(fn); }

  function pauseGame() {
    if (uiMode !== 'playing') return;
    uiMode = 'paused';
    const p = run.player;
    els.pauseStats.innerHTML =
      '<div class="pause-stat"><span>ЭТАЖ</span><b>' + (run.floorIndex + 1) + '</b></div>' +
      '<div class="pause-stat"><span>УРОВЕНЬ</span><b>' + p.level + '</b></div>' +
      '<div class="pause-stat"><span>УБИТО</span><b>' + run.kills + '</b></div>' +
      '<div class="pause-stat"><span>КРИСТАЛЛЫ</span><b>' + run.crystals + '</b></div>';
    hideAllScreens();
    els.pauseScreen.classList.remove('is-hidden');
  }

  function resumeGame() {
    if (uiMode !== 'paused' && uiMode !== 'inventory') return;
    uiMode = 'playing';
    hideAllScreens();
  }

  function openInventory() {
    if (uiMode !== 'playing' && uiMode !== 'paused') return;
    inventoryWasPlaying = uiMode === 'playing';
    uiMode = 'inventory';
    renderInventory();
    hideAllScreens();
    els.inventory.classList.remove('is-hidden');
  }

  function closeInventory() {
    uiMode = inventoryWasPlaying ? 'playing' : 'paused';
    hideAllScreens();
    if (uiMode === 'paused') els.pauseScreen.classList.remove('is-hidden');
  }

  function openArsenal() {
    uiMode = 'arsenal';
    renderArsenal();
    hideAllScreens();
    els.arsenal.classList.remove('is-hidden');
  }

  function closeArsenal() {
    uiMode = arsenalReturn;
    updateProfileUi();
    hideAllScreens();
    if (arsenalReturn === 'dead') els.deathScreen.classList.remove('is-hidden');
    else if (arsenalReturn === 'won') els.winScreen.classList.remove('is-hidden');
    else els.menu.classList.remove('is-hidden');
  }

  function showClassScreen() {
    ensureAudio();
    uiMode = 'class';
    renderClasses();
    hideAllScreens();
    els.classScreen.classList.remove('is-hidden');
  }

  function setupInput() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (uiMode === 'playing') {
        if (k === 'w' || k === 'arrowup') { e.preventDefault(); onAct(() => tryMove(0, -1)); }
        else if (k === 's' || k === 'arrowdown') { e.preventDefault(); onAct(() => tryMove(0, 1)); }
        else if (k === 'a' || k === 'arrowleft') { e.preventDefault(); onAct(() => tryMove(-1, 0)); }
        else if (k === 'd' || k === 'arrowright') { e.preventDefault(); onAct(() => tryMove(1, 0)); }
        else if (k === 'f') { e.preventDefault(); onAct(() => tryAttack()); }
        else if (k === 'q' || k === ' ') { e.preventDefault(); playerAct(() => { useAbility(); return true; }); }
        else if (k === 'e') { e.preventDefault(); playerAct(() => { descend(); return true; }); }
        else if (k === 'i') { e.preventDefault(); openInventory(); }
        else if (k === 'escape') { e.preventDefault(); pauseGame(); }
      } else if (uiMode === 'paused') {
        if (k === 'escape') resumeGame();
      } else if (uiMode === 'inventory') {
        if (k === 'i' || k === 'escape') closeInventory();
      } else if (uiMode === 'class') {
        if (k === 'escape') { uiMode = 'menu'; hideAllScreens(); els.menu.classList.remove('is-hidden'); }
      } else if (uiMode === 'arsenal') {
        if (k === 'escape') closeArsenal();
      }
    });

    els.playButton.addEventListener('click', showClassScreen);
    els.classBackButton.addEventListener('click', () => { uiMode = 'menu'; hideAllScreens(); els.menu.classList.remove('is-hidden'); });
    els.classList.addEventListener('click', (e) => {
      const card = e.target.closest('.class-card');
      if (!card) return;
      const id = card.dataset.class;
      if (!classUnlocked(id)) { showToast('КЛАСС ЗАКРЫТО, СМОТРИ АРСЕНАЛ'); tone(150, 0.12, 'square', 0.03, -40); return; }
      startRun(id);
    });
    els.arsenalButton.addEventListener('click', () => { arsenalReturn = 'menu'; openArsenal(); });
    els.deathArsenalButton.addEventListener('click', () => { arsenalReturn = 'dead'; openArsenal(); });
    els.winArsenalButton.addEventListener('click', () => { arsenalReturn = 'won'; openArsenal(); });
    els.closeArsenalButton.addEventListener('click', closeArsenal);
    els.arsenalGrid.addEventListener('click', (e) => {
      const b = e.target.closest('.buy-button');
      if (b) buyUpgrade(b.dataset.buy);
    });
    els.retryButton.addEventListener('click', showClassScreen);
    els.winRetryButton.addEventListener('click', showClassScreen);
    els.deathMenuButton.addEventListener('click', returnToMenu);
    els.winMenuButton.addEventListener('click', returnToMenu);
    els.quitButton.addEventListener('click', () => endRun(false, 'сдался'));
    els.resumeButton.addEventListener('click', resumeGame);
    els.pauseInventoryButton.addEventListener('click', openInventory);
    els.closeInventoryButton.addEventListener('click', closeInventory);
    els.menuButton.addEventListener('click', pauseGame);
    els.soundButton.addEventListener('click', () => {
      soundOn = !soundOn;
      els.soundButton.classList.toggle('muted', !soundOn);
      if (soundOn) { ensureAudio(); tone(520, 0.08, 'triangle', 0.03, 160); }
    });
    els.backpackList.addEventListener('click', (e) => {
      const it = e.target.closest('.bag-item');
      if (it) equipFromBag(Number(it.dataset.bag));
    });

    let touchStart = null;
    canvas.addEventListener('pointerdown', (e) => { touchStart = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', (e) => {
      if (!touchStart || uiMode !== 'playing') { touchStart = null; return; }
      const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
      touchStart = null;
      if (Math.hypot(dx, dy) < 24) { onAct(() => tryAttack()); return; }
      if (Math.abs(dx) > Math.abs(dy)) onAct(() => tryMove(dx > 0 ? 1 : -1, 0));
      else onAct(() => tryMove(0, dy > 0 ? 1 : -1));
    });
  }

  // ================= отрисовка =================
  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewport.w = Math.max(320, rect.width);
    viewport.h = Math.max(360, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(viewport.w * dpr);
    canvas.height = Math.round(viewport.h * dpr);
  }

  function camTransform() {
    const scale = Math.max(0.5, Math.min(viewport.w / (VIEW_RADIUS * 2 * TILE), viewport.h / (VIEW_RADIUS * 2 * TILE)));
    const ts = TILE * scale;
    const p = run ? run.player : { x: 0, y: 0 };
    return { ts, ox: viewport.w / 2 - (p.x + 0.5) * ts, oy: viewport.h / 2 - (p.y + 0.5) * ts };
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, viewport.h);
    g.addColorStop(0, '#080b1c');
    g.addColorStop(1, '#05070f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewport.w, viewport.h);
  }

  function drawMap(c) {
    const floor = run.floor;
    const half = Math.ceil(viewport.w / c.ts / 2) + 2;
    const halfH = Math.ceil(viewport.h / c.ts / 2) + 2;
    const p = run.player;
    const locked = floor.level >= MAX_FLOORS && bossAlive();
    for (let y = p.y - halfH; y <= p.y + halfH; y++) {
      for (let x = p.x - half; x <= p.x + half; x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const i = y * MAP_W + x;
        if (!floor.seen[i]) continue;
        const visible = floor.visible[i];
        const px = c.ox + x * c.ts, py = c.oy + y * c.ts;
        const tile = floor.grid[i];
        if (visible) {
          if (tile === WALL_TILE) {
            // стена: тело темнее, верхняя грань светлее — даёт объём
            ctx.fillStyle = '#26345c';
            ctx.fillRect(px, py, c.ts, c.ts);
            ctx.fillStyle = '#3d5288';
            ctx.fillRect(px, py, c.ts, Math.max(3, c.ts * 0.22));
            ctx.fillStyle = 'rgba(99,231,255,0.22)';
            ctx.fillRect(px, py, c.ts, Math.max(1, c.ts * 0.05));
            ctx.strokeStyle = 'rgba(10,14,32,0.9)';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, c.ts - 1, c.ts - 1);
          } else {
            ctx.fillStyle = '#111a33';
            ctx.fillRect(px, py, c.ts, c.ts);
            // точка в центре клетки помогает читать сетку
            ctx.fillStyle = 'rgba(99,231,255,0.10)';
            ctx.fillRect(px + c.ts / 2 - 1, py + c.ts / 2 - 1, 2, 2);
          }
          if (tile === DOOR_TILE) {
            ctx.fillStyle = 'rgba(255,180,79,0.55)';
            ctx.fillRect(px + c.ts * 0.2, py + c.ts * 0.2, c.ts * 0.6, c.ts * 0.6);
            ctx.strokeStyle = COLORS.orange;
            ctx.lineWidth = 2;
            ctx.strokeRect(px + c.ts * 0.2, py + c.ts * 0.2, c.ts * 0.6, c.ts * 0.6);
          } else if (tile === STAIRS_TILE) {
            const tint = locked ? COLORS.red : COLORS.green;
            ctx.fillStyle = locked ? 'rgba(255,95,109,0.22)' : 'rgba(98,246,189,0.28)';
            ctx.fillRect(px + 2, py + 2, c.ts - 4, c.ts - 4);
            ctx.strokeStyle = tint;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let s = 0; s < 4; s++) {
              ctx.moveTo(px + c.ts * 0.25, py + c.ts * (0.22 + s * 0.16));
              ctx.lineTo(px + c.ts * 0.75, py + c.ts * (0.22 + s * 0.16));
            }
            ctx.stroke();
            if (locked) {
              // замок рисуем фигурами: эмодзи в canvas зависят от шрифта
              const cx = px + c.ts / 2, cy = py + c.ts / 2, s = c.ts * 0.1;
              ctx.strokeStyle = tint;
              ctx.lineWidth = Math.max(2, s * 0.4);
              ctx.beginPath();
              ctx.arc(cx, cy - s * 0.8, s * 0.9, Math.PI, 0);
              ctx.stroke();
              ctx.fillStyle = tint;
              ctx.fillRect(cx - s * 1.1, cy - s * 0.4, s * 2.2, s * 1.9);
            }
          }
        } else {
          // исследованное, но не видимое сейчас: приглушено, но читаемо
          ctx.fillStyle = tile === WALL_TILE ? '#151d38' : '#0a1024';
          ctx.fillRect(px, py, c.ts, c.ts);
        }
      }
    }
  }

  function drawItems(c) {
    const floor = run.floor;
    for (const it of floor.items) {
      if (!floor.visible[it.y * MAP_W + it.x]) continue;
      const px = c.ox + (it.x + 0.5) * c.ts, py = c.oy + (it.y + 0.5) * c.ts;
      const bob = Math.sin(ambient * 2 + it.x) * c.ts * 0.05;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(c.ts * 0.55) + 'px "Arial Black", sans-serif';
      ctx.fillStyle = RARITY[it.rarity].color;
      ctx.shadowColor = RARITY[it.rarity].color;
      ctx.shadowBlur = 10;
      ctx.fillText(it.glyph, px, py + bob);
      ctx.restore();
    }
  }

  function drawEnemies(c) {
    const floor = run.floor;
    for (const e of floor.enemies) {
      if (!e.alive || !floor.visible[e.y * MAP_W + e.x]) continue;
      const px = c.ox + (e.x + 0.5) * c.ts, py = c.oy + (e.y + 0.5) * c.ts;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(c.ts * (e.boss ? 0.72 : 0.55)) + 'px "Arial Black", sans-serif';
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = e.boss ? 18 : 9;
      ctx.fillText(e.glyph, px, py);
      ctx.restore();
      if (e.hp < e.maxHp) {
        const w = c.ts * 0.7;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(px - w / 2, py - c.ts * 0.42, w, 3.5);
        const ratio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = ratio > 0.5 ? COLORS.green : ratio > 0.25 ? COLORS.orange : COLORS.red;
        ctx.fillRect(px - w / 2, py - c.ts * 0.42, w * ratio, 3.5);
      }
    }
  }

  function drawPlayer(c) {
    const p = run.player;
    const cls = CLASSES[p.classId];
    const px = c.ox + (p.x + 0.5) * c.ts, py = c.oy + (p.y + 0.5) * c.ts;
    ctx.save();
    if (p.invuln > 0 && Math.floor(ambient * 12) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(c.ts * 0.6) + 'px "Arial Black", sans-serif';
    ctx.fillStyle = p.hitFlash > 0 ? '#ffffff' : COLORS.cyanBright;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 16;
    ctx.fillText(cls.glyph, px, py);
    ctx.restore();
    if (p.charges < p.maxCharges) {
      ctx.strokeStyle = 'rgba(255,180,79,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, c.ts * 0.44, -Math.PI / 2, -Math.PI / 2 + (p.charges / p.maxCharges) * TAU);
      ctx.stroke();
    }
  }

  function drawShots(c) {
    for (const s of run.shots) {
      ctx.save();
      ctx.globalAlpha = s.life / s.maxLife;
      ctx.strokeStyle = COLORS.cyanBright;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = COLORS.cyanBright;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(c.ox + (s.x0 + 0.5) * c.ts, c.oy + (s.y0 + 0.5) * c.ts);
      ctx.lineTo(c.ox + (s.x1 + 0.5) * c.ts, c.oy + (s.y1 + 0.5) * c.ts);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFloats(c) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 ' + Math.max(11, Math.round(c.ts * 0.3)) + 'px "Arial Black", sans-serif';
    for (const f of run.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, c.ox + (f.x + 0.5) * c.ts, c.oy + f.y * c.ts - 10);
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground();
    if (run && (uiMode === 'playing' || uiMode === 'paused' || uiMode === 'inventory')) {
      const c = camTransform();
      ctx.save();
      if (run.shake > 0 && !reducedMotion) {
        ctx.translate((Math.random() - 0.5) * run.shake, (Math.random() - 0.5) * run.shake);
      }
      drawMap(c);
      drawItems(c);
      drawShots(c);
      drawEnemies(c);
      drawPlayer(c);
      drawFloats(c);
      ctx.restore();
    }
  }

  // ================= цикл =================
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    ambient += dt;
    if (run) {
      run.shake = Math.max(0, run.shake - dt * 30);
      for (let i = 0; i < run.floats.length; i++) {
        run.floats[i].life -= dt;
        run.floats[i].y -= dt * 1.4;
      }
      run.floats = run.floats.filter((f) => f.life > 0);
      for (let i = 0; i < run.shots.length; i++) run.shots[i].life -= dt;
      run.shots = run.shots.filter((s) => s.life > 0);
      if (run.player.invuln > 0) run.player.invuln -= dt;
      if (run.player.hitFlash > 0) run.player.hitFlash -= dt;
    }
    render();
    requestAnimationFrame(frame);
  }

  // ================= старт =================
  function init() {
    setupInput();
    resize();
    window.addEventListener('resize', resize);
    updateProfileUi();
    requestAnimationFrame(frame);

    // Отладочный доступ только по адресу вида index.html?debug
    if (/[?&]debug\b/.test(window.location.search)) {
      window.__descent = {
        state: function () {
          if (!run) return { mode: uiMode };
          const p = run.player;
          let near = null, bd = 999;
          for (const e of run.floor.enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < bd) { bd = d; near = { type: e.type, hp: e.hp, maxHp: e.maxHp, d: Math.round(d * 10) / 10 }; }
          }
          return {
            mode: uiMode, floor: run.floorIndex + 1, hp: p.hp, maxHp: p.maxHp,
            x: p.x, y: p.y, enemies: run.floor.enemies.length, items: run.floor.items.length,
            crystals: run.crystals, kills: run.kills, level: p.level,
            weapon: p.weapon ? p.weapon.name : '—', bag: p.bag.length, charges: p.charges,
            atk: p.atk, weaponDmg: p.weapon ? p.weapon.dmg : 0, nearest: near,
            atStairs: p.x === run.floor.exitX && p.y === run.floor.exitY,
            exit: { x: run.floor.exitX, y: run.floor.exitY }
          };
        },
        start: (c) => startRun(c || 'scout'),
        profile: () => profile,
        hurt: (n) => { run.player.hp -= n; if (run.player.hp <= 0) endRun(false, 'тест'); },
        godmode: (on) => { run.god = !!on; },
        killAll: () => { run.floor.enemies.slice().forEach((e) => { if (e.alive) killEnemy(e); }); },
        gotoFloor: (n) => { run.floorIndex = Math.max(0, Math.min(MAX_FLOORS - 1, n - 1)); buildFloor(); updateHud(); },
        teleportToExit: () => { run.player.x = run.floor.exitX; run.player.y = run.floor.exitY; computeFov(run.floor, run.player.x, run.player.y, FOV_RADIUS); updateHud(); },
        descendNow: () => descend(),
        bossInfo: () => ({
          floor: run.floorIndex + 1,
          enemies: run.floor.enemies.map((e) => ({ t: e.type, boss: !!e.boss, alive: e.alive, hp: e.hp }))
        })
      };

      // Автопилот для автотестов: один вызов — один ход.
      window.__bot = {
        step: function () {
          if (!run || uiMode !== 'playing') return 'stopped';
          const p = run.player;
          if (p.x === run.floor.exitX && p.y === run.floor.exitY) { descend(); return 'descended'; }
          if (itemAt(p.x, p.y)) { checkPickup(); return 'picked'; }
          if (p.bag.length) {
            const weight = (i) => (i && i.kind === 'weapon' ? (i.dmg || 0) * 2
              : i && i.kind === 'armor' ? (i.def || 0) * 3
              : i && i.kind === 'trinket' ? 9 : 0);
            let bestIdx = -1, bestGain = 0;
            for (let i = 0; i < p.bag.length; i++) {
              const cand = p.bag[i];
              if (cand.kind === 'potion') continue;
              const cur = cand.kind === 'weapon' ? p.weapon : p[cand.kind];
              const gain = weight(cand) - weight(cur);
              if (gain > bestGain) { bestGain = gain; bestIdx = i; }
            }
            if (bestIdx >= 0) { equipFromBag(bestIdx); return 'equipped'; }
          }
          const potionIdx = p.bag.findIndex((b) => b.kind === 'potion');
          if (potionIdx >= 0 && p.hp < p.maxHp * 0.5) { equipFromBag(potionIdx); return 'healed'; }
          for (let i = 0; i < DIRS.length; i++) {
            if (enemyAt(p.x + DIRS[i].x, p.y + DIRS[i].y)) { tryAttack(); return 'fought'; }
          }
          if (p.charges >= p.maxCharges) { useAbility(); return 'ability'; }
          let goalX = run.floor.exitX, goalY = run.floor.exitY;
          if (!(p.weapon && p.weapon.dmg > 0) && run.floor.items.length) {
            let bi = 0, bd = Infinity;
            run.floor.items.forEach(function (it, i) {
              const d = Math.hypot(it.x - p.x, it.y - p.y);
              if (d < bd) { bd = d; bi = i; }
            });
            goalX = run.floor.items[bi].x;
            goalY = run.floor.items[bi].y;
          }
          let field = bfsFrom(run.floor, goalX, goalY);
          if (field[p.y * MAP_W + p.x] === -1) {
            goalX = run.floor.exitX; goalY = run.floor.exitY;
            field = bfsFrom(run.floor, goalX, goalY);
            if (field[p.y * MAP_W + p.x] === -1) return 'unreachable';
          }
          const here = field[p.y * MAP_W + p.x];
          let best = null, bestD = here;
          for (let i = 0; i < DIRS.length; i++) {
            const nx = p.x + DIRS[i].x, ny = p.y + DIRS[i].y;
            if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
            if (isBlocking(run.floor.grid[ny * MAP_W + nx])) continue;
            const d = field[ny * MAP_W + nx];
            if (d !== -1 && d < bestD) { bestD = d; best = { x: nx, y: ny }; }
          }
          if (!best) return 'stuck';
          playerAct(() => { tryMove(best.x - p.x, best.y - p.y); return true; });
          return 'moved';
        }
      };
    }
  }
  init();
})();
