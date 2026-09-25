// Модель экономики NEON//BASTION: сколько кредитов приходит по волнам
// и сколько стоит минимально разумная оборона.
const COLS = 22, ROWS = 13, TILE = 48;
const NODES = [
  { x: -1, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 3 },
  { x: 15, y: 3 }, { x: 15, y: 10 }, { x: 19, y: 10 }, { x: 19, y: 6 }, { x: 20, y: 6 }
];

const TOWERS = {
  pulse: { cost: 60, range: 118 },
  mortar: { cost: 130, range: 168 },
  cryo: { cost: 100, range: 124 },
  tesla: { cost: 165, range: 132 },
  rail: { cost: 240, range: 300 }
};
const ENEMIES = {
  drone: { hp: 46, speed: 54, reward: 7 },
  scout: { hp: 30, speed: 104, reward: 9 },
  armor: { hp: 190, speed: 34, reward: 19 },
  wraith: { hp: 84, speed: 68, reward: 15 },
  splitter: { hp: 110, speed: 48, reward: 14 },
  boss: { hp: 1250, speed: 26, reward: 120 }
};
const MAX_LEVEL = 3;

function buildWave(n) {
  const spawns = [];
  const add = (type, count, gap, start) => {
    for (let i = 0; i < count; i++) spawns.push({ type, at: (start || 0) + i * gap });
  };
  add('drone', 4 + Math.floor(n * 0.85), 0.7, 0);
  if (n >= 2) add('scout', 2 + Math.floor(n * 0.45), 0.45, 3);
  if (n >= 4) add('armor', 1 + Math.floor(n * 0.32), 1.5, 5.5);
  if (n >= 6) add('wraith', 1 + Math.floor(n * 0.28), 1.0, 8);
  if (n >= 8) add('splitter', 1 + Math.floor(n * 0.26), 1.2, 10.5);
  if (n % 5 === 0) add('boss', 1 + Math.floor(n / 20), 0, 14);
  return spawns.sort((a, b) => a.at - b.at);
}

// сколько клеток вообще доступно под башни
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
const buildable = COLS * ROWS - road.size;

// длина пути в клетках
let pathLen = 0;
for (let i = 1; i < NODES.length; i++) {
  pathLen += Math.abs(NODES[i].x - NODES[i - 1].x) + Math.abs(NODES[i].y - NODES[i - 1].y);
}
const pathPx = pathLen * TILE;

console.log('=== ГЕОМЕТРИЯ ===');
console.log('клеток поля: ' + (COLS * ROWS) + ', под башни: ' + buildable);
console.log('длина пути: ' + pathLen + ' клеток (' + pathPx + ' px)');
const cover = (r) => Math.min(1, (2 * r) / pathPx);
console.log('одна башня Импульс (118) накрывает максимум ' + (cover(118) * 100).toFixed(1) + '% пути');
console.log('чтобы накрыть путь целиком нужно ~' + Math.ceil(pathPx / (2 * TOWERS.pulse.range)) + ' Импульсов = ' + (Math.ceil(pathPx / (2 * TOWERS.pulse.range)) * TOWERS.pulse.cost) + ' CR\n');

console.log('=== ДОХОД ПО ВОЛНАМ ===');
console.log('волна | врагов | за убийства | за волну | итого дохода | накоплено');
let total = 0;
let stock = 220;
const rows = [];
for (let w = 1; w <= 30; w++) {
  const spawns = buildWave(w);
  let kills = 0, reward = 0;
  const counts = {};
  for (const s of spawns) {
    counts[s.type] = (counts[s.type] || 0) + 1;
    reward += ENEMIES[s.type].reward;
    kills++;
  }
  const waveBonus = 20 + w * 5;
  const prepBonus = 50; // максимум за досрочный старт
  const income = reward + waveBonus + prepBonus;
  total += income;
  stock += income;
  rows.push({ w, kills, reward, waveBonus, income, total, stock });
  if (w <= 10 || w % 5 === 0) {
    console.log(
      String(w).padStart(5) + ' | ' + String(kills).padStart(6) + ' | ' +
      String(reward).padStart(12) + ' | ' + String(waveBonus + prepBonus).padStart(8) + ' | ' +
      String(income).padStart(14) + ' | ' + String(stock).padStart(10)
    );
  }
}
console.log('');

console.log('=== ПРОВЕРКА ТЕМПА ===');
// разумная стратегия: к wave N должно хватать на примерно N/2 башен
const targets = [
  { wave: 3, want: '3 Импульса', cost: 3 * 60 },
  { wave: 5, want: '2 Мортира + 2 Импульса', cost: 2 * 130 + 2 * 60 },
  { wave: 10, want: 'полный набор: 3 Мортира + 3 Крио + 4 Импульса', cost: 3 * 130 + 3 * 100 + 4 * 60 },
  { wave: 15, want: '+ Генератор и Рельсотрон', cost: 2 * 165 + 2 * 240 },
  { wave: 20, want: 'прокачка башен до ур 2', cost: 8 * 80 }
];
for (const t of targets) {
  const row = rows[t.wave - 1];
  const spentToDate = 220 + row.stock; // всего доступно денег на этот момент
  const ok = spentToDate >= t.cost;
  console.log(
    'к волне ' + String(t.wave).padStart(2) + ' нужно "' + t.want + '" (' + t.cost + ' CR)' +
    ' | доступно ' + spentToDate + ' CR | ' + (ok ? 'хватает' : 'НЕ ХВАТАЕТ (дефицит ' + (t.cost - spentToDate) + ')')
  );
}

console.log('\n=== УБЫТОЧНОСТЬ ===');
// сколько кредитов на всю игру и хватает ли на полное покрытие
const fullCover = Math.ceil(pathPx / (2 * TOWERS.pulse.range));
console.log('на полное покрытие пути нужно ' + fullCover + ' Импульсов = ' + (fullCover * 60) + ' CR');
console.log('всего за 30 волн: ' + 220 + ' старт + ' + total + ' дохода = ' + (220 + total) + ' CR');
const maxTowers = buildable;
console.log('доступно клеток: ' + maxTowers + ', хватает на ' + Math.floor((220 + total) / 60) + ' Импульсов');
console.log('требуется башен для покрытия: ' + fullCover + ' → ' + (Math.floor((220 + total) / 60) >= fullCover ? 'проходимо' : 'НЕ ПРОХОДИМО'));

console.log('\n=== ПРОЧИЕ ЧИСЛА ===');
console.log('стартовые кредиты: 220 (с прокачкой до 400)');
console.log('Импульс 60 CR, урон 13, скорость 1.35/с → урон в секунду: ' + (13 * 1.35).toFixed(1));
const droneHp = 46;
console.log('время убийства одного Дрона одним Импульсом: ' + (droneHp / (13 * 1.35)).toFixed(2) + ' с');
console.log('Дрон проходит путь за ' + (pathPx / 54).toFixed(0) + ' с');
console.log('база: 20 HP, утечка стоит 1 HP → 20 утечек = поражение');
console.log(' TPS: башенная оборона, проходов за игру ~' + (rows.reduce((s, r) => s + r.kills, 0)));
