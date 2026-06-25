#include <WiFi.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>
#include "esp_sleep.h"
#include "esp_task_wdt.h"

const char* ssid = "FRITZ!Box 6490 Cable";
const char* password = "31741128969952935150";

IPAddress localIP(192, 168, 178, 100);
IPAddress gateway(192, 168, 178, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(192, 168, 178, 1);

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

WiFiServer server(80);

const int wakeInterval = 30; // min

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

  WiFi.config(localIP, gateway, subnet, dns);
  WiFi.begin(ssid, password);
  WiFi.setAutoReconnect(true);

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

  unsigned long start = millis();
  while (millis() - start < 10000) {
    WiFiClient client = server.available();
    if (client) {
      handleClient(client);
    }
    delay(10);
  }

  Serial.printf("Deep Sleep %d min...\n", wakeInterval);
  WiFi.disconnect();
  esp_task_wdt_deinit();
  delay(100);
  esp_sleep_enable_timer_wakeup((uint64_t)wakeInterval * 60 * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}
