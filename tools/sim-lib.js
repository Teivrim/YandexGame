// Симулятор NEON//BASTION как модуль: полностью воспроизводит механику
// (движение по пути, поиск цели, перезарядку, попадания, сплит, утечки),
// чтобы можно было подбирать баланс расчётом, а не на глаз.
const TILE = 48;
const COLS = 22, ROWS = 13;
const MAX_LEVEL = 3;
const STEP = 1 / 30;

const DEFAULT_PATH = [
  { x: -1, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 3 },
  { x: 15, y: 3 }, { x: 15, y: 10 }, { x: 19, y: 10 }, { x: 19, y: 6 }, { x: 20, y: 6 }
];

const TOWER_BASE = {
  pulse:  { cost: 60,  dmg: 13, rate: 1.35, range: 118, shot: 'bolt' },
  mortar: { cost: 130, dmg: 34, rate: 0.50, range: 168, shot: 'shell', splash: 62 },
  cryo:   { cost: 100, dmg: 5,  rate: 0.90, range: 124, shot: 'bolt', slow: 0.42, slowTime: 1.8 },
  tesla:  { cost: 165, dmg: 20, rate: 0.80, range: 132, shot: 'chain', chain: 4 },
  rail:   { cost: 240, dmg: 82, rate: 0.32, range: 300, shot: 'beam' }
};

const ENEMY_BASE = {
  drone:    { hp: 46,   speed: 54,  reward: 7,   armor: 0, boss: false, leak: 1, noSlow: false },
  scout:    { hp: 30,   speed: 104, reward: 9,   armor: 0, boss: false, leak: 1, noSlow: false },
  armor:    { hp: 190,  speed: 34,  reward: 19,  armor: 5, boss: false, leak: 1, noSlow: false },
  wraith:   { hp: 84,   speed: 68,  reward: 15,  armor: 0, boss: false, leak: 1, noSlow: true },
  splitter: { hp: 110,  speed: 48,  reward: 14,  armor: 0, boss: false, leak: 1, noSlow: false, split: 'drone', splitCount: 2 },
  boss:     { hp: 1250, speed: 26,  reward: 120, armor: 10, boss: true, leak: 5, noSlow: false }
};

function defaultConfig() {
  return {
    path: DEFAULT_PATH.map(p => ({ ...p })),
    totalWaves: 30,
    hpScale: 0.11,
    rewardMul: 1,
    startCredits: 220,
    baseHp: 20,
    waveBonusBase: 20,
    waveBonusPer: 5,
    prepBonusPerSec: 2,
    prepTime: 25,
    towers: JSON.parse(JSON.stringify(TOWER_BASE)),
    enemies: JSON.parse(JSON.stringify(ENEMY_BASE)),
    upgradeCostMul: 0.8,
    levelDmg: 0.35,
    levelRate: 0.18,
    levelRange: 0.09,
    shopDmgStep: 0.12, shopDmgMax: 1.36,
    shopRateStep: 0.10, shopRateMax: 1.30
  };
}

function pathPoints(cfg) {
  return cfg.path.map(n => ({ x: (n.x + 0.5) * TILE, y: (n.y + 0.5) * TILE }));
}

function buildWave(n, cfg) {
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

function candidateCells(cfg) {
  const road = new Set();
  for (let i = 1; i < cfg.path.length; i++) {
    const a = cfg.path[i - 1], b = cfg.path[i];
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let s = 0; s <= steps; s++) {
      const c = Math.round(a.x + (b.x - a.x) * s / steps);
      const r = Math.round(a.y + (b.y - a.y) * s / steps);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) road.add(c + ':' + r);
    }
  }
  const core = cfg.path[cfg.path.length - 1];
  const out = [];
  for (let c = 1; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (road.has(c + ':' + r)) continue;
      if (Math.abs(c - core.x) <= 1 && Math.abs(r - core.y) <= 1) continue;
      out.push({ c, r });
    }
  }
  return out;
}

function makeTower(type, cell, cfg) {
  return { type, col: cell.c, row: cell.r, x: (cell.c + 0.5) * TILE, y: (cell.r + 0.5) * TILE, level: 1, cd: 0 };
}

function towerStats(type, level, cfg, shop) {
  const d = cfg.towers[type];
  return {
    dmg: d.dmg * (1 + (level - 1) * cfg.levelDmg) * shop.dmg,
    rate: d.rate * (1 + (level - 1) * cfg.levelRate) * shop.rate,
    range: d.range * (1 + (level - 1) * cfg.levelRange)
  };
}

function upgradeCost(tower, cfg) {
  return Math.round(cfg.towers[tower.type].cost * cfg.upgradeCostMul * tower.level);
}

