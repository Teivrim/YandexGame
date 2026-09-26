/**
 * Нарезает иконку 512x512 на плотности Android (48..192 px).
 * Масштабирование делает canvas уже открытого браузера:
 * ни sharp, ни ImageMagick в проекте нет, а тянуть зависимость ради
 * пяти картинок незачем.
 *
 * usage: node make-icons.js <game> <project-dir>
 */
const fs = require('node:fs');
const path = require('node:path');
const { games, densities } = require('./games');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const key = process.argv[2];
  const out = process.argv[3];
  if (!key || !out) {
    console.error('usage: node make-icons.js <game> <project-dir>');
    process.exit(1);
  }
  const g = games[key];
  if (!g) { console.error('НЕТ ИГРЫ: ' + key); process.exit(1); }
  const iconPath = path.resolve(__dirname, g.icon);
  if (!fs.existsSync(iconPath)) { console.error('НЕТ ИКОНКИ: ' + iconPath); process.exit(1); }
  const b64 = fs.readFileSync(iconPath).toString('base64');

  const r = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
  const tab = await r.json();
  const w = new WebSocket(tab.webSocketDebuggerUrl);
  let n = 1; const p = new Map();
  w.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && p.has(m.id)) { const q = p.get(m.id); p.delete(m.id); m.error ? q.reject(Error(JSON.stringify(m.error))) : q.resolve(m.result); }
  };
  await new Promise((res, j) => { w.onopen = res; w.onerror = j; });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = n++; p.set(id, { resolve, reject }); w.send(JSON.stringify({ id, method, params })); });
  const ev = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error((res.exceptionDetails.exception && res.exceptionDetails.exception.description || res.exceptionDetails.text).split('\n')[0]);
    return res.result && res.result.value;
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  // Загружаем картинку прямо в страницу, потом рисуем нужные размеры
  await send('Page.navigate', { url: 'https://itch.io/game/edit/5056118' });
  await sleep(4000);
  await ev(`new Promise(function (res, rej) {
    const img = new Image();
    img.onload = function () { window.__icon = img; res(true); };
    img.onerror = function () { rej(new Error('не открылась иконка')); };
    img.src = 'data:image/png;base64,${b64}';
  })`);

  const made = [];
  for (const d of densities) {
    const dataUrl = await ev(`(function () {
      const img = window.__icon;
      if (!img) return 'НЕТ КАРТИНКИ';
      if (img.width !== 512 || img.height !== 512) return 'ИКОНКА НЕ КВАДРАТНАЯ: ' + img.width + 'x' + img.height;
      const c = document.createElement('canvas');
      c.width = ${d.size};
      c.height = ${d.size};
      const g2 = c.getContext('2d');
      g2.imageSmoothingEnabled = true;
      g2.imageSmoothingQuality = 'high';
      g2.drawImage(img, 0, 0, ${d.size}, ${d.size});
      return c.toDataURL('image/png');
    })()`);
    if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:') !== 0) {
      console.error('  ' + d.dir + ' не получился: ' + dataUrl);
      process.exitCode = 1;
      continue;
    }
    const dir = path.join(out, 'res', d.dir);
    fs.mkdirSync(dir, { recursive: true });
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), buf);
    made.push(d.dir + ' ' + d.size + 'px ' + (buf.length / 1024).toFixed(1) + 'КБ');
  }

  try { await send('Page.close'); } catch (e) { /* закрыта */ }
  w.close();

  console.log('иконки ' + key + ':');
  made.forEach((m) => console.log('  ' + m));
}
main().catch((e) => { console.error('СБОЙ: ' + e.message); process.exitCode = 1; });
