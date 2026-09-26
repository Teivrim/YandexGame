$ErrorActionPreference = "Stop"
$sdk  = "C:\Users\teivrim\AppData\Local\Temp\opencode\android-sdk"
$proj = "C:\Users\teivrim\AppData\Local\Temp\opencode\courier-apk"
$out  = "C:\Users\teivrim\AppData\Local\Temp\opencode\apk-out-courier"
$jdk  = "C:\Users\teivrim\AppData\Local\Temp\opencode\jdk17"
if (-not (Test-Path $jdk)) { $jdk = "C:\Users\teivrim\AppData\Local\jdk17\jdk-17.0.14+7" }
$bt   = "$sdk\build-tools\34.0.0"
$plat = "$sdk\platforms\android-34"
$keys = "D:\SOOBSHESTVA\AUTOMATIC\YandexGame\rustore"

$env:JAVA_HOME = $jdk

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$out\classes", "$out\gen", "$out\compiled" | Out-Null

Write-Host "1/6 aapt2 compile" -ForegroundColor Cyan
& "$bt\aapt2.exe" compile --dir "$proj\res" -o "$out\compiled\res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

Write-Host "2/6 aapt2 link" -ForegroundColor Cyan
& "$bt\aapt2.exe" link -o "$out\compiled\base.apk" `
  -I "$plat\android.jar" `
  --manifest "$proj\AndroidManifest.xml" `
  -R "$out\compiled\res.zip" `
  -A "$proj\assets" `
  --java "$out\gen" `
  --min-sdk-version 21 `
  --target-sdk-version 34 `
  --auto-add-overlay `
  --no-version-vectors
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

Write-Host "3/6 javac" -ForegroundColor Cyan
$sources = Get-ChildItem "$proj\src" -Recurse -Filter *.java | ForEach-Object { $_.FullName }
& "$jdk\bin\javac.exe" -source 17 -target 17 -encoding UTF-8 `
  -classpath "$plat\android.jar" -d "$out\classes" $sources
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

Write-Host "4/6 d8" -ForegroundColor Cyan
$classFiles = Get-ChildItem "$out\classes" -Recurse -Filter *.class | ForEach-Object { $_.FullName }
$classList = "$out\classes.txt"
Set-Content -Path $classList -Value $classFiles -Encoding ASCII
$env:PATH = "$bt;$jdk\bin;$env:PATH"
& "$bt\d8.bat" --lib "$plat\android.jar" --min-api 21 --output "$out" "@$classList"
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

Write-Host "5/6 add dex + zipalign" -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apkPath = "$out\unsigned.apk"
Copy-Item "$out\compiled\base.apk" $apkPath -Force
$zip = [System.IO.Compression.ZipFile]::Open($apkPath, 'Update')
try {
  $dex = Get-ChildItem "$out" -Filter "classes*.dex" | Select-Object -First 1
  if (-not $dex) { throw "classes.dex not produced" }
  $entry = $zip.CreateEntry("classes.dex", [System.IO.Compression.CompressionLevel]::Optimal)
  $s = $entry.Open()
  $bytes = [System.IO.File]::ReadAllBytes($dex.FullName)
  $s.Write($bytes, 0, $bytes.Length)
  $s.Dispose()
} finally { $zip.Dispose() }

& "$bt\zipalign.exe" -f -p 4 $apkPath "$out\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

Write-Host "6/6 sign" -ForegroundColor Cyan
# Отдельный ключ: у каждой игры свой, чтобы не связывать обновления между собой.
$keystore = Join-Path $keys "courier-release.keystore"
if (-not (Test-Path $keystore)) {
  & "$jdk\bin\keytool.exe" -genkeypair -v `
    -keystore $keystore `
    -storepass courier2026 -keypass courier2026 `
    -alias courier `
    -keyalg RSA -keysize 2048 -validity 10950 `
    -dname "CN=NEON COURIER, OU=Teivrim, O=Teivrim, C=RU"
  if ($LASTEXITCODE -ne 0) { throw "keytool failed" }
  Write-Host "   IMPORTANT: back this file up. Store updates require the same key." -ForegroundColor Yellow
}

$signedApk = "$out\NEON-COURIER-signed.apk"
& "$bt\apksigner.bat" sign `
  --ks $keystore --ks-pass pass:courier2026 --key-pass pass:courier2026 `
  --ks-key-alias courier `
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true `
  --out $signedApk $out\aligned.apk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

& "$bt\apksigner.bat" verify $signedApk
if ($LASTEXITCODE -ne 0) { throw "signature verification failed" }

$size = (Get-Item $signedApk).Length / 1MB
Write-Host ("APK READY: " + $signedApk + "  (" + [math]::Round($size, 2) + " MB)") -ForegroundColor Green
