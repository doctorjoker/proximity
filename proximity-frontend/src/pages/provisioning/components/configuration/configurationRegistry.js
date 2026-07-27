import PPPoEEditor from './editors/PPPoEEditor'
import VlanEditor from './editors/VlanEditor'
import WifiEditor from './editors/WifiEditor'
import GenericEditor from './editors/GenericEditor'

export const CATEGORY_ORDER = ['Internet', 'WiFi', 'Voice', 'Management', 'Security', 'Other']

const CATEGORY_BY_CODE = {
  PPPOE: 'Internet', VLAN: 'Internet', DNS: 'Internet', IPV6: 'Internet',
  WIFI: 'WiFi', WIFI24: 'WiFi', WIFI_24: 'WiFi', WIFI5: 'WiFi', WIFI_5: 'WiFi',
  VOIP: 'Voice', SIP: 'Voice', TR069: 'Management', NTP: 'Management', SYSLOG: 'Management',
  FIREWALL: 'Security', QOS: 'Security',
}

const DOMAIN_BY_CATEGORY = {
  Internet: 'NETWORKING',
  WiFi: 'WIFI',
  Voice: 'CUSTOMER',
  Management: 'ACS',
  Security: 'SECURITY',
  Other: 'OTHER',
}

const EDITOR_BY_CODE = {
  PPPOE: PPPoEEditor,
  VLAN: VlanEditor,
  WIFI: WifiEditor,
  WIFI24: WifiEditor,
  WIFI_24: WifiEditor,
  WIFI5: WifiEditor,
  WIFI_5: WifiEditor,
}

export const TEMPLATE_VARIABLES = Object.freeze([
  'service.code',
  'service.pppoe_username',
  'service.pppoe_password',
  'service.vlan_id',
  'service.wifi_ssid',
  'service.wifi_password',
  'customer.code',
  'customer.name',
  'device.serial_number',
  'device.acs_device_id',
  'router.serial_number',
  'workflow.execution_id',
])

export function typeCodeOf(type) {
  return String(type?.type_code || type?.configuration_type_code || '').toUpperCase()
}

export function categoryOf(type) {
  const metadataCategory = type?.metadata?.category
  return metadataCategory || CATEGORY_BY_CODE[typeCodeOf(type)] || 'Other'
}

export function domainOfCategory(category) {
  return DOMAIN_BY_CATEGORY[category] || 'OTHER'
}

export function editorFor(type) {
  const editorKey = String(type?.metadata?.editor || '').toUpperCase()
  return EDITOR_BY_CODE[editorKey] || EDITOR_BY_CODE[typeCodeOf(type)] || GenericEditor
}

export function labelOf(type) {
  return type?.name || type?.configuration_type_name || typeCodeOf(type) || 'Configurazione'
}

export function validateConfiguration(code, payload = {}) {
  const errors = []
  const warnings = []

  if (code === 'PPPOE') {
    if (!String(payload.username || '').trim()) errors.push('Username PPPoE mancante')
    if (!String(payload.password || '').trim()) errors.push('Password PPPoE mancante')
  }

  if (code === 'VLAN') {
    const vlanId = Number(payload.vlan_id)
    const priority = Number(payload.priority ?? 0)
    if (!Number.isInteger(vlanId) || vlanId < 1 || vlanId > 4094) errors.push('VLAN ID deve essere compreso tra 1 e 4094')
    if (!Number.isInteger(priority) || priority < 0 || priority > 7) errors.push('Priorita 802.1p deve essere compresa tra 0 e 7')
  }

  if (code.startsWith('WIFI')) {
    if (!String(payload.ssid || '').trim()) errors.push('SSID mancante')
    if (!String(payload.password || '').trim()) warnings.push('Password Wi-Fi non valorizzata')
  }

  return { errors, warnings, valid: errors.length === 0 }
}

export function statusOf(type, item) {
  if (!item) return { key: 'EMPTY', label: 'Vuoto', color: 'default' }
  const validation = validateConfiguration(typeCodeOf(type), item.template_payload || {})
  if (!item.enabled) return { key: 'DISABLED', label: 'Disabilitato', color: 'default' }
  if (validation.errors.length) return { key: 'INVALID', label: 'Da correggere', color: 'error' }
  if (validation.warnings.length) return { key: 'PARTIAL', label: 'Parziale', color: 'warning' }
  return { key: 'CONFIGURED', label: 'Configurato', color: 'success' }
}
