param(
  [string]$SdkRoot = "$env:LOCALAPPDATA\Android\Sdk"
)

$sdkManager = Join-Path $SdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $sdkManager)) {
  throw "sdkmanager.bat was not found at $sdkManager"
}

1..50 | ForEach-Object { "y" } | & $sdkManager "--sdk_root=$SdkRoot" --licenses
if ($LASTEXITCODE -ne 0) {
  throw "Android SDK license acceptance failed."
}

& $sdkManager "--sdk_root=$SdkRoot" `
  "platform-tools" `
  "platforms;android-36" `
  "build-tools;36.0.0" `
  "ndk;27.1.12297006"
if ($LASTEXITCODE -ne 0) {
  throw "Android SDK package installation failed."
}
