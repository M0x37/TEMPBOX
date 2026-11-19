#pragma once

// Copy this file to config.h in the same folder, then enter your own settings.
#define TEMPBOX_WIFI_SSID "YOUR_WIFI_SSID"
#define TEMPBOX_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#define TEMPBOX_USE_STATIC_IP true
#define TEMPBOX_IP_ADDRESS 192, 168, 178, 100
#define TEMPBOX_GATEWAY 192, 168, 178, 1
#define TEMPBOX_SUBNET 255, 255, 255, 0
#define TEMPBOX_DNS 192, 168, 178, 1

#define TEMPBOX_MQTT_BROKER "192.168.178.20"
#define TEMPBOX_MQTT_PORT 1883
#define TEMPBOX_MQTT_USERNAME ""
#define TEMPBOX_MQTT_PASSWORD ""
#define TEMPBOX_MQTT_CLIENT_ID "tempbox_esp32"
#define TEMPBOX_HA_DISCOVERY_PREFIX "homeassistant"
#define TEMPBOX_MQTT_PUBLISH_INTERVAL (2 * 60 * 1000UL)
