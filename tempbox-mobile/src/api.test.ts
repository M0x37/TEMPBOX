import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchSensorData, normalizeEndpoint } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeEndpoint", () => {
  it("adds HTTP and a root path to a local ESP32 address", () => {
    expect(normalizeEndpoint("192.168.178.100")).toBe("http://192.168.178.100/");
  });

  it("preserves an explicit protocol and path", () => {
    expect(normalizeEndpoint("https://sensor.example/health")).toBe(
      "https://sensor.example/health",
    );
  });
});

describe("fetchSensorData", () => {
  it("accepts the documented ESP32 sensor response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ temp: 23.5, humidity: 45.2, pressure: 1013.2 }),
      }),
    );

    await expect(fetchSensorData("http://192.168.178.100/")).resolves.toEqual({
      temp: 23.5,
      humidity: 45.2,
      pressure: 1013.2,
    });
  });

  it("rejects incomplete device payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ temp: 23.5, humidity: "unknown", pressure: 1013.2 }),
      }),
    );

    await expect(fetchSensorData("http://192.168.178.100/")).rejects.toThrow(
      "Die Sensordaten sind unvollständig.",
    );
  });
});
