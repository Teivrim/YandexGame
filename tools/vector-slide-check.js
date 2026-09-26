// Проверяем, что механика скольжения реально используется: ищем в уровнях
// проходы высотой ровно в клетку (стоять нельзя, скользеть можно).
const V = require('./vector-lib');
const K = V.loadGameConstants();
const T = V.T;
const levels = V.loadLevelsFromSource();

const WALLH = Math.ceil(K.P_H / K.TILE);   // сколько клеток занимает стоящий игрок
const SLIDEH = Math.ceil(K.P_H_SLIDE / K.TILE);

console.log('рост стоя ' + K.P_H + ' px → нужно ' + WALLH + ' клетки свободного места');
console.log('рост в скольжении ' + K.P_H_SLIDE + ' px → достаточно ' + SLIDEH + ' клетки');
console.log('');

let total = 0;
levels.forEach((def, i) => {
  const lv = V.buildGrid(def.rows);
  // горизонтальные проходы: считаем подряд идущие клетки, где сверху потолок,
  // а игрок помещается только лёжа
  const runs = [];
  for (let y = 0; y < lv.h; y++) {
    let start = -1;
    for (let x = 0; x <= lv.w; x++) {
      const open = x < lv.w && lv.at(x, y) !== T.WALL;
      const ceil = x < lv.w && lv.at(x, y - 1) === T.WALL;
      const floor = x < lv.w && lv.at(x, y + 1) === T.WALL;
      // клетка годится в проход, если пол снизу есть, а сверху потолок
      const slideCell = open && floor && ceil;
      if (slideCell && start < 0) start = x;
      if (!slideCell && start >= 0) {
        const len = x - start;
        if (len >= 2) runs.push({ y, x0: start, x1: x - 1, len });
        start = -1;
      }
    }
  }
  // группируем соседние строки в один коридор
  const corridors = [];
  for (const r of runs) {
    const last = corridors[corridors.length - 1];
    if (last && last.y1 === r.y - 1 && last.x0 === r.x0) { last.y1 = r.y; last.len += r.len; }
    else corridors.push({ y0: r.y, y1: r.y, x0: r.x0, x1: r.x1, len: r.len });
  }
  const long = corridors.filter((c) => c.len >= 4);
  total += long.length;
  const name = (i + 1 < 10 ? '0' : '') + (i + 1) + '. ' + def.name;
  console.log(name.padEnd(14) + 'щелей в клетку: ' + corridors.length
    + (long.length ? '  из них длинных (4+): ' + long.length : '')
    + (long.length ? '  пример: строка ' + long[0].y0 + '-' + long[0].y1 + ', x ' + long[0].x0 + '..' + long[0].x1 : ''));
  if (corridors.length) {
    corridors.slice(0, 4).forEach((c) => {
      console.log('        проход: строки ' + c.y0 + (c.y1 > c.y0 ? '-' + c.y1 : '') + ', x ' + c.x0 + '..' + c.x1 + ' (' + c.len + ' клетки)');
    });
  }
});

console.log('');
console.log('всего длинных щелей: ' + total);
if (total === 0) {
  console.log('!! НИ ОДНОЙ ЩЕЛИ В КЛЕТКУ — механика скольжения не используется,');
  console.log('   а уровень «СКОЛЬЗИ» обещает её как основной приём.');
  process.exitCode = 1;
}
