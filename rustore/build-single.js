// Собирает один самодостаточный index.html: CSS и JS встроены прямо в разметку.
// Нужен для APK, где всё лежит в assets и не должно зависеть от file://-путей.
const fs = require('node:fs');
const path = require('node:path');

const srcDir = process.argv[2];
const outFile = process.argv[3];

if (!srcDir || !outFile) {
  console.error('usage: node build-single.js <src-dir> <out.html>');
  process.exit(1);
}

const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(srcDir, 'game.js'), 'utf8');

let out = html
  .replace(/<link rel="stylesheet" href="style\.css">/,
    '<style>\n' + css.replace(/\/==\/\s*$/, '') + '\n  </style>')
  .replace(/<script src="game\.js"><\/script>/,
    '<script>\n' + js + '\n  </script>');

// APK открывает файл локально, внешних запросов быть не должно.
out = out.replace(/<link rel="stylesheet" href="[^"]*">/g, '');
out = out.replace(/<script src="[^"]*"><\/script>/g, '');

if (out.includes('src="game.js"') || out.includes('href="style.css"')) {
  console.error('ОШИБКА: остались внешние ссылки на css/js');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out, 'utf8');

const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
console.log('готово: ' + outFile + ' (' + kb + ' КБ, один файл, без внешних ссылок)');
