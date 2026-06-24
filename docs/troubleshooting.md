# Troubleshooting

## WebSocket disconnects immediately

The ESP32 logs "App verbunden" followed by "NOT_CONNECTED" within milliseconds.

**Cause:** The `base64Encode` function in the original firmware had a bug when encoding SHA1 hashes (20 bytes, not divisible by 3). The `Sec-WebSocket-Accept` header was incorrect, causing the browser to reject the handshake and close the connection.

**Fix:** Use the current version of `CODE.ino` which has the corrected `base64Encode` function. The bug was in padding bytes: missing bytes were filled with `data[i]` instead of `0`.

## Android APK shows "ESP32 not found"

**Causes:**
1. Android blocks cleartext HTTP by default (fixed with `android:usesCleartextTraffic="true"` in `AndroidManifest.xml`)
2. Android WebView may restrict fetch() calls to private IPs (fixed using `CapacitorHttp` from `@capacitor/core`)

**Fix:** Ensure the APK includes `usesCleartextTraffic="true"` and uses `CapacitorHttp.get()` instead of `fetch()`.

## ESP32 not reachable

1. Check that both your computer/phone and the ESP32 are on the **same WiFi network**.
2. Verify the ESP32's IP in the serial monitor (`ESP32 IP: 192.168.178.100`).
3. Try pinging the ESP32: `ping 192.168.178.100`.
4. Check that `firmware/config.h` has the correct WiFi credentials.

## Required Arduino Libraries

- ArduinoJson
- Adafruit AHTX0
- Adafruit BMP280 Library
- Adafruit Unified Sensor
