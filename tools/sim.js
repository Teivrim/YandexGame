// Честная симуляция игрового цикла NEON//BASTION.
// Воспроизводит реальную механику: движение по пути, поиск цели,
// перезарядка, попадания, сплит, утечки. Никаких эвристик.
const TILE = 48;
const COLS = 22, ROWS = 13;
const MAX_LEVEL = 3;
const TOTAL_WAVES = 30;
const STEP = 1 / 30; // шаг симуляции

const NODES = [
  { x: -1, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 3 },
  { x: 15, y: 3 }, { x: 15, y: 10 }, { x: 19, y: 10 }, { x: 19, y: 6 }, { x: 20, y: 6 }
];
const PATH = NODES.map(n => ({ x: (n.x + 0.5) * TILE, y: (n.y + 0.5) * TILE }));

const TOWERS = {
  pulse:  { cost: 60,  dmg: 13, rate: 1.35, range: 118, shot: 'bolt' },
  mortar: { cost: 130, dmg: 34, rate: 0.50, range: 168, shot: 'shell', splash: 62 },
  cryo:   { cost: 100, dmg: 5,  rate: 0.90, range: 124, shot: 'bolt', slow: 0.42, slowTime: 1.8 },
  tesla:  { cost: 165, dmg: 20, rate: 0.80, range: 132, shot: 'chain', chain: 4 },
  rail:   { cost: 240, dmg: 82, rate: 0.32, range: 300, shot: 'beam' }
};
const ENEMIES = {
  drone:    { hp: 46,   speed: 54,  reward: 7,   armor: 0, boss: false, leak: 1, noSlow: false },
  scout:    { hp: 30,   speed: 104, reward: 9,   armor: 0, boss: false, leak: 1, noSlow: false },
  armor:    { hp: 190,  speed: 34,  reward: 19,  armor: 5, boss: false, leak: 1, noSlow: false },
  wraith:   { hp: 84,   speed: 68,  reward: 15,  armor: 0, boss: false, leak: 1, noSlow: true },
  splitter: { hp: 110,  speed: 48,  reward: 14,  armor: 0, boss: false, leak: 1, noSlow: false, split: 'drone', splitCount: 2 },
  boss:     { hp: 1250, speed: 26,  reward: 120, armor: 10, boss: true, leak: 5, noSlow: false }
};

const PARAMS = {
  hpScale: 0.11,
  startCredits: 220,
  baseHp: 20,
  waveBonusBase: 20,
  waveBonusPer: 5,
  shopDamage: 1,
  shopRate: 1,
  maxTowers: 30
};

function buildWave(n) {
  const s = [];
  const add = (t, c, gap, start) => { for (let i = 0; i < c; i++) s.push({ type: t, at: (start || 0) + i * gap }); };
  add('drone', 4 + Math.floor(n * 0.85), 0.7, 0);
  if (n >= 2) add('scout', 2 + Math.floor(n * 0.45), 0.45, 3);
  if (n >= 4) add('armor', 1 + Math.floor(n * 0.32), 1.5, 5.5);
  if (n >= 6) add('wraith', 1 + Math.floor(n * 0.28), 1.0, 8);
  if (n >= 8) add('splitter', 1 + Math.floor(n * 0.26), 1.2, 10.5);
  if (n % 5 === 0) add('boss', 1 + Math.floor(n / 20), 0, 14);
  return s.sort((a, b) => a.at - b.at);
}

// Клетки-кандидаты для башен: рядом с путём, с приоритетом "покрывает больше пути".
function candidateCells() {
  const road = new Set();
  for (let i = 1; i < NODES.length; i++) {
    const a = NODES[i - 1], b = NODES[i];
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let s = 0; s <= steps; s++) {
      const c = Math.round(a.x + (b.x - a.x) * s / steps);
      const r = Math.round(a.y + (b.y - a.y) * s / steps);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) road.add(c + ':' + r);
    }
  }
  const core = NODES[NODES.length - 1];
  const out = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (road.has(c + ':' + r)) continue;
      if (Math.abs(c - core.x) <= 1 && Math.abs(r - core.y) <= 1) continue;
      if (c <= 0) continue;
      out.push({ c, r });
    }
  }
  return out;
}
const CANDIDATES = candidateCells();

function towerStats(type, level) {
  const d = TOWERS[type];
  return {
    dmg: d.dmg * (1 + (level - 1) * 0.35) * PARAMS.shopDamage,
    rate: d.rate * (1 + (level - 1) * 0.18) * PARAMS.shopRate,
    range: d.range * (1 + (level - 1) * 0.09)
  };
}

function makeTower(type, cell) {
  return {
    type,
    col: cell.c, row: cell.r,
    x: (cell.c + 0.5) * TILE, y: (cell.r + 0.5) * TILE,
    level: 1, cd: 0
  };
}

