import React from 'react'
import StatusChip from './StatusChip'

export default function ProgressChip({ value = 0, label, ...props }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))

  let status = 'UNKNOWN'
  if (safeValue >= 100) status = 'COMPLETED'
  else if (safeValue > 0) status = 'IN_PROGRESS'

  return (
    <StatusChip
      status={status}
      label={label || `${safeValue}%`}
      {...props}
    />
  )
}
