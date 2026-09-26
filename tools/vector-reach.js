// Независимая проверка проходимости уровней NEON//VECTOR.
//
// Читает neon-vector/levels.js (его собирает tools/vector-gen.js) и для каждого
// уровня строит граф достижимости по настоящим прыжковым дугам. Проверяет, что
// до выхода можно дойти и что каждый осколок достижим.
//
// Запуск: node tools/vector-reach.js

const V = require('./vector-lib');

const K = V.loadGameConstants();
const levels = V.loadLevelsFromSource();

const jumpH = (K.JUMP_V * K.JUMP_V) / (2 * K.GRAVITY);
const flight = (2 * K.JUMP_V) / K.GRAVITY;
const reach = K.MAX_RUN * flight;

console.log('физика из neon-vector/game.js:');
console.log('  прыжок в высоту      ' + jumpH.toFixed(1) + ' px = ' + (jumpH / V.TILE).toFixed(2) + ' клетки');
console.log('  полёт до той же высоты ' + flight.toFixed(3) + ' c');
console.log('  дальность на полной скорости ' + reach.toFixed(0) + ' px = ' + (reach / V.TILE).toFixed(1) + ' клетки');
console.log('  рост: стоя ' + K.P_H + ' px, скольжение ' + K.P_H_SLIDE + ' px (в щель в клетку — только скольжением)');
console.log('  скорость ' + K.MAX_RUN + ' px/c, ускорение ' + K.ACCEL_GROUND + ', трение скольжения ' + K.FRICTION_SLIDE);
console.log('');

let bad = 0;
levels.forEach((def, i) => {
  const lv = V.buildGrid(def.rows);
  const res = V.solve(lv, K);
  const name = (i + 1 < 10 ? '0' : '') + (i + 1) + '. ' + def.name;
  const problems = [];
  if (!res.goalOK) problems.push('до выхода не дойти');
  if (res.missed.length) {
    problems.push('недостижимые осколки: ' + res.missed.map((s) => '(' + s.x + ',' + s.y + ')').join(' '));
  }
  if (lv.at(lv.spawn.x, lv.spawn.y) === V.T.WALL) problems.push('старт в стене');
  else if (lv.at(lv.spawn.x, lv.spawn.y + 1) !== V.T.WALL) problems.push('под стартом нет пола');
  if (!lv.shards.length) problems.push('нет осколков');
  if (lv.movers && lv.movers.length) {
    lv.movers.forEach((m) => {
      if (lv.at(m.x, m.y) === V.T.WALL) problems.push('движущаяся платформа в стене (' + m.x + ',' + m.y + ')');
    });
  }
  // осколок не должен лежать в стене
  lv.shards.forEach((s) => {
    if (lv.at(s.x, s.y) === V.T.WALL) problems.push('осколок в стене (' + s.x + ',' + s.y + ')');
  });
  if (lv.dashAt && lv.at(lv.dashAt.x, lv.dashAt.y) === V.T.WALL) problems.push('рывок в стене');

  if (problems.length) bad++;
  console.log((problems.length ? 'ФЕЙЛ ' : 'ОК   ') + name.padEnd(14)
    + lv.w + '×' + lv.h
    + '  узлов ' + String(res.nodes).padStart(4)
    + '  осколков ' + (lv.shards.length - res.missed.length) + '/' + lv.shards.length
    + '  старт ' + lv.spawn.x + ',' + lv.spawn.y
    + '  выход ' + lv.goal.x + ',' + lv.goal.y
    + (lv.dashAt ? '  рывок' : '')
    + '  платформ ' + (lv.movers ? lv.movers.length : 0)
    + (problems.length ? '' : '  ' + (res.goalOK ? 'ВЫХОД ДОСТИЖИМ' : '')));
  if (problems.length) problems.forEach((p) => console.log('        → ' + p));
});

console.log('');
if (bad) {
  console.log('НЕПРОХОДНЫХ УРОВНЕЙ: ' + bad + ' из ' + levels.length);
  process.exitCode = 1;
} else {
  console.log('Проверка пройдена: все ' + levels.length + ' уровней проходимы, все осколки достижимы.');
}
