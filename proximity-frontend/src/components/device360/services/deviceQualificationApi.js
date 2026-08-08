const API_BASE = '/api/v1';

async function requestJson(url, signal) {
  const response = await fetch(url, { signal });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || `HTTP ${response.status}`);
  }
  return payload;
}

export function getDeviceQualifications(deviceId, signal) {
  if (!deviceId) throw new Error('Device ID non disponibile');
  return requestJson(
    `${API_BASE}/cpe-capabilities/devices/${encodeURIComponent(deviceId)}/qualifications`,
    signal,
  );
}
