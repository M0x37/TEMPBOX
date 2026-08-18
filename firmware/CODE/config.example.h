#pragma once

// Copy this file to config.h in the same folder, then enter your own WLAN data.
#define TEMPBOX_WIFI_SSID "YOUR_WIFI_SSID"
#define TEMPBOX_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Keep this true to use the fixed address expected by the mobile app.
#define TEMPBOX_USE_STATIC_IP true
#define TEMPBOX_IP_ADDRESS 192, 168, 178, 100
#define TEMPBOX_GATEWAY 192, 168, 178, 1
#define TEMPBOX_SUBNET 255, 255, 255, 0
#define TEMPBOX_DNS 192, 168, 178, 1
