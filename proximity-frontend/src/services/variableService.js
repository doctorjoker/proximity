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
      // Keep default message.
    }
    throw new Error(message);
  }

  return response.json();
}

function variablesUrl(procedureCode, version) {
  return `${API}/${encodeURIComponent(procedureCode)}/versions/${encodeURIComponent(version)}/variables`;
}

export async function listVariables(procedureCode, version) {
  return request(variablesUrl(procedureCode, version));
}

export async function createVariable(procedureCode, version, payload) {
  return request(variablesUrl(procedureCode, version), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateVariable(procedureCode, version, variableId, payload) {
  return request(`${variablesUrl(procedureCode, version)}/${variableId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteVariable(procedureCode, version, variableId) {
  return request(`${variablesUrl(procedureCode, version)}/${variableId}`, {
    method: "DELETE",
  });
}
