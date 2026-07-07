const API = "/api/v1/service-workflows";

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
  return request(`${API}/definitions`);
}

export async function getProcedure(definitionCode) {
  const data = await listProcedures();

  return (data.items || []).find(
    (item) => item.definition_code === definitionCode,
  );
}

export async function listVersions(definitionCode) {
  return request(
    `${API}/definitions/${definitionCode}/versions`,
  );
}

export async function publishVersion(
  definitionCode,
  version,
) {
  return request(
    `${API}/definitions/${definitionCode}/versions/${version}/publish`,
    {
      method: "POST",
    },
  );
}

export async function cloneVersion(
  definitionCode,
  version,
) {
  return request(
    `${API}/definitions/${definitionCode}/versions/${version}/clone`,
    {
      method: "POST",
    },
  );
}

export async function validateVersion(
  definitionCode,
  version,
) {
  return request(
    `${API}/definitions/${definitionCode}/versions/${version}/validate`,
    {
      method: "POST",
    },
  );
}
