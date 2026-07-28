import React from 'react'
import StatusChip from './StatusChip'

export default function ConnectionChip({ connected, status, label, ...props }) {
  const resolved = status || (connected === true ? 'ONLINE' : connected === false ? 'OFFLINE' : 'UNKNOWN')
  return <StatusChip status={resolved} label={label} {...props} />
}
