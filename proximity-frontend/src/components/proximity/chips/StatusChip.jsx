import React from 'react'
import { Chip } from '@mui/material'
import { proximityUiTokens } from '../theme'

const { colors, radius, chip } = proximityUiTokens

const statusMap = Object.freeze({
  ACTIVE: { label: 'Attivo', fg: colors.success, bg: colors.successSoft },
  ONLINE: { label: 'Online', fg: colors.success, bg: colors.successSoft },
  COMPLETED: { label: 'Completato', fg: colors.success, bg: colors.successSoft },
  SUCCESS: { label: 'Completato', fg: colors.success, bg: colors.successSoft },
  PENDING: { label: 'In attesa', fg: colors.warning, bg: colors.warningSoft },
  WARNING: { label: 'Attenzione', fg: colors.warning, bg: colors.warningSoft },
  IN_PROGRESS: { label: 'In corso', fg: colors.info, bg: colors.infoSoft },
  RUNNING: { label: 'In corso', fg: colors.info, bg: colors.infoSoft },
  OFFLINE: { label: 'Offline', fg: colors.danger, bg: colors.dangerSoft },
  FAILED: { label: 'Fallito', fg: colors.danger, bg: colors.dangerSoft },
  ERROR: { label: 'Errore', fg: colors.danger, bg: colors.dangerSoft },
  INACTIVE: { label: 'Inattivo', fg: colors.neutralMuted, bg: '#f1f5f9' },
  UNKNOWN: { label: 'N/D', fg: colors.neutralMuted, bg: '#f1f5f9' },
})

export default function StatusChip({ status, label, sx, ...props }) {
  const normalized = String(status || 'UNKNOWN').trim().toUpperCase()
  const visual = statusMap[normalized] || {
    label: normalized || 'N/D',
    fg: colors.neutralMuted,
    bg: '#f1f5f9',
  }

  return (
    <Chip
      {...props}
      size="small"
      label={label || visual.label}
      sx={{
        height: chip.height,
        borderRadius: `${radius.sm}px`,
        color: visual.fg,
        bgcolor: visual.bg,
        fontSize: chip.fontSize,
        fontWeight: chip.fontWeight,
        '& .MuiChip-label': { px: 1 },
        ...sx,
      }}
    />
  )
}
