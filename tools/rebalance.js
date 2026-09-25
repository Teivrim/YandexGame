// Подбор сбалансированных значений.
//
// Проблема: HP волны растёт как (1 + (n-1)*0.11) -> к волне 30 это x4.19,
// но DPS игрока растёт только от числа башен и их уровней. Кредитов в
// избытке, а убить врагов нечем.
//
// Решение: сделать HP линейным, а не мультипликативным, и добавить
// площадку для осмысленного выбора типов башен.
const TILE = 48;
const PATH_PX = 2064;
const MAX_LEVEL = 3;
const TOTAL_WAVES = 30;

const CURRENT_HP_SCALE = 0.11;
const PROPOSED_HP_SCALE = 0.075;

// Сколько башен игрок может реально построить к данной волне.
// Опорная точка: 9 Импульсов покрывают путь. Дальше идёт усиление.
function towerCountAtWave(n) {
  if (n <= 5) return 4;
  if (n <= 10) return 7;
  if (n <= 15) return 10;
  if (n <= 20) return 13;
  if (n <= 25) return 16;
  return 20;
}

function towerDps(type, level, shopDamage, shopRate) {
  const base = {
    pulse:  { dmg: 13, rate: 1.35 },
    mortar: { dmg: 34, rate: 0.50 },
    cryo:   { dmg: 5,  rate: 0.90 },
    tesla:  { dmg: 20, rate: 0.80 },
    rail:   { dmg: 82, rate: 0.32 }
  }[type];
  const dmg = base.dmg * (1 + (level - 1) * 0.35) * shopDamage;
  const rate = base.rate * (1 + (level - 1) * 0.18) * shopRate;
  return dmg * rate;
}

function buildWaveCounts(n) {
  const counts = { drone: 0, scout: 0, armor: 0, wraith: 0, splitter: 0, boss: 0 };
  const add = (t, c) => { if (c > 0) counts[t] = c; };
  add('drone', 4 + Math.floor(n * 0.85));
  if (n >= 2) add('scout', 2 + Math.floor(n * 0.45));
  if (n >= 4) add('armor', 1 + Math.floor(n * 0.32));
  if (n >= 6) add('wraith', 1 + Math.floor(n * 0.28));
  if (n >= 8) add('splitter', 1 + Math.floor(n * 0.26));
  if (n % 5 === 0) counts.boss = 1 + Math.floor(n / 20);
  return counts;
}

function waveStats(n, hpScale, enemyBase) {
  const scale = 1 + (n - 1) * hpScale;
  const counts = buildWaveCounts(n);
  let hp = 0, count = 0, travelTime = 0;
  const speeds = { drone: 54, scout: 104, armor: 34, wraith: 68, splitter: 48, boss: 26 };
  for (const k of Object.keys(counts)) {
    const n2 = counts[k];
    if (!n2) continue;
    hp += enemyBase[k].hp * scale * n2;
    count += n2;
    travelTime += n2;
  }
  // окно обстрела: пока волна идёт, башни стреляют
  const lastAt = buildWaveDur(n);
  return { hp, count, duration: lastAt, scale };
}

function buildWaveDur(n) {
  const spawns = [];
  const add = (t, c, gap, start) => { for (let i = 0; i < c; i++) spawns.push({ at: (start || 0) + i * gap }); };
  add('drone', 4 + Math.floor(n * 0.85), 0.7, 0);
  if (n >= 2) add('scout', 2 + Math.floor(n * 0.45), 0.45, 3);
  if (n >= 4) add('armor', 1 + Math.floor(n * 0.32), 1.5, 5.5);
  if (n >= 6) add('wraith', 1 + Math.floor(n * 0.28), 1.0, 8);
  if (n >= 8) add('splitter', 1 + Math.floor(n * 0.26), 1.2, 10.5);
  if (n % 5 === 0) add('boss', 1 + Math.floor(n / 20), 0, 14);
  const last = spawns[spawns.length - 1];
  return last.at;
}

const ENEMY_BASE = {
  drone:    { hp: 46,   speed: 54,  reward: 7 },
  scout:    { hp: 30,   speed: 104, reward: 9 },
  armor:    { hp: 190,  speed: 34,  reward: 19 },
  wraith:   { hp: 84,   speed: 68,  reward: 15 },
  splitter: { hp: 110,  speed: 48,  reward: 14 },
  boss:     { hp: 1250, speed: 26,  reward: 120 }
};

