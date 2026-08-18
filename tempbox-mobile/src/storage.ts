import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SensorData } from "./api";

const SETTINGS_KEY = "tempbox.settings.v1";
const HISTORY_KEY = "tempbox.history.v1";
const MAX_HISTORY_ENTRIES = 200;

export type DeviceSettings = {
  endpoint: string;
  refreshIntervalSec: number;
};

export type HistoryEntry = SensorData & {
  id: string;
  recordedAt: string;
};

export const defaultSettings: DeviceSettings = {
  endpoint: "http://192.168.178.100/",
  refreshIntervalSec: 5,
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadSettings(): Promise<DeviceSettings> {
  const saved = parseJson<Partial<DeviceSettings>>(
    await AsyncStorage.getItem(SETTINGS_KEY),
    {},
  );

  return {
    endpoint:
      typeof saved.endpoint === "string" && saved.endpoint.trim()
        ? saved.endpoint
        : defaultSettings.endpoint,
    refreshIntervalSec:
      typeof saved.refreshIntervalSec === "number" &&
      saved.refreshIntervalSec >= 2 &&
      saved.refreshIntervalSec <= 60
        ? saved.refreshIntervalSec
        : defaultSettings.refreshIntervalSec,
  };
}

export async function saveSettings(settings: DeviceSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const saved = parseJson<HistoryEntry[]>(await AsyncStorage.getItem(HISTORY_KEY), []);
  return Array.isArray(saved) ? saved : [];
}

export async function appendHistory(
  data: SensorData,
  recordedAt: string,
): Promise<HistoryEntry[]> {
  const history = await loadHistory();
  const entry: HistoryEntry = {
    ...data,
    recordedAt,
    id: `${recordedAt}-${Math.random().toString(16).slice(2)}`,
  };
  const next = [...history, entry].slice(-MAX_HISTORY_ENTRIES);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
