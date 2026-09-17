# Firmware

ESP32-C3 firmware for the TEMPBOX temperature station.

## Setup

1. Install **Arduino IDE** with ESP32 board support (Board: `ESP32-C3 Dev Module`).
2. Install required libraries via Library Manager:
   - ArduinoJson
   - PubSubClient
   - Adafruit AHTX0
   - Adafruit BMP280 Library
   - Adafruit Unified Sensor
3. Open `CODE/CODE.ino` and edit the WiFi and MQTT settings at the top of the sketch.
4. Set `WIFI_SSID` and `WIFI_PASSWORD` to your local network values.
5. If you want Home Assistant to discover the device automatically, set `MQTT_BROKER`, `MQTT_PORT`, and the MQTT credentials in the same file.
6. Upload this single file to the ESP32-C3. No `config.h` file is required.

> Important: Upload the revised sketch after this update. The new `WebServer` implementation replaces the hand-written socket handling and avoids periodic WiFi scans that can close an active browser request without a response.

## Home Assistant (MQTT Discovery)

The firmware now publishes Home Assistant discovery payloads automatically once it connects to the MQTT broker. In practice this means that Home Assistant can detect the sensors without custom YAML:

- `TEMPBOX Temperature`
- `TEMPBOX Humidity`
- `TEMPBOX Pressure`

The ESP32 exposes these topics:

- `tempbox/state` → JSON payload with `temp`, `humidity`, and `pressure`
- `tempbox/status` → `online` / `offline`
- `homeassistant/sensor/tempbox_temperature/config` → discovery payload for the temperature sensor
- `homeassistant/sensor/tempbox_humidity/config` → discovery payload for the humidity sensor
- `homeassistant/sensor/tempbox_pressure/config` → discovery payload for the pressure sensor

### Home Assistant setup

1. Install and start an MQTT broker in your Home Assistant network, for example Mosquitto.
2. Set the ESP32 MQTT values in the sketch:

```cpp
const char* MQTT_BROKER = "192.168.178.20";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USERNAME = "";
const char* MQTT_PASSWORD = "";
```

3. Restart the ESP32.
4. In Home Assistant, open Settings → Devices & Services → MQTT → check the new entities.

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
