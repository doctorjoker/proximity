import React from 'react'
import StatusChip from './StatusChip'

const healthStatus = Object.freeze({
  HEALTHY: 'ONLINE',
  GOOD: 'ONLINE',
  DEGRADED: 'WARNING',
  WARNING: 'WARNING',
  CRITICAL: 'ERROR',
  DOWN: 'OFFLINE',
  UNKNOWN: 'UNKNOWN',
})

export default function HealthChip({ health = 'UNKNOWN', label, ...props }) {
  const normalized = String(health).toUpperCase()
  return <StatusChip status={healthStatus[normalized] || 'UNKNOWN'} label={label || normalized} {...props} />
}
