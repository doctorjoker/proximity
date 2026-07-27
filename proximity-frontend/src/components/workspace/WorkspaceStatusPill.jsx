import { Box } from '@mui/material'
import { workspaceTokens } from './workspaceTokens'

const toneMap = {
  DRAFT: 'warning',
  ACTIVE: 'success',
  PUBLISHED: 'success',
  CONFIGURED: 'success',
  VALID: 'success',
  INVALID: 'error',
  ERROR: 'error',
  PARTIAL: 'warning',
  WARNING: 'warning',
  DISABLED: 'neutral',
  EMPTY: 'neutral',
  INFO: 'info',
}

export default function WorkspaceStatusPill({ label, tone, compact = false, sx }) {
  const normalized = String(label || 'UNKNOWN').toUpperCase()
  const resolvedTone = tone || toneMap[normalized] || 'neutral'
  const palette = workspaceTokens.status[resolvedTone] || workspaceTokens.status.neutral

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: compact ? 20 : 24,
        px: compact ? 0.85 : 1.1,
        borderRadius: 999,
        border: `1px solid ${palette.border}`,
        bgcolor: palette.background,
        color: palette.color,
        fontSize: compact ? 10 : 11,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: 0.25,
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {label || 'Unknown'}
    </Box>
  )
}