function makeEnemy(type, wave, cfg, fromParent) {
  const d = cfg.enemies[type];
  const scale = 1 + (wave - 1) * cfg.hpScale;
  const hp = Math.round(d.hp * scale * (fromParent ? 0.5 : 1));
  return {
    type, hp, maxHp: hp, speed: d.speed, reward: d.reward, armor: d.armor,
    boss: d.boss, leak: d.leak, noSlow: d.noSlow,
    split: d.split, splitCount: d.splitCount,
    seg: fromParent ? Math.max(0, fromParent.seg - 1) : 0,
    segT: fromParent ? fromParent.segT : 0,
    x: fromParent ? fromParent.x : 0,
    y: fromParent ? fromParent.y : 0,
    slowF: 1, slowT: 0, dead: false
  };
}

function simulate(wave, towers, cfg, shop) {
  const PATH = pathPoints(cfg);
  const t = {
    enemies: [], towers, credits: 0, kills: 0, wave,
    baseHp: cfg.baseHp, spawnQueue: buildWave(wave, cfg), spawnIndex: 0, clock: 0
  };
  t.enemies = [];
  let guard = 0;
  while ((t.spawnIndex < t.spawnQueue.length || t.enemies.length > 0) && guard < 60000) {
    guard++;
    t.clock += STEP;
    while (t.spawnIndex < t.spawnQueue.length && t.spawnQueue[t.spawnIndex].at <= t.clock) {
      const e = makeEnemy(t.spawnQueue[t.spawnIndex].type, wave, cfg, null);
      e.x = PATH[0].x; e.y = PATH[0].y;
      t.enemies.push(e);
      t.spawnIndex++;
    }
    for (const e of t.enemies) {
      if (e.dead) continue;
      if (e.slowT > 0) { e.slowT -= STEP; if (e.slowT <= 0) e.slowF = 1; }
      let move = e.speed * e.slowF * STEP;
      let leaked = false;
      while (move > 0) {
        if (e.seg >= PATH.length - 1) { leaked = true; break; }
        const a = PATH[e.seg], b = PATH[e.seg + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const left = len * (1 - e.segT);
        if (move >= left) {
          move -= left; e.seg += 1; e.segT = 0;
          if (e.seg >= PATH.length - 1) { e.x = b.x; e.y = b.y; leaked = true; break; }
        } else { e.segT += move / len; move = 0; }
        const p = PATH[e.seg], q = PATH[Math.min(e.seg + 1, PATH.length - 1)];
        e.x = p.x + (q.x - p.x) * e.segT;
        e.y = p.y + (q.y - p.y) * e.segT;
      }
      if (leaked) {
        e.dead = true;
        t.baseHp -= e.leak;
        if (t.baseHp <= 0) return { result: 'lost', kills: t.kills, baseHp: 0, time: t.clock };
      }
    }
    t.enemies = t.enemies.filter(e => !e.dead);
    for (const tw of towers) {
      const def = cfg.towers[tw.type];
      const st = towerStats(tw.type, tw.level, cfg, shop);
      tw.cd -= STEP;
      if (tw.cd > 0) continue;
      let target = null, bestProg = -1, r2 = st.range * st.range;
      for (const e of t.enemies) {
        if (e.dead) continue;
        const dx = e.x - tw.x, dy = e.y - tw.y;
        if (dx * dx + dy * dy > r2) continue;
        const prog = e.seg + e.segT;
        if (prog > bestProg) { bestProg = prog; target = e; }
      }
      if (!target) continue;
      tw.cd = 1 / st.rate;
      const dmg = (e, amount, pierce) => {
        let d = amount;
        const ar = cfg.enemies[e.type].armor;
        if (ar) d = Math.max(1, amount - ar * (pierce ? 0.5 : 1));
        e.hp -= d;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true; t.kills++;
          t.credits += Math.round(cfg.enemies[e.type].reward * cfg.rewardMul);
          const ed = cfg.enemies[e.type];
          if (ed.split && ed.splitCount) {
            for (let i = 0; i < ed.splitCount; i++) {
              const c = makeEnemy(ed.split, wave, cfg, e);
              t.enemies.push(c);
            }
          }
        }
      };
      if (def.shot === 'shell') {
        for (const e of t.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - target.x, e.y - target.y) <= def.splash + 12) dmg(e, st.dmg, false);
        }
      } else if (def.shot === 'chain') {
        let cur = target; const hit = new Set();
        for (let i = 0; i < def.chain && cur && !cur.dead; i++) {
          hit.add(cur); dmg(cur, st.dmg, true);
          let next = null, nd = 96 * 96;
          for (const e of t.enemies) {
            if (e.dead || hit.has(e)) continue;
            const dx = e.x - cur.x, dy = e.y - cur.y, d2 = dx * dx + dy * dy;
            if (d2 < nd) { nd = d2; next = e; }
          }
          cur = next;
        }
      } else if (def.shot === 'beam') {
        const ang = Math.atan2(target.y - tw.y, target.x - tw.x);
        const dirX = Math.cos(ang), dirY = Math.sin(ang);
        for (const e of t.enemies) {
          if (e.dead) continue;
          const cross = Math.abs((e.x - tw.x) * dirY - (e.y - tw.y) * dirX);
          const along = (e.x - tw.x) * dirX + (e.y - tw.y) * dirY;
          if (cross < 20 && along > 0) dmg(e, st.dmg, false);
        }
      } else {
        if (def.slow && !target.noSlow) { target.slowF = 1 - def.slow; target.slowT = def.slowTime; }
        dmg(target, st.dmg, false);
      }
    }
    t.enemies = t.enemies.filter(e => !e.dead);
  }
  return { result: 'cleared', kills: t.kills, baseHp: t.baseHp, time: t.clock };
}

