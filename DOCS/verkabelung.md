# Verkabelungsplan Wetterstation (ESP32-C3 Super Mini)

## 🔋 1. Stromversorgung (Akku / Batteriebox)

| Von (Stromquelle) | Zu (ESP32-C3 Super Mini) |
| :--- | :--- |
| **Pluspol (+ / Rot)** | **Pin 5V** |
| **Minuspol (- / Schwarz)** | **Pin G (GND)** |

---

## 🔌 2. Sensor-Verkabelung (AHT20 + BMP280)

| Von (Lila Sensor) | Zu (ESP32-C3 Super Mini) | Zweck |
| :--- | :--- | :--- |
| **VDD** | **Pin 3.3V** | Stromversorgung Sensor |
| **GND** | **Pin G (GND)** | Masse |
| **SDA** | **Pin 8** (GPIO8) | Datenleitung |
| **SCL** | **Pin 9** (GPIO9) | Taktleitung |

---
