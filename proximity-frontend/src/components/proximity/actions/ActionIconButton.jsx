import React from 'react'
import { CircularProgress, IconButton, Tooltip } from '@mui/material'
import { proximityUiTokens } from '../theme'

const { colors, radius, action } = proximityUiTokens

const tones = Object.freeze({
  neutral: { color: colors.neutral, border: colors.neutralBorder, background: colors.surface, hover: colors.primarySoft },
  primary: { color: colors.primary, border: colors.primaryBorder, background: colors.surface, hover: colors.primarySoft },
  danger: { color: colors.danger, border: '#fecaca', background: colors.surface, hover: colors.dangerSoft },
  success: { color: colors.success, border: '#bbdfbd', background: colors.surface, hover: colors.successSoft },
})

export default function ActionIconButton({
  label,
  loading = false,
  disabled = false,
  children,
  size = 'normal',
  tone = 'neutral',
  sx,
  ...props
}) {
  const dimension = action[size]?.minHeight || action.normal.minHeight
  const visual = tones[tone] || tones.neutral

  const button = (
    <IconButton
      {...props}
      aria-label={label}
      disabled={disabled || loading}
      sx={{
        width: dimension,
        height: dimension,
        border: '1px solid',
        borderColor: visual.border,
        borderRadius: `${radius.md}px`,
        color: visual.color,
        bgcolor: visual.background,
        boxShadow: 'none',
        '&:hover': { bgcolor: visual.hover },
        '&.Mui-disabled': { opacity: 0.58 },
        ...sx,
      }}
    >
      {loading ? <CircularProgress size={17} color="inherit" /> : children}
    </IconButton>
  )

  return label ? <Tooltip title={label}>{button}</Tooltip> : button
}
