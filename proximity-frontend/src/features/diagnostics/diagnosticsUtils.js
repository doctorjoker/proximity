export const safeText = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object" && value._value !== undefined) return String(value._value);
  return String(value);
};

export const safeNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  const source = typeof value === "object" && value._value !== undefined ? value._value : value;
  const parsed = Number(source);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatDate = (value) => {
  if (!value) return "N/D";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDuration = (seconds) => {
  const total = safeNumber(seconds, null);
  if (total === null) return "N/D";
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}g ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const getDiagnosticTone = (diagnostics) => {
  const score = safeNumber(diagnostics?.health_score, null);
  if (score === null) return { label: "Non disponibile", tone: "neutral", color: "default", accent: "#64748b" };
  if (score >= 85) return { label: score >= 95 ? "Eccellente" : "Buono", tone: "success", color: "success", accent: "#16a34a" };
  if (score >= 65) return { label: "Attenzione", tone: "warning", color: "warning", accent: "#d97706" };
  return { label: "Critico", tone: "error", color: "error", accent: "#dc2626" };
};

export const getResourceTone = (value) => {
  const current = safeNumber(value, null);
  if (current === null) return { color: "#94a3b8", label: "N/D" };
  if (current >= 80) return { color: "#dc2626", label: "Critico" };
  if (current >= 65) return { color: "#d97706", label: "Elevato" };
  return { color: "#16a34a", label: "Normale" };
};

export const buildDeviceTimeline = (device) => {
  if (!device) return [];
  const events = Array.isArray(device.diagnostics_events) ? device.diagnostics_events : [];
  const base = device.last_seen
    ? [{ id: `inform-${device.id}`, type: "inform", title: "Inform ACS ricevuto", detail: "Ultimo contatto registrato dal CPE", timestamp: device.last_seen }]
    : [];
  return [...events, ...base]
    .filter((event) => event?.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);
};

export const isOperationalDevice = (device) => {
  const manufacturer = safeText(device?.manufacturer, "").toUpperCase();
  const model = safeText(device?.model, "").toUpperCase();
  return manufacturer !== "DISCOVERYSERVICE" && model !== "DISCOVERYSERVICE";
};

export const loadWithConcurrency = async (items, worker, concurrency = 5) => {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { ...items[index], diagnostics: null, diagnostics_error: error?.message || "Errore diagnostica" };
      }
    }
  });
  await Promise.all(runners);
  return results;
};
