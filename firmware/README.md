# Firmware

ESP32-C3 firmware for the TEMPBOX temperature station.

## Setup

1. Install **Arduino IDE** with ESP32 board support (Board: `ESP32-C3 Dev Module`).
2. Install required libraries via Library Manager:
   - ArduinoJson
   - Adafruit AHTX0
   - Adafruit BMP280 Library
   - Adafruit Unified Sensor
3. Open `CODE/CODE.ino` and edit the `WIFI_SSID` and `WIFI_PASSWORD` values at the top when needed.
4. Upload this single file to the ESP32-C3. No `config.h` file is required.

> Important: Upload the revised sketch after this update. The new `WebServer` implementation replaces the hand-written socket handling and avoids periodic WiFi scans that can close an active browser request without a response.

## Connection Handling

The firmware keeps the WiFi connection active so that the Expo app can request live data. It reconnects to WiFi when necessary but does not perform periodic network scans while handling browser requests.

## API

The server listens on port 80:

| Method | Path | Description |
|--------|------|-------------|
| `GET /` | HTTP | Returns `{"temp": 23.5, "humidity": 45.2, "pressure": 1013.2}` |
| `GET /health` | HTTP | Returns a compact sensor status response for connection checks. |

CORS is enabled (`Access-Control-Allow-Origin: *`) for cross-origin requests.

The Expo app reads the root endpoint every five seconds by default and retains a simple live view plus a local measurement history.
