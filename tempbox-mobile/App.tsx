import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
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
  canvas: "#0C121C",
  surface: "#141E2B",
  surfaceRaised: "#1A2635",
  line: "#273445",
  ink: "#F4F7F9",
  muted: "#98A6B5",
  accent: "#65D6B7",
  accentSoft: "#1E3A37",
  warning: "#F2BC68",
  danger: "#EB7181",
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
    year: "2-digit",
  }).format(new Date(iso));
}

function Icon({
  source,
  size = 22,
  color = COLORS.muted,
}: {
  source: number;
  size?: number;
  color?: string;
}) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("live");
  const [data, setData] = useState<SensorData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<DeviceSettings>(defaultSettings);
  const [endpointDraft, setEndpointDraft] = useState(defaultSettings.endpoint);
  const [intervalDraft, setIntervalDraft] = useState(String(defaultSettings.refreshIntervalSec));
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const cached = useRef<SensorData | null>(null);
  const cachedTime = useRef<string | null>(null);
  const requestInFlight = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshData = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;

    try {
      const nextData = await fetchSensorData(settings.endpoint);
      const now = new Date().toISOString();
      cached.current = nextData;
      cachedTime.current = now;
      setData(nextData);
      setLastUpdated(now);
      setStatus("online");
      void appendHistory(nextData, now);
    } catch {
      if (cached.current) {
        setData(cached.current);
        setLastUpdated(cachedTime.current);
      }
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
        pollTimer.current = setTimeout(poll, settings.refreshIntervalSec * 1_000);
      }
    }

    void poll();
    return () => {
      active = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [refreshData, settings.refreshIntervalSec]);

  async function openHistory() {
    setHistory((await loadHistory()).reverse());
  }

  useEffect(() => {
    if (tab === "history") void openHistory();
  }, [tab]);

  async function saveCurrentSettings() {
    try {
      const endpoint = normalizeEndpoint(endpointDraft);
      const refreshIntervalSec = Number(intervalDraft);
      if (!Number.isInteger(refreshIntervalSec) || refreshIntervalSec < 2 || refreshIntervalSec > 60) {
        throw new Error("Das Aktualisierungsintervall muss zwischen 2 und 60 Sekunden liegen.");
      }

      const next = { endpoint, refreshIntervalSec };
      await saveSettings(next);
      setSettings(next);
      setSettingsError(null);
      cached.current = null;
      cachedTime.current = null;
      setStatus("connecting");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Die Einstellungen konnten nicht gespeichert werden.");
    }
  }

  async function removeHistory() {
    await clearHistory();
    setHistory([]);
  }

  const statusText =
    status === "online" ? "Verbunden" : status === "connecting" ? "Verbinde" : "Nicht erreichbar";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.app}>
        {tab === "live" ? (
          <ScrollView contentContainerStyle={styles.liveContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>TEMPBOX</Text>
                <Text style={styles.screenTitle}>Raumklima</Text>
              </View>
              <View style={[styles.statusPill, status === "offline" && styles.statusPillOffline]}>
                <View style={[styles.statusDot, status === "online" && styles.statusDotOnline]} />
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Icon source={require("./assets/icons/thermometer.png")} size={30} color={COLORS.accent} />
              </View>
              <Text style={styles.heroLabel}>TEMPERATUR</Text>
              <View style={styles.heroReading}>
                <Text style={styles.heroValue}>{formatNumber(data?.temp, 1)}</Text>
                <Text style={styles.heroUnit}>°C</Text>
              </View>
              <Text style={styles.heroMeta}>
                {lastUpdated ? `${status === "offline" ? "Letzte Messung" : "Aktualisiert"} · ${formatTime(lastUpdated)}` : "Warte auf Messung"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Messwerte aktualisieren"
                onPress={() => void refreshData()}
                style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
              >
                <Text style={styles.refreshLabel}>JETZT AKTUALISIEREN</Text>
              </Pressable>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricIcon}>
                  <Icon source={require("./assets/icons/humidity.png")} size={22} color="#7CB8FF" />
                </View>
                <Text style={styles.metricLabel}>LUFTFEUCHTE</Text>
                <Text style={styles.metricValue}>{formatNumber(data?.humidity, 0)}<Text style={styles.metricUnit}> %</Text></Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricIcon}>
                  <Icon source={require("./assets/icons/pressure.png")} size={22} color={COLORS.warning} />
                </View>
                <Text style={styles.metricLabel}>LUFTDRUCK</Text>
                <Text style={styles.metricValue}>{formatNumber(data?.pressure, 0)}<Text style={styles.metricUnit}> hPa</Text></Text>
              </View>
            </View>
          </ScrollView>
        ) : null}

        {tab === "history" ? (
          <View style={styles.tabContent}>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>MESSDATEN</Text>
                <Text style={styles.screenTitle}>Verlauf</Text>
              </View>
              {history.length ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Verlauf löschen"
                  onPress={() => void removeHistory()}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Icon source={require("./assets/icons/trash.png")} size={20} color={COLORS.danger} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={history}
              keyExtractor={(entry) => entry.id}
              contentContainerStyle={history.length ? styles.historyList : styles.historyEmpty}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Icon source={require("./assets/icons/history.png")} size={38} color={COLORS.muted} />
                  <Text style={styles.emptyTitle}>Noch keine Messwerte</Text>
                  <Text style={styles.emptyText}>Neue Messungen erscheinen hier automatisch.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyTemp}>{formatNumber(item.temp, 1)}°C</Text>
                    <Text style={styles.historySub}>{formatNumber(item.humidity, 0)}% · {formatNumber(item.pressure, 0)} hPa</Text>
                  </View>
                  <View style={styles.historyTimeBlock}>
                    <Text style={styles.historyTime}>{formatTime(item.recordedAt)}</Text>
                    <Text style={styles.historyDate}>{formatDate(item.recordedAt)}</Text>
                  </View>
                </View>
              )}
            />
          </View>
        ) : null}

        {tab === "settings" ? (
          <ScrollView contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>VERBINDUNG</Text>
                <Text style={styles.screenTitle}>Einstellungen</Text>
              </View>
              <View style={styles.headerIcon}>
                <Icon source={require("./assets/icons/settings.png")} size={24} color={COLORS.accent} />
              </View>
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.fieldLabel}>GERÄTEADRESSE</Text>
              <TextInput
                value={endpointDraft}
                onChangeText={setEndpointDraft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="http://192.168.178.100/"
                placeholderTextColor={COLORS.muted}
                style={styles.textInput}
                accessibilityLabel="ESP32 Geräteadresse"
              />

              <Text style={styles.fieldLabel}>AKTUALISIERUNG</Text>
              <View style={styles.intervalRow}>
                <TextInput
                  value={intervalDraft}
                  onChangeText={setIntervalDraft}
                  keyboardType="number-pad"
                  style={[styles.textInput, styles.intervalInput]}
                  accessibilityLabel="Aktualisierungsintervall"
                />
                <Text style={styles.intervalUnit}>Sekunden</Text>
              </View>

              {settingsError ? <Text style={styles.errorText}>{settingsError}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Einstellungen speichern"
                onPress={() => void saveCurrentSettings()}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              >
                <Text style={styles.saveLabel}>SPEICHERN</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}

        <View style={styles.bottomNav}>
          {([
            ["live", "Live", "thermometer"],
            ["history", "Verlauf", "history"],
            ["settings", "Einstellungen", "settings"],
          ] as const).map(([value, label, icon]) => {
            const active = tab === value;
            const source =
              icon === "thermometer"
                ? require("./assets/icons/thermometer.png")
                : icon === "history"
                  ? require("./assets/icons/history.png")
                  : require("./assets/icons/settings.png");
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
                onPress={() => setTab(value)}
                style={styles.navItem}
              >
                <Icon source={source} size={21} color={active ? COLORS.accent : COLORS.muted} />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.canvas },
  app: { flex: 1, backgroundColor: COLORS.canvas },
  liveContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  tabContent: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  eyebrow: { color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.8, marginBottom: 3 },
  screenTitle: { color: COLORS.ink, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.7 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2D4A43",
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillOffline: { borderColor: "#514138", backgroundColor: "#31251F" },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.danger },
  statusDotOnline: { backgroundColor: COLORS.accent },
  statusText: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  heroCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 18,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
    marginBottom: 12,
  },
  heroLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroReading: { flexDirection: "row", alignItems: "flex-start", marginTop: 5 },
  heroValue: { color: COLORS.ink, fontSize: 86, lineHeight: 92, fontWeight: "300", letterSpacing: -5 },
  heroUnit: { color: COLORS.accent, fontSize: 28, lineHeight: 36, fontWeight: "600", marginTop: 13, marginLeft: 5 },
  heroMeta: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontVariant: ["tabular-nums"] },
  refreshButton: {
    width: "100%",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#233C38",
    marginTop: 22,
    paddingVertical: 13,
  },
  refreshLabel: { color: COLORS.accent, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  metricGrid: { flexDirection: "row", gap: 12, marginTop: 12 },
  metricCard: {
    flex: 1,
    minHeight: 128,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    padding: 14,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceRaised,
  },
  metricLabel: { color: COLORS.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8, marginTop: 10 },
  metricValue: { color: COLORS.ink, fontSize: 24, fontWeight: "600", marginTop: 3, fontVariant: ["tabular-nums"] },
  metricUnit: { color: COLORS.muted, fontSize: 13, fontWeight: "500" },
  bottomNav: {
    height: Platform.select({ ios: 76, android: 68, default: 76 }),
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: "#101923",
    paddingHorizontal: 8,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  navLabelActive: { color: COLORS.accent },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
  },
  historyList: { paddingTop: 4, paddingBottom: 24 },
  historyEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptyText: { color: COLORS.muted, fontSize: 13, marginTop: 5, textAlign: "center" },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyTemp: { color: COLORS.ink, fontSize: 21, fontWeight: "600", fontVariant: ["tabular-nums"] },
  historySub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  historyTimeBlock: { alignItems: "flex-end" },
  historyTime: { color: COLORS.accent, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  historyDate: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  settingsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  fieldLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  textInput: {
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    backgroundColor: "#101923",
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 20,
  },
  intervalRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  intervalInput: { width: 92, marginBottom: 20, textAlign: "center" },
  intervalUnit: { color: COLORS.muted, fontSize: 13, marginBottom: 20 },
  errorText: { color: COLORS.danger, fontSize: 12, marginBottom: 12 },
  saveButton: {
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
  },
  saveLabel: { color: "#0C121C", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
