# Firmware

ESP32-C3 firmware for the TEMPBOX temperature station.

## Setup

1. Install **Arduino IDE** with ESP32 board support (Board: `ESP32-C3 Dev Module`).
2. Install required libraries via Library Manager:
   - ArduinoJson
   - Adafruit AHTX0
   - Adafruit BMP280 Library
   - Adafruit Unified Sensor
3. Copy `config.example.h` to `config.h` and set your WiFi credentials.
4. Open `CODE.ino` and upload to the ESP32-C3.

## API

The server listens on port 80 and provides:

| Method | Path | Description |
|--------|------|-------------|
| `GET /` | HTTP | Returns `{"temp": 23.5, "humidity": 45.2, "pressure": 1013.2}` |
| `WebSocket /` | WS | Receives JSON updates broadcast every 60 seconds |

CORS is enabled (`Access-Control-Allow-Origin: *`) for cross-origin browser access.
