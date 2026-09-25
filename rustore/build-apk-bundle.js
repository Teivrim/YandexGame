/**
 * Собирает игру в ОДИН самодостаточный HTML-файл, совместимый с очень старыми
 * системными WebView (Android 5.x без Google-сервисов -> Chrome 37).
 *
 * Что делает:
 *  1) транспилирует game.js в ES5 через Babel (стрелки, for..of, let/const -> старый синтаксис);
 *  2) добавляет точечные polyfill для API, которых нет в старых движках;
 *  3) встраивает CSS и JS прямо в разметку, чтобы не зависеть от file://-путей.
 */
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const srcDir = process.argv[2];
const outFile = process.argv[3];
if (!srcDir || !outFile) {
  console.error('usage: node build-apk-bundle.js <src-dir> <out.html>');
  process.exit(1);
}

const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(srcDir, 'game.js'), 'utf8');

// 1) ES5-транспиляция. Никаких browser-целей: нужен именно старый синтаксис.
const transpiled = babel.transformSync(js, {
  babelrc: false,
  configFile: false,
  presets: [
    ['@babel/preset-env', {
      targets: { ie: '11' },
      modules: false
    }]
  ]
}).code;

// 2) Polyfill того, что Chrome 37 не умеет, но использует игра.
const polyfill = `
(function () {
  // Number.isFinite
  if (typeof Number.isFinite !== 'function') {
    Number.isFinite = function (v) { return typeof v === 'number' && isFinite(v); };
  }
  // String.prototype.padStart
  if (typeof String.prototype.padStart !== 'function') {
    String.prototype.padStart = function (len, pad) {
      var s = String(this);
      pad = pad === undefined ? '0' : String(pad);
      if (pad.length === 0) pad = '0';
      while (s.length < len) { s = pad + s; }
      return s;
    };
  }
  // Array.prototype.includes / Object.assign / Math.trunc
  if (typeof Array.prototype.includes !== 'function') {
    Array.prototype.includes = function (v) { return this.indexOf(v) !== -1; };
  }
  if (typeof Object.assign !== 'function') {
    Object.assign = function (t) {
      for (var i = 1; i < arguments.length; i++) {
        var src = arguments[i];
        for (var k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) t[k] = src[k]; }
      }
      return t;
    };
  }
  if (typeof Math.trunc !== 'function') {
    Math.trunc = function (v) { return v < 0 ? Math.ceil(v) : Math.floor(v); };
  }
  // Map и Set нужны игре; на очень старых движках их нет
  if (typeof Map === 'undefined') {
    var MapShim = function () { this._d = {}; this._s = 0; };
    MapShim.prototype.set = function (k, v) { this._d['@' + k] = v; this._s++; return this; };
    MapShim.prototype.get = function (k) { var v = this._d['@' + k]; return v === undefined ? undefined : v; };
    MapShim.prototype.has = function (k) { return this._d['@' + k] !== undefined; };
    MapShim.prototype.delete = function (k) { delete this._d['@' + k]; };
    MapShim.prototype.clear = function () { this._d = {}; };
    MapShim.prototype.forEach = function (fn) { for (var k in this._d) fn(this._d[k], k); };
    this.Map = MapShim;
  }
  if (typeof Set === 'undefined') {
    var SetShim = function () { this._a = []; };
    SetShim.prototype.add = function (v) { if (this._a.indexOf(v) === -1) this._a.push(v); return this; };
    SetShim.prototype.has = function (v) { return this._a.indexOf(v) !== -1; };
    SetShim.prototype.delete = function (v) { var i = this._a.indexOf(v); if (i >= 0) this._a.splice(i, 1); };
    SetShim.prototype.forEach = function (fn) { for (var i = 0; i < this._a.length; i++) fn(this._a[i], this._a[i]); };
    SetShim.prototype.size = 0;
    this.Set = SetShim;
  }
})();
`;

// 3) Сборка одного файла
let out = html
  .replace(/<link rel="stylesheet" href="style\.css">/, '<style>\n' + css + '\n  </style>')
  .replace(/<script src="game\.js"><\/script>/, '<script>\n' + polyfill + '\n' + transpiled + '\n  </script>')
  .replace(/<link rel="stylesheet" href="[^"]*">/g, '')
  .replace(/<script src="[^"]*"><\/script>/g, '');

// Контроль: внешних ссылок остаться не должно
if (/src="game\.js"|href="style\.css"/.test(out)) {
  console.error('ОШИБКА: остались внешние ссылки на css/js');
  process.exit(1);
}
// Контроль: стрелок и for..of в собранном коде быть не должно
const scriptBlock = out.slice(out.indexOf('<script>'));
const arrows = (scriptBlock.match(/=>/g) || []).length;
const forOf = (scriptBlock.match(/for\s*\((?:const|let|var)\s+[\w\s,{}\[\]:]+\s+of\s/g) || []).length;
if (arrows > 0 || forOf > 0) {
  console.error('ОШИБКА: ES6 остался — стрелок: ' + arrows + ', for..of: ' + forOf);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out, 'utf8');
console.log('собрано: ' + outFile);
console.log('  размер: ' + (fs.statSync(outFile).size / 1024).toFixed(1) + ' КБ');
console.log('  стрелок в ES5-сборке: ' + arrows + ', for..of: ' + forOf);
console.log('  внешних запросов: 0, один файл');
