(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const els = {
    hud: document.getElementById('hud'),
    waveValue: document.getElementById('waveValue'),
    waveTotal: document.getElementById('waveTotal'),
    creditsValue: document.getElementById('hudCreditsValue'),
    enemyCountValue: document.getElementById('enemyCountValue'),
    healthPips: document.getElementById('healthPips'),
    waveBanner: document.getElementById('waveBanner'),
    buildBar: document.getElementById('buildBar'),
    towerCards: document.getElementById('towerCards'),
    startWaveButton: document.getElementById('startWaveButton'),
    prepTimer: document.getElementById('prepTimer'),
    repairButton: document.getElementById('repairButton'),
    repairCost: document.getElementById('repairCost'),
    selectionPanel: document.getElementById('selectionPanel'),
    selectionIcon: document.getElementById('selectionIcon'),
    selectionName: document.getElementById('selectionName'),
    selectionLevel: document.getElementById('selectionLevel'),
    selectionDamage: document.getElementById('selectionDamage'),
    selectionRange: document.getElementById('selectionRange'),
    selectionLevelStat: document.getElementById('selectionLevelStat'),
    upgradeTowerButton: document.getElementById('upgradeTowerButton'),
    upgradeTowerCost: document.getElementById('upgradeTowerCost'),
    sellTowerButton: document.getElementById('sellTowerButton'),
    sellTowerValue: document.getElementById('sellTowerValue'),
    speedButton: document.getElementById('speedButton'),
    soundButton: document.getElementById('soundButton'),
    pauseButton: document.getElementById('pauseButton'),
    menu: document.getElementById('menu'),
    playButton: document.getElementById('playButton'),
    shopButton: document.getElementById('shopButton'),
    menuCreditsValue: document.getElementById('menuCreditsValue'),
    menuDailyButton: document.getElementById('menuDailyButton'),
    bestValue: document.getElementById('bestValue'),
    pauseScreen: document.getElementById('pauseScreen'),
    resumeButton: document.getElementById('resumeButton'),
    pauseShopButton: document.getElementById('pauseShopButton'),
    quitButton: document.getElementById('quitButton'),
    gameoverScreen: document.getElementById('gameoverScreen'),
    finalWave: document.getElementById('finalWave'),
    finalKills: document.getElementById('finalKills'),
    finalTowers: document.getElementById('finalTowers'),
    runCredits: document.getElementById('runCredits'),
    newRecord: document.getElementById('newRecord'),
    retryButton: document.getElementById('retryButton'),
    resultShopButton: document.getElementById('resultShopButton'),
    menuButton: document.getElementById('menuButton'),
    winScreen: document.getElementById('winScreen'),
    winCredits: document.getElementById('winCredits'),
    winKills: document.getElementById('winKills'),
    winTowers: document.getElementById('winTowers'),
    winRetryButton: document.getElementById('winRetryButton'),
    winShopButton: document.getElementById('winShopButton'),
    winMenuButton: document.getElementById('winMenuButton'),
    shop: document.getElementById('shop'),
    shopCreditsValue: document.getElementById('shopCreditsValue'),
    closeShopButton: document.getElementById('closeShopButton'),
    dailyStatus: document.getElementById('dailyStatus'),
    dailyButton: document.getElementById('dailyButton'),
    runCountValue: document.getElementById('runCountValue'),
    toast: document.getElementById('toast')
  };

  // ---------- константы ----------
  const COLS = 22;
  const ROWS = 13;
  const TILE = 48;
  const BOARD_W = COLS * TILE;
  const BOARD_H = ROWS * TILE;
  const TOTAL_WAVES = 30;
  const PREP_TIME = 25;
  const MAX_TOWER_LEVEL = 3;
  const TAU = Math.PI * 2;

  const COLORS = {
    cyan: '#63e7ff',
    cyanBright: '#b5f7ff',
    pink: '#ff4fbd',
    orange: '#ffb44f',
    green: '#62f6bd',
    violet: '#9d7bff',
    red: '#ff5f6d',
    white: '#eff9ff',
    muted: '#8491b4'
  };

  const PATH_NODES = [
    { x: -1, y: 2 },
    { x: 5, y: 2 },
    { x: 5, y: 8 },
    { x: 10, y: 8 },
    { x: 10, y: 3 },
    { x: 15, y: 3 },
    { x: 15, y: 10 },
    { x: 19, y: 10 },
    { x: 19, y: 6 },
    { x: 20, y: 6 }
  ];

  const TOWERS = {
    pulse: {
      name: 'Импульс', glyph: '◉', color: COLORS.cyan, cost: 60,
      damage: 13, rate: 1.35, range: 153, shot: 'bolt',
      desc: 'Быстрая одиночная стрельба по самому близкому к базе врагу.'
    },
    mortar: {
      name: 'Мортира', glyph: '◎', color: COLORS.orange, cost: 130,
      damage: 34, rate: 0.5, range: 218, shot: 'shell', splash: 62,
      desc: 'Навесной выстрел, накрывает площадь. Медленная, но бьёт по толпе.'
    },
    cryo: {
      name: 'Криозар', glyph: '❄', color: COLORS.green, cost: 100,
      damage: 5, rate: 0.9, range: 161, shot: 'bolt', slow: 0.42, slowTime: 1.8,
      desc: 'Слабый урон, но сильно замедляет всё в радиусе.'
    },
    tesla: {
      name: 'Генератор', glyph: '⚡', color: COLORS.violet, cost: 165,
      damage: 20, rate: 0.8, range: 172, shot: 'chain', chain: 4, locked: 'tesla',
      desc: 'Разряд перескакивает на 4 цели. Пробивает броню наполовину.'
    },
    rail: {
      name: 'Рельсотрон', glyph: '▤', color: COLORS.pink, cost: 240,
      damage: 82, rate: 0.32, range: 390, shot: 'beam', pierce: true, locked: 'rail',
      desc: 'Дальний рельсовый выстрел проходит сквозь всех на линии.'
    }
  };

  const TOWER_ORDER = ['pulse', 'mortar', 'cryo', 'tesla', 'rail'];

  const ENEMIES = {
    drone: { name: 'Дрон', hp: 46, speed: 54, reward: 7, color: COLORS.pink, r: 12, shape: 'hex' },
    scout: { name: 'Скаут', hp: 30, speed: 104, reward: 9, color: COLORS.cyan, r: 10, shape: 'tri' },
    armor: { name: 'Бронетрак', hp: 190, speed: 34, reward: 19, color: COLORS.orange, r: 15, shape: 'square', armor: 5 },
    wraith: { name: 'Фазер', hp: 84, speed: 68, reward: 15, color: COLORS.violet, r: 12, shape: 'diamond', noSlow: true },
    splitter: { name: 'Делитель', hp: 110, speed: 48, reward: 14, color: COLORS.green, r: 13, shape: 'cluster', splitInto: 'drone', splitCount: 2 },
    boss: { name: 'Титан', hp: 1250, speed: 26, reward: 120, color: COLORS.red, r: 27, shape: 'boss', armor: 10, boss: true, leak: 5 }
  };

  const SHOP_ITEMS = {
    starter: { name: 'Стабилизатор', maxLevel: 3, costs: [140, 320, 600] },
    damage: { name: 'Резонансное ядро', maxLevel: 3, costs: [180, 400, 720] },
    rate: { name: 'Автомат заряда', maxLevel: 3, costs: [160, 360, 660] },
    core: { name: 'Бронеклапан', maxLevel: 3, costs: [150, 340, 620] },
    tesla: { name: 'Генератор', maxLevel: 1, costs: [400] },
    rail: { name: 'Рельсотрон', maxLevel: 1, costs: [550] }
  };

  const STORAGE_BEST = 'neon-bastion-best-v1';
  const STORAGE_PROFILE = 'neon-bastion-profile-v1';
  const DAILY_REWARD = 80;
  const DAILY_INTERVAL = 24 * 60 * 60 * 1000;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- состояние ----------
  let viewport = { w: 800, h: 600 };
  let dpr = 1;
  let lastFrame = performance.now();
  let ambientTime = 0;
  let uiClock = 0;
  let toastTimeout = 0;
  let soundEnabled = true;
  let speed = 1;
  let shopReturnMode = 'menu';
  let profile = loadProfile();
  let game = createGame();
  let selectedBuildType = 'pulse';
  let selectedTowerId = null;
  let hoverTile = null;
  let bannerTimeout = 0;
  // отступы под HUD сверху и под панель башен снизу; снизу измеряем по факту
  const uiInsets = { top: 60, bottom: 132 };

  const audio = { context: null, master: null };
  const stars = createStars();

  // ---------- сетка и поле ----------
  const roadTiles = new Set();
  const blockedTiles = new Set();
  const pathPoints = [];

  function tileKey(col, row) {
    return col + ':' + row;
  }

  function buildBoard() {
    roadTiles.clear();
    blockedTiles.clear();
    pathPoints.length = 0;

    for (let i = 0; i < PATH_NODES.length; i++) {
      const node = PATH_NODES[i];
      pathPoints.push({ x: (node.x + 0.5) * TILE, y: (node.y + 0.5) * TILE });
      if (i === 0) continue;
      const prev = PATH_NODES[i - 1];
      const steps = Math.max(Math.abs(node.x - prev.x), Math.abs(node.y - prev.y));
      for (let s = 0; s <= steps; s++) {
        const col = Math.round(prev.x + ((node.x - prev.x) * s) / steps);
        const row = Math.round(prev.y + ((node.y - prev.y) * s) / steps);
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) roadTiles.add(tileKey(col, row));
      }
    }

    // зона вокруг базы и спавна строить нельзя
    const core = PATH_NODES[PATH_NODES.length - 1];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const col = core.x + dx;
        const row = core.y + dy;
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) blockedTiles.add(tileKey(col, row));
      }
    }
    const spawn = PATH_NODES[0];
    for (let dy = -1; dy <= 1; dy++) {
      const col = spawn.x + 1;
      const row = spawn.y + dy;
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) blockedTiles.add(tileKey(col, row));
    }
  }

  function isBuildable(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    const key = tileKey(col, row);
    return !roadTiles.has(key) && !blockedTiles.has(key);
  }

  function createStars() {
    const result = [];
    for (let i = 0; i < 46; i++) {
      result.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.5 + 0.4,
        a: Math.random() * 0.5 + 0.12,
        s: Math.random() * 0.4 + 0.2
      });
    }
    return result;
  }

  // ---------- профиль ----------
  function safeInteger(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(number)));
  }

  function loadProfile() {
    const fallback = { credits: 0, upgrades: {}, bestWave: 0, runs: 0, dailyAt: 0 };
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_PROFILE) || 'null');
    } catch (error) {
      stored = null;
    }
    if (!stored || typeof stored !== 'object') return fallback;
    const upgrades = {};
    Object.keys(SHOP_ITEMS).forEach((id) => {
      upgrades[id] = safeInteger(stored.upgrades ? stored.upgrades[id] : 0, 0, 0, SHOP_ITEMS[id].maxLevel);
    });
    return {
      credits: safeInteger(stored.credits, 0, 0),
      upgrades,
      bestWave: safeInteger(stored.bestWave, 0, 0, TOTAL_WAVES),
      runs: safeInteger(stored.runs, 0, 0),
      dailyAt: safeInteger(stored.dailyAt, 0, 0)
    };
  }

  function saveProfile() {
    try {
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
    } catch (error) {
      /* приватный режим — молча игнорируем */
    }
  }

  function getUpgrade(id) {
    return profile.upgrades[id] || 0;
  }

  function getStartingCredits() {
    return 450 + getUpgrade('starter') * 60;
  }

  function getBaseHp() {
    return 30 + getUpgrade('core') * 5;
  }

  // Ремонт базы между волнами: цена растёт с каждым восстановленным пунктом,
  // поэтому кредиты всегда находят применение, а не копятся.
  function repairCost() {
    const missing = game.baseMaxHp - game.baseHp;
    if (missing <= 0) return Infinity;
    return 18 * missing + Math.round(game.wave * 3);
  }

  function repairBase() {
    if (game.mode !== 'prep') return;
    const cost = repairCost();
    if (!Number.isFinite(cost) || game.credits < cost) return;
    game.credits -= cost;
    game.baseHp = game.baseMaxHp;
    spawnBurst(
      pathPoints[pathPoints.length - 1].x,
      pathPoints[pathPoints.length - 1].y,
      COLORS.green, 22, 170
    );
    tone(300, 0.18, 'triangle', 0.04, 340);
    showToast('БАЗА ВОССТАНОВЛЕНА');
    updateHud();
  }

  function getDamageBonus() {
    return 1 + getUpgrade('damage') * 0.12;
  }

  function getRateBonus() {
    return 1 + getUpgrade('rate') * 0.1;
  }

  function towerUnlocked(type) {
    const def = TOWERS[type];
    if (!def.locked) return true;
    return getUpgrade(def.locked) > 0;
  }

  function getBest() {
    return Math.max(profile.bestWave, safeInteger(localStorage.getItem(STORAGE_BEST), 0, 0, TOTAL_WAVES));
  }

  // ---------- игра ----------
  function createGame() {
    return {
      mode: 'menu',
      paused: false,
      time: 0,
      wave: 0,
      prepClock: PREP_TIME,
      waveClock: 0,
      spawnQueue: [],
      spawnIndex: 0,
      credits: 0,
      baseHp: 20,
      baseMaxHp: 20,
      kills: 0,
      towersBuilt: 0,
      earnedThisRun: 0,
      towers: [],
      enemies: [],
      projectiles: [],
      effects: [],
      particles: [],
      floats: [],
      shake: 0,
      flash: 0,
      nextTowerId: 1,
      coreHitClock: 0
    };
  }

  function resetGame() {
    const coreMax = getBaseHp();
    game = {
      mode: 'prep',
      paused: false,
      time: 0,
      wave: 0,
      prepClock: PREP_TIME,
      waveClock: 0,
      spawnQueue: [],
      spawnIndex: 0,
      credits: getStartingCredits(),
      baseHp: coreMax,
      baseMaxHp: coreMax,
      kills: 0,
      towersBuilt: 0,
      earnedThisRun: 0,
      towers: [],
      enemies: [],
      projectiles: [],
      effects: [],
      particles: [],
      floats: [],
      shake: 0,
      flash: 0,
      nextTowerId: 1,
      coreHitClock: 0
    };
    selectedTowerId = null;
    selectedBuildType = 'pulse';
    updateHud();
  }

  // ---------- волны ----------
  function buildWave(number) {
    const spawns = [];
    const add = (type, count, gap, start) => {
      for (let i = 0; i < count; i++) {
        spawns.push({ type, at: (start || 0) + i * gap });
      }
    };

    const isBoss = number % 5 === 0;
    add('drone', 4 + Math.floor(number * 0.85), 0.7, 0);
    if (number >= 2) add('scout', 2 + Math.floor(number * 0.45), 0.45, 3);
    if (number >= 4) add('armor', 1 + Math.floor(number * 0.32), 1.5, 5.5);
    if (number >= 6) add('wraith', 1 + Math.floor(number * 0.28), 1.0, 8);
    if (number >= 8) add('splitter', 1 + Math.floor(number * 0.26), 1.2, 10.5);
    if (isBoss) add('boss', 1 + Math.floor(number / 20), 0, 14);

    spawns.sort((a, b) => a.at - b.at);
    return spawns;
  }

  function waveHpScale(number) {
    // линейный рост: при ×0.07 к 30-й волне множитель всего 3.03,
    // иначе HP обгоняет DPS игрока и поздние волны становятся непроходимыми
    return 1 + (number - 1) * 0.07;
  }

  function startWave() {
    if (game.mode !== 'prep') return;
    const bonus = Math.max(0, Math.floor(game.prepClock)) * 2;
    if (bonus > 0) {
      game.credits += bonus;
      game.earnedThisRun += bonus;
      showToast('ДОСРОЧНЫЙ СТАРТ +' + bonus + ' CR');
      tone(700, 0.12, 'triangle', 0.04, 320);
    }
    game.wave += 1;
    game.spawnQueue = buildWave(game.wave);
    game.spawnIndex = 0;
    game.waveClock = 0;
    game.mode = 'wave';
    const isBoss = game.wave % 5 === 0;
    showBanner(isBoss ? 'ВОЛНА ' + game.wave + ' // БОСС' : 'ВОЛНА ' + game.wave, isBoss);
    tone(150, 0.18, 'sine', 0.05, 300);
    updateHud();
  }

  function finishWave() {
    const reward = 35 + game.wave * 8;
    game.credits += reward;
    game.earnedThisRun += reward;
    tone(520, 0.16, 'triangle', 0.04, 260);
    if (game.wave >= TOTAL_WAVES) {
      endGame(true);
      return;
    }
    game.mode = 'prep';
    game.prepClock = PREP_TIME;
    game.spawnQueue = [];
    game.spawnIndex = 0;
    showToast('ВОЛНА ' + game.wave + ' ОТБИТА +' + reward + ' CR');
    updateHud();
  }

  // ---------- враги ----------
  function spawnEnemy(type) {
    const def = ENEMIES[type];
    if (!def) return;
    const scale = waveHpScale(game.wave);
    const enemy = {
      id: 'e' + game.nextTowerId++,
      type,
      hp: Math.round(def.hp * scale),
      maxHp: Math.round(def.hp * scale),
      speed: def.speed,
      reward: def.reward,
      color: def.color,
      r: def.r,
      shape: def.shape,
      armor: def.armor || 0,
      noSlow: !!def.noSlow,
      boss: !!def.boss,
      leak: def.leak || 1,
      splitInto: def.splitInto,
      splitCount: def.splitCount,
      segment: 0,
      segT: 0,
      x: pathPoints[0].x,
      y: pathPoints[0].y,
      angle: 0,
      slowFactor: 1,
      slowClock: 0,
      hitFlash: 0,
      dead: false
    };
    game.enemies.push(enemy);
  }

  function enemyStepSpeed(enemy) {
    let speedNow = enemy.speed;
    if (enemy.slowClock > 0) speedNow *= enemy.slowFactor;
    if (enemy.boss && game.wave >= 25) speedNow *= 1.12;
    return speedNow;
  }

  function advanceEnemy(enemy, dt) {
    let remaining = enemyStepSpeed(enemy) * dt;
    while (remaining > 0 && !enemy.dead) {
      if (enemy.segment >= pathPoints.length - 1) {
        leakEnemy(enemy);
        return;
      }
      const from = pathPoints[enemy.segment];
      const to = pathPoints[enemy.segment + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const segLen = Math.hypot(dx, dy) || 1;
      const left = segLen * (1 - enemy.segT);
      enemy.angle = Math.atan2(dy, dx);
      if (remaining >= left) {
        remaining -= left;
        enemy.segment += 1;
        enemy.segT = 0;
        if (enemy.segment >= pathPoints.length - 1) {
          enemy.x = to.x;
          enemy.y = to.y;
          leakEnemy(enemy);
          return;
        }
      } else {
        enemy.segT += remaining / segLen;
        remaining = 0;
      }
      const a = pathPoints[enemy.segment];
      const b = pathPoints[Math.min(enemy.segment + 1, pathPoints.length - 1)];
      const t = enemy.segT;
      enemy.x = a.x + (b.x - a.x) * t;
      enemy.y = a.y + (b.y - a.y) * t;
    }
  }

  function leakEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    game.baseHp = Math.max(0, game.baseHp - enemy.leak);
    game.shake = Math.max(game.shake, 14);
    game.flash = 0.5;
    game.coreHitClock = 0.4;
    spawnBurst(pathPoints[pathPoints.length - 1].x, pathPoints[pathPoints.length - 1].y, COLORS.red, 18, 190);
    tone(90, 0.22, 'sawtooth', 0.05, -40);
    if (game.baseHp <= 0) endGame(false);
  }

  function damageEnemy(enemy, amount, pierceArmor) {
    if (enemy.dead) return;
    let damage = amount;
    if (enemy.armor && !pierceArmor) damage = Math.max(1, amount - enemy.armor);
    else if (enemy.armor && pierceArmor) damage = Math.max(1, amount - enemy.armor * 0.5);
    enemy.hp -= damage;
    enemy.hitFlash = 0.12;
    addFloat(enemy.x, enemy.y - enemy.r - 6, String(Math.round(damage)), COLORS.white, 0.6);
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    game.kills += 1;
    game.credits += enemy.reward;
    game.earnedThisRun += enemy.reward;
    spawnBurst(enemy.x, enemy.y, enemy.color, enemy.boss ? 46 : 14, enemy.boss ? 260 : 150);
    addFloat(enemy.x, enemy.y, '+' + enemy.reward + ' CR', COLORS.orange, 0.9);
    if (enemy.boss) {
      game.shake = Math.max(game.shake, 20);
      tone(70, 0.4, 'sawtooth', 0.06, -20);
    } else {
      tone(280 + Math.random() * 90, 0.07, 'square', 0.018, -90);
    }
    if (enemy.splitInto && enemy.splitCount) {
      for (let i = 0; i < enemy.splitCount; i++) {
        const child = spawnSplit(enemy, enemy.splitInto);
        if (child) game.enemies.push(child);
      }
    }
  }

  function spawnSplit(parent, type) {
    const def = ENEMIES[type];
    if (!def) return null;
    const scale = waveHpScale(game.wave);
    return {
      id: 'e' + game.nextTowerId++,
      type,
      hp: Math.round(def.hp * scale * 0.5),
      maxHp: Math.round(def.hp * scale * 0.5),
      speed: def.speed * 1.15,
      reward: Math.max(1, Math.round(def.reward * 0.4)),
      color: def.color,
      r: def.r * 0.75,
      shape: def.shape,
      armor: 0,
      noSlow: false,
      boss: false,
      leak: 1,
      splitInto: null,
      splitCount: 0,
      segment: Math.max(0, parent.segment - 1),
      segT: parent.segT,
      x: parent.x,
      y: parent.y,
      angle: parent.angle,
      slowFactor: 1,
      slowClock: 0,
      hitFlash: 0,
      dead: false
    };
  }

  // ---------- башни ----------
  function towerStats(type, level) {
    const def = TOWERS[type];
    return {
      damage: def.damage * (1 + (level - 1) * 0.35) * getDamageBonus(),
      range: def.range * (1 + (level - 1) * 0.09),
      rate: def.rate * (1 + (level - 1) * 0.18) * getRateBonus()
    };
  }

  function towerTotalSpent(tower) {
    const def = TOWERS[tower.type];
    let total = def.cost;
    for (let i = 1; i < tower.level; i++) total += Math.round(def.cost * (0.8 * i));
    return total;
  }

  function towerUpgradeCost(tower) {
    const def = TOWERS[tower.type];
    if (tower.level >= MAX_TOWER_LEVEL) return Infinity;
    return Math.round(def.cost * (0.8 * tower.level));
  }

  function canPlace(col, row) {
    if (!isBuildable(col, row)) return false;
    return !game.towers.some((t) => t.col === col && t.row === row);
  }

  function placeTower(type, col, row) {
    const def = TOWERS[type];
    if (!def || !canPlace(col, row) || game.credits < def.cost) return false;
    game.credits -= def.cost;
    game.towersBuilt += 1;
    const tower = {
      id: game.nextTowerId++,
      type,
      col,
      row,
      x: (col + 0.5) * TILE,
      y: (row + 0.5) * TILE,
      level: 1,
      cooldown: 0,
      angle: -Math.PI / 2,
      targetId: null,
      recoil: 0,
      charge: 0,
      buildAnim: 0
    };
    game.towers.push(tower);
    spawnBurst(tower.x, tower.y, def.color, 12, 120);
    tone(430, 0.09, 'triangle', 0.03, 160);
    return true;
  }

  function upgradeTower(tower) {
    const cost = towerUpgradeCost(tower);
    if (!Number.isFinite(cost) || game.credits < cost) return false;
    game.credits -= cost;
    tower.level += 1;
    tower.buildAnim = 0.4;
    spawnBurst(tower.x, tower.y, TOWERS[tower.type].color, 18, 150);
    tone(620, 0.12, 'triangle', 0.035, 240);
    showToast(TOWERS[tower.type].name + ' УР ' + tower.level);
    return true;
  }

  function sellTower(tower) {
    const value = Math.floor(towerTotalSpent(tower) * 0.6);
    game.credits += value;
    spawnBurst(tower.x, tower.y, COLORS.orange, 14, 130);
    game.towers = game.towers.filter((t) => t !== tower);
    selectedTowerId = null;
    tone(220, 0.1, 'sine', 0.03, -80);
    showToast('ПРОДАНО +' + value + ' CR');
  }

  function findTarget(tower, range) {
    let best = null;
    let bestProgress = -1;
    const rangeSq = range * range;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      if (dx * dx + dy * dy > rangeSq) continue;
      const progress = enemy.segment + enemy.segT;
      if (progress > bestProgress) {
        bestProgress = progress;
        best = enemy;
      }
    }
    return best;
  }

  function updateTowers(dt) {
    for (const tower of game.towers) {
      const def = TOWERS[tower.type];
      const stats = towerStats(tower.type, tower.level);
      tower.recoil = Math.max(0, tower.recoil - dt * 4);
      tower.buildAnim = Math.max(0, tower.buildAnim - dt);
      tower.cooldown -= dt;

      const target = findTarget(tower, stats.range);
      tower.targetId = target ? target.id : null;
      if (target) {
        const wanted = Math.atan2(target.y - tower.y, target.x - tower.x);
        let diff = wanted - tower.angle;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        tower.angle += diff * Math.min(1, dt * 12);
      }

      if (target && tower.cooldown <= 0) {
        tower.cooldown = 1 / Math.max(0.1, stats.rate);
        tower.recoil = 1;
        fireTower(tower, target, stats, def);
      }
    }
  }

  function fireTower(tower, target, stats, def) {
    if (def.shot === 'beam') {
      game.effects.push({
        kind: 'beam',
        x: tower.x,
        y: tower.y,
        x2: target.x,
        y2: target.y,
        color: def.color,
        life: 0.22,
        maxLife: 0.22,
        width: 3 + tower.level * 1.4
      });
      const dirX = Math.cos(tower.angle);
      const dirY = Math.sin(tower.angle);
      const hitList = game.enemies
        .filter((e) => !e.dead && Math.abs((e.x - tower.x) * dirY - (e.y - tower.y) * dirX) < e.r + 8)
        .sort((a, b) => Math.hypot(a.x - tower.x, a.y - tower.y) - Math.hypot(b.x - tower.x, b.y - tower.y));
      for (const enemy of hitList) damageEnemy(enemy, stats.damage, false);
      tone(180, 0.1, 'sawtooth', 0.035, 900);
      return;
    }

    if (def.shot === 'chain') {
      const hitIds = new Set();
      let current = target;
      let fromX = tower.x;
      let fromY = tower.y;
      for (let i = 0; i < def.chain; i++) {
        if (!current || current.dead) break;
        hitIds.add(current.id);
        game.effects.push({
          kind: 'chain',
          x: fromX,
          y: fromY,
          x2: current.x,
          y2: current.y,
          color: def.color,
          life: 0.16,
          maxLife: 0.16,
          width: 2.4
        });
        damageEnemy(current, stats.damage, true);
        fromX = current.x;
        fromY = current.y;
        current = nearestEnemy(fromX, fromY, 96, hitIds);
      }
      tone(880, 0.07, 'square', 0.028, -420);
      return;
    }

    if (def.shot === 'shell') {
      game.projectiles.push({
        kind: 'shell',
        x: tower.x,
        y: tower.y,
        sx: tower.x,
        sy: tower.y,
        tx: target.x,
        ty: target.y,
        speed: 260,
        damage: stats.damage,
        splash: def.splash,
        color: def.color,
        life: 3,
        pierceArmor: false
      });
      tone(150, 0.09, 'sine', 0.03, -30);
      return;
    }

    game.projectiles.push({
      kind: 'bolt',
      x: tower.x,
      y: tower.y,
      targetId: target.id,
      speed: 620,
      damage: stats.damage,
      splash: 0,
      color: def.color,
      slow: def.slow || 0,
      slowTime: def.slowTime || 0,
      life: 2.4,
      pierceArmor: false
    });
    tone(def.slow ? 620 : 520, 0.05, 'square', 0.02, -220);
  }

  function nearestEnemy(x, y, radius, exclude) {
    let best = null;
    let bestDist = radius * radius;
    for (const enemy of game.enemies) {
      if (enemy.dead || (exclude && exclude.has(enemy.id))) continue;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    return best;
  }

  // ---------- снаряды ----------
  function updateProjectiles(dt) {
    for (const p of game.projectiles) {
      p.life -= dt;
      if (p.life <= 0) continue;

      if (p.kind === 'shell') {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.hypot(dx, dy);
        const step = p.speed * dt;
        if (dist <= step || dist < 6) {
          explode(p);
          p.life = 0;
          continue;
        }
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.progress = Math.min(1, p.progress + step / Math.max(1, p.travel || (p.travel = Math.hypot(p.tx - p.sx, p.ty - p.sy))));
        continue;
      }

      const target = game.enemies.find((e) => e.id === p.targetId && !e.dead);
      if (!target) {
        p.life = 0;
        continue;
      }
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const step = p.speed * dt;
      p.angle = Math.atan2(dy, dx);
      if (dist <= step + target.r * 0.5) {
        if (p.slow) {
          if (!target.noSlow) {
            target.slowFactor = 1 - p.slow;
            target.slowClock = Math.max(target.slowClock, p.slowTime);
          }
          damageEnemy(target, p.damage, false);
        } else {
          damageEnemy(target, p.damage, p.pierceArmor);
        }
        game.effects.push({
          kind: 'hit',
          x: target.x,
          y: target.y,
          color: p.color,
          life: 0.16,
          maxLife: 0.16,
          width: 2
        });
        p.life = 0;
        continue;
      }
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
    game.projectiles = game.projectiles.filter((p) => p.life > 0);
  }

  function explode(p) {
    game.effects.push({
      kind: 'explosion',
      x: p.tx,
      y: p.ty,
      radius: p.splash,
      color: p.color,
      life: 0.32,
      maxLife: 0.32,
      width: 2
    });
    spawnBurst(p.tx, p.ty, p.color, 16, 180);
    game.shake = Math.max(game.shake, 5);
    tone(110, 0.16, 'sawtooth', 0.04, -40);
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dist = Math.hypot(enemy.x - p.tx, enemy.y - p.ty);
      if (dist > p.splash + enemy.r) continue;
      const falloff = 1 - Math.min(1, dist / (p.splash + enemy.r)) * 0.55;
      damageEnemy(enemy, p.damage * falloff, false);
    }
  }

  // ---------- частицы и текст ----------
  function spawnBurst(x, y, color, count, force) {
    if (reducedMotion) count = Math.min(count, 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const speed = force * (0.3 + Math.random() * 0.7);
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        color,
        r: 1 + Math.random() * 2.2
      });
    }
  }

  function addFloat(x, y, text, color, life) {
    if (game.floats.length > 40) game.floats.shift();
    game.floats.push({ x, y, text, color, life, maxLife: life });
  }

  function updateEffects(dt) {
    for (const p of game.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    game.particles = game.particles.filter((p) => p.life > 0);
    for (const e of game.effects) e.life -= dt;
    game.effects = game.effects.filter((e) => e.life > 0);
    for (const f of game.floats) {
      f.life -= dt;
      f.y -= dt * 26;
    }
    game.floats = game.floats.filter((f) => f.life > 0);
  }

  // ---------- обновление ----------
  function update(dt) {
    if (game.paused || game.mode === 'menu') return;
    const step = dt * speed;
    game.time += step;
    game.shake = Math.max(0, game.shake - step * 34);
    game.flash = Math.max(0, game.flash - step * 2.2);
    game.coreHitClock = Math.max(0, game.coreHitClock - step);

    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      if (enemy.slowClock > 0) {
        enemy.slowClock -= step;
        if (enemy.slowClock <= 0) enemy.slowFactor = 1;
      }
      enemy.hitFlash = Math.max(0, enemy.hitFlash - step);
      advanceEnemy(enemy, step);
    }
    game.enemies = game.enemies.filter((e) => !e.dead);

    if (game.mode === 'wave') {
      game.waveClock += step;
      while (game.spawnIndex < game.spawnQueue.length && game.spawnQueue[game.spawnIndex].at <= game.waveClock) {
        spawnEnemy(game.spawnQueue[game.spawnIndex].type);
        game.spawnIndex += 1;
      }
    } else if (game.mode === 'prep') {
      game.prepClock -= step;
      if (game.prepClock <= 0) {
        game.prepClock = 0;
        startWave();
      }
    }

    updateTowers(step);
    updateProjectiles(step);
    updateEffects(step);

    if (game.mode === 'wave' && game.spawnIndex >= game.spawnQueue.length && game.enemies.length === 0) {
      finishWave();
    }
  }

  function enemiesRemaining() {
    const pending = game.spawnQueue.length - game.spawnIndex;
    return pending + game.enemies.length;
  }

  // ---------- конец игры ----------
  function endGame(won) {
    game.mode = won ? 'win' : 'over';
    const previousBest = getBest();
    const reached = won ? TOTAL_WAVES : Math.max(0, game.wave - 1);
    if (reached > profile.bestWave) {
      profile.bestWave = reached;
      try {
        localStorage.setItem(STORAGE_BEST, String(reached));
      } catch (error) {
        /* игнорируем */
      }
    }
    profile.runs += 1;
    profile.credits += game.earnedThisRun;
    saveProfile();

    if (won) {
      els.winCredits.textContent = game.earnedThisRun + ' CR';
      els.winKills.textContent = String(game.kills);
      els.winTowers.textContent = String(game.towersBuilt);
      showScreen(els.winScreen);
      tone(520, 0.3, 'triangle', 0.05, 400);
    } else {
      els.finalWave.textContent = String(Math.max(1, game.wave)).padStart(2, '0');
      els.finalKills.textContent = String(game.kills);
      els.finalTowers.textContent = String(game.towersBuilt);
      els.runCredits.textContent = '+' + game.earnedThisRun + ' CR';
      els.newRecord.classList.toggle('is-hidden', reached <= previousBest);
      showScreen(els.gameoverScreen);
      tone(160, 0.4, 'sawtooth', 0.05, -90);
    }
    updateProfileUi();
  }

  function returnToMenu() {
    game = createGame();
    selectedTowerId = null;
    hideAllScreens();
    els.hud.classList.add('is-hidden');
    els.buildBar.classList.add('is-hidden');
    els.selectionPanel.classList.add('is-hidden');
    game.mode = 'menu';
    updateUiInsets();
    updateProfileUi();
  }

  function startGame() {
    ensureAudio();
    hideAllScreens();
    resetGame();
    els.hud.classList.remove('is-hidden');
    els.buildBar.classList.remove('is-hidden');
    updateUiInsets();
    showBanner('ОБОРОНА НАЧАЛАСЬ');
    tone(160, 0.18, 'sine', 0.04, 300);
    updateHud();
    // поле широкое: в портретной ориентации советуем повернуть устройство
    if (viewport.h > viewport.w) window.setTimeout(() => showToast('СОВЕТ: ПОВЕРНИ УСТРОЙСТВО ГОРИЗОНТАЛЬНО'), 1700);
  }

  // ---------- интерфейс ----------
  function showScreen(node) {
    hideAllScreens();
    if (node) node.classList.remove('is-hidden');
  }

  function hideAllScreens() {
    [els.menu, els.pauseScreen, els.gameoverScreen, els.winScreen, els.shop].forEach((s) => s.classList.add('is-hidden'));
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('visible');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => els.toast.classList.remove('visible'), 1900);
  }

  function showBanner(text, danger) {
    els.waveBanner.querySelector('span').textContent = text;
    els.waveBanner.classList.toggle('danger', !!danger);
    els.waveBanner.classList.add('show');
    window.clearTimeout(bannerTimeout);
    bannerTimeout = window.setTimeout(() => els.waveBanner.classList.remove('show'), 1500);
  }

  function updatePips() {
    const total = game.baseMaxHp;
    const ratio = total ? game.baseHp / total : 0;
    // на узких экранах показываем меньше пипсов и всегда дублируем числом
    const maxShown = Math.min(total, viewport.w <= 520 ? 6 : viewport.w <= 820 ? 10 : 20);
    const filledCount = Math.ceil(ratio * maxShown);
    let html = '';
    for (let i = 0; i < maxShown; i++) {
      html += '<i class="pip' + (i < filledCount ? '' : ' empty') + '"></i>';
    }
    if (total > maxShown || viewport.w <= 820) {
      html += '<strong class="pip-value">' + game.baseHp + '</strong>';
    }
    els.healthPips.innerHTML = html;
  }

  function updateHud() {
    els.waveValue.textContent = String(Math.max(1, game.wave)).padStart(2, '0');
    els.waveTotal.textContent = '/' + TOTAL_WAVES;
    els.creditsValue.textContent = String(game.credits);
    els.enemyCountValue.textContent = String(enemiesRemaining()).padStart(2, '0');
    updatePips();

    if (game.mode === 'prep') {
      els.startWaveButton.classList.remove('combat');
      els.startWaveButton.querySelector('span').textContent = 'НАЧАТЬ ВОЛНУ ' + (game.wave + 1);
      els.prepTimer.textContent = Math.ceil(game.prepClock) + 'с · +' + Math.max(0, Math.floor(game.prepClock) * 2) + ' CR';
    } else {
      els.startWaveButton.classList.add('combat');
      els.startWaveButton.querySelector('span').textContent = game.mode === 'wave' ? 'ВОЛНА ИДЁТ' : 'ПАУЗА';
      els.prepTimer.textContent = enemiesRemaining() + ' ВРАГОВ';
    }
    updateRepairButton();
    updateTowerCards();
    updateSelectionPanel();
  }

  function updateRepairButton() {
    if (!els.repairButton) return;
    const cost = repairCost();
    const ready = game.mode === 'prep' && Number.isFinite(cost);
    els.repairButton.classList.toggle('is-hidden', !ready);
    if (!ready) return;
    els.repairButton.disabled = game.credits < cost;
    els.repairCost.textContent = cost + ' CR';
    els.repairButton.title = 'Восстановить базу до ' + game.baseMaxHp + ' HP';
  }

  function buildTowerCards() {
    els.towerCards.innerHTML = TOWER_ORDER.map((type, i) => {
      const def = TOWERS[type];
      return '<button class="tower-card" data-tower="' + type + '" type="button">' +
        '<span class="tower-key">' + (i + 1) + '</span>' +
        '<span class="tower-glyph" style="background:' + def.color + '">' + def.glyph + '</span>' +
        '<span class="tower-name">' + def.name.toUpperCase() + '</span>' +
        '<span class="tower-cost">' + def.cost + ' CR</span>' +
        '</button>';
    }).join('');
  }

  function updateTowerCards() {
    for (const card of els.towerCards.querySelectorAll('.tower-card')) {
      const type = card.dataset.tower;
      const def = TOWERS[type];
      const unlocked = towerUnlocked(type);
      const poor = game.credits < def.cost;
      card.classList.toggle('locked', !unlocked);
      card.classList.toggle('poor', unlocked && poor);
      card.classList.toggle('selected', selectedBuildType === type && !selectedTowerId);
      const cost = card.querySelector('.tower-cost');
      cost.textContent = unlocked ? def.cost + ' CR' : 'ЗАКРЫТО';
    }
  }

  function updateSelectionPanel() {
    const tower = game.towers.find((t) => t.id === selectedTowerId);
    if (!tower) {
      els.selectionPanel.classList.add('is-hidden');
      return;
    }
    const def = TOWERS[tower.type];
    const stats = towerStats(tower.type, tower.level);
    els.selectionPanel.classList.remove('is-hidden');
    els.selectionIcon.textContent = def.glyph;
    els.selectionIcon.style.background = def.color;
    els.selectionName.textContent = def.name;
    els.selectionLevel.textContent = 'УРОВЕНЬ ' + tower.level + ' / ' + MAX_TOWER_LEVEL;
    els.selectionDamage.textContent = String(Math.round(stats.damage));
    els.selectionRange.textContent = String(Math.round(stats.range));
    els.selectionLevelStat.textContent = String(tower.level);

    const cost = towerUpgradeCost(tower);
    const canUpgrade = Number.isFinite(cost) && game.credits >= cost;
    els.upgradeTowerButton.disabled = !canUpgrade;
    els.upgradeTowerCost.textContent = Number.isFinite(cost) ? cost + ' CR' : 'МАКС';
    els.sellTowerValue.textContent = '+' + Math.floor(towerTotalSpent(tower) * 0.6) + ' CR';
  }

  function updateProfileUi() {
    const credits = profile.credits;
    const formatted = credits.toLocaleString('ru-RU') + ' CR';
    els.menuCreditsValue.textContent = formatted;
    els.shopCreditsValue.textContent = formatted;
    els.runCountValue.textContent = String(profile.runs);
    els.bestValue.textContent = String(getBest()).padStart(2, '0');
    updateDailyUi();
    renderShop();
  }

  function dailyAvailable() {
    return Date.now() - profile.dailyAt >= DAILY_INTERVAL;
  }

  function updateDailyUi() {
    const available = dailyAvailable();
    els.dailyStatus.textContent = available ? 'Бонус доступен' : 'Бонус уже получен. Приходи завтра.';
    els.dailyButton.disabled = !available;
    els.dailyButton.textContent = available ? 'ЗАБРАТЬ +' + DAILY_REWARD + ' CR' : 'ПОЛУЧЕНО';
    els.menuDailyButton.disabled = !available;
    els.menuDailyButton.textContent = available ? 'ЕЖЕДНЕВНЫЙ БОНУС // +' + DAILY_REWARD + ' CR' : 'БОНУС ПОЛУЧЕН // ЖДЁМ ЗАВТРА';
  }

  function claimDaily(target) {
    if (!dailyAvailable()) {
      showToast('БОНУС УЖЕ ПОЛУЧЕН');
      return;
    }
    profile.credits += DAILY_REWARD;
    profile.dailyAt = Date.now();
    saveProfile();
    updateProfileUi();
    showToast('+' + DAILY_REWARD + ' CR');
    tone(660, 0.14, 'triangle', 0.04, 320);
    const other = target === els.dailyButton ? els.menuDailyButton : els.dailyButton;
    if (other) other.blur();
  }

  function renderShop() {
    document.querySelectorAll('.upgrade-card').forEach((card) => {
      const id = card.dataset.upgrade;
      const item = SHOP_ITEMS[id];
      const level = getUpgrade(id);
      const maxed = level >= item.maxLevel;
      const cost = maxed ? 0 : item.costs[level];
      const levelLabel = card.querySelector('.upgrade-level');
      const button = card.querySelector('.buy-button');
      const track = card.querySelectorAll('.level-track i');

      levelLabel.textContent = maxed ? 'МАКС' : 'УР ' + level + ' / ' + item.maxLevel;
      track.forEach((i, index) => i.classList.toggle('on', index < level));
      card.classList.toggle('maxed', maxed);
      button.textContent = maxed ? 'ОТКРЫТО' : cost + ' CR';
      button.disabled = maxed || profile.credits < cost;
    });
  }

  function buyUpgrade(id) {
    const item = SHOP_ITEMS[id];
    if (!item) return;
    const level = getUpgrade(id);
    if (level >= item.maxLevel) return;
    const cost = item.costs[level];
    if (profile.credits < cost) {
      showToast('НЕДОСТАТОЧНО КРЕДИТОВ');
      return;
    }
    profile.credits -= cost;
    profile.upgrades[id] = level + 1;
    saveProfile();
    updateProfileUi();
    showToast(item.name + ' УР ' + (level + 1));
    tone(600, 0.12, 'triangle', 0.035, 220);
  }

  function openShop(mode) {
    shopReturnMode = mode;
    game.paused = true;
    updateProfileUi();
    showScreen(els.shop);
  }

  function closeShop() {
    showScreen(null);
    game.paused = false;
    if (shopReturnMode === 'pause') {
      showScreen(els.pauseScreen);
    } else if (shopReturnMode === 'over') {
      showScreen(els.gameoverScreen);
    } else if (shopReturnMode === 'win') {
      showScreen(els.winScreen);
    }
  }

  function pauseGame() {
    if (game.mode === 'menu' || game.mode === 'over' || game.mode === 'win') return;
    game.paused = true;
    showScreen(els.pauseScreen);
  }

  function resumeGame() {
    game.paused = false;
    showScreen(null);
  }

  function toggleSpeed() {
    speed = speed === 1 ? 2 : 1;
    els.speedButton.textContent = speed + '×';
    els.speedButton.classList.toggle('active', speed === 2);
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    els.soundButton.classList.toggle('muted', !soundEnabled);
    els.soundButton.setAttribute('aria-label', soundEnabled ? 'Выключить звук' : 'Включить звук');
    if (soundEnabled) {
      ensureAudio();
      tone(520, 0.08, 'triangle', 0.03, 160);
    }
  }

  // ---------- ввод ----------
  function boardTransform() {
    const t = uiInsets;
    const availableH = Math.max(160, viewport.h - t.top - t.bottom);
    const scale = Math.min(viewport.w / BOARD_W, availableH / BOARD_H);
    const boardH = BOARD_H * scale;
    const ox = (viewport.w - BOARD_W * scale) / 2;
    // если остаётся много пустоты (узкий экран), прижимаем поле к верху,
    // чтобы пустое место собиралось у нижней панели, а не висело по центру
    const slack = availableH - boardH;
    const oy = t.top + (slack > 150 ? Math.min(slack, 40) : slack / 2);
    return { scale, ox, oy };
  }

  function screenToTile(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const t = boardTransform();
    const x = (clientX - rect.left - t.ox) / t.scale;
    const y = (clientY - rect.top - t.oy) / t.scale;
    return {
      col: Math.floor(x / TILE),
      row: Math.floor(y / TILE),
      inside: x >= 0 && y >= 0 && x < BOARD_W && y < BOARD_H
    };
  }

  function handlePointer(clientX, clientY) {
    if (game.mode === 'menu' || game.mode === 'over' || game.mode === 'win' || game.paused) return;
    const tile = screenToTile(clientX, clientY);
    if (!tile.inside) return;
    hoverTile = tile;

    const existing = game.towers.find((t) => t.col === tile.col && t.row === tile.row);
    if (existing) {
      selectedTowerId = existing.id;
      updateHud();
      tone(360, 0.05, 'sine', 0.02, 60);
      return;
    }

    selectedTowerId = null;
    const type = selectedBuildType;
    if (!towerUnlocked(type)) {
      showToast('БАШНЯ ЗАКРЫТА // МАГАЗИН');
      return;
    }
    if (game.credits < TOWERS[type].cost) {
      showToast('НЕДОСТАТОЧНО КРЕДИТОВ');
      return;
    }
    if (placeTower(type, tile.col, tile.row)) {
      updateHud();
    } else {
      showToast('ЗДЕСЬ СТРОИТЬ НЕЛЬЗЯ');
    }
  }

  function selectBuildType(type) {
    if (!towerUnlocked(type)) {
      showToast('БАШНЯ ЗАКРЫТА // МАГАЗИН');
      return;
    }
    selectedBuildType = type;
    selectedTowerId = null;
    updateHud();
  }

  function setupInput() {
    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handlePointer(event.clientX, event.clientY);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') {
        hoverTile = screenToTile(event.clientX, event.clientY);
      }
    });
    canvas.addEventListener('pointerleave', () => {
      hoverTile = null;
    });
    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      selectedTowerId = null;
      updateHud();
    });

    els.towerCards.addEventListener('click', (event) => {
      const card = event.target.closest('.tower-card');
      if (card) selectBuildType(card.dataset.tower);
    });

    els.startWaveButton.addEventListener('click', () => {
      ensureAudio();
      startWave();
    });

    els.repairButton.addEventListener('click', () => {
      ensureAudio();
      repairBase();
    });

    els.upgradeTowerButton.addEventListener('click', () => {
      const tower = game.towers.find((t) => t.id === selectedTowerId);
      if (tower && upgradeTower(tower)) updateHud();
    });

    els.sellTowerButton.addEventListener('click', () => {
      const tower = game.towers.find((t) => t.id === selectedTowerId);
      if (tower) {
        sellTower(tower);
        updateHud();
      }
    });

    els.playButton.addEventListener('click', startGame);
    els.retryButton.addEventListener('click', startGame);
    els.winRetryButton.addEventListener('click', startGame);
    els.pauseButton.addEventListener('click', pauseGame);
    els.resumeButton.addEventListener('click', resumeGame);
    els.speedButton.addEventListener('click', toggleSpeed);
    els.soundButton.addEventListener('click', toggleSound);
    els.quitButton.addEventListener('click', returnToMenu);
    els.menuButton.addEventListener('click', returnToMenu);
    els.winMenuButton.addEventListener('click', returnToMenu);

    els.shopButton.addEventListener('click', () => openShop('menu'));
    els.pauseShopButton.addEventListener('click', () => openShop('pause'));
    els.resultShopButton.addEventListener('click', () => openShop('over'));
    els.winShopButton.addEventListener('click', () => openShop('win'));
    els.closeShopButton.addEventListener('click', closeShop);
    els.dailyButton.addEventListener('click', () => claimDaily(els.dailyButton));
    els.menuDailyButton.addEventListener('click', () => claimDaily(els.menuDailyButton));

    document.querySelector('.shop-grid').addEventListener('click', (event) => {
      const button = event.target.closest('.buy-button');
      if (button) buyUpgrade(button.dataset.buy);
    });

    window.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key >= '1' && key <= '5') {
        const type = TOWER_ORDER[Number(key) - 1];
        if (type) selectBuildType(type);
        return;
      }
      if (key === 'Escape') {
        if (!els.shop.classList.contains('is-hidden')) {
          closeShop();
        } else if (game.paused && game.mode !== 'menu') {
          resumeGame();
        } else {
          selectedTowerId = null;
          updateHud();
        }
        return;
      }
      if (key === ' ' || key === 'Enter') {
        if (game.mode === 'prep' && !game.paused) {
          event.preventDefault();
          startWave();
        } else if (key === ' ' && (game.mode === 'menu')) {
          event.preventDefault();
          startGame();
        }
        return;
      }
      if ((key === 'p' || key === 'P' || key === 'з' || key === 'З') && game.mode !== 'menu') {
        if (game.paused) resumeGame();
        else pauseGame();
      }
    });

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('blur', () => {
      if (game.mode === 'wave' || game.mode === 'prep') pauseGame();
    });
  }

  // ---------- звук ----------
  function ensureAudio() {
    if (!soundEnabled) return;
    if (!audio.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        audio.context = new AudioContextClass();
        audio.master = audio.context.createGain();
        audio.master.gain.value = 0.6;
        audio.master.connect(audio.context.destination);
      } catch (error) {
        audio.context = null;
        audio.master = null;
      }
    }
    if (audio.context && audio.context.state === 'suspended') audio.context.resume().catch(() => {});
  }

  function tone(frequency, duration, type = 'sine', volume = 0.03, slide = 0) {
    if (!soundEnabled || !audio.context || !audio.master) return;
    const now = audio.context.currentTime;
    const oscillator = audio.context.createOscillator();
    const gain = audio.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audio.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  // ---------- отрисовка ----------
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    viewport.w = Math.max(320, rect.width);
    viewport.h = Math.max(360, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(viewport.w * dpr);
    canvas.height = Math.round(viewport.h * dpr);
    updateUiInsets();
  }

  function updateUiInsets() {
    const compact = viewport.w <= 820;
    uiInsets.top = compact ? 50 : 60;
    const bar = els.buildBar;
    if (bar && !bar.classList.contains('is-hidden')) {
      uiInsets.bottom = Math.min(viewport.h * 0.42, bar.getBoundingClientRect().height + 16);
    } else {
      uiInsets.bottom = compact ? 40 : 24;
    }
  }

  function hexPath(context, x, y, r, rotation = 0) {
    context.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = rotation + (i / 6) * TAU;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, viewport.h);
    grad.addColorStop(0, '#080b1c');
    grad.addColorStop(1, '#05070f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewport.w, viewport.h);

    for (const s of stars) {
      const alpha = s.a * (0.65 + Math.sin(ambientTime * s.s + s.x * 10) * 0.35);
      ctx.fillStyle = 'rgba(99, 231, 255, ' + alpha.toFixed(3) + ')';
      ctx.fillRect(s.x * viewport.w, s.y * viewport.h, s.r, s.r);
    }
  }

  function drawBoard(t) {
    ctx.save();
    ctx.translate(t.ox, t.oy);
    ctx.scale(t.scale, t.scale);

    // подложка поля
    ctx.fillStyle = 'rgba(9, 14, 34, 0.86)';
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    // сетка
    ctx.strokeStyle = 'rgba(79, 147, 190, 0.11)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= COLS; c++) {
      ctx.moveTo(c * TILE, 0);
      ctx.lineTo(c * TILE, BOARD_H);
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.moveTo(0, r * TILE);
      ctx.moveTo(0, r * TILE);
      ctx.lineTo(BOARD_W, r * TILE);
    }
    ctx.stroke();

    drawRoad(t);
    drawBuildableHints(t);

    // рамка
    ctx.strokeStyle = 'rgba(99, 231, 255, 0.34)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, BOARD_W - 2, BOARD_H - 2);

    ctx.restore();
  }

  function drawRoad(t) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(4, 8, 22, 0.95)';
    ctx.lineWidth = TILE - 6;
    ctx.beginPath();
    pathPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    ctx.strokeStyle = 'rgba(99, 231, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // бегущие штрихи
    ctx.save();
    ctx.strokeStyle = 'rgba(99, 231, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 26]);
    ctx.lineDashOffset = -ambientTime * 34;
    ctx.beginPath();
    pathPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  }

  function drawBuildableHints(t) {
    const def = TOWERS[selectedBuildType];
    if (!def || game.mode === 'menu') return;
    const active = !game.paused && game.credits >= def.cost;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (!isBuildable(c, r)) continue;
        if (game.towers.some((tw) => tw.col === c && tw.row === r)) continue;
        const occupied = hoverTile && hoverTile.col === c && hoverTile.row === r && hoverTile.inside;
        ctx.fillStyle = occupied
          ? active ? 'rgba(99, 231, 255, 0.24)' : 'rgba(255, 95, 109, 0.24)'
          : 'rgba(99, 231, 255, 0.045)';
        ctx.fillRect(c * TILE + 5, r * TILE + 5, TILE - 10, TILE - 10);
        if (occupied) {
          ctx.strokeStyle = active ? def.color : COLORS.red;
          ctx.lineWidth = 2;
          ctx.strokeRect(c * TILE + 5, r * TILE + 5, TILE - 10, TILE - 10);
        }
      }
    }
  }

  function drawSpawnAndCore(t) {
    const start = pathPoints[0];
    const pulse = 1 + Math.sin(ambientTime * 2.4) * 0.06;
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.strokeStyle = 'rgba(255, 79, 189, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, TILE * 0.42 * pulse, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 79, 189, 0.14)';
    ctx.fill();
    ctx.restore();

    const core = pathPoints[pathPoints.length - 1];
    const hpRatio = game.baseMaxHp ? game.baseHp / game.baseMaxHp : 0;
    const hit = game.coreHitClock > 0;
    ctx.save();
    ctx.translate(core.x, core.y);
    const glow = hit ? 1 + Math.sin(ambientTime * 34) * 0.14 : 1 + Math.sin(ambientTime * 2) * 0.05;
    ctx.scale(glow, glow);
    hexPath(ctx, 0, 0, TILE * 0.44, ambientTime * 0.35);
    ctx.fillStyle = 'rgba(98, 246, 189, 0.12)';
    ctx.fill();
    ctx.strokeStyle = hit ? COLORS.red : COLORS.green;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    hexPath(ctx, 0, 0, TILE * 0.24, -ambientTime * 0.6);
    ctx.strokeStyle = hpRatio < 0.35 ? COLORS.orange : COLORS.green;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawTowers(t) {
    const selected = game.towers.find((tw) => tw.id === selectedTowerId);
    if (selected) {
      const stats = towerStats(selected.type, selected.level);
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 231, 255, 0.3)';
      ctx.fillStyle = 'rgba(99, 231, 255, 0.06)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(selected.x, selected.y, stats.range, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (const tower of game.towers) {
      const def = TOWERS[tower.type];
      const isSelected = tower.id === selectedTowerId;
      const recoil = tower.recoil * 4;
      ctx.save();
      ctx.translate(tower.x, tower.y);

      // основание
      hexPath(ctx, 0, 0, TILE * 0.36, Math.PI / 6);
      ctx.fillStyle = 'rgba(8, 14, 34, 0.96)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? COLORS.cyanBright : 'rgba(99, 231, 255, 0.42)';
      ctx.lineWidth = isSelected ? 2.6 : 1.8;
      ctx.stroke();

      if (tower.buildAnim > 0) {
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        hexPath(ctx, 0, 0, TILE * (0.36 + (1 - tower.buildAnim / 0.4) * 0.5), Math.PI / 6);
        ctx.stroke();
      }

      ctx.rotate(tower.angle);
      ctx.translate(-recoil, 0);
      drawTowerBarrel(tower, def);
      ctx.restore();

      // уровень
      const pips = tower.level;
      ctx.fillStyle = def.color;
      for (let i = 0; i < pips; i++) {
        ctx.fillRect(-(pips - 1) * 3 + i * 6, -TILE * 0.34, 4, 2.4);
      }
    }
  }

  function drawTowerBarrel(tower, def) {
    ctx.fillStyle = def.color;
    if (tower.type === 'rail') {
      ctx.fillRect(0, -2.2, TILE * 0.52, 4.4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(TILE * 0.42, -1.2, TILE * 0.1, 2.4);
    } else if (tower.type === 'mortar') {
      ctx.fillRect(0, -4.4, TILE * 0.32, 8.8);
      ctx.beginPath();
      ctx.arc(TILE * 0.32, 0, 5, 0, TAU);
      ctx.fill();
    } else if (tower.type === 'cryo') {
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.rotate(i * 0.5 + ambientTime * 1.2);
        ctx.fillRect(0, -1.8, TILE * 0.28, 3.6);
        ctx.restore();
      }
    } else if (tower.type === 'tesla') {
      ctx.beginPath();
      ctx.arc(TILE * 0.12, 0, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(TILE * 0.12, 0, 3, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillRect(0, -2.6, TILE * 0.42, 5.2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, TAU);
    ctx.fill();
  }

  function drawEnemies(t) {
    for (const enemy of game.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      const slow = enemy.slowClock > 0;

      if (slow) {
        ctx.strokeStyle = 'rgba(98, 246, 189, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.r + 4, 0, TAU);
        ctx.stroke();
      }

      ctx.rotate(enemy.angle + Math.PI / 2);
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = enemy.boss ? 18 : 10;
      drawEnemyShape(enemy);
      ctx.shadowBlur = 0;

      if (enemy.armor) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.restore();

      if (enemy.hp < enemy.maxHp) {
        const ratio = Math.max(0, enemy.hp / enemy.maxHp);
        const w = enemy.r * 2.2;
        const y = enemy.y - enemy.r - 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(enemy.x - w / 2, y, w, 3.4);
        ctx.fillStyle = ratio > 0.5 ? COLORS.green : ratio > 0.25 ? COLORS.orange : COLORS.red;
        ctx.fillRect(enemy.x - w / 2, y, w * ratio, 3.4);
      }
    }
  }

  function drawEnemyShape(enemy) {
    const r = enemy.r;
    switch (enemy.shape) {
      case 'tri':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.9, r * 0.7);
        ctx.lineTo(-r * 0.9, r * 0.7);
        ctx.closePath();
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.72, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.72, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'cluster':
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * TAU;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.55, 0, TAU);
          ctx.fill();
        }
        break;
      case 'boss':
        hexPath(ctx, 0, 0, r, ambientTime * 0.3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(10, 6, 12, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, TAU);
        ctx.fill();
        break;
      default:
        hexPath(ctx, 0, 0, r, ambientTime * 0.6);
        ctx.fill();
    }
  }

  function drawProjectiles(t) {
    for (const p of game.projectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      if (p.kind === 'shell') {
        const height = Math.sin((p.progress || 0) * Math.PI) * 54;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 4.5, 2.2, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y - height, 4.6, 0, TAU);
        ctx.fill();
      } else {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle || 0);
        ctx.fillRect(-6, -1.4, 12, 2.8);
      }
      ctx.restore();
    }
  }

  function drawEffects(t) {
    for (const e of game.effects) {
      const ratio = Math.max(0, e.life / e.maxLife);
      ctx.save();
      ctx.globalAlpha = ratio;
      ctx.strokeStyle = e.color;
      ctx.fillStyle = e.color;
      if (e.kind === 'beam') {
        ctx.lineWidth = e.width * ratio;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
      } else if (e.kind === 'chain') {
        ctx.lineWidth = e.width;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        const steps = 4;
        for (let i = 1; i < steps; i++) {
          const f = i / steps;
          const jitter = (i % 2 === 0 ? 1 : -1) * 9;
          ctx.lineTo(e.x + (e.x2 - e.x) * f + jitter, e.y + (e.y2 - e.y) * f - jitter * 0.5);
        }
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
      } else if (e.kind === 'explosion') {
        ctx.globalAlpha = ratio * 0.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (1.25 - ratio * 0.25), 0, TAU);
        ctx.fill();
        ctx.globalAlpha = ratio;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (1 - ratio * 0.4), 0, TAU);
        ctx.stroke();
      } else {
        ctx.globalAlpha = ratio;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6 + (1 - ratio) * 10, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawParticles(t) {
    for (const p of game.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      ctx.restore();
    }
  }

  function drawFloats(t) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 11px "Arial Black", sans-serif';
    for (const f of game.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function render() {
    // всегда начинаем с чистого преобразования под devicePixelRatio
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const t = boardTransform();
    drawBackground();

    const shake = game.shake > 0 ? game.shake : 0;
    if (shake > 0 && !reducedMotion) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawBoard(t);

    ctx.save();
    ctx.translate(t.ox, t.oy);
    ctx.scale(t.scale, t.scale);
    drawSpawnAndCore(t);
    drawTowers(t);
    drawProjectiles(t);
    drawEnemies(t);
    drawEffects(t);
    drawParticles(t);
    drawFloats(t);
    ctx.restore();

    if (game.flash > 0) {
      ctx.fillStyle = 'rgba(255, 95, 109, ' + (game.flash * 0.28).toFixed(3) + ')';
      ctx.fillRect(0, 0, viewport.w, viewport.h);
    }
  }

  // ---------- цикл ----------
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    ambientTime += dt;
    update(dt);

    uiClock += dt;
    if (uiClock > 0.12) {
      uiClock = 0;
      if (game.mode === 'prep' || game.mode === 'wave') updateHud();
    }

    render();
    requestAnimationFrame(frame);
  }

  // ---------- старт ----------
  buildBoard();
  buildTowerCards();
  setupInput();
  resizeCanvas();
  updateProfileUi();
  updateHud();

  // Отладочный доступ по адресу вида index.html?debug — позволяет проверять
  // внутреннее состояние из консоли и автотестов. В обычном запуске не включается.
  if (/[?&]debug\b/.test(window.location.search)) {
    window.__bastion = {
      state: () => ({
        mode: game.mode,
        paused: game.paused,
        wave: game.wave,
        speed,
        enemies: game.enemies.length,
        firstEnemy: game.enemies[0]
          ? {
              type: game.enemies[0].type,
              seg: game.enemies[0].segment,
              segT: game.enemies[0].segT,
              x: game.enemies[0].x,
              y: game.enemies[0].y,
              speed: game.enemies[0].speed
            }
          : null,
        pathPoints: pathPoints.length,
        baseHp: game.baseHp,
        credits: game.credits,
        time: game.time
      }),
      damage: (amount) => {
        game.baseHp = Math.max(0, game.baseHp - amount);
        updateHud();
      },
      setSpeed: (value) => {
        speed = value;
      }
    };
  }

  requestAnimationFrame(frame);
})();
