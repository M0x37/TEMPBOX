#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <Wire.h>
#include <PubSubClient.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

// TEMPBOX configuration: keep all settings in this one sketch file.
const char* WIFI_SSID = "FRITZ!Box 6490 Cable";
const char* WIFI_PASSWORD = "31741128969952935150";
const bool USE_STATIC_IP = true;

const char* MQTT_BROKER = "192.168.178.21";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USERNAME = "mqtt";
const char* MQTT_PASSWORD = "KW9z8OoCcoxBMzK";
const char* MQTT_CLIENT_ID = "tempbox_esp32";
const char* HA_DISCOVERY_PREFIX = "homeassistant";
const unsigned long MQTT_PUBLISH_INTERVAL = 2 * 60'000;

IPAddress localIP(192, 168, 178, 100);
IPAddress gateway(192, 168, 178, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(192, 168, 178, 1);

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;
WebServer server(80);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastWifiCheck = 0;
unsigned long lastMqttPublish = 0;
bool ahtReady = false;
bool bmpReady = false;
bool mqttDiscoveryPublished = false;
float currentTemp = 0.0f;
float currentHumidity = 0.0f;
float currentPressure = 0.0f;

bool hasMqttCredentials() {
  return strlen(MQTT_USERNAME) > 0 || strlen(MQTT_PASSWORD) > 0;
}

void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
}

bool readSensorData(String& output, float& tempValue, float& humidityValue, float& pressureValue) {
  if (!ahtReady || !bmpReady) return false;

  sensors_event_t humidity, temperature;
  aht.getEvent(&humidity, &temperature);
  const float pressure = bmp.readPressure() / 100.0F;

  if (isnan(temperature.temperature) || isnan(humidity.relative_humidity) || isnan(pressure)) {
    return false;
  }

  tempValue = temperature.temperature;
  humidityValue = humidity.relative_humidity;
  pressureValue = pressure;

  StaticJsonDocument<200> document;
  document["temp"] = tempValue;
  document["humidity"] = humidityValue;
  document["pressure"] = pressureValue;

  serializeJson(document, output);
  return true;
}

bool readSensorData(String& output) {
  return readSensorData(output, currentTemp, currentHumidity, currentPressure);
}

void publishMqttAvailability(const char* status) {
  if (!mqttClient.connected()) return;
  mqttClient.publish("tempbox/status", status, true);
}

void publishHomeAssistantDiscovery() {
  if (!mqttClient.connected()) return;

  const String device = "{\"identifiers\":[\"tempbox_esp32\"],\"name\":\"TEMPBOX\",\"manufacturer\":\"M0x37\",\"model\":\"ESP32-C3\"}";

  const String tempConfig = String("{\n") +
    "\"name\":\"TEMPBOX Temperature\",\n" +
    "\"unique_id\":\"tempbox_temperature\",\n" +
    "\"state_topic\":\"tempbox/state\",\n" +
    "\"value_template\":\"{{ value_json.temp }}\",\n" +
    "\"device_class\":\"temperature\",\n" +
    "\"unit_of_measurement\":\"°C\",\n" +
    "\"icon\":\"mdi:thermometer\",\n" +
    "\"availability_topic\":\"tempbox/status\",\n" +
    "\"payload_available\":\"online\",\n" +
    "\"payload_not_available\":\"offline\",\n" +
    "\"device\":" + device + "\n" +
    "}";

  const String humidityConfig = String("{\n") +
    "\"name\":\"TEMPBOX Humidity\",\n" +
    "\"unique_id\":\"tempbox_humidity\",\n" +
    "\"state_topic\":\"tempbox/state\",\n" +
    "\"value_template\":\"{{ value_json.humidity }}\",\n" +
    "\"device_class\":\"humidity\",\n" +
    "\"unit_of_measurement\":\"%\",\n" +
    "\"icon\":\"mdi:water-percent\",\n" +
    "\"availability_topic\":\"tempbox/status\",\n" +
    "\"payload_available\":\"online\",\n" +
    "\"payload_not_available\":\"offline\",\n" +
    "\"device\":" + device + "\n" +
    "}";

  const String pressureConfig = String("{\n") +
    "\"name\":\"TEMPBOX Pressure\",\n" +
    "\"unique_id\":\"tempbox_pressure\",\n" +
    "\"state_topic\":\"tempbox/state\",\n" +
    "\"value_template\":\"{{ value_json.pressure }}\",\n" +
    "\"device_class\":\"pressure\",\n" +
    "\"unit_of_measurement\":\"hPa\",\n" +
    "\"icon\":\"mdi:gauge\",\n" +
    "\"availability_topic\":\"tempbox/status\",\n" +
    "\"payload_available\":\"online\",\n" +
    "\"payload_not_available\":\"offline\",\n" +
    "\"device\":" + device + "\n" +
    "}";

  const String tempTopic = String(HA_DISCOVERY_PREFIX) + "/sensor/tempbox_temperature/config";
  const String humidityTopic = String(HA_DISCOVERY_PREFIX) + "/sensor/tempbox_humidity/config";
  const String pressureTopic = String(HA_DISCOVERY_PREFIX) + "/sensor/tempbox_pressure/config";

  if (mqttClient.publish(tempTopic.c_str(), tempConfig.c_str(), true) == false) {
    Serial.println("Discovery publish failed: temp");
  }
  if (mqttClient.publish(humidityTopic.c_str(), humidityConfig.c_str(), true) == false) {
    Serial.println("Discovery publish failed: humidity");
  }
  if (mqttClient.publish(pressureTopic.c_str(), pressureConfig.c_str(), true) == false) {
    Serial.println("Discovery publish failed: pressure");
  }
  mqttDiscoveryPublished = true;
}


void publishSensorState() {
  if (!mqttClient.connected()) return;

  String payload = "{";
  payload += "\"temp\":" + String(currentTemp, 2) + ",";
  payload += "\"humidity\":" + String(currentHumidity, 1) + ",";
  payload += "\"pressure\":" + String(currentPressure, 1);
  payload += "}";

  if (mqttClient.publish("tempbox/state", payload.c_str(), true) == false) {
    Serial.println("State publish failed");
    return;
  }
  publishMqttAvailability("online");
}

bool connectMqtt() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  if (mqttClient.connected()) {
    return true;
  }

  Serial.print("Connecting to MQTT broker...");
  bool connected = hasMqttCredentials()
    ? mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)
    : mqttClient.connect(MQTT_CLIENT_ID);

  if (connected) {
    Serial.println(" connected");
    publishHomeAssistantDiscovery();
    publishMqttAvailability("online");
  } else {
    Serial.print(" failed, rc=");
    Serial.println(mqttClient.state());
  }

  return connected;
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

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(30);
  mqttClient.setBufferSize(1024);

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

  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      static unsigned long lastMqttReconnectAttempt = 0;
      if (millis() - lastMqttReconnectAttempt > 5000) {
        lastMqttReconnectAttempt = millis();
        connectMqtt();
      }
    } else {
      if (millis() - lastMqttPublish > MQTT_PUBLISH_INTERVAL) {
        String payload;
        if (readSensorData(payload)) {
          publishSensorState();
        } else {
          publishMqttAvailability("offline");
        }
        lastMqttPublish = millis();
      }
      mqttClient.loop();
    }
  } else {
    publishMqttAvailability("offline");
  }

  // No periodic WiFi scan here: scans can interrupt the active HTTP connection.
  server.handleClient();
  delay(2);
}
