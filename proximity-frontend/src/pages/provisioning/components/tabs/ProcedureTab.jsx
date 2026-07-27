import { Alert, Stack, Typography } from '@mui/material'
import WorkspaceCard from '../../../../components/workspace/WorkspaceCard'
import WorkspaceStatusPill from '../../../../components/workspace/WorkspaceStatusPill'
import { workspaceTokens } from '../../../../components/workspace/workspaceTokens'

export default function ProcedureTab({ version }) {
  if (!version) return <Alert severity="info">Nessuna versione selezionata.</Alert>
  return (
    <WorkspaceCard title="Procedura associata" subtitle="Workflow eseguito dal runtime per applicare la configurazione desiderata">
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Stack spacing={0.5}>
          <Typography variant="caption" color={workspaceTokens.shell.textMuted}>Codice procedura</Typography>
          <Typography variant="h6" fontWeight={850}>{version.procedure_code || '—'}</Typography>
          <Typography variant="body2" color={workspaceTokens.shell.textMuted}>{version.procedure_version || 'Versione non definita'}</Typography>
        </Stack>
        <WorkspaceStatusPill label={version.procedure_code ? 'COLLEGATA' : 'NON COLLEGATA'} tone={version.procedure_code ? 'success' : 'warning'} sx={{ alignSelf: 'flex-start' }} />
      </Stack>
    </WorkspaceCard>
  )
}