function playerDps(n, shopDamage, shopRate) {
  const towers = towerCountAtWave(n);
  // разумный микс: часть Импульсов, часть Мортир, часть Рельсотронов
  const mix = [];
  for (let i = 0; i < towers; i++) {
    if (i % 4 === 3) mix.push('mortar');
    else if (i % 5 === 4) mix.push('rail');
    else mix.push('pulse');
  }
  // уровень прокачки тоже растёт
  const level = n <= 10 ? 1 : n <= 20 ? 2 : 3;
  return mix.reduce((s, t) => s + towerDps(t, level, shopDamage, shopRate), 0);
}

console.log('=== СРАВНЕНИЕ МАСШТАБА HP ===\n');
console.log('волна | HP сейчас (x0.11) | HP с x0.075 | разница');
for (const w of [10, 15, 20, 25, 30]) {
  const cur = 1 + (w - 1) * CURRENT_HP_SCALE;
  const prop = 1 + (w - 1) * PROPOSED_HP_SCALE;
  console.log(String(w).padStart(5) + ' | ' + cur.toFixed(2).padStart(18) + ' | ' + prop.toFixed(2).padStart(12) + ' | x' + (cur / prop).toFixed(1));
}

console.log('\n=== НОВЫЙ БАЛАНС: запас DPS ===\n');
console.log('Предполагаем: игрок строит 4→20 башен, прокачивает до ур3, берёт магазин.\n');
console.log('волна | HP волны | нужно DPS | DPS игрока | запас | вердикт');

let allPass = true;
for (let w = 1; w <= TOTAL_WAVES; w++) {
  const shopDamage = 1 + Math.min(3, Math.floor(w / 7)) * 0.12;
  const shopRate = 1 + Math.min(3, Math.floor(w / 7)) * 0.10;
  const { hp, count, duration } = waveStats(w, PROPOSED_HP_SCALE, ENEMY_BASE);
  const need = hp / duration;
  const have = playerDps(w, shopDamage, shopRate);
  const ratio = have / need;
  const verdict = ratio >= 3 ? 'комфорт' : ratio >= 1.6 ? 'норма' : ratio >= 1.05 ? 'впритык' : 'ПРОВАЛ';
  if (ratio < 1.05) allPass = false;
  if (w <= 6 || w % 5 === 0 || w >= 28) {
    console.log(
      String(w).padStart(5) + ' | ' + hp.toFixed(0).padStart(8) + ' | ' +
      need.toFixed(0).padStart(9) + ' | ' + have.toFixed(0).padStart(10) + ' | ' +
      ratio.toFixed(2).padStart(5) + ' | ' + verdict
    );
  }
}
console.log('\nвсе волны проходимы: ' + (allPass ? 'ДА' : 'НЕТ'));

// Проверяем, хватает ли денег на такое количество башен
console.log('\n=== ХВАТАЕТ ЛИ ДЕНЕГ ===\n');
const TOWER_COST = { pulse: 60, mortar: 130, rail: 240 };
let stock = 260;
console.log('старт: 260 CR');
console.log('волна | построено башен | потрачено | доход | остаток');
let spent = 0;
for (let w = 1; w <= TOTAL_WAVES; w++) {
  const want = towerCountAtWave(w);
  const already = towerCountAtWave(w - 1) || 0;
  const toBuild = want - already;
  let cost = 0;
  for (let i = 0; i < toBuild; i++) cost += i % 4 === 3 ? TOWER_COST.mortar : i % 5 === 4 ? TOWER_COST.rail : TOWER_COST.pulse;
  const counts = buildWaveCounts(w);
  let reward = 0;
  for (const k of Object.keys(counts)) reward += ENEMY_BASE[k].reward * (counts[k] || 0);
  const income = reward + 30 + w * 6;
  spent += cost;
  stock += income - cost;
  if (w <= 8 || w % 5 === 0) {
    console.log(String(w).padStart(5) + ' | ' + want.toString().padStart(16) + ' | ' + cost.toString().padStart(8) + ' | ' + income.toString().padStart(5) + ' | ' + stock.toString().padStart(7));
  }
}
console.log('\nитоговый остаток: ' + stock + ' CR' + (stock < 0 ? '  <-- ДЕФИЦИТ' : '  (профицит)'));
