async function parse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail?.message || body?.detail || `HTTP ${response.status}`);
  return body;
}

export async function listTr143QualificationRuns(deviceId, limit = 20) {
  const response = await fetch(`/api/v1/tr143-qualification/runs?device_id=${encodeURIComponent(deviceId)}&limit=${limit}`, { credentials: "same-origin" });
  return (await parse(response)).items || [];
}

export async function getTr143QualificationRun(runId) {
  const response = await fetch(`/api/v1/tr143-qualification/runs/${runId}`, { credentials: "same-origin" });
  return (await parse(response)).run;
}

export async function startTr143Qualification(payload) {
  const response = await fetch('/api/v1/tr143-qualification/runs', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return (await parse(response)).run;
}
