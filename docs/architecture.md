# TEMPBOX – Hardware & Datenabfrage

## Übersicht

TEMPBOX ist eine IoT-Temperaturstation bestehend aus:

- **ESP32-C3 Supermini** (Microcontroller, WiFi)
- **AHT20** (Temperatur & Luftfeuchtigkeit, I2C-Adresse: 0x38)
- **BMP280** (Luftdruck, I2C-Adresse: 0x77)

Die Sensoren werden über I2C ausgelesen. Der ESP32 stellt die Daten per HTTP (JSON) im lokalen Netzwerk bereit.

---

## Verkabelung

### I2C-Bus (beide Sensoren parallel)

| Sensor Pin | ESP32-C3 Pin | Zweck      |
|------------|--------------|------------|
| VDD        | 3.3V         | Spannung   |
| GND        | GND          | Masse      |
| SDA        | GPIO8        | I2C Daten  |
| SCL        | GPIO9        | I2C Takt   |

Verwende Female-to-Male Jumper-Kabel zum Anschließen der Sensormodule an den ESP32.

### Spannungsversorgung

| Quelle        | ESP32-C3 Pin |
|---------------|--------------|
| USB (5V)      | USB-C        |
| Akku (Li-Po)  | 5V           |
| Masse         | GND          |

**Wichtig:** Akku an den **5V-Pin** anschließen, nicht an 3.3V! Der ESP32-C3 Supermini hat einen AMS1117-3.3-Regulator onboard.

### Sensoradressen (I2C)

- **AHT20**: 0x38
- **BMP280**: 0x77

---

## Datenabfrage (API)

Der ESP32 läuft als HTTP-Server auf Port 80 mit der statischen IP:

```
http://192.168.178.100/
```

### Anfrage

```
GET /
```

### Antwort (JSON)

```json
{
  "temp": 23.5,
  "humidity": 45.2,
  "pressure": 1013.2
}
```

| Feld      | Einheit | Beschreibung                |
|-----------|---------|-----------------------------|
| temp      | °C      | Temperatur (AHT20)          |
| humidity  | %       | Relative Luftfeuchtigkeit   |
| pressure  | hPa     | Luftdruck (BMP280)          |

CORS ist aktiviert (`Access-Control-Allow-Origin: *`), sodass die Daten von beliebigen Webseiten/Apps abgefragt werden können.

### Daten abfragen (Beispiele)

**cURL:**
```bash
curl http://192.168.178.100/
```

**Python:**
```python
import requests
data = requests.get("http://192.168.178.100/").json()
print(data["temp"], data["humidity"], data["pressure"])
```

**JavaScript (Browser):**
```js
const data = await fetch("http://192.168.178.100/").then(r => r.json());
console.log(data.temp, data.humidity, data.pressure);
```

---

## ESP32-C3 Firmware (Code)

### Benötigte Arduino-Bibliotheken

- ArduinoJson
- Adafruit AHTX0
- Adafruit BMP280 Library
- Adafruit Unified Sensor

### Board-Einstellungen (Arduino IDE)

- Board: **ESP32-C3 Dev Module**
- Flash-Mode: QIO (oder DIO)
- Baudrate: 115200

### Konfiguration (WLAN)

Erstelle eine `config.h` im `firmware/`-Ordner:

```cpp
#ifndef CONFIG_H
#define CONFIG_H

const char* ssid = "DEIN_WLAN_NAME";
const char* password = "DEIN_WLAN_PASSWORT";

#endif
```

### Vollständiger Code (`firmware/CODE/CODE.ino`)

```cpp
#include <WiFi.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

const char* ssid = "DEIN_WLAN_NAME";
const char* password = "DEIN_WLAN_PASSWORT";

IPAddress localIP(192, 168, 178, 100);
IPAddress gateway(192, 168, 178, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(192, 168, 178, 1);

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

WiFiServer server(80);

void ledsOff() {
  pinMode(2, OUTPUT);
  digitalWrite(2, LOW);
}

String readSensorData() {
  sensors_event_t humidity, temp;
  aht.getEvent(&humidity, &temp);
  float pressure = bmp.readPressure() / 100.0F;

  StaticJsonDocument<200> doc;
  doc["temp"] = temp.temperature;
  doc["humidity"] = humidity.relative_humidity;
  doc["pressure"] = pressure;

  char buffer[256];
  serializeJson(doc, buffer);
  return String(buffer);
}

void handleClient(WiFiClient& client) {
  String buffer;
  while (client.available()) {
    char ch = client.read();
    buffer += ch;
    if (buffer.endsWith("\r\n\r\n")) break;
  }

  if (buffer.indexOf("GET /") == -1) {
    client.stop();
    return;
  }

  String json = readSensorData();
  String response = "HTTP/1.1 200 OK\r\n"
    "Content-Type: application/json\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Connection: close\r\n"
    "Content-Length: " + String(json.length()) + "\r\n"
    "\r\n" + json;
  client.print(response);
  client.stop();

  Serial.println("HTTP 200 gesendet");
}

void setup() {
  Serial.begin(115200);
  ledsOff();

  Wire.begin(8, 9);

  if (!aht.begin()) Serial.println("AHT20 Fehler");
  if (!bmp.begin(0x77)) Serial.println("BMP280 Fehler");

  setCpuFrequencyMhz(80);

  WiFi.setHostname("tempbox");
  WiFi.config(localIP, gateway, subnet, dns);
  WiFi.begin(ssid, password);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(true);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 50) {
    delay(200);
    Serial.print(".");
    retries++;
  }
  Serial.println();
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  server.begin();
  Serial.println("Server auf Port 80");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi verloren, reconnect...");
    WiFi.reconnect();
    delay(3000);
  }

  WiFiClient client = server.available();
  if (client) {
    handleClient(client);
  }

  delay(10);
}
```

---

## Fehlersuche

- **ESP32 nicht erreichbar:** Prüfe, ob PC/Handy im selben WLAN sind. Power- Cycle den ESP32 (USB ziehen und neu einstecken).
- **Sensoren liefern keine Werte:** Prüfe die Verkabelung (SDA→GPIO8, SCL→GPIO9) und die I2C-Adressen (AHT20: 0x38, BMP280: 0x77).
- **WiFi-Abbrüche:** Der Code reconnectet automatisch alle 3 Sekunden.
- **Android App zeigt "ESP32 not found":** Die App muss `usesCleartextTraffic="true"` im AndroidManifest haben, da HTTP (nicht HTTPS) verwendet wird.

---

## Stromverbrauch

| Zustand          | Stromverbrauch |
|------------------|----------------|
| Aktiv (WiFi an)  | ~105 mA        |
| Deep Sleep       | ~5 µA          |

Mit einem 2000 mAh Li-Po-Akku:
- Dauerbetrieb: ~19 Stunden
- Mit Deep Sleep (alle 30 Min messen): ~240 Tage

Akku an den **5V-Pin** anschließen (nicht 3.3V!). Die Mindestspannung für einen stabilen Betrieb ist ~4,68 V am 5V-Pin.

---

## Dateistruktur (firmware/)

```
firmware/
├── CODE/CODE.ino       Hauptfirmware (HTTP-Server)
├── config.example.h    WLAN-Vorlage
└── config.h            Eigene WLAN-Zugangsdaten (gitignored)
```
