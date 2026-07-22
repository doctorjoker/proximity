import { Chip } from '@mui/material'

export default function ProgressChip({ value = 0, label, ...props }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  const color = safeValue >= 100 ? 'success' : safeValue > 0 ? 'info' : 'default'
  return <Chip size="small" color={color} label={label || `${safeValue}%`} {...props} />
}
