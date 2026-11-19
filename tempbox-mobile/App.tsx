import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { fetchSensorData, normalizeEndpoint, type SensorData } from "./src/api";
import {
  appendHistory,
  clearHistory,
  defaultSettings,
  loadHistory,
  loadSettings,
  saveSettings,
  type DeviceSettings,
  type HistoryEntry,
} from "./src/storage";

const COLORS = {
  background: "#0A0A0A",
  foreground: "#F5F5F5",
};

type Tab = "live" | "history" | "settings";
type ConnectionState = "connecting" | "online" | "offline";

function formatNumber(value: number | undefined, digits: number) {
  return typeof value === "number" ? value.toFixed(digits) : "--";
}

function formatTime(iso: string | null) {
  if (!iso) return "--:--";
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

export default function App() {
  const [tab, setTab] = useState<Tab>("live");
  const [data, setData] = useState<SensorData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<DeviceSettings>(defaultSettings);
  const [endpointDraft, setEndpointDraft] = useState(defaultSettings.endpoint);
  const [intervalDraft, setIntervalDraft] = useState(
    String(defaultSettings.refreshIntervalSec),
  );
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const requestInFlight = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshData = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;

    try {
      const nextData = await fetchSensorData(settings.endpoint);
      const now = new Date().toISOString();
      setData(nextData);
      setLastUpdated(now);
      setStatus("online");
      void appendHistory(nextData, now);
    } catch {
      setStatus("offline");
    } finally {
      requestInFlight.current = false;
    }
  }, [settings.endpoint]);

  useEffect(() => {
    void loadSettings().then((saved) => {
      setSettings(saved);
      setEndpointDraft(saved.endpoint);
      setIntervalDraft(String(saved.refreshIntervalSec));
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function poll() {
      await refreshData();
      if (active) {
        pollTimer.current = setTimeout(
          poll,
          settings.refreshIntervalSec * 1_000,
        );
      }
    }

    void poll();
    return () => {
      active = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [refreshData, settings.refreshIntervalSec]);

  useEffect(() => {
    if (tab === "history") {
      void loadHistory().then((entries) => setHistory(entries.reverse()));
    }
  }, [tab]);

  async function saveCurrentSettings() {
    setSettingsSaved(false);
    try {
      const endpoint = normalizeEndpoint(endpointDraft);
      const refreshIntervalSec = Number(intervalDraft);
      if (
        !Number.isInteger(refreshIntervalSec) ||
        refreshIntervalSec < 2 ||
        refreshIntervalSec > 60
      ) {
        throw new Error(
          "Das Intervall muss zwischen 2 und 60 Sekunden liegen.",
        );
      }

      const next = { endpoint, refreshIntervalSec };
      await saveSettings(next);
      setSettings(next);
      setSettingsError(null);
      setStatus("connecting");
      setSettingsSaved(true);
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Die Einstellungen konnten nicht gespeichert werden.",
      );
    }
  }

  async function removeHistory() {
    await clearHistory();
    setHistory([]);
  }

  const statusText =
    status === "online"
      ? "Verbunden"
      : status === "connecting"
        ? "Verbinde"
        : "Nicht erreichbar";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.app}>
        {tab === "live" ? (
          <ScrollView
            contentContainerStyle={styles.screen}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>TEMPBOX</Text>
              <Text
                accessibilityLiveRegion="polite"
                style={styles.status}
              >
                {statusText}
              </Text>
            </View>

            <View style={styles.reading}>
              <Text style={styles.readingLabel}>Temperatur</Text>
              <View style={styles.temperatureRow}>
                <Text style={styles.temperature}>
                  {formatNumber(data?.temp, 1)}
                </Text>
                <Text style={styles.unit}>°C</Text>
              </View>
              <Text style={styles.updated}>
                {lastUpdated
                  ? `${status === "offline" ? "Letzte Messung" : "Aktualisiert"} ${formatTime(lastUpdated)}`
                  : "Warte auf Messung"}
              </Text>
            </View>

            {status === "offline" ? (
              <View style={styles.errorMessage}>
                <Text style={styles.errorTitle}>Gerät nicht erreichbar</Text>
                <Text style={styles.errorText}>
                  Prüfe Adresse und WLAN-Verbindung.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Verbindung erneut prüfen"
                  onPress={() => void refreshData()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Erneut prüfen</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.measurements}>
              <View style={styles.measurement}>
                <Text style={styles.measurementLabel}>Luftfeuchte</Text>
                <Text style={styles.measurementValue}>
                  {formatNumber(data?.humidity, 0)}%
                </Text>
              </View>
              <View style={[styles.measurement, styles.measurementLast]}>
                <Text style={styles.measurementLabel}>Luftdruck</Text>
                <Text style={styles.measurementValue}>
                  {formatNumber(data?.pressure, 0)} hPa
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Messwerte aktualisieren"
              onPress={() => void refreshData()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Aktualisieren</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {tab === "history" ? (
          <View style={styles.screen}>
            <View style={styles.header}>
              <Text style={styles.title}>Verlauf</Text>
              {history.length ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Verlauf löschen"
                  onPress={() => void removeHistory()}
                  style={({ pressed }) => [
                    styles.textButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.textButtonText}>Löschen</Text>
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={history}
              keyExtractor={(entry) => entry.id}
              contentContainerStyle={
                history.length ? styles.historyList : styles.historyEmpty
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Noch keine Messwerte</Text>
                  <Text style={styles.emptyText}>
                    Öffne die Live-Ansicht und aktualisiere die Messung.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTab("live")}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Zur Live-Ansicht
                    </Text>
                  </Pressable>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyTemperature}>
                      {formatNumber(item.temp, 1)}°C
                    </Text>
                    <Text style={styles.historyDetails}>
                      {formatNumber(item.humidity, 0)}% ·{" "}
                      {formatNumber(item.pressure, 0)} hPa
                    </Text>
                  </View>
                  <View style={styles.historyTimeBlock}>
                    <Text style={styles.historyTime}>
                      {formatTime(item.recordedAt)}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(item.recordedAt)}
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>
        ) : null}

        {tab === "settings" ? (
          <ScrollView
            contentContainerStyle={styles.screen}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Einstellungen</Text>
            </View>

            <View style={styles.form}>
              <Text nativeID="endpoint-label" style={styles.fieldLabel}>
                Geräteadresse
              </Text>
              <TextInput
                value={endpointDraft}
                onChangeText={(value) => {
                  setEndpointDraft(value);
                  setSettingsSaved(false);
                }}
                accessibilityLabel="Geräteadresse"
                accessibilityLabelledBy="endpoint-label"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="http://192.168.178.100/"
                placeholderTextColor="#F5F5F5"
                style={styles.textInput}
              />

              <Text nativeID="interval-label" style={styles.fieldLabel}>
                Aktualisierung in Sekunden
              </Text>
              <TextInput
                value={intervalDraft}
                onChangeText={(value) => {
                  setIntervalDraft(value);
                  setSettingsSaved(false);
                }}
                accessibilityLabel="Aktualisierungsintervall"
                accessibilityLabelledBy="interval-label"
                keyboardType="number-pad"
                style={styles.textInput}
              />

              {settingsError ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {settingsError}
                </Text>
              ) : null}
              {settingsSaved ? (
                <Text accessibilityLiveRegion="polite" style={styles.savedText}>
                  Gespeichert
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Einstellungen speichern"
                onPress={() => void saveCurrentSettings()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Speichern</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}

        <View style={styles.bottomNav}>
          {([
            ["live", "Live"],
            ["history", "Verlauf"],
            ["settings", "Einstellungen"],
          ] as const).map(([value, label]) => {
            const active = tab === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
                onPress={() => setTab(value)}
                style={[styles.navItem, active && styles.navItemActive]}
              >
                <Text
                  style={[
                    styles.navLabel,
                    active && styles.navLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  app: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F533",
    paddingBottom: 12,
  },
  title: {
    color: COLORS.foreground,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  status: {
    color: COLORS.foreground,
    fontSize: 13,
  },
  reading: {
    alignItems: "center",
    paddingVertical: 48,
  },
  readingLabel: {
    color: COLORS.foreground,
    fontSize: 13,
    opacity: 0.65,
  },
  temperatureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  temperature: {
    color: COLORS.foreground,
    fontSize: 104,
    lineHeight: 112,
    fontWeight: "300",
    letterSpacing: -6,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    color: COLORS.foreground,
    fontSize: 32,
    lineHeight: 42,
    marginTop: 18,
  },
  updated: {
    color: COLORS.foreground,
    fontSize: 13,
    opacity: 0.65,
  },
  measurements: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F5F5F533",
  },
  measurement: {
    minHeight: 76,
    justifyContent: "center",
  },
  measurementLast: {
    borderTopWidth: 1,
    borderTopColor: "#F5F5F533",
  },
  measurementLabel: {
    color: COLORS.foreground,
    fontSize: 12,
    opacity: 0.65,
  },
  measurementValue: {
    color: COLORS.foreground,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "500",
    marginTop: 2,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: 6,
    marginTop: 20,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.foreground,
    borderRadius: 6,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: COLORS.foreground,
    fontSize: 15,
    fontWeight: "700",
  },
  textButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  textButtonText: {
    color: COLORS.foreground,
    fontSize: 13,
  },
  errorMessage: {
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F533",
    paddingBottom: 20,
  },
  errorTitle: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: COLORS.foreground,
    fontSize: 13,
    opacity: 0.65,
  },
  historyList: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  historyEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: COLORS.foreground,
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.65,
    textAlign: "center",
    marginTop: 6,
  },
  historyRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F533",
  },
  historyTemperature: {
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: "600",
  },
  historyDetails: {
    color: COLORS.foreground,
    fontSize: 12,
    opacity: 0.65,
    marginTop: 3,
  },
  historyTimeBlock: {
    alignItems: "flex-end",
  },
  historyTime: {
    color: COLORS.foreground,
    fontSize: 13,
  },
  historyDate: {
    color: COLORS.foreground,
    fontSize: 12,
    opacity: 0.65,
    marginTop: 3,
  },
  form: {
    paddingTop: 28,
  },
  fieldLabel: {
    color: COLORS.foreground,
    fontSize: 13,
    marginBottom: 8,
  },
  textInput: {
    width: "100%",
    minHeight: 48,
    color: COLORS.foreground,
    borderWidth: 1,
    borderColor: "#F5F5F5",
    borderRadius: 6,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  savedText: {
    color: COLORS.foreground,
    fontSize: 13,
  },
  bottomNav: {
    height: Platform.select({ ios: 76, android: 68, default: 76 }),
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F533",
  },
  navItem: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: COLORS.foreground,
  },
  navLabel: {
    color: COLORS.foreground,
    fontSize: 12,
    opacity: 0.65,
  },
  navLabelActive: {
    opacity: 1,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
  },
});
