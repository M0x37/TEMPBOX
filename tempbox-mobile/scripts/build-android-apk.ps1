$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot "android"
$candidates = @(
  $env:ANDROID_HOME,
  $env:ANDROID_SDK_ROOT,
  (Join-Path $env:LOCALAPPDATA "Android\Sdk")
) | Where-Object { $_ }

$sdkRoot = $candidates | Where-Object { Test-Path (Join-Path $_ "platform-tools\adb.exe") } | Select-Object -First 1

if (-not $sdkRoot) {
  throw "Android SDK nicht gefunden. Setze ANDROID_HOME oder installiere das SDK unter $env:LOCALAPPDATA\Android\Sdk."
}

Set-Content -LiteralPath (Join-Path $androidRoot "local.properties") `
  -Value "sdk.dir=$($sdkRoot.Replace('\', '/'))" `
  -Encoding ascii

Push-Location $androidRoot
try {
  & ".\gradlew.bat" "assembleRelease"
  if ($LASTEXITCODE -ne 0) {
    throw "Der Android-Release-Build ist fehlgeschlagen."
  }
} finally {
  Pop-Location
}

$sourceApk = Join-Path $androidRoot "app\build\outputs\apk\release\app-release.apk"
$destinationApk = Join-Path (Split-Path -Parent $projectRoot) "tempbox-release.apk"

if (-not (Test-Path $sourceApk)) {
  throw "Die erzeugte APK wurde nicht gefunden: $sourceApk"
}

Copy-Item -LiteralPath $sourceApk -Destination $destinationApk -Force
Write-Host "APK erstellt: $destinationApk"
