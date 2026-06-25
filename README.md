# TEMPBOX

ESP32-C3 temperature station with AHT20 (temperature/humidity) and BMP280 (pressure) sensors, featuring a live data web app built with React and Capacitor.

## Project Structure

```
├── firmware/          ESP32-C3 Arduino firmware
│   ├── CODE.ino       Main sketch (WebSocket + HTTP JSON API)
│   ├── config.example.h   WiFi credentials template
│   └── config.h       Your local WiFi config (gitignored)
├── weather-app/       React + Capacitor mobile app
│   ├── src/           React source code
│   └── android/       Android native project (generated)
├── docs/
│   ├── wiring.md      Sensor wiring instructions
│   └── troubleshooting.md  Common issues & fixes
└── README.md
```

## Quick Start

### 1. Flash the ESP32

1. Copy `firmware/config.example.h` to `firmware/config.h` and set your WiFi credentials.
2. Open `firmware/CODE.ino` in the Arduino IDE (with ESP32 board support installed).
3. Select board: **ESP32-C3 Dev Module**.
4. Install required libraries:
   - ArduinoJson
   - Adafruit AHTX0
   - Adafruit BMP280
5. Flash to the ESP32-C3 Supermini.

### 2. Run the Web App (development)

```bash
cd weather-app
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### 3. Build Android APK

```bash
cd weather-app
npm run build
npx cap sync android
# Open android/ in Android Studio or:
cd android
./gradlew assembleDebug
```

The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

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

WebSocket is also supported at `ws://192.168.178.100/` for real-time updates (broadcast every 60s).

## Hardware

- **ESP32-C3 Supermini** microcontroller
- **AHT20** temperature & humidity sensor (I2C address: 0x38)
- **BMP280** barometric pressure sensor (I2C address: 0x77)
- I2C: SDA → GPIO8, SCL → GPIO9

See [docs/wiring.md](docs/wiring.md) for wiring and [docs/power.md](docs/power.md) for power consumption details.

## License

MIT
