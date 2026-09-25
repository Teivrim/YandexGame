// Сверяем конфиг симулятора с реальными константами игры,
// чтобы проверка баланса велась по фактическим числам, а не по копии.
const fs = require('node:fs');
const path = require('node:path');
const { runGame } = require('./sim-lib');

const src = fs.readFileSync(path.join(__dirname, '..', 'neon-bastion', 'game.js'), 'utf8');

function num(re, label) {
  const m = src.match(re);
  if (!m) throw Error('не найдено: ' + label);
  return Number(m[1]);
}

const towers = {
  pulse: { cost: 60, dmg: 13, rate: 1.35, range: 153, shot: 'bolt' },
  mortar: { cost: 130, dmg: 34, rate: 0.5, range: 218, shot: 'shell', splash: 62 },
  cryo: { cost: 100, dmg: 5, rate: 0.9, range: 161, shot: 'bolt', slow: 0.42, slowTime: 1.8 },
  tesla: { cost: 165, dmg: 20, rate: 0.8, range: 172, shot: 'chain', chain: 4 },
  rail: { cost: 240, dmg: 82, rate: 0.32, range: 390, shot: 'beam' }
};
// проверяем, что числа в игре совпадают с используемыми здесь
for (const [name, def] of Object.entries(towers)) {
  const find = (field) => {
    const m = src.match(new RegExp('\\n    ' + name + ': \\{[\\s\\S]{0,300}?' + field + ': (\\d+)'));
    return m ? Number(m[1]) : null;
  };
  for (const [field, key] of [['range', 'range'], ['damage', 'dmg'], ['cost', 'cost']]) {
    const inGame = find(field);
    if (inGame === null) throw Error('не найдено поле ' + field + ' у башни ' + name);
    if (inGame !== def[key]) {
      console.log('РАСХОЖДЕНИЕ ' + name + '.' + field + ': в игре ' + inGame + ', в симуляторе ' + def[key]);
      def[key] = inGame;
    }
  }
}

const startCredits = num(/return (\d+) \+ getUpgrade\('starter'\) \* 60;/, 'startCredits');
const baseHp = num(/return (\d+) \+ getUpgrade\('core'\) \* 5;/, 'baseHp');
const hpScale = num(/return 1 \+ \(number - 1\) \* ([\d.]+);/, 'hpScale');
const waveBonusBase = num(/const reward = (\d+) \+ game\.wave \* (\d+);/, 'waveBonus');
const waveBonusPer = Number(src.match(/const reward = (\d+) \+ game\.wave \* (\d+);/)[2]);

console.log('=== КОНСТАНТЫ ИЗ ИГРЫ ===');
console.log('стартовые кредиты: ' + startCredits);
console.log('прочность базы: ' + baseHp);
console.log('масштаб HP за волну: ' + hpScale + ' (на 30-й волне x' + (1 + 29 * hpScale).toFixed(2) + ')');
console.log('бонус за волну: ' + waveBonusBase + ' + ' + waveBonusPer + ' x волна');
console.log('');

const config = {
  startCredits, baseHp, hpScale,
  waveBonusBase, waveBonusPer,
  towers
};

console.log('=== ПРОВЕРКА БАЛАНСА ПО ФАКТУ ===');
const good = runGame(config);
const bad = runGame({ ...config, sloppy: true });

function report(label, r) {
  const log = r.log;
  const minBase = Math.min(...log.slice(3).map(l => l.baseHp));
  const avgTime = log.slice(3).reduce((s, l) => s + l.time, 0) / Math.max(1, log.length - 3);
  const lastCredits = log[log.length - 1].credits;
  console.log(label + ': ' + (r.result === 'win' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ на волне ' + r.at) +
    ' | база min ' + minBase + '/' + config.baseHp +
    ' | волна ~' + avgTime.toFixed(0) + 'с' +
    ' | CR в конце ' + lastCredits);
  console.log('   волна | башен | база | убито | время');
  for (const l of log) {
    if (l.wave <= 6 || l.wave % 5 === 0) {
      console.log('   ' + String(l.wave).padStart(5) + ' | ' + String(l.towers).padStart(6) + ' | ' +
        String(l.baseHp).padStart(4) + ' | ' + String(l.kills).padStart(5) + ' | ' + l.time.toFixed(0).padStart(5) + 'с');
    }
  }
}
report('аккуратный игрок', good);
console.log('');
report('небрежный игрок', bad);