function makeEnemy(type, wave, fromParent) {
  const d = ENEMIES[type];
  const scale = 1 + (wave - 1) * PARAMS.hpScale;
  const hp = d.hp * scale * (fromParent ? 0.5 : 1);
  return {
    type, hp, maxHp: hp, speed: d.speed, reward: d.reward, armor: d.armor,
    boss: d.boss, leak: d.leak, noSlow: d.noSlow,
    split: d.split, splitCount: d.splitCount,
    seg: fromParent ? Math.max(0, fromParent.seg - 1) : 0,
    segT: fromParent ? fromParent.segT : 0,
    x: fromParent ? fromParent.x : PATH[0].x,
    y: fromParent ? fromParent.y : PATH[0].y,
    slowF: 1, slowT: 0, dead: false
  };
}

function stepEnemy(e, dt) {
  if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
  let move = e.speed * (e.slowF) * dt;
  while (move > 0) {
    if (e.seg >= PATH.length - 1) return 'leak';
    const a = PATH[e.seg], b = PATH[e.seg + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const left = len * (1 - e.segT);
    if (move >= left) {
      move -= left; e.seg += 1; e.segT = 0;
      if (e.seg >= PATH.length - 1) {
        e.x = b.x; e.y = b.y;
        return 'leak';
      }
    } else {
      e.segT += move / len; move = 0;
    }
    const p = PATH[e.seg], q = PATH[Math.min(e.seg + 1, PATH.length - 1)];
    e.x = p.x + (q.x - p.x) * e.segT;
    e.y = p.y + (q.y - p.y) * e.segT;
  }
  return null;
}

function findTarget(t, range) {
  let best = null, bestProg = -1;
  const r2 = range * range;
  for (const e of t.enemies) {
    if (e.dead) continue;
    const dx = e.x - t.x, dy = e.y - t.y;
    if (dx * dx + dy * dy > r2) continue;
    const prog = e.seg + e.segT;
    if (prog > bestProg) { bestProg = prog; best = e; }
  }
  return best;
}

function damage(t, e, amount, pierceArmor) {
  let d = amount;
  if (e.armor) d = Math.max(1, amount - e.armor * (pierceArmor ? 0.5 : 1));
  e.hp -= d;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    t.kills++;
    t.credits += e.reward;
    if (e.split && e.splitCount) {
      for (let i = 0; i < e.splitCount; i++) t.enemies.push(makeEnemy(e.split, t.wave, e));
    }
  }
}

function simulate(wave, towers, playerShop) {
  const P = { ...PARAMS, shopDamage: playerShop.dmg, shopRate: playerShop.rate };
  const t = {
    enemies: [], towers, credits: 0, kills: 0, wave, baseHp: P.baseHp,
    spawnQueue: buildWave(wave), spawnIndex: 0, clock: 0, maxT: 0
  };
  let guard = 0;
  while ((t.spawnIndex < t.spawnQueue.length || t.enemies.length > 0) && guard < 30000) {
    guard++;
    t.clock += STEP;
    t.maxT = t.clock;
    // спавн
    while (t.spawnIndex < t.spawnQueue.length && t.spawnQueue[t.spawnIndex].at <= t.clock) {
      t.enemies.push(makeEnemy(t.spawnQueue[t.spawnIndex].type, wave, null));
      t.spawnIndex++;
    }
    // движение
    for (const e of t.enemies) {
      if (e.dead) continue;
      const r = stepEnemy(e, STEP);
      if (r === 'leak') {
        e.dead = true;
        t.baseHp -= e.leak;
        if (t.baseHp <= 0) return { ...t, result: 'lost', dps: 0 };
      }
    }
    t.enemies = t.enemies.filter(e => !e.dead);
    // башни
    for (const tw of towers) {
      const def = TOWERS[tw.type];
      const st = towerStats(tw.type, tw.level);
      tw.cd -= STEP;
      if (tw.cd > 0) continue;
      const target = findTarget({ ...tw, enemies: t.enemies }, st.range);
      if (!target) continue;
      tw.cd = 1 / st.rate;
      if (def.shot === 'shell') {
        for (const e of t.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - target.x, e.y - target.y) <= def.splash + e.type) {
            damage(t, e, st.dmg, false);
          }
        }
      } else if (def.shot === 'chain') {
        let cur = target, fx = tw.x, fy = tw.y;
        const hit = new Set();
        for (let i = 0; i < def.chain && cur && !cur.dead; i++) {
          hit.add(cur);
          damage(t, cur, st.dmg, true);
          let next = null, nd = 96 * 96;
          for (const e of t.enemies) {
            if (e.dead || hit.has(e)) continue;
            const dx = e.x - cur.x, dy = e.y - cur.y, d2 = dx * dx + dy * dy;
            if (d2 < nd) { nd = d2; next = e; }
          }
          fx = cur.x; fy = cur.y; cur = next;
        }
      } else if (def.shot === 'beam') {
        const dirX = Math.cos(Math.atan2(target.y - tw.y, target.x - tw.x));
        const dirY = Math.sin(Math.atan2(target.y - tw.y, target.x - tw.x));
        for (const e of t.enemies) {
          if (e.dead) continue;
          const cross = Math.abs((e.x - tw.x) * dirY - (e.y - tw.y) * dirX);
          if (cross < 20 && (e.x - tw.x) * dirX + (e.y - tw.y) * dirY > 0) damage(t, e, st.dmg, false);
        }
      } else {
        if (def.slow) {
          if (!target.noSlow) { target.slowF = 1 - def.slow; target.slowT = def.slowTime; }
        }
        damage(t, target, st.dmg, false);
      }
    }
    t.enemies = t.enemies.filter(e => !e.dead);
  }
  return { ...t, result: 'cleared' };
}

