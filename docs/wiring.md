# Wiring Guide

## ESP32-C3 Supermini Pinout

```
                  ┌──────────┐
                  │  ESP32-C3 │
                  │  Supermini│
                  └────┬─────┘
             3.3V ──►──┤
             GND  ──►──┤
             GPIO8 ──►──┤ (SDA)
             GPIO9 ──►──┤ (SCL)
                       └──
```

## Power Supply

| Source       | ESP32-C3 Pin |
|--------------|--------------|
| Battery (+)  | 5V           |
| Battery (-)  | GND          |

## I2C Sensors (AHT20 + BMP280)

Both sensors share the same I2C bus.

| Sensor Pin | ESP32-C3 Pin | Purpose         |
|------------|--------------|-----------------|
| VDD        | 3.3V         | Power           |
| GND        | GND          | Ground          |
| SDA        | GPIO8        | I2C Data        |
| SCL        | GPIO9        | I2C Clock       |

Sensor addresses:
- **AHT20**: 0x38
- **BMP280**: 0x77

Use female-to-male jumper wires to connect the sensor module to the ESP32.
