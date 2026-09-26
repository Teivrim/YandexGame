param(
  # Ключ из rustore/games.js: courier | bastion | descent | vector | oni
  [Parameter(Mandatory = $true)]
  [string]$Game,
  [string]$OutDir = "C:\Users\teivrim\AppData\Local\Temp\opencode\apk-out"
)

# Единая сборка Android-обёртки для любой игры репозитория.
# Шесть шагов, без Gradle:
#   aapt2 compile -> aapt2 link -> javac -> d8 -> zipalign -> apksigner
#
# Раньше на каждую игру был свой почти идентичный скрипт; разница
# между ними сводилась к пакету, ярлыку и ориентации, и теперь описана
# в games.js и генерируется автоматически.

$ErrorActionPreference = "Stop"

$sdk = "C:\Users\teivrim\AppData\Local\Temp\opencode\android-sdk"
$jdk = "C:\Users\teivrim\AppData\Local\jdk17\jdk-17.0.14+7"
$bt  = "$sdk\build-tools\34.0.0"
$plat = "$sdk\platforms\android-34"
$proj = "C:\Users\teivrim\AppData\Local\Temp\opencode\apk-proj-$Game"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

$env:JAVA_HOME = $jdk
# Держим кучу JVM в узде: сборка не должна съедать сотни мегабайт.
$env:JAVA_TOOL_OPTIONS = "-Xmx96m -Xss4m"

foreach ($p in @($bt, $plat, $jdk)) {
  if (-not (Test-Path $p)) { throw "нет инструмента: $p" }
}

# ---- 1/8 обёртка ---------------------------------------------------------
Write-Host "1/8 обёртка" -ForegroundColor Cyan
& node "$here\make-project.js" $Game $proj
if ($LASTEXITCODE -ne 0) { throw "make-project failed" }
& node "$here\make-icons.js" $Game $proj
if ($LASTEXITCODE -ne 0) { throw "make-icons failed" }

# ---- 2/8 игра в assets -----------------------------------------------------
# Обычная игра кладётся одним самодостаточным index.html. Сборник
# устроен иначе: в assets ложится меню плюс пять игр рядом, каждая
# собирается тем же build-bundle.js. Ветка выбирается по признаку
# collection в games.js, чтобы не заводить второй скрипт сборки.
$hereFwd = $here -replace '\\','/'
$isCollection = (& node -e "const g=require('$hereFwd/games').games['$Game']; process.stdout.write(g.collection ? 'yes' : 'no');")
if ($LASTEXITCODE -ne 0) { throw "не удалось прочитать games.js" }
if ($isCollection -eq "yes") {
  Write-Host "2/8 сборка сборника в assets" -ForegroundColor Cyan
  & node "$here\build-collection.js" "$proj\assets" ".."
  if ($LASTEXITCODE -ne 0) { throw "build-collection failed" }
} else {
  Write-Host "2/8 сборка игры в assets" -ForegroundColor Cyan
  # Каталог проекта переиспользуется между сборками. Без очистки в пакет
  # попадают файлы прошлой сборки: так в assets однажды остались пять
  # games/*.html от прежней многофайловой схемы сборника.
  if (Test-Path "$proj\assets") { Remove-Item "$proj\assets" -Recurse -Force }
  New-Item -ItemType Directory -Force -Path "$proj\assets" | Out-Null
  $srcAndSkip = (& node -e "const g=require('$hereFwd/games').games['$Game']; process.stdout.write(require('path').resolve('$hereFwd', g.src) + '|' + g.skip.join(','));")
  if ($LASTEXITCODE -ne 0 -or -not $srcAndSkip) { throw "не удалось прочитать games.js" }
  $parts = $srcAndSkip.Split('|')
  $src = $parts[0]
  $skip = if ($parts.Length -gt 1) { $parts[1] } else { '' }
  Write-Host "   исходники: $src  (пропуск: '$skip')"
  & node "$here\build-bundle.js" $src "$proj\assets\index.html" $skip
  if ($LASTEXITCODE -ne 0) { throw "build-bundle failed" }
}

# ---- подготовка выходной папки -------------------------------------------
if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$OutDir\classes", "$OutDir\gen", "$OutDir\compiled" | Out-Null

# ---- 3/8 aapt2 compile ---------------------------------------------------
Write-Host "3/8 aapt2 compile" -ForegroundColor Cyan
& "$bt\aapt2.exe" compile --dir "$proj\res" -o "$OutDir\compiled\res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

# ---- 4/8 aapt2 link ------------------------------------------------------
Write-Host "4/8 aapt2 link" -ForegroundColor Cyan
& "$bt\aapt2.exe" link -o "$OutDir\compiled\base.apk" `
  -I "$plat\android.jar" `
  --manifest "$proj\AndroidManifest.xml" `
  -R "$OutDir\compiled\res.zip" `
  -A "$proj\assets" `
  --java "$OutDir\gen" `
  --min-sdk-version 21 `
  --target-sdk-version 34 `
  --auto-add-overlay `
  --no-version-vectors
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

# ---- 5/8 javac + d8 ------------------------------------------------------
Write-Host "5/8 javac + d8" -ForegroundColor Cyan
$sources = Get-ChildItem "$proj\src" -Recurse -Filter *.java | ForEach-Object { $_.FullName }
if (-not $sources) { throw "нет исходников MainActivity" }
& "$jdk\bin\javac.exe" -J-Xmx64m -source 17 -target 17 -encoding UTF-8 `
  -classpath "$plat\android.jar" `
  -d "$OutDir\classes" `
  $sources
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

