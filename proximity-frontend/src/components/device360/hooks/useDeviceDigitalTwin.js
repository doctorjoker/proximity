import { useCallback, useEffect, useState } from "react";

export default function useDeviceDigitalTwin(deviceId) {
  const [digitalTwin, setDigitalTwin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!deviceId) {
      setDigitalTwin(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/v1/cpe-profiles/devices/${encodeURIComponent(deviceId)}/digital-twin`,
        { credentials: "same-origin" },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.detail || `HTTP ${response.status}`);
      setDigitalTwin(body);
    } catch (exc) {
      setError(exc?.message || "Impossibile caricare il Digital Twin");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  return { digitalTwin, loading, error, reload: load };
}
