#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

void setup() {
  Serial.begin(115200);
  delay(3000); 

  Serial.println("System startet...");
  Wire.begin(8, 9);

  // AHT20 Initialisierung
  if (!aht.begin()) {
    Serial.println("Fehler: AHT20 nicht gefunden!");
  } else {
    Serial.println("AHT20 bereit.");
  }

  // BMP280 Initialisierung
  if (!bmp.begin()) {
    Serial.println("Fehler: BMP280 nicht gefunden!");
  } else {
    Serial.println("BMP280 bereit.");
  }
  
}

void loop() {
  sensors_event_t humidity, temp;
  aht.getEvent(&humidity, &temp);

  // Wir nutzen die Temperatur vom AHT20
  float finalTemp = temp.temperature;
  float finalHumidity = humidity.relative_humidity;
  float finalPressure = bmp.readPressure() / 100.0F;

  Serial.println("--- Aktuelle Werte ---");
  
  // Temperatur vom AHT20
  Serial.print("Temperatur: "); 
  Serial.print(finalTemp); 
  Serial.println(" °C");

  // Luftfeuchte
  Serial.print("Luftfeuchte: "); 
  Serial.print(finalHumidity); 
  Serial.println(" %");

  // Luftdruck vom BMP280
  Serial.print("Luftdruck: "); 
  Serial.print(finalPressure); 
  Serial.println(" hPa");
  
  Serial.println("----------------------");

  delay(3000);
}