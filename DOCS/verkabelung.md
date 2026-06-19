# Verkabelungsplan  (ESP32-C3 Super Mini)

##  1. Stromversorgung (Akku / Batteriebox)

| Von (Stromquelle) | Zu (ESP32-C3 Super Mini) |
| :--- | :--- |
| **Pluspol (+ / Rot)** | **Pin 5V** |
| **Minuspol (- / Schwarz)** | **Pin G (GND)** |

---

##  2. Sensor-Verkabelung (AHT20 + BMP280)

| Von (Sensor) | Zu (ESP32-C3) | Zweck |
| :--- | :--- | :--- |
| **VDD** | **Pin 3.3V** | Stromversorgung Sensor |
| **GND** | **Pin G (GND)** | Masse |
| **SDA** | **Pin 8** (GPIO8) | Datenleitung |
| **SCL** | **Pin 9** (GPIO9) | Taktleitung |

---

## Details
Jumper Female vom Module zu passendem Pin loch per Male Seite am esp32C3 Supermini verbinden