$classFiles = Get-ChildItem "$OutDir\classes" -Recurse -Filter *.class | ForEach-Object { $_.FullName }
$classList = "$OutDir\classes.txt"
Set-Content -Path $classList -Value $classFiles -Encoding ASCII
$env:PATH = "$bt;$jdk\bin;$env:PATH"
& "$bt\d8.bat" --lib "$plat\android.jar" --min-api 21 --output "$OutDir" "@$classList"
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

# ---- 6/8 dex в apk + zipalign --------------------------------------------
Write-Host "6/8 dex + zipalign" -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apkPath = "$OutDir\unsigned.apk"
Copy-Item "$OutDir\compiled\base.apk" $apkPath -Force
$zip = [System.IO.Compression.ZipFile]::Open($apkPath, 'Update')
try {
  $dex = Get-ChildItem "$OutDir" -Filter "classes*.dex" | Select-Object -First 1
  if (-not $dex) { throw "classes.dex not produced" }
  $entry = $zip.CreateEntry("classes.dex", [System.IO.Compression.CompressionLevel]::Optimal)
  $s = $entry.Open()
  $bytes = [System.IO.File]::ReadAllBytes($dex.FullName)
  $s.Write($bytes, 0, $bytes.Length)
  $s.Dispose()
  Write-Host ("   added " + $dex.Name + " (" + $bytes.Length + " bytes)")
} finally { $zip.Dispose() }

& "$bt\zipalign.exe" -f -p 4 $apkPath "$OutDir\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

# ---- 7/8 подпись ---------------------------------------------------------
Write-Host "7/8 подпись" -ForegroundColor Cyan
# Ключ подписи лежит РЯДОМ со скриптом, а не во временной папке сборки.
# RuStore запрещает менять ключ: обновление, подписанное другим ключом,
# не примут, поэтому keystore обязан пережить любую пересборку.
$conf = (& node -e "const g=require('$hereFwd/games').games['$Game']; process.stdout.write(g.alias + '|' + g.password);").Split('|')
$alias = $conf[0]
$pass = $conf[1]
$keystore = Join-Path $here "$Game-release.keystore"
if (-not (Test-Path $keystore)) {
  Write-Host "   ключа нет, создаю новый" -ForegroundColor Yellow
  & "$jdk\bin\keytool.exe" -genkeypair -v `
    -keystore $keystore `
    -storepass $pass -keypass $pass `
    -alias $alias `
    -keyalg RSA -keysize 2048 -validity 10950 `
    -dname "CN=$Game, OU=Teivrim, O=Teivrim, C=RU"
  if ($LASTEXITCODE -ne 0) { throw "keytool failed" }
  Write-Host "   ВАЖНО: сохраните этот файл, RuStore не примет обновление с другим ключом." -ForegroundColor Yellow
}

$signedApk = "$OutDir\$Game-signed.apk"
& "$bt\apksigner.bat" sign `
  --ks $keystore --ks-pass "pass:$pass" --key-pass "pass:$pass" `
  --ks-key-alias $alias `
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true `
  --out $signedApk "$OutDir\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

& "$bt\apksigner.bat" verify --print-certs $signedApk
if ($LASTEXITCODE -ne 0) { throw "signature verification failed" }

# ---- 8/8 проверка содержимого и выкладка --------------------------------
Write-Host "8/8 проверка" -ForegroundColor Cyan
& "$bt\aapt2.exe" dump badging $signedApk > "$OutDir\badging.txt"
if ($LASTEXITCODE -ne 0) { throw "aapt2 dump failed" }
$pkg = (Select-String -Path "$OutDir\badging.txt" -Pattern "^package: name='([^']+)'").Matches[0].Groups[1].Value
$label = (Select-String -Path "$OutDir\badging.txt" -Pattern "application-label:'([^']*)'").Matches[0].Groups[1].Value
$perms = (Select-String -Path "$OutDir\badging.txt" -Pattern "uses-permission: name='([^']+)'").Matches.Count
$expected = (& node -e "process.stdout.write(require('$hereFwd/games').games['$Game'].package);")

if ($pkg -ne $expected) { throw "пакет не тот: ожидали $expected, получили $pkg" }
Write-Host "   пакет:  $pkg"
Write-Host "   ярлык:  $label"
Write-Host "   разрешений: $perms (должно быть 0)"

$final = Join-Path $here "NEON-$($Game.ToUpper())-1.0.0.apk"
Copy-Item $signedApk $final -Force
$hash = (Get-FileHash $final -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item $final).Length

Write-Host ""
Write-Host ("APK READY: " + $final) -ForegroundColor Green
Write-Host ("  размер   " + $size + " байт (" + [math]::Round($size / 1MB, 2) + " МБ)") -ForegroundColor Green
Write-Host ("  SHA-256  " + $hash) -ForegroundColor Green
