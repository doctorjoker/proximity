export async function listDiagnosticServers(includeDisabled = false) {
  const response = await fetch(`/api/v1/diagnostic-servers?include_disabled=${includeDisabled ? "true" : "false"}`, { credentials: "same-origin" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || `HTTP ${response.status}`);
  return body?.items || [];
}

export async function validateDiagnosticServer(serverId, fileId = null) {
  const response = await fetch(`/api/v1/diagnostic-servers/${serverId}/validate`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, timeout_seconds: 10 }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || `HTTP ${response.status}`);
  return body?.validation;
}
