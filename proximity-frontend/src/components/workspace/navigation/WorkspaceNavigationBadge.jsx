import { Box } from '@mui/material'

const tones = {
  neutral: { color: '#475569', background: '#eef2f7' },
  success: { color: '#166534', background: '#dcfce7' },
  warning: { color: '#92400e', background: '#fef3c7' },
  error: { color: '#991b1b', background: '#fee2e2' },
  info: { color: '#1d4ed8', background: '#dbeafe' },
  primary: { color: '#3730a3', background: '#e0e7ff' },
}

export default function WorkspaceNavigationBadge({ children, tone = 'neutral', sx }) {
  const palette = tones[tone] || tones.neutral
  return (
    <Box component="span" sx={{ minWidth: 22, height: 20, px: 0.7, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, lineHeight: 1, fontWeight: 900, color: palette.color, bgcolor: palette.background, ...sx }}>
      {children}
    </Box>
  )
}
