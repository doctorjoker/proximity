import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const Device360SharedStateContext = createContext(null);

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
};

const resolveDeviceId = (device, overview) => firstValue(
  device?.id,
  device?.device_id,
  device?.uuid,
  overview?.id,
  overview?.device_id,
);

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal, credentials: "same-origin" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : body?.detail?.message;
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return body;
}

export function Device360SharedStateProvider({
  device,
  overview,
  diagnostics,
  wifi,
  wifiQuality,
  clients,
  capabilities,
  qualification,
  activeSection,
  children,
}) {
  const deviceId = resolveDeviceId(device, overview);
  const [qualificationPayload, setQualificationPayload] = useState(qualification || null);
  const [qualificationLoading, setQualificationLoading] = useState(false);
  const [qualificationError, setQualificationError] = useState("");

  useEffect(() => {
    if (qualification) setQualificationPayload(qualification);
  }, [qualification]);

  const refreshQualification = useCallback(async () => {
    if (!deviceId) return;
    const controller = new AbortController();
    setQualificationLoading(true);
    setQualificationError("");
    try {
      const body = await fetchJson(
        `/api/v1/cpe-capabilities/devices/${encodeURIComponent(deviceId)}/qualifications`,
        controller.signal,
      );
      setQualificationPayload(body);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setQualificationError(error?.message || "Qualificazione non disponibile");
      }
    } finally {
      setQualificationLoading(false);
    }
    return () => controller.abort();
  }, [deviceId]);

  useEffect(() => {
    if (!qualification && deviceId) refreshQualification();
  }, [deviceId, qualification, refreshQualification]);

  useEffect(() => {
    const handler = (event) => {
      const targetId = event?.detail?.deviceId;
      const scope = event?.detail?.scope;
      if (targetId && String(targetId) !== String(deviceId)) return;
      if (!scope || scope === "all" || scope === "qualification") refreshQualification();
    };
    window.addEventListener("device360:refresh", handler);
    return () => window.removeEventListener("device360:refresh", handler);
  }, [deviceId, refreshQualification]);

  const value = useMemo(() => ({
    deviceId,
    device: device || {},
    overview: overview || {},
    diagnostics: diagnostics || {},
    wifi: wifi || {},
    wifiQuality: wifiQuality || {},
    clients: Array.isArray(clients) ? clients : [],
    capabilities: capabilities || {},
    qualification: qualificationPayload || {},
    qualificationLoading,
    qualificationError,
    refreshQualification,
    activeSection,
  }), [
    activeSection,
    capabilities,
    clients,
    device,
    deviceId,
    diagnostics,
    overview,
    qualificationError,
    qualificationLoading,
    qualificationPayload,
    refreshQualification,
    wifi,
    wifiQuality,
  ]);

  return (
    <Device360SharedStateContext.Provider value={value}>
      {children}
    </Device360SharedStateContext.Provider>
  );
}

export function useDevice360SharedState() {
  const value = useContext(Device360SharedStateContext);
  if (!value) {
    throw new Error("useDevice360SharedState deve essere usato dentro Device360SharedStateProvider");
  }
  return value;
}
