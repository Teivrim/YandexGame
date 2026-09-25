/*
 * Необязательный адаптер Yandex Games.
 *
 * В обычном браузере файл ничего не делает. В контейнере Yandex он загружает
 * официальный SDK, дожидается готовности и сохраняет экземпляр в
 * window.NeonCourierSDK. Сама игра не зависит от SDK и запускается даже без него.
 */
(() => {
  'use strict';

  async function bootYandexSdk() {
    if (window.NeonCourierSDK || !window.YaGames) return;
    try {
      const sdk = await window.YaGames.init();
      if (sdk && sdk.features && sdk.features.LoadingAPI && sdk.features.LoadingAPI.ready) {
        await sdk.features.LoadingAPI.ready;
      }
      window.NeonCourierSDK = sdk;
      window.dispatchEvent(new CustomEvent('neon-courier-sdk-ready', { detail: sdk }));
    } catch (error) {
      console.info('Yandex Games SDK не загрузился; игра продолжает работать автономно.');
    }
  }

  function loadSdk() {
    // В обычной вкладке SDK пытается отправить сообщения во «родительский»
    // iframe и оставляет ошибки в консоли. В контейнере Yandex Games iframe есть.
    if (window.parent === window) return;
    if (window.YaGames) {
      bootYandexSdk();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://yandex.ru/games/sdk/v2';
    script.async = true;
    script.onload = bootYandexSdk;
    script.onerror = () => console.info('Yandex SDK недоступен; используется автономный режим.');
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSdk, { once: true });
  } else {
    loadSdk();
  }
})();
