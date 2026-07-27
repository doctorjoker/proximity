import { Alert, Stack, Typography } from '@mui/material'
import WorkspaceCard from '../../../../components/workspace/WorkspaceCard'
import WorkspaceStatusPill from '../../../../components/workspace/WorkspaceStatusPill'
import { workspaceTokens } from '../../../../components/workspace/workspaceTokens'

export default function HistoryTab({ versions = [] }) {
  if (!versions.length) return <Alert severity="info">Nessuna versione disponibile.</Alert>
  return (
    <Stack spacing={1.25}>
      {versions.map((version) => (
        <WorkspaceCard key={version.id} contentSx={{ py: 1.75 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
            <Stack>
              <Typography fontWeight={850} color={workspaceTokens.shell.text}>Versione {version.version}</Typography>
              <Typography variant="body2" color={workspaceTokens.shell.textMuted}>{version.procedure_code || 'Nessuna procedura associata'}</Typography>
            </Stack>
            <WorkspaceStatusPill label={version.status || 'UNKNOWN'} />
          </Stack>
        </WorkspaceCard>
      ))}
    </Stack>
  )
}
