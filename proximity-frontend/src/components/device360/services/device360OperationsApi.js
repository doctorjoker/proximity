const API_BASE = '/api/v1';

async function readJson(response, fallbackMessage) {
  if (!response.ok) {
    let detail = fallbackMessage;
    try {
      const payload = await response.json();
      detail = payload?.detail || payload?.message || detail;
    } catch (_) {
      // Keep fallback message when the response is not JSON.
    }
    throw new Error(detail);
  }
  return response.json();
}

export async function getDeviceOverview(deviceId, signal) {
  const response = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}/overview`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  const payload = await readJson(response, 'Impossibile caricare l’overview del dispositivo');
  return payload?.item || payload;
}

export async function getDeviceAcsIdentities(deviceId, signal) {
  const response = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}/acs-identities`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  return readJson(response, 'Impossibile caricare le identità ACS');
}

export async function getDeviceDiagnostics(deviceId, signal) {
  const response = await fetch(`/api/v1/devices/${deviceId}/diagnostics`, { signal });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  const payload = await response.json();
  return payload?.item ?? payload?.diagnostics ?? payload;
}
