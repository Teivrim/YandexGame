(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const els = {
    hud: document.getElementById('hud'),
    menu: document.getElementById('menu'),
    pause: document.getElementById('pauseScreen'),
    gameover: document.getElementById('gameoverScreen'),
    play: document.getElementById('playButton'),
    retry: document.getElementById('retryButton'),
    resume: document.getElementById('resumeButton'),
    quit: document.getElementById('quitButton'),
    menuButton: document.getElementById('menuButton'),
    pauseButton: document.getElementById('pauseButton'),
    soundButton: document.getElementById('soundButton'),
    score: document.getElementById('scoreValue'),
    wave: document.getElementById('waveValue'),
    time: document.getElementById('timeValue'),
    health: document.getElementById('healthPips'),
    dashFill: document.getElementById('dashFill'),
    effects: document.getElementById('activeEffects'),
    best: document.getElementById('bestValue'),
    finalScore: document.getElementById('finalScore'),
    finalTime: document.getElementById('finalTime'),
    finalWave: document.getElementById('finalWave'),
    newRecord: document.getElementById('newRecord'),
    toast: document.getElementById('toast'),
    joystick: document.getElementById('joystick'),
    joystickKnob: document.getElementById('joystickKnob'),
    dashButton: document.getElementById('dashButton')
  };

  const WORLD = { w: 2600, h: 1800 };
  const DASH_COOLDOWN = 1.25;
  const TAU = Math.PI * 2;
  const COLORS = {
    cyan: '#63e7ff',
    cyanBright: '#b5f7ff',
    pink: '#ff4fbd',
    orange: '#ffb44f',
    green: '#62f6bd',
    violet: '#9d7bff',
    white: '#eff9ff',
    muted: '#8491b4'
  };
  const STORAGE_BEST = 'neon-courier-best-v1';
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let viewport = { w: 800, h: 600 };
  let dpr = 1;
  let lastFrame = performance.now();
  let ambientTime = 0;
  let uiClock = 0;
  let toastTimeout = 0;
  let soundEnabled = true;
  let game = createGame();
  const stars = createStars();
  const input = {
    keys: new Set(),
    touchX: 0,
    touchY: 0,
    touchActive: false
  };
  const audio = {
    context: null,
    master: null
  };

  function createPlayer() {
    return {
      x: WORLD.w / 2,
      y: WORLD.h / 2,
      r: 15,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hp: 3,
      maxHp: 3,
      dashTime: 0,
      dashCooldown: 0,
      dashDirX: 1,
      dashDirY: 0,
      invuln: 0,
      shield: 0,
      overdrive: 0,
      trailClock: 0
    };
  }

  function createGame() {
    return {
      mode: 'menu',
      time: 0,
      ambientTime: 0,
      score: 0,
      wave: 1,
      spawnClock: 1,
      specialClock: 7,
      combo: 0,
      comboClock: 0,
      shake: 0,
      obstacles: [],
      pickups: [],
      enemies: [],
      particles: [],
      trails: [],
      texts: [],
      player: createPlayer(),
      camera: { x: 0, y: 0 },
      newRecord: false
    };
  }

  function createStars() {
    const result = [];
    for (let i = 0; i < 210; i += 1) {
      result.push({
        x: Math.random() * WORLD.w,
        y: Math.random() * WORLD.h,
        size: Math.random() > 0.84 ? 2.2 : Math.random() * 1.5 + 0.35,
        alpha: Math.random() * 0.55 + 0.12,
        phase: Math.random() * TAU,
        color: Math.random() > 0.82 ? COLORS.pink : COLORS.cyan
      });
    }
    return result;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    viewport.w = Math.max(1, rect.width);
    viewport.h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.w * dpr);
    canvas.height = Math.floor(viewport.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    centerCamera(true);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function distanceSquared(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(6, '0');
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function getBest() {
    try {
      return Math.max(0, Number.parseInt(localStorage.getItem(STORAGE_BEST) || '0', 10) || 0);
    } catch (error) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(STORAGE_BEST, String(Math.floor(value)));
    } catch (error) {
      // Local storage can be disabled in an embedded browser. The game still works.
    }
  }

  function pointIsBlocked(x, y, padding = 0) {
    return game.obstacles.some((obstacle) => (
      x > obstacle.x - padding &&
      x < obstacle.x + obstacle.w + padding &&
      y > obstacle.y - padding &&
      y < obstacle.y + obstacle.h + padding
    ));
  }

  function generateObstacles() {
    const result = [];
    const count = 27;
    for (let attempt = 0; attempt < count * 30 && result.length < count; attempt += 1) {
      const width = random(58, 190);
      const height = random(48, 155);
      const x = random(100, WORLD.w - width - 100);
      const y = random(100, WORLD.h - height - 100);
      const block = { x, y, w: width, h: height, tone: Math.random() };
      const tooCloseToStart = Math.abs(x + width / 2 - WORLD.w / 2) < 240 && Math.abs(y + height / 2 - WORLD.h / 2) < 240;
      const overlaps = result.some((other) => {
        const gapX = Math.max(0, Math.max(other.x - (x + width), x - (other.x + other.w)));
        const gapY = Math.max(0, Math.max(other.y - (y + height), y - (other.y + other.h)));
        return gapX < 55 && gapY < 55;
      });
      if (!tooCloseToStart && !overlaps) result.push(block);
    }
    return result;
  }

  function randomPoint(minDistance = 0, avoidCamera = false) {
    const player = game.player;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      const x = random(55, WORLD.w - 55);
      const y = random(55, WORLD.h - 55);
      if (distanceSquared(x, y, player.x, player.y) < minDistance * minDistance) continue;
      if (pointIsBlocked(x, y, 32)) continue;
      if (avoidCamera) {
        const visibleX = x > game.camera.x - 80 && x < game.camera.x + viewport.w + 80;
        const visibleY = y > game.camera.y - 80 && y < game.camera.y + viewport.h + 80;
        if (visibleX && visibleY) continue;
      }
      return { x, y };
    }
    return { x: random(55, WORLD.w - 55), y: random(55, WORLD.h - 55) };
  }

  function makePickup(kind = 'energy') {
    const point = randomPoint(kind === 'energy' ? 55 : 110);
    const colors = {
      energy: COLORS.cyan,
      shield: COLORS.green,
      overdrive: COLORS.orange,
      repair: COLORS.pink
    };
    return {
      x: point.x,
      y: point.y,
      r: kind === 'energy' ? 8 : 10,
      kind,
      color: colors[kind] || colors.energy,
      phase: random(0, TAU),
      alive: true
    };
  }

  function spawnEnergy(count = 1) {
    for (let i = 0; i < count; i += 1) game.pickups.push(makePickup('energy'));
  }

  function spawnSpecialPickup() {
    const roll = Math.random();
    const kind = game.player.hp <= 1 || roll < 0.22 ? 'repair' : roll < 0.62 ? 'shield' : 'overdrive';
    game.pickups.push(makePickup(kind));
  }

  function makeEnemy(forcedType) {
    const point = randomPoint(430, true);
    const type = forcedType || (Math.random() < Math.min(0.13 + game.wave * 0.018, 0.38) ? 'hunter' : 'drone');
    const isHunter = type === 'hunter';
    return {
      x: point.x,
      y: point.y,
      r: isHunter ? 21 : 13,
      hp: isHunter ? 3 + Math.floor(game.wave / 4) : 1,
      maxHp: isHunter ? 3 + Math.floor(game.wave / 4) : 1,
      speed: isHunter ? random(50, 65) + game.wave * 2 : random(82, 100) + game.wave * 4,
      type,
      age: random(0, TAU),
      phase: random(0, TAU),
      state: 'approach',
      stateClock: random(2.2, 4.3),
      targetX: 0,
      targetY: 0,
      hitClock: 0,
      contactClock: 0,
      dead: false
    };
  }

  function spawnEnemy(forcedType) {
    if (game.enemies.length >= 30) return;
    game.enemies.push(makeEnemy(forcedType));
  }

  function resetGame() {
    game = createGame();
    game.mode = 'playing';
    game.obstacles = generateObstacles();
    spawnEnergy(24);
    game.enemies.push(makeEnemy('drone'), makeEnemy('drone'));
    centerCamera(true);
    input.keys.clear();
    input.touchX = 0;
    input.touchY = 0;
    input.touchActive = false;
    updateJoystickVisual();
    els.menu.classList.add('is-hidden');
    els.pause.classList.add('is-hidden');
    els.gameover.classList.add('is-hidden');
    els.hud.classList.remove('is-hidden');
    showToast('СМЕНА НАЧАЛАСЬ // СОБИРАЙ ЭНЕРГИЮ');
    updateHud(true);
  }

  function returnToMenu() {
    game = createGame();
    input.keys.clear();
    input.touchX = 0;
    input.touchY = 0;
    input.touchActive = false;
    updateJoystickVisual();
    els.hud.classList.add('is-hidden');
    els.pause.classList.add('is-hidden');
    els.gameover.classList.add('is-hidden');
    els.menu.classList.remove('is-hidden');
    updateBest();
    updateHud(true);
  }

  function pauseGame() {
    if (game.mode !== 'playing') return;
    game.mode = 'paused';
    input.keys.clear();
    input.touchX = 0;
    input.touchY = 0;
    input.touchActive = false;
    updateJoystickVisual();
    els.pause.classList.remove('is-hidden');
    tone(180, 0.12, 'sine', 0.025, -90);
  }

  function resumeGame() {
    if (game.mode !== 'paused') return;
    game.mode = 'playing';
    els.pause.classList.add('is-hidden');
    lastFrame = performance.now();
    tone(300, 0.1, 'sine', 0.025, 100);
  }

  function endGame() {
    if (game.mode !== 'playing') return;
    game.mode = 'gameover';
    const finalScore = Math.floor(game.score);
    const previousBest = getBest();
    game.newRecord = finalScore > previousBest;
    if (game.newRecord) saveBest(finalScore);
    els.finalScore.textContent = formatScore(finalScore);
    els.finalTime.textContent = formatTime(game.time);
    els.finalWave.textContent = String(game.wave).padStart(2, '0');
    els.newRecord.classList.toggle('is-hidden', !game.newRecord);
    els.gameover.classList.remove('is-hidden');
    input.keys.clear();
    input.touchX = 0;
    input.touchY = 0;
    input.touchActive = false;
    updateJoystickVisual();
    burst(game.player.x, game.player.y, COLORS.pink, 32, 260, 0.8);
    game.shake = 18;
    tone(120, 0.4, 'sawtooth', 0.05, -70);
    updateBest();
    updateHud(true);
  }

  function updateBest() {
    els.best.textContent = formatScore(getBest());
  }

  function getMoveVector() {
    let x = 0;
    let y = 0;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
    x += input.touchX;
    y += input.touchY;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    if (length < 0.08) return { x: 0, y: 0, length: 0 };
    return { x, y, length };
  }

  function triggerDash() {
    if (game.mode !== 'playing') return;
    const player = game.player;
    if (player.dashCooldown > 0) return;
    const move = getMoveVector();
    if (move.length > 0.08) {
      const vectorLength = Math.max(0.001, Math.hypot(move.x, move.y));
      player.dashDirX = move.x / vectorLength;
      player.dashDirY = move.y / vectorLength;
    } else {
      player.dashDirX = Math.cos(player.angle);
      player.dashDirY = Math.sin(player.angle);
    }
    player.dashTime = 0.19;
    player.dashCooldown = DASH_COOLDOWN * (player.overdrive > 0 ? 0.72 : 1);
    player.invuln = Math.max(player.invuln, 0.3);
    player.trailClock = 0;
    burst(player.x, player.y, COLORS.pink, 9, 105, 0.32);
    game.shake = Math.max(game.shake, 3.5);
    tone(180, 0.13, 'sawtooth', 0.035, 480);
  }

  function updatePlayer(dt) {
    const player = game.player;
    const move = getMoveVector();
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.shield = Math.max(0, player.shield - dt);
    player.overdrive = Math.max(0, player.overdrive - dt);
    if (move.length > 0.08) {
      const directionLength = move.length;
      player.angle = Math.atan2(move.y / directionLength, move.x / directionLength);
    }

    if (player.dashTime > 0) {
      player.dashTime = Math.max(0, player.dashTime - dt);
      const speed = player.overdrive > 0 ? 1080 : 930;
      player.vx = player.dashDirX * speed;
      player.vy = player.dashDirY * speed;
    } else {
      const speed = player.overdrive > 0 ? 330 : 265;
      const targetX = move.x * speed;
      const targetY = move.y * speed;
      const response = 1 - Math.exp(-18 * dt);
      player.vx += (targetX - player.vx) * response;
      player.vy += (targetY - player.vy) * response;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    resolveEntityCollision(player);

    player.trailClock -= dt;
    if ((player.dashTime > 0 || player.overdrive > 0) && player.trailClock <= 0) {
      game.trails.push({ x: player.x, y: player.y, life: 0.34, maxLife: 0.34, r: player.r * 0.7 });
      player.trailClock = player.dashTime > 0 ? 0.022 : 0.065;
    }
  }

  function resolveEntityCollision(entity) {
    entity.x = clamp(entity.x, entity.r + 18, WORLD.w - entity.r - 18);
    entity.y = clamp(entity.y, entity.r + 18, WORLD.h - entity.r - 18);
    game.obstacles.forEach((obstacle) => resolveCircleRect(entity, obstacle));
  }

  function resolveCircleRect(entity, rect) {
    const closestX = clamp(entity.x, rect.x, rect.x + rect.w);
    const closestY = clamp(entity.y, rect.y, rect.y + rect.h);
    let dx = entity.x - closestX;
    let dy = entity.y - closestY;
    let distance = Math.hypot(dx, dy);
    if (distance >= entity.r) return;

    if (distance < 0.0001) {
      const distances = [
        { value: Math.abs(entity.x - rect.x), x: -1, y: 0 },
        { value: Math.abs(rect.x + rect.w - entity.x), x: 1, y: 0 },
        { value: Math.abs(entity.y - rect.y), x: 0, y: -1 },
        { value: Math.abs(rect.y + rect.h - entity.y), x: 0, y: 1 }
      ].sort((a, b) => a.value - b.value);
      dx = distances[0].x;
      dy = distances[0].y;
      distance = 1;
    } else {
      dx /= distance;
      dy /= distance;
    }
    const push = entity.r - distance + 0.5;
    entity.x += dx * push;
    entity.y += dy * push;
  }

  function updateEnemies(dt) {
    const player = game.player;
    game.enemies.forEach((enemy) => {
      if (enemy.dead) return;
      enemy.age += dt;
      enemy.hitClock = Math.max(0, enemy.hitClock - dt);
      enemy.contactClock = Math.max(0, enemy.contactClock - dt);
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const towardX = dx / distance;
      const towardY = dy / distance;

      if (enemy.type === 'hunter') {
        enemy.stateClock -= dt;
        if (enemy.state === 'approach') {
          enemy.x += towardX * enemy.speed * dt;
          enemy.y += towardY * enemy.speed * dt;
          if (enemy.stateClock <= 0) {
            enemy.state = 'windup';
            enemy.stateClock = 0.72;
            enemy.targetX = player.x;
            enemy.targetY = player.y;
          }
        } else if (enemy.state === 'windup') {
          enemy.x += towardX * enemy.speed * 0.12 * dt;
          enemy.y += towardY * enemy.speed * 0.12 * dt;
          if (enemy.stateClock <= 0) {
            const targetDx = enemy.targetX - enemy.x;
            const targetDy = enemy.targetY - enemy.y;
            const targetDistance = Math.max(1, Math.hypot(targetDx, targetDy));
            enemy.chargeX = targetDx / targetDistance;
            enemy.chargeY = targetDy / targetDistance;
            enemy.state = 'charge';
            enemy.stateClock = 0.48;
            tone(92, 0.16, 'sawtooth', 0.018, 35);
          }
        } else if (enemy.state === 'charge') {
          enemy.x += enemy.chargeX * 520 * dt;
          enemy.y += enemy.chargeY * 520 * dt;
          if (enemy.stateClock <= 0) {
            enemy.state = 'recover';
            enemy.stateClock = 0.82;
            burst(enemy.x, enemy.y, COLORS.orange, 5, 55, 0.3);
          }
        } else {
          enemy.x -= towardX * enemy.speed * 0.35 * dt;
          enemy.y -= towardY * enemy.speed * 0.35 * dt;
          if (enemy.stateClock <= 0) {
            enemy.state = 'approach';
            enemy.stateClock = random(2.4, 4.5);
          }
        }
      } else {
        const weave = Math.sin(enemy.age * 2.7 + enemy.phase) * 0.25;
        const weaveX = -towardY * weave;
        const weaveY = towardX * weave;
        enemy.x += (towardX + weaveX) * enemy.speed * dt;
        enemy.y += (towardY + weaveY) * enemy.speed * dt;
      }
      resolveEntityCollision(enemy);
      enemy.x = clamp(enemy.x, enemy.r + 18, WORLD.w - enemy.r - 18);
      enemy.y = clamp(enemy.y, enemy.r + 18, WORLD.h - enemy.r - 18);
    });
  }

  function updatePlayerInteractions() {
    const player = game.player;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      const contact = player.r + enemy.r;
      if (distance >= contact) continue;
      const normalX = distance > 0.001 ? dx / distance : 1;
      const normalY = distance > 0.001 ? dy / distance : 0;
      if (player.dashTime > 0) {
        damageEnemy(enemy, player.overdrive > 0 ? 3 : 2, normalX, normalY);
      } else if (enemy.contactClock <= 0) {
        enemy.contactClock = 0.45;
        hurtPlayer(enemy.type === 'hunter' && enemy.state === 'charge' ? 2 : 1);
        enemy.x -= normalX * 28;
        enemy.y -= normalY * 28;
      }
    }

    for (let i = game.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = game.pickups[i];
      if (!pickup.alive) continue;
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      let distance = Math.hypot(dx, dy);
      if (player.overdrive > 0 && distance < 155) {
        const pull = 370 * dt;
        pickup.x += dx / Math.max(distance, 1) * pull;
        pickup.y += dy / Math.max(distance, 1) * pull;
        distance = Math.hypot(player.x - pickup.x, player.y - pickup.y);
      }
      if (distance < player.r + pickup.r + 3) {
        pickup.alive = false;
        collectPickup(pickup);
        if (pickup.kind === 'energy') {
          game.pickups.splice(i, 1);
          spawnEnergy(1);
        } else {
          game.pickups.splice(i, 1);
        }
      }
    }
  }

  function damageEnemy(enemy, amount, normalX, normalY) {
    if (enemy.dead || enemy.hitClock > 0) return;
    enemy.hp -= amount;
    enemy.hitClock = 0.28;
    enemy.x += normalX * 25;
    enemy.y += normalY * 25;
    burst(enemy.x, enemy.y, enemy.type === 'hunter' ? COLORS.orange : COLORS.pink, 9, 115, 0.42);
    if (enemy.hp <= 0) {
      enemy.dead = true;
      game.score += enemy.type === 'hunter' ? 45 : 20;
      game.shake = Math.max(game.shake, enemy.type === 'hunter' ? 7 : 3);
      burst(enemy.x, enemy.y, enemy.type === 'hunter' ? COLORS.orange : COLORS.pink, enemy.type === 'hunter' ? 24 : 14, enemy.type === 'hunter' ? 180 : 120, 0.7);
      addText(enemy.type === 'hunter' ? '+45' : '+20', enemy.x, enemy.y, enemy.type === 'hunter' ? COLORS.orange : COLORS.pink);
      if (Math.random() < (enemy.type === 'hunter' ? 0.58 : 0.16)) spawnEnergy(1);
      tone(enemy.type === 'hunter' ? 220 : 420, 0.1, 'square', 0.025, enemy.type === 'hunter' ? -90 : 120);
    }
  }

  function hurtPlayer(amount) {
    const player = game.player;
    if (game.mode !== 'playing' || player.invuln > 0) return;
    if (player.shield > 0) {
      player.shield = 0;
      player.invuln = 0.85;
      game.shake = Math.max(game.shake, 8);
      burst(player.x, player.y, COLORS.green, 20, 165, 0.55);
      addText('ЩИТ ПОГЛОЩЁН', player.x, player.y - 18, COLORS.green);
      tone(500, 0.2, 'sine', 0.045, -170);
      return;
    }
    player.hp -= amount;
    player.invuln = 1.05;
    game.shake = Math.max(game.shake, 10);
    burst(player.x, player.y, COLORS.pink, 16, 155, 0.55);
    addText(`-${amount} КОРПУС`, player.x, player.y - 18, COLORS.pink);
    tone(95, 0.22, 'sawtooth', 0.05, -45);
    if (player.hp <= 0) {
      player.hp = 0;
      endGame();
    }
  }

  function collectPickup(pickup) {
    const player = game.player;
    if (pickup.kind === 'energy') {
      game.comboClock = 2.5;
      game.combo = game.combo > 0 ? Math.min(5, game.combo + 1) : 1;
      const value = 10 * game.combo * (player.overdrive > 0 ? 2 : 1);
      game.score += value;
      addText(`+${value}`, pickup.x, pickup.y - 10, game.combo > 1 ? COLORS.orange : COLORS.cyanBright);
      burst(pickup.x, pickup.y, pickup.color, 6, 65, 0.3);
      tone(360 + game.combo * 60, 0.08, 'sine', 0.025, 100);
    } else if (pickup.kind === 'shield') {
      player.shield = 8;
      addText('ЩИТ // 8 СЕК', pickup.x, pickup.y - 12, COLORS.green);
      showToast('ЗАЩИТА АКТИВИРОВАНА');
      burst(pickup.x, pickup.y, COLORS.green, 18, 120, 0.6);
      tone(420, 0.18, 'sine', 0.04, 280);
    } else if (pickup.kind === 'overdrive') {
      player.overdrive = 6;
      addText('OVERDRIVE // 6 СЕК', pickup.x, pickup.y - 12, COLORS.orange);
      showToast('OVERDRIVE // СКОРОСТЬ И ОЧКИ X2');
      burst(pickup.x, pickup.y, COLORS.orange, 20, 145, 0.65);
      tone(170, 0.2, 'sawtooth', 0.04, 300);
    } else {
      player.hp = Math.min(player.maxHp, player.hp + 1);
      addText('РЕМОНТ +1', pickup.x, pickup.y - 12, COLORS.pink);
      showToast('КОРПУС ВОССТАНОВЛЕН');
      burst(pickup.x, pickup.y, COLORS.pink, 18, 120, 0.6);
      tone(280, 0.16, 'sine', 0.04, 260);
    }
  }

  function addText(text, x, y, color) {
    game.texts.push({ text, x, y, color, life: 0.85, maxLife: 0.85 });
  }

  function burst(x, y, color, count = 10, speed = 100, life = 0.5) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const velocity = random(speed * 0.35, speed);
      const particleLife = random(life * 0.6, life);
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        r: random(1.3, 4.2),
        life: particleLife,
        maxLife: particleLife,
        color,
        drag: random(2.2, 4.7)
      });
    }
    if (game.particles.length > 500) game.particles.splice(0, game.particles.length - 500);
  }

  function updateEffects(dt) {
    game.shake = Math.max(0, game.shake - dt * 22);
    game.comboClock = Math.max(0, game.comboClock - dt);
    if (game.comboClock === 0) game.combo = 0;
    game.particles.forEach((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const drag = Math.exp(-particle.drag * dt);
      particle.vx *= drag;
      particle.vy *= drag;
    });
    game.particles = game.particles.filter((particle) => particle.life > 0);
    game.trails.forEach((trail) => { trail.life -= dt; });
    game.trails = game.trails.filter((trail) => trail.life > 0);
    game.texts.forEach((text) => {
      text.life -= dt;
      text.y -= 32 * dt;
    });
    game.texts = game.texts.filter((text) => text.life > 0);
  }

  function updateGame(dt) {
    if (game.mode !== 'playing') return;
    game.time += dt;
    game.ambientTime += dt;
    const nextWave = 1 + Math.floor(game.time / 15);
    if (nextWave !== game.wave) {
      game.wave = nextWave;
      showToast(`ВОЛНА ${String(game.wave).padStart(2, '0')} // УГРОЗА РАСТЁТ`);
      tone(260, 0.16, 'sine', 0.035, 180);
    }
    game.score += dt * (1 + game.combo * 0.22);
    game.spawnClock -= dt;
    if (game.spawnClock <= 0) {
      spawnEnemy();
      if (game.wave >= 5 && Math.random() < 0.2) spawnEnemy('drone');
      game.spawnClock = Math.max(0.38, 1.35 - game.wave * 0.065) * random(0.86, 1.12);
    }
    game.specialClock -= dt;
    if (game.specialClock <= 0) {
      spawnSpecialPickup();
      game.specialClock = random(8, 13);
    }
    updatePlayer(dt);
    updateEnemies(dt);
    updatePlayerInteractions();
    if (game.mode !== 'playing') return;
    game.enemies = game.enemies.filter((enemy) => !enemy.dead);
    game.pickups = game.pickups.filter((pickup) => pickup.alive);
    updateEffects(dt);
    centerCamera(false, dt);
    uiClock -= dt;
    if (uiClock <= 0) {
      updateHud();
      uiClock = 0.08;
    }
  }

  function centerCamera(immediate = false, dt = 0.016) {
    const player = game.player;
    const cameraX = WORLD.w <= viewport.w ? (WORLD.w - viewport.w) / 2 : clamp(player.x - viewport.w / 2, 0, WORLD.w - viewport.w);
    const cameraY = WORLD.h <= viewport.h ? (WORLD.h - viewport.h) / 2 : clamp(player.y - viewport.h / 2, 0, WORLD.h - viewport.h);
    if (immediate) {
      game.camera.x = cameraX;
      game.camera.y = cameraY;
      return;
    }
    const amount = 1 - Math.exp(-8 * dt);
    game.camera.x += (cameraX - game.camera.x) * amount;
    game.camera.y += (cameraY - game.camera.y) * amount;
  }

  function updateHud(force = false) {
    if (!force && game.mode === 'menu') return;
    const player = game.player;
    els.score.textContent = formatScore(game.score);
    els.wave.textContent = String(game.wave).padStart(2, '0');
    els.time.textContent = formatTime(game.time);
    const healthRatio = clamp(player.hp / player.maxHp, 0, 1);
    if (els.health.childElementCount !== player.maxHp) {
      els.health.innerHTML = '';
      for (let i = 0; i < player.maxHp; i += 1) {
        const pip = document.createElement('span');
        pip.className = 'pip';
        els.health.appendChild(pip);
      }
    }
    [...els.health.children].forEach((pip, index) => pip.classList.toggle('empty', index >= healthRatio));
    const dashReady = 1 - clamp(player.dashCooldown / (DASH_COOLDOWN * (player.overdrive > 0 ? 0.72 : 1)), 0, 1);
    els.dashFill.style.transform = `scaleX(${dashReady})`;
    els.dashButton.classList.toggle('cooling', player.dashCooldown > 0);
    const effects = [];
    if (player.shield > 0) effects.push({ name: `ЩИТ ${Math.ceil(player.shield)}`, className: 'shield' });
    if (player.overdrive > 0) effects.push({ name: `BOOST ${Math.ceil(player.overdrive)}`, className: 'overdrive' });
    const effectSignature = effects.map((effect) => effect.name).join('|');
    if (force || els.effects.dataset.signature !== effectSignature) {
      els.effects.dataset.signature = effectSignature;
      els.effects.innerHTML = effects.map((effect) => `<span class="effect-chip ${effect.className}">${effect.name}</span>`).join('');
    }
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('visible');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => els.toast.classList.remove('visible'), 1900);
  }

  function ensureAudio() {
    if (!soundEnabled) return;
    if (!audio.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        audio.context = new AudioContextClass();
        audio.master = audio.context.createGain();
        audio.master.gain.value = 0.65;
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

  function updateJoystickVisual() {
    els.joystickKnob.style.transform = `translate(calc(-50% + ${input.touchX * 38}px), calc(-50% + ${input.touchY * 38}px))`;
  }

  function moveJoystick(clientX, clientY) {
    const rect = els.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = (clientX - centerX) / (rect.width * 0.39);
    let dy = (clientY - centerY) / (rect.height * 0.39);
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    input.touchX = Math.abs(dx) < 0.04 ? 0 : dx;
    input.touchY = Math.abs(dy) < 0.04 ? 0 : dy;
    updateJoystickVisual();
  }

  function setupInput() {
    window.addEventListener('keydown', (event) => {
      const code = event.code;
      const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
      if (movementKeys.includes(code)) event.preventDefault();
      if (code === 'Escape') {
        if (game.mode === 'playing') pauseGame();
        else if (game.mode === 'paused') resumeGame();
        return;
      }
      if (code === 'Enter' && (game.mode === 'menu' || game.mode === 'gameover')) {
        event.preventDefault();
        startGame();
        return;
      }
      input.keys.add(code);
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') triggerDash();
    }, { passive: false });

    window.addEventListener('keyup', (event) => input.keys.delete(event.code));
    window.addEventListener('blur', () => {
      if (game.mode === 'playing') pauseGame();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.mode === 'playing') pauseGame();
    });

    let joystickPointer = null;
    els.joystick.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      joystickPointer = event.pointerId;
      input.touchActive = true;
      els.joystick.setPointerCapture(event.pointerId);
      moveJoystick(event.clientX, event.clientY);
    });
    els.joystick.addEventListener('pointermove', (event) => {
      if (joystickPointer !== event.pointerId) return;
      event.preventDefault();
      moveJoystick(event.clientX, event.clientY);
    });
    const releaseJoystick = (event) => {
      if (joystickPointer !== event.pointerId) return;
      joystickPointer = null;
      input.touchActive = false;
      input.touchX = 0;
      input.touchY = 0;
      updateJoystickVisual();
    };
    els.joystick.addEventListener('pointerup', releaseJoystick);
    els.joystick.addEventListener('pointercancel', releaseJoystick);
    els.joystick.addEventListener('lostpointercapture', releaseJoystick);
    els.dashButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      triggerDash();
    });

    els.play.addEventListener('click', startGame);
    els.retry.addEventListener('click', startGame);
    els.resume.addEventListener('click', resumeGame);
    els.pauseButton.addEventListener('click', pauseGame);
    els.quit.addEventListener('click', returnToMenu);
    els.menuButton.addEventListener('click', returnToMenu);
    els.soundButton.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      els.soundButton.textContent = soundEnabled ? '◖))' : '◖×';
      els.soundButton.classList.toggle('muted', !soundEnabled);
      els.soundButton.setAttribute('aria-label', soundEnabled ? 'Выключить звук' : 'Включить звук');
      if (soundEnabled) {
        ensureAudio();
        tone(360, 0.08, 'sine', 0.025, 90);
      }
    });
  }

  function startGame() {
    ensureAudio();
    resetGame();
    tone(120, 0.15, 'sine', 0.035, 260);
  }

  function drawGrid(cam) {
    const grid = 80;
    const left = Math.max(0, Math.floor(cam.x / grid) * grid);
    const top = Math.max(0, Math.floor(cam.y / grid) * grid);
    const right = Math.min(WORLD.w, cam.x + viewport.w + grid);
    const bottom = Math.min(WORLD.h, cam.y + viewport.h + grid);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(79, 147, 190, 0.095)';
    ctx.beginPath();
    for (let x = left; x <= right; x += grid) {
      ctx.moveTo(x, Math.max(0, cam.y));
      ctx.lineTo(x, Math.min(WORLD.h, cam.y + viewport.h));
    }
    for (let y = top; y <= bottom; y += grid) {
      ctx.moveTo(Math.max(0, cam.x), y);
      ctx.lineTo(Math.min(WORLD.w, cam.x + viewport.w), y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(99, 231, 255, 0.05)';
    ctx.strokeRect(16, 16, WORLD.w - 32, WORLD.h - 32);
    ctx.strokeStyle = 'rgba(99, 231, 255, 0.38)';
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 12;
    ctx.strokeRect(18, 18, WORLD.w - 36, WORLD.h - 36);
    ctx.restore();
  }

  function drawStars(cam) {
    ctx.save();
    stars.forEach((star) => {
      if (star.x < cam.x - 8 || star.x > cam.x + viewport.w + 8 || star.y < cam.y - 8 || star.y > cam.y + viewport.h + 8) return;
      const twinkle = reducedMotion ? 1 : 0.72 + Math.sin(ambientTime * 1.5 + star.phase) * 0.28;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.restore();
  }

  function drawObstacle(obstacle) {
    const { x, y, w, h } = obstacle;
    ctx.save();
    ctx.fillStyle = 'rgba(12, 24, 47, 0.94)';
    ctx.strokeStyle = 'rgba(73, 139, 176, 0.48)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(30, 117, 181, 0.2)';
    ctx.shadowBlur = 12;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(99, 231, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + h - 1);
    ctx.lineTo(x + w - 12, y + h - 1);
    ctx.moveTo(x + 1, y + 12);
    ctx.lineTo(x + 1, y + h - 12);
    ctx.stroke();
    const corner = 10;
    ctx.strokeStyle = obstacle.tone > 0.5 ? 'rgba(255, 79, 189, 0.75)' : 'rgba(99, 231, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + corner);
    ctx.lineTo(x, y);
    ctx.lineTo(x + corner, y);
    ctx.moveTo(x + w - corner, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - corner);
    ctx.stroke();
    ctx.restore();
  }

  function drawPickup(pickup) {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(ambientTime * 4 + pickup.phase) * 0.12;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = pickup.color;
    ctx.shadowColor = pickup.color;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(0, 0, pickup.r * 2.6 * pulse, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.shadowBlur = 13;
    ctx.rotate(Math.PI / 4);
    const size = pickup.r * (pickup.kind === 'energy' ? 1.05 : 1.25) * pulse;
    ctx.fillStyle = pickup.color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.white;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-size * 0.18, -size * 0.18, size * 0.36, size * 0.36);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    if (enemy.dead) return;
    const player = game.player;
    const color = enemy.type === 'hunter' ? COLORS.orange : COLORS.pink;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.type === 'hunter' && (enemy.state === 'windup' || enemy.state === 'charge')) {
      const targetX = enemy.state === 'windup' ? enemy.targetX : enemy.x + enemy.chargeX * 240;
      const targetY = enemy.state === 'windup' ? enemy.targetY : enemy.y + enemy.chargeY * 240;
      ctx.globalAlpha = enemy.state === 'charge' ? 0.7 : 0.28 + Math.sin(ambientTime * 18) * 0.1;
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = enemy.state === 'charge' ? 4 : 1.5;
      ctx.setLineDash([8, 9]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(targetX - enemy.x, targetY - enemy.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.rotate(enemy.age * (enemy.type === 'hunter' ? 0.9 : 1.6));
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = enemy.type === 'hunter' ? 24 : 15;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r * 2.1, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = enemy.type === 'hunter' ? '#33202a' : '#301b42';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (enemy.type === 'hunter') {
      for (let i = 0; i < 6; i += 1) {
        const angle = -Math.PI / 2 + i * TAU / 6;
        const x = Math.cos(angle) * enemy.r;
        const y = Math.sin(angle) * enemy.r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, enemy.r, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.type === 'hunter' ? 5 : 3.5, 0, TAU);
    ctx.fill();
    if (enemy.type === 'hunter') {
      ctx.rotate(-enemy.age * 0.9);
      ctx.strokeStyle = 'rgba(255, 180, 79, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.r + 7, 0.2, Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const player = game.player;
    const bob = reducedMotion ? 0 : Math.sin(ambientTime * 5) * 1.4;
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    if (player.invuln > 0 && Math.floor(ambientTime * 18) % 2 === 0) ctx.globalAlpha = 0.42;
    if (player.shield > 0) {
      ctx.globalAlpha = 0.24 + Math.sin(ambientTime * 7) * 0.06;
      ctx.fillStyle = COLORS.green;
      ctx.shadowColor = COLORS.green;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, player.r + 10 + Math.sin(ambientTime * 5) * 2, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, player.r + 12, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = player.invuln > 0 && Math.floor(ambientTime * 18) % 2 === 0 ? 0.42 : 1;
    }
    if (player.overdrive > 0) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = COLORS.orange;
      ctx.shadowColor = COLORS.orange;
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(0, 0, player.r + 5, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    if (player.dashTime > 0) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = COLORS.pink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-player.dashDirX * 38, -player.dashDirY * 38);
      ctx.lineTo(-player.dashDirX * 12, -player.dashDirY * 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.rotate(player.angle);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b2842';
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 17;
    ctx.beginPath();
    ctx.arc(0, 0, player.r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.cyanBright;
    ctx.beginPath();
    ctx.arc(3, 0, 5.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLORS.pink;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(player.r - 1, -2, 9, 4);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawEffects() {
    game.trails.forEach((trail) => {
      const alpha = trail.life / trail.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.38;
      ctx.fillStyle = COLORS.pink;
      ctx.shadowColor = COLORS.pink;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, trail.r * alpha, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
    game.particles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r * alpha, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
    game.texts.forEach((text) => {
      const alpha = Math.min(1, text.life / text.maxLife * 1.7);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text.color;
      ctx.shadowColor = text.color;
      ctx.shadowBlur = 10;
      ctx.font = `700 ${text.text.length > 12 ? 9 : 11}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-display') || 'Arial'}`;
      ctx.textAlign = 'center';
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    });
  }

  function drawWorld(cam) {
    ctx.fillStyle = '#070a18';
    ctx.fillRect(cam.x - 4, cam.y - 4, viewport.w + 8, viewport.h + 8);
    drawStars(cam);
    drawGrid(cam);
    game.obstacles.forEach(drawObstacle);
    game.pickups.forEach(drawPickup);
    game.enemies.forEach(drawEnemy);
    drawPlayer();
    drawEffects();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#040611';
    ctx.fillRect(0, 0, viewport.w, viewport.h);
    let camX = game.camera.x;
    let camY = game.camera.y;
    if (game.mode === 'menu') {
      camX = WORLD.w <= viewport.w ? (WORLD.w - viewport.w) / 2 : (WORLD.w - viewport.w) / 2;
      camY = WORLD.h <= viewport.h ? (WORLD.h - viewport.h) / 2 : (WORLD.h - viewport.h) / 2;
    }
    if (!reducedMotion && game.shake > 0) {
      camX += (Math.random() - 0.5) * game.shake;
      camY += (Math.random() - 0.5) * game.shake;
    }
    ctx.save();
    ctx.translate(-camX, -camY);
    drawWorld({ x: camX, y: camY });
    ctx.restore();
    drawAtmosphere();
  }

  function drawAtmosphere() {
    const pulse = reducedMotion ? 0.3 : 0.23 + Math.sin(ambientTime * 2.2) * 0.04;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 1;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 16;
    const centerX = viewport.w / 2;
    const centerY = viewport.h / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.min(viewport.w, viewport.h) * 0.38, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = pulse * 0.42;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.min(viewport.w, viewport.h) * 0.62, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.034, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    ambientTime += dt;
    if (game.mode === 'playing') {
      updateGame(dt);
    } else {
      game.ambientTime += dt;
      updateEffects(dt);
      uiClock -= dt;
      if (uiClock <= 0) {
        updateHud();
        uiClock = 0.1;
      }
    }
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resizeCanvas);
  setupInput();
  resizeCanvas();
  updateBest();
  updateHud(true);
  requestAnimationFrame(frame);
})();
