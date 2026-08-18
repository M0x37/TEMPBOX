import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { fetchSensorData, type SensorData } from "./src/api";
import { appendHistory, loadHistory, type HistoryEntry } from "./src/storage";

const DEFAULT_ENDPOINT = "http://192.168.178.100/";
const POLL_INTERVAL_MS = 5_000;

const COLORS = {
  canvas: "#010102",
  ink: "#F7F8F8",
  soft: "#C6CBD3",
  muted: "#8A8F98",
  dim: "#4C5057",
  border: "#34343A",
  surface: "#0F1011",
  online: "#27A644",
};

type ConnectionState = "connecting" | "online" | "offline";

function formatNumber(value: number | undefined, digits: number) {
  return typeof value === "number" ? value.toFixed(digits) : "--";
}

function formatTime(iso: string | null) {
  if (!iso) return "--:--:--";
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export default function App() {
  const [data, setData] = useState<SensorData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const cached = useRef<SensorData | null>(null);
  const cachedTime = useRef<string | null>(null);
  const requestInFlight = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshData = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;

    try {
      const nextData = await fetchSensorData(DEFAULT_ENDPOINT);
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
  }, []);

  useEffect(() => {
    let active = true;

    async function poll() {
      await refreshData();
      if (active) {
        pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();
    return () => {
      active = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [refreshData]);

  async function openHistory() {
    setHistory((await loadHistory()).reverse());
    setShowHistory(true);
  }

  if (showHistory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.historyScreen}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>VERLAUF</Text>
          </View>

          <FlatList
            data={history}
            keyExtractor={(entry) => entry.id}
            contentContainerStyle={history.length ? styles.historyList : styles.historyEmptyList}
            ListEmptyComponent={<Text style={styles.emptyText}>keine einträge</Text>}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <Text style={styles.historyTemperature}>{formatNumber(item.temp, 1)}°C</Text>
                <Text style={styles.historyTime}>{formatTime(item.recordedAt)}</Text>
              </View>
            )}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zurück zur Temperaturansicht"
            onPress={() => setShowHistory(false)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backButtonLabel}>← ZURÜCK</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const dimmed = status === "offline" || !data;
  const statusLabel =
    status === "online" ? "lokal" : status === "connecting" ? "verbinde …" : "nicht erreichbar";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.readingArea}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, status === "online" && styles.statusDotOnline]} />
            <Text style={styles.statusLabel}>{statusLabel}</Text>
          </View>

          <View style={styles.temperatureRow}>
            <Text style={[styles.temperature, dimmed && styles.dimmedTemperature]}>
              {formatNumber(data?.temp, 1)}
            </Text>
            <Text style={styles.temperatureUnit}>°C</Text>
          </View>

          <View style={styles.extras}>
            <View style={styles.extraItem}>
              <Text style={styles.extraLabel}>LUFTFEUCHTE</Text>
              <Text style={styles.extraValue}>{formatNumber(data?.humidity, 0)}%</Text>
            </View>
            <View style={styles.extraItem}>
              <Text style={styles.extraLabel}>LUFTDRUCK</Text>
              <Text style={styles.extraValue}>{formatNumber(data?.pressure, 0)} hPa</Text>
            </View>
          </View>

          {lastUpdated ? (
            <Text style={[styles.meta, dimmed && styles.metaDimmed]}>
              {status === "offline" ? "letzte messung " : "aktualisiert "}
              <Text style={styles.metaTime}>{formatTime(lastUpdated)}</Text>
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Temperaturverlauf öffnen"
          onPress={() => void openHistory()}
          style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}
        >
          <Text style={styles.historyButtonLabel}>VERLAUF</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.canvas },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: Platform.select({ ios: 28, android: 36, default: 28 }),
  },
  readingArea: { width: "100%", alignItems: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.dim },
  statusDotOnline: { backgroundColor: COLORS.online },
  statusLabel: { color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  temperatureRow: { flexDirection: "row", alignItems: "baseline" },
  temperature: { color: COLORS.ink, fontSize: 96, lineHeight: 102, fontWeight: "300", letterSpacing: -4.5 },
  dimmedTemperature: { color: COLORS.dim },
  temperatureUnit: { color: COLORS.muted, fontSize: 47, lineHeight: 54, fontWeight: "300", letterSpacing: -1.5, marginLeft: 3 },
  extras: { flexDirection: "row", gap: 32, marginTop: 24 },
  extraItem: { alignItems: "center" },
  extraLabel: { color: COLORS.dim, fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 5 },
  extraValue: { color: COLORS.soft, fontSize: 20, fontWeight: "300", fontVariant: ["tabular-nums"] },
  meta: { color: COLORS.dim, fontSize: 13, marginTop: 31, fontVariant: ["tabular-nums"] },
  metaDimmed: { color: "#3D4045" },
  metaTime: { color: COLORS.muted },
  historyButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 20, marginTop: 26 },
  historyButtonLabel: { color: "#A6ABB4", fontSize: 12, fontWeight: "600", letterSpacing: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  historyScreen: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },
  historyHeader: { alignItems: "center", marginBottom: 16 },
  backButton: { alignSelf: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
  backButtonLabel: { color: "#A6ABB4", fontSize: 11, fontWeight: "600", letterSpacing: 0.7 },
  historyTitle: { color: COLORS.muted, fontSize: 13, fontWeight: "600", letterSpacing: 1 },
  historyList: { paddingBottom: 22 },
  historyEmptyList: { flexGrow: 1, justifyContent: "center" },
  historyItem: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#1A1B1D", paddingVertical: 11 },
  historyTemperature: { color: COLORS.ink, fontSize: 18, fontWeight: "300" },
  historyTime: { color: COLORS.muted, fontSize: 14, fontVariant: ["tabular-nums"] },
  emptyText: { color: COLORS.dim, fontSize: 14, textAlign: "center" },
});
