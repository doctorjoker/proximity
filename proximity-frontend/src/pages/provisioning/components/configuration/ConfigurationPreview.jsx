import { Box, Divider, Stack, Typography } from '@mui/material'
import WorkspaceCard from '../../../../components/workspace/WorkspaceCard'
import { workspaceTokens } from '../../../../components/workspace/workspaceTokens'

function maskValue(key, value) {
  if (String(key).toLowerCase().includes('password') && value) return '••••••••'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function ConfigurationPreview({ payload = {} }) {
  const entries = Object.entries(payload)
  return (
    <WorkspaceCard title="Preview desiderata" subtitle="Valori consegnati al runtime" contentSx={{ p: 0 }}>
      <Stack divider={<Divider />}>
        {entries.length ? entries.map(([key, value]) => (
          <Stack key={key} direction="row" justifyContent="space-between" gap={2} sx={{ px: 2, py: 1.25 }}>
            <Typography sx={{ color: workspaceTokens.shell.textMuted, fontFamily: 'monospace', fontSize: 12 }}>{key}</Typography>
            <Typography sx={{ color: workspaceTokens.shell.text, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, textAlign: 'right', wordBreak: 'break-all' }}>
              {maskValue(key, value)}
            </Typography>
          </Stack>
        )) : (
          <Typography sx={{ color: workspaceTokens.shell.textMuted, fontSize: 13, p: 2 }}>Nessun parametro valorizzato.</Typography>
        )}
      </Stack>
    </WorkspaceCard>
  )
}
