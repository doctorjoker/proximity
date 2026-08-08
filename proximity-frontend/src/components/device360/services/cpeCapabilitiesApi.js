const API_BASE = '/api/v1/cpe-capabilities';

async function requestJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload?.detail || payload?.message || detail;
    } catch (_) {
      // Keep the HTTP status when the response is not JSON.
    }
    throw new Error(detail);
  }
  return response.json();
}

export function getDeviceCapabilities(deviceId, signal) {
  if (!deviceId) return Promise.reject(new Error('Device ID mancante'));
  return requestJson(`${API_BASE}/devices/${encodeURIComponent(deviceId)}`, signal);
}

export function getCapabilityEngine(signal) {
  return requestJson(`${API_BASE}/engine`, signal);
}
