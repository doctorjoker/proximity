const API = "/api/v1/procedure-executions";

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
    } catch {
      const text = await response.text();
      message = text || message;
    }
    throw new Error(message);
  }

  return response.json();
}

export async function listExecutions({ limit = 100 } = {}) {
  return request(`${API}?limit=${encodeURIComponent(limit)}`);
}

export async function getExecution(executionCode) {
  return request(`${API}/${encodeURIComponent(executionCode)}`);
}

export async function getExecutionTimeline(executionCode) {
  return request(`${API}/${encodeURIComponent(executionCode)}/timeline`);
}

export async function getExecutionEvents(executionCode) {
  return request(`${API}/${encodeURIComponent(executionCode)}/events`);
}

export async function getExecutionSteps(executionCode) {
  return request(`${API}/${encodeURIComponent(executionCode)}/steps`);
}
