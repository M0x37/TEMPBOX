/*
 * ESP32-C3 Supermini Wetterstation
 * mit WebSocket-Server + HTTP JSON API
 * Verkabelung: SDA -> GPIO 8, SCL -> GPIO 9
 */

#include <WiFi.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>
#include <mbedtls/sha1.h>

#include "config.h"

IPAddress localIP(192, 168, 178, 100);
IPAddress gateway(192, 168, 178, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(192, 168, 178, 1);

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

WiFiServer server(80);

struct WSClient {
  WiFiClient client;
  bool active;
  bool handshakeDone;
  String buffer;
};

WSClient clients[4];
const char* wsGUID = "258EAFA5-E914-47DA-95CA-5AB5DC11B09B";

String base64Encode(const uint8_t* data, size_t len) {
  const char b64[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String out;
  for (size_t i = 0; i < len; i += 3) {
    uint8_t d0 = data[i];
    uint8_t d1 = (i + 1 < len) ? data[i + 1] : 0;
    uint8_t d2 = (i + 2 < len) ? data[i + 2] : 0;
    uint32_t b = (d0 << 16) | (d1 << 8) | d2;
    out += b64[(b >> 18) & 0x3F];
    out += b64[(b >> 12) & 0x3F];
    out += (i + 1 < len) ? b64[(b >> 6) & 0x3F] : '=';
    out += (i + 2 < len) ? b64[b & 0x3F] : '=';
  }
  return out;
}

String wsAcceptKey(const String& key) {
  String concat = key + wsGUID;
  uint8_t hash[20];
  mbedtls_sha1((const uint8_t*)concat.c_str(), concat.length(), hash);
  return base64Encode(hash, 20);
}

void sendWSFrame(WiFiClient& client, const String& data) {
  uint8_t header[10];
  size_t len = data.length();
  size_t headerLen;

  header[0] = 0x81;

  if (len < 126) {
    header[1] = len;
    headerLen = 2;
  } else if (len < 65536) {
    header[1] = 126;
    header[2] = (len >> 8) & 0xFF;
    header[3] = len & 0xFF;
    headerLen = 4;
  } else {
    header[1] = 127;
    for (int i = 0; i < 8; i++) header[2 + i] = (len >> (56 - i * 8)) & 0xFF;
    headerLen = 10;
  }

  client.write(header, headerLen);
  client.print(data);
}

void sendPong(WiFiClient& client, uint8_t* data, size_t len) {
  uint8_t header[10];
  size_t headerLen;

  header[0] = 0x8A;

  if (len < 126) {
    header[1] = len;
    headerLen = 2;
  } else if (len < 65536) {
    header[1] = 126;
    header[2] = (len >> 8) & 0xFF;
    header[3] = len & 0xFF;
    headerLen = 4;
  } else {
    header[1] = 127;
    for (int i = 0; i < 8; i++) header[2 + i] = (len >> (56 - i * 8)) & 0xFF;
    headerLen = 10;
  }

  client.write(header, headerLen);
  if (len > 0) client.write(data, len);
}

int findFreeSlot() {
  for (int i = 0; i < 4; i++) {
    if (!clients[i].active) return i;
  }
  return -1;
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

void sendHttpJson(WiFiClient& client, const String& json) {
  String response = "HTTP/1.1 200 OK\r\n"
    "Content-Type: application/json\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Connection: close\r\n"
    "Content-Length: " + String(json.length()) + "\r\n"
    "\r\n" + json;
  client.print(response);
}

void handleClient(int idx) {
  WSClient& c = clients[idx];

  if (!c.handshakeDone) {
    if (!c.client.available()) return;

    while (c.client.available()) {
      char ch = c.client.read();
      c.buffer += ch;
      if (c.buffer.endsWith("\r\n\r\n")) {
        break;
      }
    }

    if (!c.buffer.endsWith("\r\n\r\n")) return;

    if (c.buffer.indexOf("GET /") == -1) {
      c.client.stop();
      c.active = false;
      return;
    }

    int keyPos = c.buffer.indexOf("Sec-WebSocket-Key: ");

    if (keyPos != -1) {
      // WebSocket upgrade
      int end = c.buffer.indexOf("\r\n", keyPos);
      String wsKey = c.buffer.substring(keyPos + 19, end);
      String accept = wsAcceptKey(wsKey);

      String httpResponse = "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: " + accept + "\r\n\r\n";
      c.client.print(httpResponse);
      c.client.flush();

      c.handshakeDone = true;
      c.buffer = "";
      Serial.printf("WS verbunden [%d]\n", idx);
      return;
    }

    // Regular HTTP request → send JSON
    String json = readSensorData();
    sendHttpJson(c.client, json);
    c.client.stop();
    c.active = false;
    return;
  }

  // WebSocket frame handling
  if (c.client.available() < 2) {
    if (!c.client.connected()) {
      c.client.stop();
      c.active = false;
      Serial.printf("WS getrennt [%d]\n", idx);
    }
    return;
  }

  uint8_t byte1 = c.client.read();
  uint8_t byte2 = c.client.read();

  uint8_t opcode = byte1 & 0x0F;
  bool masked = byte2 & 0x80;
  uint64_t payloadLen = byte2 & 0x7F;

  if (payloadLen == 126) {
    if (c.client.available() < 2) return;
    payloadLen = c.client.read() << 8;
    payloadLen |= c.client.read();
  } else if (payloadLen == 127) {
    if (c.client.available() < 8) return;
    payloadLen = 0;
    for (int i = 0; i < 8; i++) {
      payloadLen = (payloadLen << 8) | c.client.read();
    }
  }

  uint8_t mask[4];
  if (masked) {
    if (c.client.available() < 4) return;
    c.client.read(mask, 4);
  }

  if (payloadLen > 0) {
    if (c.client.available() < payloadLen) return;
  }

  if (opcode == 0x9) {
    if (payloadLen > 0) {
      uint8_t* pingData = new uint8_t[payloadLen];
      c.client.read(pingData, payloadLen);
      if (masked) for (uint64_t i = 0; i < payloadLen; i++) pingData[i] ^= mask[i % 4];
      sendPong(c.client, pingData, payloadLen);
      delete[] pingData;
    } else {
      sendPong(c.client, nullptr, 0);
    }
  } else if (opcode == 0x8) {
    c.client.stop();
    c.active = false;
    Serial.printf("WS getrennt [%d] close\n", idx);
  } else if (opcode == 0xA) {
    if (payloadLen > 0) {
      while (c.client.available() && payloadLen > 0) { c.client.read(); payloadLen--; }
    }
  } else {
    while (c.client.available() && payloadLen > 0) {
      c.client.read();
      payloadLen--;
    }
  }
}

void setup() {
  Serial.begin(115200);

  Wire.begin(8, 9);

  if (!aht.begin()) Serial.println("AHT20 Fehler");
  if (!bmp.begin(0x77)) Serial.println("BMP280 Fehler");

  WiFi.config(localIP, gateway, subnet, dns);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println();
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  server.begin();
  Serial.println("Server auf Port 80");
}

void loop() {
  WiFiClient newClient = server.available();
  if (newClient) {
    int slot = findFreeSlot();
    if (slot != -1) {
      clients[slot].client = newClient;
      clients[slot].active = true;
      clients[slot].handshakeDone = false;
      clients[slot].buffer = "";
    } else {
      newClient.stop();
    }
  }

  for (int i = 0; i < 4; i++) {
    if (clients[i].active) {
      handleClient(i);
    }
  }

  static unsigned long lastSend = 0;
  if (millis() - lastSend > 60000) {
    lastSend = millis();
    for (int i = 0; i < 4; i++) {
      if (clients[i].active && clients[i].handshakeDone) {
        sendWSFrame(clients[i].client, readSensorData());
      }
    }
    Serial.println("Daten gesendet");
  }
}
