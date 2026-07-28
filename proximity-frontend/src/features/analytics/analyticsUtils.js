export const safeText = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object" && value._value !== undefined) return String(value._value);
  return String(value);
};

export const safeNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object" && value._value !== undefined) value = value._value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const isOperationalDevice = (device) => {
  const manufacturer = safeText(device?.manufacturer, "").toUpperCase();
  const model = safeText(device?.model, "").toUpperCase();
  return manufacturer !== "DISCOVERYSERVICE" && model !== "DISCOVERYSERVICE" && manufacturer !== "PROBE";
};

export const formatPercent = (value) => value === null || value === undefined ? "—" : `${Math.round(value)}%`;

export const groupCount = (items, selector, fallback = "N/D") => {
  const map = new Map();
  items.forEach((item) => {
    const key = safeText(selector(item), fallback);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

export const loadWithConcurrency = async (items, loader, concurrency = 5) => {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = await loader(items[index], index); }
      catch (error) { results[index] = { ...items[index], diagnostics: null, diagnostics_error: error.message }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, worker));
  return results;
};

export const healthBucket = (score) => {
  const value = safeNumber(score, null);
  if (value === null) return "Unavailable";
  if (value >= 85) return "Excellent";
  if (value >= 65) return "Warning";
  return "Critical";
};
