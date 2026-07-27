const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function unwrap(payload) {
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'item')) return payload.item
  return payload
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload
  return payload?.items || payload?.results || []
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const payload = await response.json()
      const apiDetail = payload?.detail
      detail = apiDetail?.message || apiDetail || payload?.message || JSON.stringify(payload)
    } catch {
      const text = await response.text()
      if (text) detail = text
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  if (response.status === 204) return null
  return response.json()
}

export const provisioningProfilesApi = {
  getProfiles: async () => unwrapList(await request('/api/v1/provisioning-profiles')),
  getProfile: async (profileCode) => unwrap(await request(`/api/v1/provisioning-profiles/${encodeURIComponent(profileCode)}`)),
  createProfile: async (payload) => unwrap(await request('/api/v1/provisioning-profiles', {
    method: 'POST', body: JSON.stringify(payload),
  })),
  updateProfile: async (profileCode, payload) => unwrap(await request(`/api/v1/provisioning-profiles/${encodeURIComponent(profileCode)}`, {
    method: 'PATCH', body: JSON.stringify(payload),
  })),
  deleteProfile: (profileCode) => request(`/api/v1/provisioning-profiles/${encodeURIComponent(profileCode)}`, { method: 'DELETE' }),
  getVersions: async (profileCode) => unwrapList(await request(`/api/v1/provisioning-profiles/${encodeURIComponent(profileCode)}/versions`)),
  createVersion: async (profileCode, payload) => unwrap(await request(`/api/v1/provisioning-profiles/${encodeURIComponent(profileCode)}/versions`, {
    method: 'POST', body: JSON.stringify(payload),
  })),
  getVersion: async (versionId) => unwrap(await request(`/api/v1/provisioning-profile-versions/${encodeURIComponent(versionId)}`)),
  publishVersion: async (versionId, payload = {}) => unwrap(await request(`/api/v1/provisioning-profile-versions/${encodeURIComponent(versionId)}/publish`, {
    method: 'POST', body: JSON.stringify({ make_current: true, ...payload }),
  })),
  deprecateVersion: async (versionId, payload = {}) => unwrap(await request(`/api/v1/provisioning-profile-versions/${encodeURIComponent(versionId)}/deprecate`, {
    method: 'POST', body: JSON.stringify(payload),
  })),
  getConfigurationTypes: async () => unwrapList(await request('/api/v1/provisioning-configuration-types')),
  getItems: async (versionId) => unwrapList(await request(`/api/v1/provisioning-profile-versions/${encodeURIComponent(versionId)}/items`)),
  createItem: async (versionId, payload) => unwrap(await request(`/api/v1/provisioning-profile-versions/${encodeURIComponent(versionId)}/items`, {
    method: 'POST', body: JSON.stringify(payload),
  })),
  updateItem: async (itemId, payload) => unwrap(await request(`/api/v1/provisioning-profile-items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH', body: JSON.stringify(payload),
  })),
  deleteItem: (itemId) => request(`/api/v1/provisioning-profile-items/${encodeURIComponent(itemId)}`, { method: 'DELETE' }),
}

export default provisioningProfilesApi
