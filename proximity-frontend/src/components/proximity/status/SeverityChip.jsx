import { Chip } from '@mui/material'

const colors = {
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
  INFO: 'default',
}

export default function SeverityChip({ severity, label, ...props }) {
  const normalized = String(severity || 'INFO').toUpperCase()
  return <Chip size="small" color={colors[normalized] || 'default'} label={label || normalized} {...props} />
}
