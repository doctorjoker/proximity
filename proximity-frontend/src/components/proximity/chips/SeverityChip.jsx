import React from 'react'
import StatusChip from './StatusChip'

const severityStatus = Object.freeze({
  CRITICAL: 'ERROR',
  HIGH: 'ERROR',
  MEDIUM: 'WARNING',
  LOW: 'IN_PROGRESS',
  INFO: 'UNKNOWN',
})

export default function SeverityChip({ severity = 'INFO', label, ...props }) {
  const normalized = String(severity).toUpperCase()
  return <StatusChip status={severityStatus[normalized] || 'UNKNOWN'} label={label || normalized} {...props} />
}
