const BASE = '/api/v1/device-diagnostics';

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail;
    const message = detail?.message || detail || payload?.message || `HTTP ${response.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return payload;
}

export async function getDiagnosticsEngine(signal) {
  return parseResponse(await fetch(`${BASE}/engine`, { signal }));
}

export async function listDiagnosticJobs(deviceId, { limit = 20, signal } = {}) {
  const query = new URLSearchParams({ device_id: deviceId, limit: String(limit) });
  return parseResponse(await fetch(`${BASE}/jobs?${query.toString()}`, { signal }));
}

export async function getDiagnosticJob(jobId, signal) {
  return parseResponse(await fetch(`${BASE}/jobs/${jobId}`, { signal }));
}

export async function createDiagnosticJob({ deviceId, diagnosticType, parameters = {}, timeoutSeconds = 120 }) {
  return parseResponse(await fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id: deviceId,
      diagnostic_type: diagnosticType,
      parameters,
      timeout_seconds: timeoutSeconds,
      requested_by: 'Device360 Diagnostics Hub',
    }),
  }));
}

export async function cancelDiagnosticJob(jobId, reason = 'Annullata dall’operatore') {
  return parseResponse(await fetch(`${BASE}/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  }));
}
