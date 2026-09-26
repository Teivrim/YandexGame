/**
 * Меню сборника NEON.
 *
 * Ключевое решение: игра грузится в iframe через document.write, а не через
 * src. Установка src добавляет запись в историю сессии, и системная кнопка
 * «Назад» на Android уходила бы внутрь iframe вместо возврата в меню.
 * document.write записи в историю не добавляет, поэтому историю ведёт
 * только меню.
 *
 * Для Android у окна есть window.NEON с current() и close(): обёртка
 * спрашивает current() перед onBackPressed, чтобы решить — закрывать игру
 * или сворачивать приложение.
 */
(function () {
  'use strict';

  var games = window.CATALOG || [];
  var openKey = '';
  var frame = null;
  var stage = null;
  var menu = null;
  var stageTitle = null;

  /* ---------- значки игр: геометрия вместо картинок ---------- */

  // Значки нарисованы геометрией, а не картинками. Кулак у ONI сначала
  // получился похожим на реплику в облаке: округлённый корпус с хвостиком
  // читался как speech bubble. Теперь это кулак с костяшками и ударными
  // штрихами сбоку.
  var MARKS = {
    box: '<path d="M6 15h20v14H6z"/><path d="M6 15l4-5h12l4 5"/><path d="M18 20l-4 4h4l-4 4"/>',
    tower: '<path d="M9 29V13h4v-4h4v4h4v-4h4v4h4v16z"/><path d="M15 29v-7h6v7"/>',
    descent: '<path d="M16 6v16"/><path d="M11 17l5 5 5-5"/><path d="M7 25h18"/><path d="M7 30h18"/>',
    vector: '<path d="M8 17h14"/><path d="M17 12l5 5-5 5"/><path d="M6 12h6"/><path d="M4 17h4"/><path d="M6 22h6"/>',
    fist: '<path d="M4 16h11a6 6 0 0 1 6 6v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/>' +
          '<path d="M8 16v10"/><path d="M12 16v10"/><path d="M16 16v10"/>' +
          '<path d="M4 21h5"/><path d="M26 9l-4 4"/><path d="M29 15h-5"/>'
  };

  function markSvg(kind, accent) {
    var body = MARKS[kind] || MARKS.box;
    return '<svg viewBox="0 0 32 34" fill="none" stroke="' + accent +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      body + '</svg>';
  }

  /* ---------- меню ---------- */

  function cardHtml(g) {
    return '<button class="card" type="button" data-key="' + g.key + '"' +
      ' style="--accent:' + g.accent + ';--accent2:' + g.accent2 + '">' +
      '<span class="mark">' + markSvg(g.mark, g.accent) + '</span>' +
      '<span class="card-body">' +
      '<span class="card-title">' + g.title + '</span>' +
      '<span class="card-genre">' + g.genre + '</span>' +
      '<p class="card-pitch">' + g.pitch + '</p>' +
      '</span></button>';
  }

  function byKey(key) {
    for (var i = 0; i < games.length; i++) {
      if (games[i].key === key) return games[i];
    }
    return null;
  }

  function render() {
    var grid = document.getElementById('grid');
    var html = '';
    for (var i = 0; i < games.length; i++) html += cardHtml(games[i]);
    grid.innerHTML = html;

    var count = document.getElementById('count');
    if (count) {
      count.textContent = games.length + ' ' + plural(games.length, 'игра', 'игры', 'игр');
    }
  }

  function plural(n, one, few, many) {
    var m = n % 100;
    if (m >= 11 && m <= 14) return many;
    switch (n % 10) {
      case 1: return one;
      case 2: case 3: case 4: return few;
      default: return many;
    }
  }

  /* ---------- хранилище для игр в кадре ---------- */

  // Кадр игры живёт на непрозрачном происхождении, и его собственный
  // localStorage недоступен: обращение бросает SecurityError. Проверено
  // на file://. Поэтому родитель отдаёт игры функции хранилища, а в кадр
  // подставляется прослойка storage-shim.js. Спуск идёт в AndroidStore,
  // если мост есть: на file:// localStorage местами не переживает
  // перезапуск процесса, и прогресс молча пропадал бы. Благодаря этому
  // ни одну из пяти игр править не пришлось.
  function nativeStore() {
    return (typeof window !== 'undefined' && window.AndroidStore) ? window.AndroidStore : null;
  }

  function lsGet(k) {
    var n = nativeStore();
    if (n) {
      try { var v = n.load(k); if (v) return v; } catch (e) { /* падаем в localStorage */ }
    }
    try { return window.localStorage.getItem(k); } catch (e) { return null; }
  }

  function lsSet(k, v) {
    var n = nativeStore();
    if (n) { try { n.save(k, v); } catch (e) { /* есть запасной путь */ } }
    try { window.localStorage.setItem(k, v); } catch (e) { /* приватный режим */ }
  }

  function lsDel(k) {
    var n = nativeStore();
    if (n) { try { n.save(k, ''); } catch (e) { /* пусто */ } }
    try { window.localStorage.removeItem(k); } catch (e) { /* пусто */ }
  }

  function lsKey(i) {
    try { return window.localStorage.key(i); } catch (e) { return null; }
  }

  function lsLen() {
    try { return window.localStorage.length; } catch (e) { return 0; }
  }

  function lsClear() {
    try { window.localStorage.clear(); } catch (e) { /* пусто */ }
  }

  function installStorageApi() {
    window.__neonLsGet = lsGet;
    window.__neonLsSet = lsSet;
    window.__neonLsDel = lsDel;
    window.__neonLsKey = lsKey;
    window.__neonLsLen = lsLen;
    window.__neonLsClear = lsClear;
  }

  /* ---------- экран игры ---------- */

  function openGame(key) {
    var g = byKey(key);
    if (!g || openKey === key) return;
    openKey = key;

    stageTitle.textContent = g.title + ' · ' + g.genre;
    stage.hidden = false;
    menu.hidden = true;
    document.documentElement.style.background = '#03040a';

    var html = (window.NEON_GAMES && window.NEON_GAMES[key]) || null;
    if (!html) {
      // Такого быть не должно: сборка кладёт все пять игр в NEON_GAMES.
      // Показываем честное сообщение вместо молчаливого пустого экрана.
      html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<body style="font-family:sans-serif;padding:24px;color:#dfe6ff;background:#03040a">' +
        '<h2 style="margin:0 0 8px">' + g.title + '</h2>' +
        '<p style="color:#9aa6d4;margin:0">Игра не вложена в сборку: ' +
        'в NEON_GAMES нет ключа "' + key + '".</p></body></html>';
    }
    showInFrame(html);
  }

  // srcdoc - единственный способ, который работает на file://: он не
  // меняет происхождение кадра, в отличие от Blob URL, и не добавляет
  // запись в историю, в отличие от src. document.write и src оставлены
  // как запасные пути для движков без srcdoc.
  function showInFrame(html) {
    if ('srcdoc' in frame) {
      frame.srcdoc = html;
      return;
    }
    try {
      var doc = frame.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      return;
    } catch (e) { /* кадр недоступен, пробуем иначе */ }
    frame.src = 'about:blank';
    frame.srcdoc = html;
  }

  function closeGame() {
    if (!openKey) return;
    openKey = '';
    stage.hidden = true;
    menu.hidden = false;
    document.documentElement.style.background = '';
    clearFrame();
    clearHash();
  }

  /* ---------- очистка кадра ---------- */

  function clearFrame() {
    try {
      frame.srcdoc = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';
    } catch (e) { /* пусто */ }
    try {
      frame.contentWindow.location.replace('about:blank');
    } catch (e) { /* документ мог быть уже закрыт */ }
  }

  /* ---------- история: возврат кнопкой «Назад» в браузере ---------- */

  function setHash(key) {
    try {
      if (key) history.pushState({ game: key }, '', '#' + key);
      else history.replaceState(null, '', location.pathname);
    } catch (e) {
      // На file:// pushState может бросить SecurityError. Тогда историю
      // ведём через replaceState в нулевом состоянии, а назад на
      // Android всё равно обрабатывает обёртка через window.NEON.
      try {
        if (!key) history.replaceState(null, '', location.pathname);
      } catch (e2) { /* история недоступна совсем */ }
    }
  }

  function clearHash() { setHash(''); }

  function syncFromHash() {
    var key = String(location.hash || '').replace(/^#/, '');
    if (key && byKey(key)) {
      if (key !== openKey) openGame(key);
    } else if (openKey) {
      openKey = '';
      openGameFromMenuReset();
    }
  }

  function openGameFromMenuReset() {
    // Возврат из игры по кнопке браузера: закрываем без повторного
    // подталкивания истории.
    stage.hidden = true;
    menu.hidden = false;
    document.documentElement.style.background = '';
    clearFrame();
  }

  /* ---------- запуск ---------- */

  function boot() {
    frame = document.getElementById('frame');
    stage = document.getElementById('stage');
    menu = document.getElementById('menu');
    stageTitle = document.getElementById('stage-title');

    // Функции хранилища для кадров игры ставим до всего остального:
    // игра может попросить прогресс уже при инициализации.
    installStorageApi();

    render();

    document.getElementById('grid').addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.card') : null;
      if (!card) {
        // Для старых WebView без Element.closest ищем вручную.
        var node = e.target;
        while (node && node !== document.body && !(node.className === 'card')) node = node.parentNode;
        card = node && node.className === 'card' ? node : null;
      }
      if (!card) return;
      var key = card.getAttribute('data-key');
      if (!byKey(key)) return;
      setHash(key);
      openGame(key);
    });

    document.getElementById('back').addEventListener('click', function () {
      closeGame();
    });

    window.addEventListener('popstate', syncFromHash);

    // Мост для системной кнопки «Назад» на Android.
    window.NEON = {
      current: function () { return openKey; },
      close: function () { closeGame(); },
      games: function () {
        var out = [];
        for (var i = 0; i < games.length; i++) out.push(games[i].key);
        return out.join(',');
      }
    };

    // Если процесс убили и вернули на конкретную игру, открываем её.
    var initial = String(location.hash || '').replace(/^#/, '');
    if (initial && byKey(initial)) openGame(initial);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