// Стратегия игрока: копит на башни, потом на прокачку, магазин берёт по ходу.
function runGame(overrides = {}) {
  const cfg = { ...defaultConfig(), ...overrides };
  const candidates = candidateCells(cfg);
  const used = new Set();
  const nextCell = () => {
    for (const cell of candidates) {
      const k = cell.c + ':' + cell.r;
      if (!used.has(k)) { used.add(k); return cell; }
    }
    return null;
  };
  let credits = cfg.startCredits;
  const towers = [];
  const plan = [];
  for (let i = 0; i < 26; i++) plan.push(i % 4 === 3 ? 'mortar' : i % 6 === 5 ? 'rail' : 'pulse');
  let planIdx = 0;
  const shop = { dmg: 1, rate: 1 };
  const log = [];

  // Аккуратный игрок строит быстро и качает уровни. Небрежный — опаздывает,
  // берёт меньше башен и позже покупает усиления в магазине.
  const wants = cfg.sloppy
    ? (wave) => {
        if (wave <= 4) return { n: 2, lvl: 1 };
        if (wave <= 9) return { n: 4, lvl: 1 };
        if (wave <= 16) return { n: 6, lvl: 2 };
        if (wave <= 24) return { n: 9, lvl: 2 };
        return { n: 12, lvl: 3 };
      }
    : (wave) => {
        if (wave <= 2) return { n: 3, lvl: 1 };
        if (wave <= 5) return { n: 5, lvl: 1 };
        if (wave <= 9) return { n: 8, lvl: 2 };
        if (wave <= 14) return { n: 11, lvl: 2 };
        if (wave <= 19) return { n: 14, lvl: 3 };
        if (wave <= 24) return { n: 17, lvl: 3 };
        return { n: 20, lvl: 3 };
      };

  for (let wave = 1; wave <= cfg.totalWaves; wave++) {
    const want = wants(wave);
    let guard = 0;
    while (guard++ < 400) {
      let acted = false;
      for (const tw of towers) {
        if (tw.level < want.lvl) {
          const c = upgradeCost(tw, cfg);
          if (credits >= c) { credits -= c; tw.level++; acted = true; }
        }
      }
      if (towers.length < want.n && planIdx < plan.length) {
        const type = plan[planIdx];
        if (credits >= cfg.towers[type].cost) {
          const cell = nextCell();
          if (cell) { credits -= cfg.towers[type].cost; towers.push(makeTower(type, cell, cfg)); planIdx++; acted = true; }
          else break;
        }
      }
      if (!acted) break;
    }
    const dmgEvery = cfg.sloppy ? 12 : 6;
    const rateEvery = cfg.sloppy ? 16 : 8;
    if (wave % dmgEvery === 0 && shop.dmg < cfg.shopDmgMax) shop.dmg = Math.min(cfg.shopDmgMax, shop.dmg + cfg.shopDmgStep);
    if (wave % rateEvery === 0 && shop.rate < cfg.shopRateMax) shop.rate = Math.min(cfg.shopRateMax, shop.rate + cfg.shopRateStep);

    const res = simulate(wave, towers, cfg, shop);
    credits += cfg.waveBonusBase + wave * cfg.waveBonusPer + Math.floor(cfg.prepTime * cfg.prepBonusPerSec);
    log.push({
      wave, towers: towers.length, result: res.result, baseHp: res.baseHp,
      kills: res.kills, time: res.time, credits,
      levels: towers.map(t => t.level).join('')
    });
    if (res.result === 'lost') return { result: 'lost', at: wave, log, cfg, towers };
  }
  return { result: 'win', log, cfg, towers };
}

module.exports = { runGame, defaultConfig, TOWER_BASE, ENEMY_BASE, buildWave, pathPoints, TILE, COLS, ROWS, candidateCells };

if (require.main === module) {
  const r = runGame();
  console.log('=== ТЕКУЩИЙ БАЛАНС ===');
  console.log('результат: ' + (r.result === 'win' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ на волне ' + r.at));
  console.log('волна | башен | итог | база | убито | время');
  for (const l of r.log) {
    if (l.wave <= 8 || l.wave % 5 === 0 || l.result === 'lost') {
      console.log(String(l.wave).padStart(5) + ' | ' + String(l.towers).padStart(6) + ' | ' + l.result.padEnd(7) + ' | ' + String(l.baseHp).padStart(4) + ' | ' + String(l.kills).padStart(5) + ' | ' + l.time.toFixed(0).padStart(5) + 'с');
    }
  }
}
