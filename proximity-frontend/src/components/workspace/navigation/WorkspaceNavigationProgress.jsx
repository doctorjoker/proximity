import { Box, LinearProgress, Stack, Typography } from '@mui/material'

export default function WorkspaceNavigationProgress({ value = 0, label, color = '#2563eb' }) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <Stack spacing={0.55}>
      {(label || label === '') && <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800 }}>{label}</Typography>}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress variant="determinate" value={normalized} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
        <Typography variant="caption" sx={{ minWidth: 32, textAlign: 'right', fontWeight: 900, color: '#475569' }}>{normalized}%</Typography>
      </Box>
    </Stack>
  )
}
