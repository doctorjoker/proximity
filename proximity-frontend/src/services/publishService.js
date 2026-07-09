const API = "/api/v1/procedures";

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.detail || payload.message || message;
    } catch (_) {
      const text = await response.text();
      message = text || message;
    }
    throw new Error(message);
  }

  return response.json();
}

function versionUrl(procedureCode, version) {
  return `${API}/${encodeURIComponent(procedureCode)}/versions/${encodeURIComponent(version)}`;
}

export async function validateProcedureVersion(procedureCode, version, payload = {}) {
  return request(`${versionUrl(procedureCode, version)}/validate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function publishProcedureVersion(procedureCode, version, payload = {}) {
  return request(`${versionUrl(procedureCode, version)}/publish`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cloneProcedureVersion(procedureCode, version, payload = {}) {
  return request(`${versionUrl(procedureCode, version)}/clone`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
