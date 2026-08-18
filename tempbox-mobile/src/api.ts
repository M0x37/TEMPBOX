export type SensorData = {
  temp: number;
  humidity: number;
  pressure: number;
};

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 2;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("Bitte gib die Adresse deines ESP32 ein.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  const url = new URL(withProtocol);

  if (!url.hostname) {
    throw new Error("Die Geräteadresse ist ungültig.");
  }

  return `${url.protocol}//${url.host}${url.pathname || "/"}`;
}

async function requestSensorData(endpoint: string): Promise<SensorData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Der ESP32 antwortet mit HTTP ${response.status}.`);
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") {
      throw new Error("Der ESP32 hat kein gültiges JSON gesendet.");
    }

    const { temp, humidity, pressure } = payload as Record<string, unknown>;
    if (!isFiniteNumber(temp) || !isFiniteNumber(humidity) || !isFiniteNumber(pressure)) {
      throw new Error("Die Sensordaten sind unvollständig.");
    }

    return { temp, humidity, pressure };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Die Verbindung zum ESP32 hat zu lange gedauert.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSensorData(endpoint: string): Promise<SensorData> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await requestSensorData(endpoint);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Die Verbindung zum ESP32 ist fehlgeschlagen.");
}
