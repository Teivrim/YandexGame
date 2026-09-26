/**
 * Сборка сборника NEON в assets для Android.
 *
 * Схема одна страница. Всё, включая пять игр, лежит в единственном
 * assets/index.html. Так сделано не из простоты, а потому что на file://
 * (а именно так игра открывается в APK) не работают оба способа
 * подгрузить игру из меню:
 *
 *   - XMLHttpRequest к games/*.html - заблокирован, приходит статус 0;
 *   - <script src>, созданный из кода через createElement, - тоже
 *     не грузится, ни с query-строкой, ни с абсолютным file-URL.
 *
 * Проверено на file://. Скрипты, которые парсер читает прямо из готового
 * HTML, загружаются; созданные скриптом - нет. Поэтому игры встраиваются
 * в страницу как строки и пишутся в iframe через srcdoc.
 *
 * Игры вставляются ПОСЛЕ сборки меню, отдельным шагом. Это принципиально:
 * build-bundle.js прогоняет файл через Babel, и тот перепечатывает строковые
 * литералы, возвращая "<\/script>" в "</script>". После этого парсер
 * страницы обрывает тег <script> на середине, и весь файл падает с
 * "SyntaxError: Invalid or unexpected token". Экранирование, сделанное
 * до Babel, не выживает. Поэтому Babel не видит игр вовсе.
 *
 * usage: node build-collection.js <out-assets-dir> [repo-root]
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const outDir = process.argv[2];
const root = process.argv[3] || path.resolve(__dirname, '..');

if (!outDir) {
  console.error('usage: node build-collection.js <out-assets-dir> [repo-root]');
  process.exit(1);
}

/** Кто входит в сборник. Порядок задаёт порядок в меню. */
const GAMES = [
  { key: 'courier', src: '.', skip: ['yandex-sdk.js'] },
  { key: 'bastion', src: 'neon-bastion', skip: [] },
  { key: 'descent', src: 'neon-descent', skip: [] },
  { key: 'vector', src: 'neon-vector', skip: [] },
  { key: 'oni', src: 'neon-oni', skip: [] }
];

const collSrc = path.join(root, 'neon-collection');
const bundle = path.join(__dirname, 'build-bundle.js');

// Разделители строк U+2028 и U+2029 в старых движках считаются концом
// строки и рвут строковый литерал. Символы строим по кодам: буквальные
// неотличимы от обычных пробелов, и их легко спутать.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const SEPS = new RegExp('[' + LS + PS + ']', 'g');

/**
 * Подставляет прослойку хранилища в начало игры.
 *
 * Кадр игры на file:// живёт на непрозрачном происхождении, и его
 * localStorage недоступен: обращение бросает SecurityError. Прослойка
 * перенаправляет вызовы в родителя, который ходит в AndroidStore.
 * Ставим её ПЕРВОЙ, до скриптов игры, иначе игра успеет прочитать
 * профиль напрямую и упрётся в ошибку.
 */
function injectShim(html, shim) {
  const tag = '<script>\n' + shim + '\n  <\/script>';
  const m = html.match(/<head[^>]*>/i);
  if (m) return html.slice(0, m.index + m[0].length) + '\n' + tag + html.slice(m.index + m[0].length);
  const d = html.match(/<!DOCTYPE[^>]*>/i);
  if (d) return html.slice(0, d.index + d[0].length) + '\n' + tag + html.slice(d.index + d[0].length);
  return tag + html;
}

/**
 * Готовит строку для вставки в страницу.
 *
 * Сначала JSON.stringify: он экранирует кавычки, обратные слэши и
 * переводы строк. И только потом правим "</" на "<\/". Если заменить
 * раньше, JSON.stringify экранирует и наш обратный слэш тоже, и в
 * документе не окажется ни одного закрывающего тега: парсер примет всё
 * после первого <script> за текст скрипта.
 */
