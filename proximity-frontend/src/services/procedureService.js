const API = "/api/v1/procedures";

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

export async function listProcedures() {
  return request(API);
}

export async function getProcedure(procedureCode) {
  return request(`${API}/${procedureCode}`);
}

export async function listVersions(procedureCode) {
  return request(`${API}/${procedureCode}/versions`);
}

export async function getVersion(procedureCode, version) {
  return request(`${API}/${procedureCode}/versions/${version}`);
}

export async function publishVersion(procedureCode, version) {
  return request(`${API}/${procedureCode}/versions/${version}/publish`, {
    method: "POST",
  });
}

export async function cloneVersion(procedureCode, version) {
  return request(`${API}/${procedureCode}/versions/${version}/clone`, {
    method: "POST",
  });
}

export async function validateVersion(procedureCode, version) {
  return request(`${API}/${procedureCode}/versions/${version}/validate`, {
    method: "POST",
  });
}
