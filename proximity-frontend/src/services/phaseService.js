const API = "/api/v1/procedures";

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload.detail || payload.message || detail;
    } catch (_) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

function phasesUrl(procedureCode, version) {
  return `${API}/${encodeURIComponent(procedureCode)}/versions/${encodeURIComponent(version)}/phases`;
}

export async function listPhases(procedureCode, version) {
  return request(phasesUrl(procedureCode, version));
}

export async function createPhase(procedureCode, version, payload) {
  return request(phasesUrl(procedureCode, version), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePhase(procedureCode, version, phaseId, payload) {
  return request(`${phasesUrl(procedureCode, version)}/${phaseId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePhase(procedureCode, version, phaseId) {
  return request(`${phasesUrl(procedureCode, version)}/${phaseId}`, {
    method: "DELETE",
  });
}
