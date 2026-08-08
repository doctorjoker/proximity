async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || `HTTP ${response.status}`);
  return body;
}

export async function getQualificationDashboard(deviceId) {
  const response = await fetch(
    `/api/v1/tr143-qualification/devices/${encodeURIComponent(deviceId)}/dashboard`,
    { credentials: "same-origin" },
  );
  return parseResponse(response);
}

export async function getQualificationHistory(deviceId, limit = 20) {
  const response = await fetch(
    `/api/v1/tr143-qualification/devices/${encodeURIComponent(deviceId)}/history?limit=${limit}`,
    { credentials: "same-origin" },
  );
  const body = await parseResponse(response);
  return body?.items || [];
}

export async function getQualificationReport(runId) {
  const response = await fetch(
    `/api/v1/tr143-qualification/runs/${encodeURIComponent(runId)}/report`,
    { credentials: "same-origin" },
  );
  const body = await parseResponse(response);
  return body?.report || null;
}

export async function evaluateQualificationRun(runId) {
  const response = await fetch(
    `/api/v1/tr143-qualification/runs/${encodeURIComponent(runId)}/evaluate`,
    { method: "POST", credentials: "same-origin" },
  );
  return parseResponse(response);
}

export async function rerunQualification(latest) {
  const parameters = latest?.parameters || {};
  const response = await fetch(`/api/v1/tr143-qualification/runs`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_id: latest?.device_id,
      server_ids: parameters.server_ids || [],
      file_ids: parameters.file_ids || [],
      repetitions: parameters.repetitions || 1,
      include_ping: parameters.include_ping !== false,
      ping_target: parameters.ping_target || "8.8.8.8",
      requested_by: "Device360",
    }),
  });
  return parseResponse(response);
}

export async function getQualificationRun(runId) {
  const response = await fetch(
    `/api/v1/tr143-qualification/runs/${encodeURIComponent(runId)}`,
    { credentials: "same-origin" },
  );
  const body = await parseResponse(response);
  return body?.run || null;
}

export async function cancelQualificationRun(runId) {
  const response = await fetch(
    `/api/v1/tr143-qualification/runs/${encodeURIComponent(runId)}/cancel`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: false }),
    },
  );
  return parseResponse(response);
}