// Стратегия игрока: покупает башни и качает их по мере дохода.
function runGame(params) {
  Object.assign(PARAMS, params);
  let credits = PARAMS.startCredits;
  let baseHp = PARAMS.baseHp;
  const towers = [];
  const used = new Set();
  const log = [];
  let shopDmg = 1, shopRate = 1;
  const nextCell = () => {
    for (const cell of CANDIDATES) {
      const k = cell.c + ':' + cell.r;
      if (!used.has(k)) { used.add(k); return cell; }
    }
    return null;
  };
  // разумная покупка: чередуем типы по мере накопления
  const plan = [];
  for (let i = 0; i < 30; i++) plan.push(i % 4 === 3 ? 'mortar' : i % 5 === 4 ? 'rail' : 'pulse');
  let planIdx = 0;

  for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
    // покупаем башни, пока хватает денег на целевую цифру
    const wantTowers = wave <= 3 ? 3 : wave <= 6 ? 5 : wave <= 10 ? 8 : wave <= 15 ? 11 : wave <= 20 ? 14 : wave <= 25 ? 17 : 20;
    const wantLevel = wave <= 8 ? 1 : wave <= 16 ? 2 : 3;
    // сначала прокачка
    let guard = 0;
    while (guard++ < 200) {
      let acted = false;
      for (const tw of towers) {
        if (tw.level < wantLevel) {
          const cost = Math.round(TOWERS[tw.type].cost * 0.8 * tw.level);
          if (credits >= cost) { credits -= cost; tw.level++; acted = true; }
        }
      }
      if (towers.length < wantTowers && planIdx < plan.length) {
        const type = plan[planIdx];
        if (credits >= TOWERS[type].cost) {
          const cell = nextCell();
          if (cell) { credits -= TOWERS[type].cost; towers.push(makeTower(type, cell)); planIdx++; acted = true; }
          else break;
        } else break;
      } else if (!acted) break;
    }
    // магазин: покупаем усиления, когда есть профицит
    if (wave % 6 === 0 && shopDmg < 1.36) shopDmg = Math.min(1.36, shopDmg + 0.12);
    if (wave % 8 === 0 && shopRate < 1.30) shopRate = Math.min(1.30, shopRate + 0.10);

    const res = simulate(wave, towers, { dmg: shopDmg, rate: shopRate });
    const waveBonus = PARAMS.waveBonusBase + wave * PARAMS.waveBonusPer;
    credits += waveBonus;
    baseHp -= (PARAMS.baseHp - res.baseHp);
    log.push({
      wave, towers: towers.length, levels: towers.map(t => t.level).join(''),
      result: res.result, baseHp: res.baseHp, kills: res.kills, time: res.maxT, credits
    });
    if (res.result === 'lost') return { result: 'lost', at: wave, log, towers };
  }
  return { result: 'win', log, towers };
}

const H1 = '==========================================================';
console.log(H1);
console.log('ТЕКУЩИЕ НАСТРОЙКИ (hpScale 0.11)');
console.log(H1);
let r = runGame({ hpScale: 0.11, startCredits: 220, baseHp: 20, waveBonusBase: 20, waveBonusPer: 5 });
console.log('результат: ' + (r.result === 'win' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ на волне ' + r.at));
console.log('волна | башен | ур | итог | база | убито | время | CR');
for (const l of r.log) {
  if (l.wave <= 8 || l.wave % 5 === 0 || l.result === 'lost') {
    console.log(String(l.wave).padStart(5) + ' | ' + String(l.towers).padStart(6) + ' | ' + l.levels.slice(0, 12).padEnd(12) + ' | ' + l.result.padEnd(7) + ' | ' + String(l.baseHp).padStart(4) + ' | ' + String(l.kills).padStart(5) + ' | ' + l.time.toFixed(0).padStart(5) + 'с | ' + String(l.credits).padStart(6));
  }
}
console.log('');
