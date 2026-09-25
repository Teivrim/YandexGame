// Проверка боевого баланса: успевают ли башни убивать волны, пока враг идёт по пути.
const TILE = 48;
const PATH_PX = 2064;
const MAX_LEVEL = 3;

const TOWERS = {
  pulse:  { cost: 60,  dmg: 13, rate: 1.35, range: 118 },
  mortar: { cost: 130, dmg: 34, rate: 0.50, range: 168, splash: 62 },
  cryo:   { cost: 100, dmg: 5,  rate: 0.90, range: 124, slow: 0.42, slowTime: 1.8 },
  tesla:  { cost: 165, dmg: 20, rate: 0.80, range: 132, chain: 4 },
  rail:   { cost: 240, dmg: 82, rate: 0.32, range: 300 }
};
const ENEMIES = {
  drone:    { hp: 46,   speed: 54,  reward: 7,   armor: 0 },
  scout:    { hp: 30,   speed: 104, reward: 9,   armor: 0 },
  armor:    { hp: 190,  speed: 34,  reward: 19,  armor: 5 },
  wraith:   { hp: 84,   speed: 68,  reward: 15,  armor: 0 },
  splitter: { hp: 110,  speed: 48,  reward: 14,  armor: 0 },
  boss:     { hp: 1250, speed: 26,  reward: 120, armor: 10 }
};

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

// DPS одной башни на максимальном уровне (без прокачки из магазина)
function towerDps(type, level) {
  const d = TOWERS[type];
  const dmg = d.dmg * (1 + (level - 1) * 0.35);
  const rate = d.rate * (1 + (level - 1) * 0.18);
  return dmg * rate;
}

// Сколько башен нужно, чтобы перебить поток на каждой волне.
// Считаем грубо: суммарный HP волны / (DPS * время, пока враг в радиусе).
// Для оценки берём "окно обстрела" = pathLen / countSegment проходов.
function waveHp(n) {
  const scale = 1 + (n - 1) * 0.11;
  let hp = 0, count = 0;
  for (const s of buildWave(n)) {
    hp += ENEMIES[s.type].hp * scale;
    count++;
  }
  return { hp, count, scale };
}

function waveDuration(n) {
  const spawns = buildWave(n);
  return spawns[spawns.length - 1].at;
}

console.log('=== УРОН vs HP ПО ВОЛНАМ ===');
console.log('Полная оборота: 9 Импульсов ур3, равномерно по пути.');
console.log('Каждая башня видит ~2*range пути; 9 башен покрывают путь целиком.');
console.log('');

const NINE = Array.from({ length: 9 }, () => 'pulse');
const totalDps = NINE.reduce((s, t) => s + towerDps(t, MAX_LEVEL), 0);
console.log('DPS одной Импульса ур3: ' + towerDps('pulse', 3).toFixed(1));
console.log('DPS 9 Импульсов ур3: ' + totalDps.toFixed(1) + '\n');

console.log('волна | HP волны | врагов | волна идёт | нужно DPS | есть DPS | запас');
for (let w = 1; w <= 30; w++) {
  const { hp, count, scale } = waveHp(w);
  const dur = waveDuration(w);
  // Каждый враг проводит в зоне обстрела примерно (2*range*9)/pathLen от общей длины
  // Проще: суммарное время "враг в радиусе" ≈ count * (2*118*9) / speed / pathLen * pathLen
  // Практично: суммарный урон, который 9 башен нанесут за всю волну = DPS * dur
  const available = totalDps * dur;
  const need = hp;
  const ratio = available / need;
  const verdict = ratio >= 2.5 ? 'ок' : ratio >= 1.3 ? 'впритык' : 'НЕ ХВАТАЕТ';
  if (w <= 8 || w % 5 === 0 || w >= 28) {
    console.log(
      String(w).padStart(5) + ' | ' + hp.toFixed(0).padStart(8) + ' | ' + String(count).padStart(6) + ' | ' +
      dur.toFixed(0).padStart(9) + ' с | ' + (need / dur).toFixed(0).padStart(9) + ' | ' +
      totalDps.toFixed(0).padStart(8) + ' | ' + ratio.toFixed(2).padStart(5) + ' ' + verdict
    );
  }
}

console.log('\n=== ВЫВОД ===');
const w30 = waveHp(30);
const dur30 = waveDuration(30);
console.log('на 30-й волне HP = ' + w30.hp.toFixed(0) + ' (масштаб x' + w30.scale.toFixed(2) + ')');
console.log('нужно DPS = ' + (w30.hp / dur30).toFixed(0) + ', есть только ' + totalDps.toFixed(0));
console.log('дефицит в ' + (w30.hp / dur30 / totalDps).toFixed(1) + ' раза');

// А если прокачать магазином (+12% урон x3 = 1.36, +10% скорость x3 = 1.3)?
const boosted = totalDps * 1.36 * 1.3;
console.log('\nс полной прокачкой магазина (урон 1.36, скорость 1.3):');
console.log('DPS = ' + boosted.toFixed(0) + ', запас на 30 волне = ' + (boosted * dur30 / w30.hp).toFixed(2) + 'x');
