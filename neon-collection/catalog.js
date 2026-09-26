/**
 * Каталог игр в сборнике.
 *
 * Один и тот же список используют и меню, и скрипт сборки APK, поэтому
 * он лежит отдельным файлом, а не зашит в разметку.
 */
window.CATALOG = [
  {
    key: 'courier',
    file: 'games/courier.html',
    title: 'NEON//COURIER',
    genre: 'Аркада на выживание',
    pitch: 'Забирай ячейки, уходи от дронов, держись дольше',
    accent: '#3ba7ff',
    accent2: '#ff3d9e',
    mark: 'box'
  },
  {
    key: 'bastion',
    file: 'games/bastion.html',
    title: 'NEON//BASTION',
    genre: 'Башенная оборона',
    pitch: 'Тридцать волн, пять башен, босс каждые пять',
    accent: '#3dffa8',
    accent2: '#b16bff',
    mark: 'tower'
  },
  {
    key: 'descent',
    file: 'games/descent.html',
    title: 'NEON//DESCENT',
    genre: 'Roguelite',
    pitch: 'Десять этажей, каждый собран заново, три класса',
    accent: '#3dffa8',
    accent2: '#ff3d6e',
    mark: 'descent'
  },
  {
    key: 'vector',
    file: 'games/vector.html',
    title: 'NEON//VECTOR',
    genre: 'Платформер',
    pitch: 'Восемь уровней про инерцию, скольжение и рекорды',
    accent: '#ffd23d',
    accent2: '#63e7ff',
    mark: 'vector'
  },
  {
    key: 'oni',
    file: 'games/oni.html',
    title: 'NEON//ONI',
    genre: 'Бит-эм-ап',
    pitch: 'Четыре улицы ночного Токио, пять типов врагов, четыре босса',
    accent: '#ff6ea8',
    accent2: '#ffb44f',
    mark: 'fist'
  }
];
