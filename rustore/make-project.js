/**
 * Генерирует проект Android-обёртки для одной игры.
 * Заменяет ручные копии AndroidManifest.xml и MainActivity.java.
 *
 * usage: node make-project.js <game> <out-dir>
 */
const fs = require('node:fs');
const path = require('node:path');
const { games } = require('./games');

const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="__PACKAGE__"
    android:versionCode="1"
    android:versionName="1.0.0">

    <!-- Игра полностью офлайн: ни сети, ни микрофона, ни хранилища не нужно. -->

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />

    <supports-screens
        android:smallScreens="true"
        android:normalScreens="true"
        android:largeScreens="true"
        android:xlargeScreens="true"
        android:anyDensity="true" />

    <application
        android:label="__LABEL__"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="__ORIENTATION__"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout|uiMode"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

const ACTIVITY = `package __PACKAGE__;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Тонкая нативная обёртка: игра целиком лежит в assets и работает офлайн.
 * Никаких сетевых разрешений и внешних зависимостей.
 *
 * Игра открывается по file://, где localStorage держится на непрозрачном
 * происхождении и на части прошивок молча не сохраняет прогресс. Поэтому
 * профиль дублируется в SharedPreferences через AndroidStore, а
 * localStorage остаётся запасным путём.
 */
public class MainActivity extends Activity {

    private static final String PREFS = "neon_progress";

    private WebView web;

    /** Мост для профиля: вызовы save/load из JavaScript. */
    public class AndroidStore {
        @JavascriptInterface
        public void save(String key, String value) {
            getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(key, value).apply();
        }

        @JavascriptInterface
        public String load(String key) {
            return getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(key, null);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Играть удобнее в полноэкранном режиме без системных панелей.
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        // localStorage нужен магазину и прогрессу
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        // игра полностью офлайн, но разрешаем file-доступ для assets
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        settings.setMediaPlaybackRequiresUserGesture(false);

        web.setWebViewClient(new WebViewClient());
        web.setBackgroundColor(0xFF__BGHEX__);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        // Мост хранилища: даёт прогрессу надёжное место рядом с localStorage
        web.addJavascriptInterface(new AndroidStore(), "AndroidStore");

        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
`;

function main() {
  const key = process.argv[2];
  const out = process.argv[3];
  if (!key || !out) {
    console.error('usage: node make-project.js <game> <out-dir>');
    process.exit(1);
  }
  const g = games[key];
  if (!g) {
    console.error('НЕТ ИГРЫ: ' + key + '. Доступны: ' + Object.keys(games).join(', '));
    process.exit(1);
  }

  const hex = g.background.replace('#', '').toUpperCase();

  fs.mkdirSync(path.join(out, 'res', 'values'), { recursive: true });
  fs.mkdirSync(path.join(out, 'src', ...g.package.split('.')), { recursive: true });
  fs.mkdirSync(path.join(out, 'assets'), { recursive: true });

  const sub = (tpl) => tpl
    .split('__PACKAGE__').join(g.package)
    .split('__LABEL__').join(g.label)
    .split('__ORIENTATION__').join(g.orientation)
    .split('__BGHEX__').join(hex);

  fs.writeFileSync(path.join(out, 'AndroidManifest.xml'), sub(MANIFEST), 'utf8');
  fs.writeFileSync(
    path.join(out, 'src', ...g.package.split('.'), 'MainActivity.java'),
    sub(ACTIVITY), 'utf8');
  fs.writeFileSync(
    path.join(out, 'res', 'values', 'strings.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">'
      + g.label + '</string>\n</resources>\n', 'utf8');

  console.log('обёртка собрана: ' + key);
  console.log('  package:     ' + g.package);
  console.log('  label:       ' + g.label);
  console.log('  ориентация:  ' + g.orientation);
  console.log('  фон WebView: ' + g.background);
}
main();
