# TEMPBOX Expo – Mobile Design

## Designziel

TEMPBOX wird als fokussierte iOS- und Android-kompatible Temperaturstation in **9:16-Hochformat** gestaltet. Die Oberfläche übersetzt den bereitgestellten Linear-Guide in eine mobile Produktoberfläche: ein nahezu schwarzer Grund, präzise Haarlinien, helle Typografie und ein gezielt eingesetzter Lavendel-Akzent. Das Layout ist für die einhändige Nutzung ausgelegt; häufige Aktionen liegen im unteren Bereich oder in der Tab-Leiste.

## Screen List

| Bildschirm | Primäre Inhalte | Funktionalität |
|---|---|---|
| Übersicht | Live-Temperatur, Luftfeuchte, Luftdruck, Verbindungsstatus und Zeitpunkt der letzten Messung | Aktualisieren, zum Verlauf oder zur Geräteeinstellung navigieren |
| Verlauf | Gespeicherte Temperaturmessungen mit Zeitstempel | Historische Werte prüfen und bei Bedarf löschen |
| Gerät | ESP32-Adresse, voreingestellte lokale Adresse und Verbindungsprüfung | Adresse ändern, speichern und Verbindung testen |
| Einstellungen | Aktualisierungsintervall und lokale App-Daten | Aktualisierung anpassen und Verlauf zurücksetzen |

## Kernflüsse

| Aufgabe | Ablauf |
|---|---|
| Live-Werte prüfen | App öffnen → gespeicherte ESP32-Adresse laden → HTTP-Abfrage starten → Status und Sensorwerte anzeigen → alle fünf Sekunden aktualisieren |
| Andere ESP32-Adresse nutzen | Tab „Gerät“ → Adresse eingeben → „Speichern & testen“ → Adresse lokal sichern → Daten sofort neu laden |
| Verlauf ansehen | Tab „Verlauf“ → lokale Einträge in absteigender Reihenfolge anzeigen → optional Verlauf leeren |
| Verbindungsfehler behandeln | Anfrage läuft ab oder schlägt fehl → letzte bekannte Messwerte gedimmt anzeigen → klare Offline-Kennzeichnung und erneute Aktualisierung ermöglichen |

## Visuelles System

Die App nutzt die bereitgestellten Linear-Token in mobil optimierter Form. `#010102` bildet den Canvas, `#0f1011` bis `#18191a` strukturieren Karten und Eingabefelder, und `#23252a` zeichnet Haarlinien. Primärer Text ist `#f7f8f8`; sekundäre Informationen verwenden `#d0d6e0` oder `#8a8f98`. Der Akzent `#5e6ad2` ist ausschließlich für die aktive Navigation, den Refresh und den primären Speichern-Button vorgesehen. Erfolgreiche Verbindung zeigt sich mit `#27a644`.

Das Schriftbild verwendet die Plattform-Systemschrift mit enger Laufweite für große Temperaturwerte und normale Laufweite für Lesetext. Karten erhalten 12 Pixel Radius und 1 Pixel Haarlinie statt starker Schatten. Interaktionen verwenden dezente Transparenz- und Skalierungsrückmeldung; die wichtigsten Aktionen erzeugen auf unterstützten Geräten ein leichtes haptisches Feedback.

## Bedienung und Zugänglichkeit

Alle berührbaren Ziele sind großzügig bemessen und beschriftet. Status wird neben der Farbe immer als Text ausgegeben. Zahlen werden mit tabellarischen Ziffern formatiert, damit Aktualisierungen nicht springen. Die Gestaltung berücksichtigt Safe Areas, die Android-Systemnavigation und ausreichenden Kontrast für dunkle Oberflächen.
