# TEMPBOX

ESP32-C3 temperature station with AHT20 (temperature/humidity) and BMP280 (pressure) sensors, featuring a live-data mobile app built with Expo and React Native.

## Project Structure

```
TEMPBOX/
├── firmware/
│   ├── CODE/                 Aktuelle ESP32-C3-Sketch-Dateien
│   ├── legacy/               Ältere Arduino-Sketches
│   └── README.md             Firmware-Dokumentation
├── tempbox-mobile/           Expo + React Native Android-App
│   ├── App.tsx
│   ├── src/                  API und lokaler Speicher
│   └── scripts/              Android-Build-Skripte
├── docs/                     Architektur, Design und Hardware-Dokumentation
├── release/                  Fertige Android-APK
├── .vscode/                  ESP32-IntelliSense-Konfiguration
└── README.md
```

## Quick Start

### 1. Flash the ESP32

1. Open `firmware/CODE/CODE.ino` in the Arduino IDE (with ESP32 board support installed).
2. Copy `firmware/CODE/config.example.h` to `firmware/CODE/config.h` and set the local WiFi, static IP and optional MQTT values there. `config.h` is ignored by Git.
3. Set the MQTT settings for Home Assistant if you want automatic entity discovery in HA.
4. Select board: **ESP32-C3 Dev Module**.
5. Install required libraries:
   - ArduinoJson
   - PubSubClient
   - Adafruit AHTX0
   - Adafruit BMP280
6. Flash to the ESP32-C3 Supermini.

### 2. Home Assistant integration

The ESP32 can publish sensor values to Home Assistant via MQTT discovery. Once the broker is reachable, Home Assistant will auto-create the entities for temperature, humidity and pressure. This does not replace the existing HTTP endpoint used by the mobile app.

Example MQTT settings:

```cpp
const char* MQTT_BROKER = "192.168.178.20";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USERNAME = "";
const char* MQTT_PASSWORD = "";
```

Then restart the ESP32 and check whether Home Assistant discovers the entities under the MQTT integration.

### 3. Run the Expo App (development)

```bash
cd tempbox-mobile
npm start
```

Scanne den QR-Code anschließend mit Expo Go. Smartphone und ESP32 müssen im selben WLAN sein.

### 4. Build Android APK

```bash
cd tempbox-mobile
npm run apk:release
```

Das Skript verwendet das lokale Android-SDK und legt die APK als `release/tempbox-release.apk` ab. Für einen lokalen Debug-Build mit Android Studio kann `npx expo run:android` verwendet werden.

## API

The ESP32 provides sensor data via HTTP GET on port 80:

```
GET http://192.168.178.100/
```

Response:
```json
{
  "temp": 23.5,
  "humidity": 45.2,
  "pressure": 1013.2
}
```

The endpoint includes `Access-Control-Allow-Origin: *` for cross-origin requests.

## Hardware

- **ESP32-C3 Supermini** microcontroller
- **AHT20** temperature & humidity sensor (I2C address: 0x38)
- **BMP280** barometric pressure sensor (I2C address: 0x77)
- I2C: SDA → GPIO8, SCL → GPIO9

See [docs/wiring.md](docs/wiring.md) for wiring and [docs/power.md](docs/power.md) for power consumption details.

## License

MIT
