import React from 'react'
import StatusChip from './StatusChip'

export default function ProvisioningChip({ status, label, ...props }) {
  return <StatusChip status={status || 'UNKNOWN'} label={label} {...props} />
}
