/**
 * Единая таблица игр для сборки Android.
 *
 * Раньше на каждую игру заводили отдельные копии AndroidManifest.xml и
 * MainActivity.java, которые отличались тремя строками. Теперь разница
 * описана здесь, а make-project.js генерирует обёртку сам.
 */
module.exports = {
  games: {
    courier: {
      label: 'NEON//COURIER',
      package: 'com.teivrim.courier',
      orientation: 'portrait',
      // Фон берём из --bg соответствующей игры: иначе при запуске
      // WebView моргает белым до отрисовки первого кадра.
      background: '#070a18',
      src: '..',
      icon: '..\\yandex-assets\\icon.png',
      // Yandex SDK работает только внутри контейнера Yandex Games,
      // в APK он бесполезен и только тянет лишний код.
      skip: ['yandex-sdk.js'],
      alias: 'courier',
      password: 'courier2026'
    },
    bastion: {
      label: 'NEON//BASTION',
      package: 'com.teivrim.bastion',
      orientation: 'sensorLandscape',
      background: '#070a18',
      src: '..\\neon-bastion',
      icon: '..\\bastion-assets\\icon.png',
      skip: [],
      alias: 'bastion',
      password: 'bastion2026'
    },
    descent: {
      label: 'NEON//DESCENT',
      package: 'com.teivrim.descent',
      orientation: 'sensorLandscape',
      background: '#070a18',
      src: '..\\neon-descent',
      icon: '..\\descent-assets\\icon.png',
      skip: [],
      alias: 'descent',
      password: 'descent2026'
    },
    vector: {
      label: 'NEON//VECTOR',
      package: 'com.teivrim.vector',
      orientation: 'sensorLandscape',
      background: '#05060d',
      src: '..\\neon-vector',
      icon: '..\\vector-assets\\icon.png',
      skip: [],
      alias: 'vector',
      password: 'vector2026'
    },
    oni: {
      label: 'NEON//ONI',
      package: 'com.teivrim.oni',
      orientation: 'sensorLandscape',
      background: '#0a0512',
      src: '..\\neon-oni',
      icon: '..\\oni-assets\\icon.png',
      skip: [],
      alias: 'oni',
      password: 'oni2026'
    }
  },

  // Плотности иконки, которые Android ожидает на всех экранах
  densities: [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 }
  ]
};
