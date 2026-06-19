#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

// --- WLAN-Einstellungen für den Access Point (AP) ---
const char* ssid = "Wetterstation-ESP32S3"; // Der Name des WLAN-Netzwerks
const char* password = "";               // Passwort (leer lassen für offenes Netzwerk)

// --- Webserver auf Port 80 starten ---
WebServer server(80);

// --- Sensor-Objekte initialisieren ---
Adafruit_AHTX0 aht;     // Für Temperatur und Luftfeuchtigkeit
Adafruit_BMP280 bmp;   // Für Luftdruck

// --- Globale Variablen zum Speichern der Daten ---
float temperature_aht = 0.0;
float humidity = 0.0;
float pressure = 0.0;
unsigned long lastUpdate = 0; // Für zeitgesteuertes Update
const long interval = 5000;  // Intervall in Millisekunden (5 Sekunden)

// --- Funktion zum Lesen der Sensordaten ---
void readSensors() {
  sensors_event_t humidity_event, temp_event;
  aht.getEvent(&humidity_event, &temp_event); // AHT20 auslesen

  temperature_aht = temp_event.temperature;
  humidity = humidity_event.relative_humidity;
  pressure = bmp.readPressure() / 100.0F; // BMP280 Luftdruck in hPa
}

// --- Funktion zum Erstellen der HTML-Website ---
String getHtmlPage() {
  String html = "<!DOCTYPE html><html>\n";
  html += "<head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\">\n";
  html += "<title>Wetterstation ESP32-S3</title>\n";
  html += "<style>html { font-family: sans-serif; display: inline-block; margin: 0px auto; text-align: center; }\n";
  html += "body { margin-top: 50px; background-color: #f0f8ff; }\n";
  html += "h1 { color: #007bff; }\n";
  html += "h2 { color: #555; }\n";
  html += ".data-container { display: flex; flex-direction: column; align-items: center; gap: 20px; }\n";
  html += ".data-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; width: 80%; max-width: 300px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }\n";
  html += ".value { font-size: 2em; font-weight: bold; color: #333; }\n";
  html += ".unit { font-size: 1.2em; color: #777; }\n";
  html += "</style>\n";
  // Auto-Refresh alle 10 Sekunden
  html += "<script>setInterval(function() { location.reload(); }, 10000);</script>\n"; 
  html += "</head>\n";
  html += "<body>\n";
  html += "  <h1>🌡️ Aktuelle Wetterdaten</h1>\n";
  html += "  <h2>ESP32-S3 Wetterstation</h2>\n";
  html += "  <div class=\"data-container\">\n";

  // Temperatur-Karte
  html += "    <div class=\"data-card\">\n";
  html += "      <h3>Temperatur</h3>\n";
  html += "      <span class=\"value\">" + String(temperature_aht, 1) + "</span><span class=\"unit\">°C</span>\n";
  html += "    </div>\n";

  // Luftfeuchtigkeits-Karte
  html += "    <div class=\"data-card\">\n";
  html += "      <h3>Luftfeuchtigkeit</h3>\n";
  html += "      <span class=\"value\">" + String(humidity, 0) + "</span><span class=\"unit\">% rF</span>\n";
  html += "    </div>\n";

  // Luftdruck-Karte
  html += "    <div class=\"data-card\">\n";
  html += "      <h3>Luftdruck</h3>\n";
  html += "      <span class=\"value\">" + String(pressure, 1) + "</span><span class=\"unit\">hPa</span>\n";
  html += "    </div>\n";

  html += "  </div>\n";
  html += "</body></html>\n";
  return html;
}

// --- Handler-Funktion für die Hauptseite ---
void handleRoot() {
  readSensors(); 
  Serial.println("Webseite angefordert.");
  server.send(200, "text/html", getHtmlPage()); 
}

// --- Setup-Funktion ---
void setup() {
  Serial.begin(115200);
  Serial.println("\n--- Wetterstation ESP32-S3 startet ---");

  // I2C Kommunikation starten (Standard-Pins für SDA/SCL werden genutzt)
  Wire.begin(); 

  // AHT20 initialisieren
  if (!aht.begin()) {
    Serial.println("❌ AHT20 nicht gefunden!");
    while (1) delay(10);
  }
  Serial.println("✅ AHT20 Sensor bereit.");

  // BMP280 initialisieren
  unsigned status;
  status = bmp.begin(0x76); 
  if (!status) {
    status = bmp.begin(0x77); 
  }
  if (!status) {
    Serial.println("❌ BMP280 nicht gefunden!");
    while (1) delay(10);
  }
  Serial.println("✅ BMP280 Sensor bereit.");

  // Access Point starten
  WiFi.softAP(ssid, password);
  IPAddress myIP = WiFi.softAPIP();
  Serial.print("✅ WLAN gestartet: ");
  Serial.println(ssid);
  Serial.print("💻 Website erreichbar unter: http://");
  Serial.println(myIP);

  // Router einrichten
  server.on("/", handleRoot); 
  server.begin();
  Serial.println("🚀 Webserver gestartet.");
}

// --- Hauptschleife ---
void loop() {
  server.handleClient(); 

  // Alle 5 Sekunden Daten auf den Seriellen Monitor werfen
  unsigned long currentMillis = millis();
  if (currentMillis - lastUpdate >= interval) {
    readSensors(); 
    Serial.print("Temp: "); Serial.print(temperature_aht, 1); Serial.print("°C | ");
    Serial.print("Humi: "); Serial.print(humidity, 0); Serial.print("% | ");
    Serial.print("Pres: "); Serial.print(pressure, 1); Serial.println("hPa");
    lastUpdate = currentMillis;
  }
}