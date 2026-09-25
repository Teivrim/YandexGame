// Проверка "запаса прощения": держится ли баланс, если игрок ошибается —
// поздно строит, мало башен, не успевает качать уровни.
const { runGame } = require('./sim-lib');

function scaleRanges(k, costMul = 1) {
  const base = {
    pulse: { cost: 60, dmg: 13, rate: 1.35, range: 118, shot: 'bolt' },
    mortar: { cost: 130, dmg: 34, rate: 0.5, range: 168, shot: 'shell', splash: 62 },
    cryo: { cost: 100, dmg: 5, rate: 0.9, range: 124, shot: 'bolt', slow: 0.42, slowTime: 1.8 },
    tesla: { cost: 165, dmg: 20, rate: 0.8, range: 132, shot: 'chain', chain: 4 },
    rail: { cost: 240, dmg: 82, rate: 0.32, range: 300, shot: 'beam' }
  };
  const t = {};
  for (const [k2, v] of Object.entries(base)) t[k2] = { ...v, range: Math.round(v.range * k), cost: Math.round(v.cost * costMul) };
  return t;
}

function evaluate(label, overrides) {
  const good = runGame(overrides);
  const bad = runGame({ ...overrides, sloppy: true });
  const gTag = good.result === 'win' ? 'победа' : 'провал@' + good.at;
  const bTag = bad.result === 'win' ? 'победа' : 'провал@' + bad.at;
  const gMin = Math.min(...good.log.slice(3).map(l => l.baseHp));
  const bMin = Math.min(...bad.log.slice(3).map(l => l.baseHp));
  const gTime = good.log.slice(3).reduce((s, l) => s + l.time, 0) / Math.max(1, good.log.length - 3);
  const bTime = bad.log.slice(3).reduce((s, l) => s + l.time, 0) / Math.max(1, bad.log.length - 3);
  console.log(
    label.padEnd(30) + ' | аккуратный ' + gTag.padEnd(9) + ' база ' + String(gMin).padStart(3) + ' ' + gTime.toFixed(0).padStart(3) + 'с' +
    ' | небрежный ' + bTag.padEnd(9) + ' база ' + String(bMin).padStart(3) + ' ' + bTime.toFixed(0).padStart(3) + 'с'
  );
}

console.log('=== ПРОВЕРКА ПРОЩЕНИЯ ===');
console.log('идеал: аккуратный побеждает уверенно, небрежный — держится дольше 15-й волны\n');

evaluate('текущий баланс', {});
evaluate('старт 380', { startCredits: 380 });
evaluate('старт 460 + база 30', { startCredits: 460, baseHp: 30 });
evaluate('старт 460 + р1.35 + база30', { startCredits: 460, baseHp: 30, towers: scaleRanges(1.35) });
evaluate('КАНДИДАТ А', {
  startCredits: 420, baseHp: 30, hpScale: 0.08, rewardMul: 1.3,
  waveBonusBase: 35, waveBonusPer: 8, towers: scaleRanges(1.3)
});
evaluate('КАНДИДАТ Б', {
  startCredits: 480, baseHp: 32, hpScale: 0.085, rewardMul: 1.3,
  waveBonusBase: 35, waveBonusPer: 8, towers: scaleRanges(1.3)
});
evaluate('КАНДИДАТ В', {
  startCredits: 420, baseHp: 30, hpScale: 0.075, rewardMul: 1.35,
  waveBonusBase: 35, waveBonusPer: 8, towers: scaleRanges(1.35)
});
evaluate('КАНДИДАТ Г', {
  startCredits: 450, baseHp: 30, hpScale: 0.07, rewardMul: 1.3,
  waveBonusBase: 35, waveBonusPer: 8, towers: scaleRanges(1.3)
});
