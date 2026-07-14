const API_BASE = "/api/v1";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { detail: await response.text() };

  if (!response.ok) {
    throw new Error(payload?.detail || `HTTP ${response.status}`);
  }
  return payload;
}

export function listExecutions({ limit = 200 } = {}) {
  return requestJson(`/procedure-executions?limit=${encodeURIComponent(limit)}`);
}

export function getExecution(executionCode) {
  return requestJson(`/procedure-executions/${encodeURIComponent(executionCode)}`);
}

export function getExecutionTimeline(executionCode) {
  return requestJson(`/procedure-executions/${encodeURIComponent(executionCode)}/timeline`);
}

export function getExecutionPhases(executionCode) {
  return requestJson(`/procedure-executions/${encodeURIComponent(executionCode)}/phases`);
}

export function getExecutionEvents(executionCode) {
  return requestJson(`/procedure-executions/${encodeURIComponent(executionCode)}/events`);
}

export const getExecutionSteps = getExecutionPhases;
