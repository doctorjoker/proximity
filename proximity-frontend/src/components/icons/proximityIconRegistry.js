import {
  IconActivityHeartbeat,
  IconArrowsExchange,
  IconCalendarTime,
  IconCloudNetwork,
  IconCpu,
  IconDeviceDesktopCog,
  IconHierarchy3,
  IconPlugConnected,
  IconRefresh,
  IconRouter,
  IconShieldLock,
  IconTool,
  IconUser,
  IconWifi,
  IconWorldCog,
} from '@tabler/icons-react'

export const PROXIMITY_ICON_DOMAINS = Object.freeze({
  PROVISIONING: 'PROVISIONING',
  NETWORKING: 'NETWORKING',
  ACS: 'ACS',
  CUSTOMER: 'CUSTOMER',
  MAINTENANCE: 'MAINTENANCE',
  ROUTER: 'ROUTER',
  ROUTER_REPLACEMENT: 'ROUTER_REPLACEMENT',
  DEVICE_REBOOT: 'DEVICE_REBOOT',
  FIRMWARE: 'FIRMWARE',
  DIAGNOSTICS: 'DIAGNOSTICS',
  SECURITY: 'SECURITY',
  SCHEDULER: 'SCHEDULER',
  WORKFLOW: 'WORKFLOW',
  WIFI: 'WIFI',
  OTHER: 'OTHER',
})

export const PROXIMITY_ICON_REGISTRY = Object.freeze({
  PROVISIONING: {
    label: 'Provisioning',
    icon: IconPlugConnected,
    color: '#2563EB',
    background: 'rgba(37, 99, 235, 0.10)',
    border: 'rgba(37, 99, 235, 0.18)',
  },
  NETWORKING: {
    label: 'Networking',
    icon: IconHierarchy3,
    color: '#4F46E5',
    background: 'rgba(79, 70, 229, 0.10)',
    border: 'rgba(79, 70, 229, 0.18)',
  },
  ACS: {
    label: 'ACS',
    icon: IconWorldCog,
    color: '#7C3AED',
    background: 'rgba(124, 58, 237, 0.10)',
    border: 'rgba(124, 58, 237, 0.18)',
  },
  CUSTOMER: {
    label: 'Customer',
    icon: IconUser,
    color: '#0891B2',
    background: 'rgba(8, 145, 178, 0.10)',
    border: 'rgba(8, 145, 178, 0.18)',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon: IconTool,
    color: '#D97706',
    background: 'rgba(217, 119, 6, 0.11)',
    border: 'rgba(217, 119, 6, 0.19)',
  },
  ROUTER: {
    label: 'Router',
    icon: IconRouter,
    color: '#0284C7',
    background: 'rgba(2, 132, 199, 0.10)',
    border: 'rgba(2, 132, 199, 0.18)',
  },
  ROUTER_REPLACEMENT: {
    label: 'Router replacement',
    icon: IconArrowsExchange,
    color: '#0284C7',
    background: 'rgba(2, 132, 199, 0.10)',
    border: 'rgba(2, 132, 199, 0.18)',
  },
  DEVICE_REBOOT: {
    label: 'Device reboot',
    icon: IconRefresh,
    color: '#0F766E',
    background: 'rgba(15, 118, 110, 0.10)',
    border: 'rgba(15, 118, 110, 0.18)',
  },
  FIRMWARE: {
    label: 'Firmware',
    icon: IconCpu,
    color: '#EA580C',
    background: 'rgba(234, 88, 12, 0.10)',
    border: 'rgba(234, 88, 12, 0.18)',
  },
  DIAGNOSTICS: {
    label: 'Diagnostics',
    icon: IconActivityHeartbeat,
    color: '#16A34A',
    background: 'rgba(22, 163, 74, 0.10)',
    border: 'rgba(22, 163, 74, 0.18)',
  },
  SECURITY: {
    label: 'Security',
    icon: IconShieldLock,
    color: '#DC2626',
    background: 'rgba(220, 38, 38, 0.10)',
    border: 'rgba(220, 38, 38, 0.18)',
  },
  SCHEDULER: {
    label: 'Scheduler',
    icon: IconCalendarTime,
    color: '#475569',
    background: 'rgba(71, 85, 105, 0.10)',
    border: 'rgba(71, 85, 105, 0.18)',
  },
  WORKFLOW: {
    label: 'Workflow',
    icon: IconCloudNetwork,
    color: '#6366F1',
    background: 'rgba(99, 102, 241, 0.10)',
    border: 'rgba(99, 102, 241, 0.18)',
  },
  WIFI: {
    label: 'WiFi',
    icon: IconWifi,
    color: '#0D9488',
    background: 'rgba(13, 148, 136, 0.10)',
    border: 'rgba(13, 148, 136, 0.18)',
  },
  OTHER: {
    label: 'Altro',
    icon: IconDeviceDesktopCog,
    color: '#64748B',
    background: 'rgba(100, 116, 139, 0.10)',
    border: 'rgba(100, 116, 139, 0.18)',
  },
})

export function normalizeProximityIconDomain(domain) {
  const normalized = String(domain || 'OTHER').trim().toUpperCase()
  return PROXIMITY_ICON_REGISTRY[normalized] ? normalized : 'OTHER'
}

export function getProximityIconConfig(domain) {
  return PROXIMITY_ICON_REGISTRY[normalizeProximityIconDomain(domain)]
}

export function resolveProcedureIconDomain(procedure = {}) {
  const explicit = String(
    procedure.icon_domain ||
    procedure.operation_type ||
    procedure.procedure_type ||
    procedure.category ||
    procedure.domain ||
    '',
  ).toUpperCase()

  const code = String(procedure.code || procedure.procedure_code || procedure.workflow_code || '').toUpperCase()
  const searchable = `${explicit} ${code}`

  if (searchable.includes('ROUTER') && searchable.includes('REPLAC')) return 'ROUTER_REPLACEMENT'
  if (searchable.includes('REBOOT') || searchable.includes('RESTART')) return 'DEVICE_REBOOT'
  if (searchable.includes('FIRMWARE') || searchable.includes('UPGRADE')) return 'FIRMWARE'
  if (searchable.includes('DIAGNOST') || searchable.includes('ASSURANCE')) return 'DIAGNOSTICS'
  if (searchable.includes('SECURITY')) return 'SECURITY'
  if (searchable.includes('SCHED') || searchable.includes('CRON')) return 'SCHEDULER'
  if (searchable.includes('WIFI') || searchable.includes('WIRELESS')) return 'WIFI'
  if (searchable.includes('CUSTOMER') || searchable.includes('CLIENT')) return 'CUSTOMER'
  if (searchable.includes('PROVISION') || searchable.includes('SERVICE')) return 'PROVISIONING'
  if (searchable.includes('NETWORK')) return 'NETWORKING'
  if (searchable.includes('ACS') || searchable.includes('DEVICE') || searchable.includes('CPE')) return 'ACS'
  if (searchable.includes('MAINT')) return 'MAINTENANCE'
  if (searchable.includes('WORKFLOW') || searchable.includes('PROCEDURE')) return 'WORKFLOW'

  return normalizeProximityIconDomain(explicit)
}
