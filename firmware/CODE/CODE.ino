#include <WiFi.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

const char* ssid = "FRITZ!Box 6490 Cable";
const char* password = "31741128969952935150";

IPAddress localIP(192, 168, 178, 100);
IPAddress gateway(192, 168, 178, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(192, 168, 178, 1);

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

WiFiServer server(80);
unsigned long lastWifiCheck = 0;

const int blueLed = 3;
unsigned long lastBlink = 0;
bool ledOn = false;

void blinkLed() {
  if (millis() - lastBlink > 3000 && !ledOn) {
    digitalWrite(blueLed, HIGH);
    ledOn = true;
    lastBlink = millis();
  }
  if (ledOn && millis() - lastBlink > 100) {
    digitalWrite(blueLed, LOW);
    ledOn = false;
  }
}

void pinsInit() {
  pinMode(2, OUTPUT);
  digitalWrite(2, LOW);
  pinMode(blueLed, OUTPUT);
  digitalWrite(blueLed, LOW);
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
  unsigned long start = millis();
  while (client.available() == 0) {
    if (millis() - start > 2000) {
      client.stop();
      return;
    }
    delay(1);
  }
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
    "Access-Control-Allow-Methods: GET, OPTIONS\r\n"
    "Access-Control-Allow-Headers: *\r\n"
    "Cache-Control: no-cache, no-store, must-revalidate\r\n"
    "Pragma: no-cache\r\n"
    "Expires: 0\r\n"
    "Connection: close\r\n"
    "Content-Length: " + String(json.length()) + "\r\n"
    "\r\n" + json;
  client.print(response);
  client.stop();
}

void setup() {
  Serial.begin(115200);
  pinsInit();
  blinkLed();

  Wire.begin(8, 9);

  if (!aht.begin()) Serial.println("AHT20 Fehler");
  if (!bmp.begin(0x77)) Serial.println("BMP280 Fehler");

  setCpuFrequencyMhz(80);

  WiFi.setHostname("tempbox");
  WiFi.config(localIP, gateway, subnet, dns);
  WiFi.begin(ssid, password);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 50) {
    blinkLed();
    delay(200);
    Serial.print(".");
    retries++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi fehlgeschlagen – versuche im Loop");
  }

  server.begin();
  Serial.println("Server auf Port 80");
}

void loop() {
  blinkLed();

  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWifiCheck > 1000) {
      lastWifiCheck = millis();
      WiFi.reconnect();
    }
    delay(10);
    return;
  }

  WiFiClient client = server.available();
  if (client) {
    handleClient(client);
  }

  delay(10);
}
