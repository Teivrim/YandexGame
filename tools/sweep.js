// Перебор параметров экономики: ищем конфиг, где
// - игра проходится,
// - база держится выше 70% (без спирали смерти),
// - волна не длится дольше ~60 с,
// - деньги не превращаются в профицит (иначе экономика "пустая").
const { runGame } = require('./sim-lib');

function score(result) {
  const log = result.log;
  const last = log[log.length - 1];
  const minBase = Math.min(...log.slice(4).map(l => l.baseHp));
  const avgTime = log.slice(4).reduce((s, l) => s + l.time, 0) / Math.max(1, log.slice(4).length);
  const lastCredits = last.credits;
  const won = result.result === 'win';
  return { won, minBase, avgTime, lastCredits, at: result.at };
}

function run(label, overrides) {
  const r = runGame(overrides);
  const s = score(r);
  const tag = s.won ? 'ПОБЕДА' : 'провал@' + s.at;
  console.log(
    label.padEnd(34) + ' | ' + tag.padEnd(11) +
    ' | база min ' + String(s.minBase).padStart(3) +
    ' | волна ~' + s.avgTime.toFixed(0).padStart(3) + 'с' +
    ' | CR в конце ' + String(s.lastCredits).padStart(6)
  );
  return s;
}

console.log('=== БАЗОВАЯ ЛИНИЯ ===');
run('текущие настройки', {});

console.log('\n=== СТАРТОВЫЕ КРЕДИТЫ ===');
for (const c of [220, 300, 380, 460, 560]) {
  run('start ' + c, { startCredits: c });
}

console.log('\n=== МАСШТАБ HP ===');
for (const h of [0.11, 0.09, 0.075, 0.06, 0.05]) {
  run('hpScale ' + h, { hpScale: h });
}

console.log('\n=== НАГРАДЫ ЗА УБИЙСТВА ===');
for (const m of [1, 1.4, 1.8, 2.4]) {
  run('rewardMul ' + m, { rewardMul: m });
}

console.log('\n=== БОНУС ЗА ВОЛНУ ===');
for (const w of [{ b: 20, p: 5 }, { b: 40, p: 8 }, { b: 60, p: 12 }]) {
  run('waveBonus ' + w.b + '+' + w.p + 'x', { waveBonusBase: w.b, waveBonusPer: w.p });
}

console.log('\n=== ПРОЧИЕ ===');
run('база 30 HP', { baseHp: 30 });
run('база 40 HP', { baseHp: 40 });
run('дешёвые башни x0.8', { towers: scaleTowers(0.8) });
run('дорогие башни x1.4', { towers: scaleTowers(1.4) });
run('радиусы x1.25', { towers: scaleRanges(1.25) });
run('радиусы x1.5', { towers: scaleRanges(1.5) });
run('дешёвая прокачка x0.6', { upgradeCostMul: 0.6 });
run('дорогая прокачка x1.3', { upgradeCostMul: 1.3 });

console.log('\n=== КОМБИНАЦИИ ===');
run('старт 380 + hp 0.075', { startCredits: 380, hpScale: 0.075 });
run('старт 380 + радиусы 1.25', { startCredits: 380, towers: scaleRanges(1.25) });
run('старт 380 + база 30', { startCredits: 380, baseHp: 30 });
run('старт 380 + радиусы 1.25 + база 30', { startCredits: 380, baseHp: 30, towers: scaleRanges(1.25) });
run('старт 460 + радиусы 1.35 + база 30', { startCredits: 460, baseHp: 30, towers: scaleRanges(1.35) });
run('старт 460 + р1.35 + база30 + hp0.08', { startCredits: 460, baseHp: 30, hpScale: 0.08, towers: scaleRanges(1.35) });
run('полный сбаланс', {
  startCredits: 420, baseHp: 30, hpScale: 0.08,
  rewardMul: 1.3, waveBonusBase: 35, waveBonusPer: 8,
  towers: scaleRanges(1.3)
});

function scaleTowers(k) {
  const t = {};
  for (const [name, v] of Object.entries({
    pulse: { cost: 60, dmg: 13, rate: 1.35, range: 118, shot: 'bolt' },
    mortar: { cost: 130, dmg: 34, rate: 0.5, range: 168, shot: 'shell', splash: 62 },
    cryo: { cost: 100, dmg: 5, rate: 0.9, range: 124, shot: 'bolt', slow: 0.42, slowTime: 1.8 },
    tesla: { cost: 165, dmg: 20, rate: 0.8, range: 132, shot: 'chain', chain: 4 },
    rail: { cost: 240, dmg: 82, rate: 0.32, range: 300, shot: 'beam' }
  })) t[name] = { ...v, cost: Math.round(v.cost * k) };
  return t;
}
function scaleRanges(k) {
  const t = scaleTowers(1);
  for (const v of Object.values(t)) v.range = Math.round(v.range * k);
  return t;
}
