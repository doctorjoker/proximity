async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function itemsFrom(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.devices)) return payload.devices;
  return [];
}

export async function loadControlCenter() {
  const requests = {
    health: fetchJson('/health'),
    executions: fetchJson('/api/v1/procedure-executions?limit=12'),
    procedures: fetchJson('/api/v1/procedures'),
    devices: fetchJson('/api/v1/devices'),
    firmwareJobs: fetchJson('/api/v1/firmware/jobs'),
  };

  const entries = Object.entries(requests);
  const settled = await Promise.allSettled(entries.map(([, promise]) => promise));
  const data = {};
  const errors = {};

  settled.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === 'fulfilled') data[key] = result.value;
    else errors[key] = result.reason?.message || 'Endpoint non disponibile';
  });

  return {
    health: data.health || null,
    executions: itemsFrom(data.executions),
    procedures: itemsFrom(data.procedures),
    devices: itemsFrom(data.devices),
    firmwareJobs: itemsFrom(data.firmwareJobs),
    errors,
  };
}
