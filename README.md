# TEMPBOX

ESP32-C3 temperature station with AHT20 (temperature/humidity) and BMP280 (pressure) sensors, featuring a live-data mobile app built with Expo and React Native.

## Project Structure

```
├── firmware/          ESP32-C3 Arduino firmware
│   └── CODE/CODE.ino      Main sketch with local WLAN configuration
├── tempbox-mobile/    Expo + React Native mobile app
│   ├── App.tsx        TEMPBOX interface
│   ├── src/           ESP32 client and local storage
│   └── eas.json       Android APK build profile
├── app/               Previous React + Capacitor implementation (legacy)
├── docs/
│   ├── wiring.md      Sensor wiring instructions
│   ├── power.md       Power consumption calculations
│   └── troubleshooting.md  Common issues & fixes
└── README.md
```

## Quick Start

### 1. Flash the ESP32

1. Open `firmware/CODE/CODE.ino` in the Arduino IDE (with ESP32 board support installed).
2. Set `WIFI_SSID` and `WIFI_PASSWORD` at the top of the sketch if necessary.
3. Select board: **ESP32-C3 Dev Module**.
4. Install required libraries:
   - ArduinoJson
   - Adafruit AHTX0
   - Adafruit BMP280
5. Flash to the ESP32-C3 Supermini.

### 2. Run the Expo App (development)

```bash
cd tempbox-mobile
npm start
```

Scanne den QR-Code anschließend mit Expo Go. Smartphone und ESP32 müssen im selben WLAN sein.

### 3. Build Android APK

```bash
npm install --global eas-cli
cd tempbox-mobile
eas login
eas build --platform android --profile preview
```

Das `preview`-Profil erzeugt eine installierbare Android-APK. Für einen lokalen Debug-Build mit Android Studio kann `npx expo run:android` verwendet werden.

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
