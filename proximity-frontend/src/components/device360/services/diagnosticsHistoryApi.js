const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function fetchDiagnosticsHistory(acsDeviceId, options = {}) {
  if (!acsDeviceId) return { count: 0, items: [] };

  const params = new URLSearchParams();
  if (options.type) params.set('diagnostic_type', options.type);
  if (options.limit) params.set('limit', String(options.limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(
    `${API_BASE}/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/history${suffix}`,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `History HTTP ${response.status}`);
  }

  return response.json();
}