function escapeForScript(html) {
  return JSON.stringify(html)
    .split('</').join('<\\/')
    .replace(SEPS, (c) => (c === LS ? '\\u2028' : '\\u2029'));
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-coll-'));
  try {
    // --- 0. Чистим assets ------------------------------------------------
    // Каталог переиспользуется между сборками, и без очистки в APK
    // попадают файлы прошлой сборки. Так случилось: при переходе на
    // однофайловую схему в assets остались пять games/*.html, и они
    // уехали в пакет мёртвым грузом рядом с новым index.html.
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    // --- 1. Собираем каждую игру -----------------------------------------
    const built = [];
    let gamesBytes = 0;
    for (const g of GAMES) {
      const out = path.join(tmp, g.key + '.html');
      execFileSync(process.execPath, [bundle, path.join(root, g.src), out, g.skip.join(',')], {
        stdio: ['ignore', 'pipe', 'inherit']
      });
      const size = fs.statSync(out).size;
      gamesBytes += size;
      built.push({ key: g.key, file: out, size: size });
      process.stdout.write('  ' + g.key.padEnd(9) + String(Math.round(size / 1024)).padStart(5) + ' КБ\n');
    }

    // --- 2. Собираем меню (без игр) ---------------------------------------
    const hubTmp = path.join(tmp, 'hub');
    fs.mkdirSync(hubTmp, { recursive: true });
    for (const f of ['index.html', 'hub.css', 'hub.js', 'catalog.js']) {
      fs.copyFileSync(path.join(collSrc, f), path.join(hubTmp, f));
    }
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, 'index.html');
    execFileSync(process.execPath, [bundle, hubTmp, out, ''], {
      stdio: ['ignore', 'pipe', 'inherit']
    });

    // --- 3. Вставляем игры отдельным шагом ------------------------------
    // Сначала готовим блок, потом вставляем. Между этими шагами файл
    // не проходит через Babel - иначе экранирование рассыплется.
    const shim = fs.readFileSync(path.join(collSrc, 'storage-shim.js'), 'utf8');
    const rows = [];
    for (const b of built) {
      const raw = fs.readFileSync(b.file, 'utf8');
      const html = injectShim(raw, shim);
      if (html.indexOf('__neonLsGet') < 0 || html.length <= raw.length) {
        console.error('ОШИБКА: прослойка не попала в ' + b.key);
        process.exit(1);
      }
      const esc = escapeForScript(html);
      if (esc.indexOf('<\\/script>') < 0) {
        console.error('ОШИБКА: в ' + b.key + ' нет закрывающих тегов script');
        process.exit(1);
      }
      rows.push('  ' + JSON.stringify(b.key) + ': ' + esc);
    }
    const block = '<script>\n/* Сгенерировано rustore/build-collection.js. Не править руками. */\n'
      + 'window.NEON_GAMES = {\n' + rows.join(',\n') + '\n};\n<\/script>\n';

    let html = fs.readFileSync(out, 'utf8');
    const at = html.lastIndexOf('</body>');
    if (at < 0) {
      console.error('ОШИБКА: в собранном меню нет </body>');
      process.exit(1);
    }
    html = html.slice(0, at) + block + html.slice(at);
    fs.writeFileSync(out, html, 'utf8');

    // --- 4. Проверки ------------------------------------------------------
    if (html.indexOf('rel="stylesheet"') >= 0) {
      console.error('ОШИБКА: в меню остались внешние ссылки на css');
      process.exit(1);
    }
    // Внешние <script src> допустимы только если их нет вообще: в сборке
    // всё внутри одной страницы
    const extJs = (html.match(/<script[^>]+src=/g) || []).length;
    if (extJs > 0) {
      console.error('ОШИБКА: в меню остались внешние скрипты: ' + extJs);
      process.exit(1);
    }
    for (const b of built) {
      if (html.indexOf(JSON.stringify(b.key) + ':') < 0) {
        console.error('ОШИБКА: в меню нет встроенной игры ' + b.key);
        process.exit(1);
      }
    }
    if (html.indexOf('window.NEON =') < 0) {
      console.error('ОШИБКА: в меню нет моста window.NEON для кнопки «Назад»');
      process.exit(1);
    }
    // В рантайме читать файлы нельзя: на file:// это заблокировано
    if (html.indexOf('new XMLHttpRequest') >= 0) {
      console.error('ОШИБКА: в меню остался XHR - на file:// он не работает');
      process.exit(1);
    }

    const total = fs.statSync(out).size;
    console.log('  ---------------------------');
    console.log('  игр встроено: ' + built.length + ', прослойка в каждой');
    console.log('  игр: ' + Math.round(gamesBytes / 1024) + ' КБ, страница: ' + Math.round(total / 1024) + ' КБ');
    console.log('  внешних запросов: 0, всё внутри страницы');
    console.log('сборник собран: ' + out);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
main();
