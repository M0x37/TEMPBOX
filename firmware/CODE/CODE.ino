#include <ArduinoJson.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

// TEMPBOX configuration: keep all settings in this one sketch file.
const char* WIFI_SSID = "FRITZ!Box 6490 Cable";
const char* WIFI_PASSWORD = "31741128969952935150";
const bool USE_STATIC_IP = true;

IPAddress localIP(192, 168, 178, 100);
IPAddress gateway(192, 168, 178, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(192, 168, 178, 1);

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;
WebServer server(80);

unsigned long lastWifiCheck = 0;
bool ahtReady = false;
bool bmpReady = false;

void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
}

bool readSensorData(String& output) {
  if (!ahtReady || !bmpReady) return false;

  sensors_event_t humidity, temperature;
  aht.getEvent(&humidity, &temperature);
  const float pressure = bmp.readPressure() / 100.0F;

  if (isnan(temperature.temperature) || isnan(humidity.relative_humidity) || isnan(pressure)) {
    return false;
  }

  StaticJsonDocument<200> document;
  document["temp"] = temperature.temperature;
  document["humidity"] = humidity.relative_humidity;
  document["pressure"] = pressure;

  serializeJson(document, output);
  return true;
}

void handleRoot() {
  String json;
  sendCorsHeaders();

  if (!readSensorData(json)) {
    server.send(503, "application/json", "{\"error\":\"sensor unavailable\"}");
    return;
  }

  server.send(200, "application/json", json);
}

void handleHealth() {
  sendCorsHeaders();
  const bool healthy = ahtReady && bmpReady && WiFi.status() == WL_CONNECTED;
  server.send(
    healthy ? 200 : 503,
    "application/json",
    healthy ? "{\"status\":\"ok\"}" : "{\"status\":\"unavailable\"}"
  );
}

void handleOptions() {
  sendCorsHeaders();
  server.send(204, "text/plain", "");
}

void setup() {
  Serial.begin(115200);
  Wire.begin(8, 9);

  ahtReady = aht.begin();
  bmpReady = bmp.begin(0x77);
  if (!ahtReady) Serial.println("AHT20 Fehler");
  if (!bmpReady) Serial.println("BMP280 Fehler");

  WiFi.setHostname("tempbox");
  if (USE_STATIC_IP) WiFi.config(localIP, gateway, subnet, dns);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 50) {
    delay(200);
    Serial.print(".");
    retries++;
  }
  Serial.println();
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/", HTTP_OPTIONS, handleOptions);
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/health", HTTP_OPTIONS, handleOptions);
  server.onNotFound([]() {
    sendCorsHeaders();
    server.send(404, "application/json", "{\"error\":\"not found\"}");
  });
  server.begin();
  Serial.println("HTTP Server auf Port 80 gestartet");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiCheck > 1'000) {
    lastWifiCheck = millis();
    WiFi.reconnect();
  }

  // No periodic WiFi scan here: scans can interrupt the active HTTP connection.
  server.handleClient();
  delay(2);
}
