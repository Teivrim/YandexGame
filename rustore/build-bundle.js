/**
 * Универсальный сборщик: превращает веб-игру в ОДИН самодостаточный HTML-файл,
 * совместимый с очень старыми системными WebView (Android 5.x без Google-сервисов
 * -> Chrome 37).
 *
 * Зачем это нужно:
 *  - APK не должен зависеть от файловой системы: всё лежит в assets;
 *  - в Chrome 37 нет ни стрелочных функций, ни for..of, ни Set/Map,
 *    ни String.padStart, поэтому JS транспилируется в ES5 через Babel;
 *  - добавляются polyfill для API, которых в старых движках нет.
 *
 * usage: node build-bundle.js <src-dir> <out.html> [skip.js,skip.js]
 */
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const srcDir = process.argv[2];
const outFile = process.argv[3];
const skip = new Set((process.argv[4] || '').split(',').map((s) => s.trim()).filter(Boolean));

if (!srcDir || !outFile) {
  console.error('usage: node build-bundle.js <src-dir> <out.html> [skip.js,...]');
  process.exit(1);
}

const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');

/** Транспилирует один JS-файл в ES5. */
function toEs5(code) {
  return babel.transformSync(code, {
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-env', { targets: { ie: '11' }, modules: false }]]
  }).code;
}

const polyfill = `
(function () {
  if (typeof Number.isFinite !== 'function') {
    Number.isFinite = function (v) { return typeof v === 'number' && isFinite(v); };
  }
  if (typeof String.prototype.padStart !== 'function') {
    String.prototype.padStart = function (len, pad) {
      var s = String(this);
      pad = pad === undefined ? '0' : String(pad);
      if (pad.length === 0) pad = '0';
      while (s.length < len) { s = pad + s; }
      return s;
    };
  }
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
  if (typeof Map === 'undefined') {
    var MapShim = function () { this._d = {}; };
    MapShim.prototype.set = function (k, v) { this._d['@' + k] = v; return this; };
    MapShim.prototype.get = function (k) { return this._d['@' + k]; };
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
    this.Set = SetShim;
  }
})();
`;

// CSS: встраиваем все подключённые таблицы стилей
let out = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/g, (tag) => {
  const href = (tag.match(/href=["']([^"']+)["']/) || [])[1];
  if (!href) return tag;
  return '<style>\n' + fs.readFileSync(path.join(srcDir, href), 'utf8') + '\n  </style>';
});

// JS: встраиваем и транспилируем, пропуская ненужные файлы
const inlined = [];
out = out.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/g, (tag, src) => {
  const name = path.basename(src);
  if (skip.has(name)) {
    inlined.push(name + ' (пропущен)');
    return '<!-- ' + name + ' skipped for android -->';
  }
  inlined.push(name);
  return '<script>\n' + toEs5(fs.readFileSync(path.join(srcDir, name), 'utf8')) + '\n  </script>';
});

if (out.includes('rel="stylesheet"') || /<script[^>]+src=/.test(out)) {
  console.error('ОШИБКА: остались внешние ссылки на css/js');
  process.exit(1);
}

// Проверка: в собранном коде не должно остаться ES6
const firstScript = out.indexOf('<script>');
const scriptBlock = out.slice(firstScript);
const arrows = (scriptBlock.match(/=>/g) || []).length;
const forOf = (scriptBlock.match(/for\s*\((?:const|let|var)\s+[\w\s,{}\[\]:]+\s+of\s/g) || []).length;
if (arrows > 0 || forOf > 0) {
  console.error('ОШИБКА: ES6 остался — стрелок: ' + arrows + ', for..of: ' + forOf);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out, 'utf8');

console.log('собрано: ' + outFile);
console.log('  встроено: ' + inlined.join(', '));
console.log('  размер: ' + (fs.statSync(outFile).size / 1024).toFixed(1) + ' КБ');
console.log('  ES5: стрелок ' + arrows + ', for..of ' + forOf + ', внешних запросов 0');
