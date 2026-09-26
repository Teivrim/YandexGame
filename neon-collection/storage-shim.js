/**
 * Прослойка хранилища для игр внутри сборника.
 *
 * Зачем. Игра живёт в iframe, который открыт через srcdoc со страницы
 * file:///android_asset/index.html. У такого кадра непрозрачное
 * происхождение, и localStorage внутри него недоступен: обращение
 * бросает SecurityError. Проверено - и на file:// в браузере, и здесь.
 *
 * У самой страницы-родителя localStorage работает, и на Android там же
 * есть мост AndroidStore, который переживает перезапуск процесса. Поэтому
 * прослойка перенаправляет все вызовы в родителя: тот спускается в
 * AndroidStore, если мост есть, иначе в свой localStorage.
 *
 * Благодаря этому ни одну из пяти игр править не пришлось - все четыре
 * игры, которые пишут напрямую в localStorage, получают то же надёжное
 * хранилище, что и ONI с его мостом.
 *
 * Файл подставляется сборкой в начало каждой игры, поэтому код должен
 * быть ES5 и не зависеть от родительского контекста.
 */
(function () {
  'use strict';

  var P = null;
  try { P = window.parent; } catch (e) { P = null; }
  if (!P || P === window) return;

  // Родитель держит эти функции: они уже умеют AndroidStore
  function call(name, args, fallback) {
    try {
      if (P[name]) return P[name].apply(P, args);
    } catch (e) { /* родитель недоступен - отдаём заглушку */ }
    return fallback;
  }

  function Shim() {}

  Shim.prototype.getItem = function (k) {
    var v = call('__neonLsGet', [k], null);
    return v === null || v === undefined ? null : v;
  };

  Shim.prototype.setItem = function (k, v) {
    call('__neonLsSet', [k, String(v)], null);
  };

  Shim.prototype.removeItem = function (k) {
    call('__neonLsDel', [k], null);
  };

  Shim.prototype.key = function (i) {
    var v = call('__neonLsKey', [i], null);
    return v === null || v === undefined ? null : v;
  };

  Shim.prototype.clear = function () {
    call('__neonLsClear', [], null);
  };

  // length - свойство, а не метод
  try {
    Object.defineProperty(Shim.prototype, 'length', {
      get: function () { return call('__neonLsLen', [], 0) || 0; },
      configurable: true
    });
  } catch (e) {
    // Движок не даёт определить свойство: подменяем через прототип Object
    Shim.prototype.__len = 0;
  }

  var shim = new Shim();
  try {
    Object.defineProperty(window, 'localStorage', {
      get: function () { return shim; },
      configurable: true
    });
  } catch (e) {
    // Запасной путь: присваивание молча провалится в строгом режиме,
    // но в обычном сработает
    try { window.localStorage = shim; } catch (e2) { /* тогда у игры не будет хранилища вовсе */ }
  }
})();
