# TEMPBOX Mobile

Die Expo-App ruft die Temperatur, Luftfeuchte und den Luftdruck vom ESP32 per HTTP ab. Die Geräteadresse, der Aktualisierungsintervall und bis zu 200 lokale Messungen werden nur auf dem Telefon gespeichert.

## Entwicklung

```powershell
cd D:\Coding\tempbox\tempbox-mobile
npm start
```

Scanne anschließend den QR-Code mit Expo Go. Das Smartphone und der ESP32 müssen im selben WLAN sein. Trage die ESP32-Adresse, standardmäßig `192.168.178.100`, im Tab **Gerät** ein.

## Android-APK

Installiere einmalig die EAS-CLI und melde dich mit deinem Expo-Konto an. Anschließend erzeugt das Preview-Profil eine installierbare APK.

```powershell
npm install --global eas-cli
eas login
eas build --platform android --profile preview
```

Für einen lokalen Debug-Build mit installiertem Android Studio kannst du alternativ ausführen:

```powershell
npx expo run:android
```

## ESP32-Schnittstelle

Die App erwartet einen HTTP-GET-Endpunkt, der JSON in diesem Format zurückgibt:

```json
{
  "temp": 23.5,
  "humidity": 45.2,
  "pressure": 1013.2
}
```

Die Android-Konfiguration erlaubt bewusst unverschlüsseltes HTTP im lokalen WLAN, weil der ESP32 keinen TLS-Endpunkt bereitstellt. Verwende eine lokale, vertrauenswürdige Netzwerkverbindung und veröffentliche den Sensor nicht direkt im Internet.
