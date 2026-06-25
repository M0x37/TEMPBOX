# Power Consumption

## Typical Draw (WiFi active, continuous)

| Component | Current @3.3V | Power |
|---|---|---|
| ESP32-C3 (WiFi TX/RX) | ~100 mA | 0,33 W |
| AHT20 (measuring) | ~2 mA | 0,007 W |
| BMP280 (measuring) | ~2,7 mA | 0,009 W |
| **Total** | **~105 mA** | **~0,35 W** |

## From USB Power Supply (5V)

- Board + regulator losses (~10 %) → **~0,4 W**
- Per day: **~9,6 Wh**
- Per month: **~0,29 kWh**
- Per year: **~3,5 kWh**
- At 0,30 €/kWh → **~1,05 €/year**

## From Battery (2000 mAh Li-Po, 3,7V)

- Continuous: 2000 mAh / 105 mA ≈ **19 hours runtime**
- With Deep Sleep (wake every 60 s to measure + send): effective ~1–2 mA → **40+ days**

## Battery voltage

The ESP32-C3 Supermini has an onboard AMS1117-3.3 regulator.  
**Connect battery to the 5V pin**, not the 3.3V pin.

| Input (5V pin) | Result |
|---|---|
| < 4,3 V | Regulator may drop out → unstable |
| **4,68 V** (or higher) | **OK – fully stable** |
| > 12 V | Regulator may overheat/damage |

> Do **not** connect battery voltage to the 3.3V pin: max rating is 3.6 V.
