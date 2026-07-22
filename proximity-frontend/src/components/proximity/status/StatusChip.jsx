import { Chip } from '@mui/material'
import { proximityTokens } from '../../../theme/proximityTokens'

export default function StatusChip({ status, label, color, size = 'small', ...props }) {
  const normalized = String(status || '').toUpperCase()
  const config = proximityTokens.status[normalized] || { label: status || 'N/D', color: 'default' }
  return <Chip size={size} label={label || config.label} color={color || config.color} {...props} />
}
