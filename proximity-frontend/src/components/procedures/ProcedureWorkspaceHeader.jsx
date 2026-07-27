import { Button } from '@mui/material'
import { WorkspaceHeader, WorkspaceToolbar } from '../workspace'
import ProximityActionIcon from '../icons/ProximityActionIcon'

/** Procedure adapter kept for backward compatibility during the 16.x migration. */
export default function ProcedureWorkspaceHeader({ onCreate }) {
  return (
    <WorkspaceHeader
      iconDomain="WORKFLOW"
      eyebrow="Automation"
      title="Procedure Automatiche"
      subtitle="Gestisci i modelli procedurali, le versioni e il relativo ciclo di vita."
      breadcrumbs={['Proximity', 'Procedure']}
      actions={(
        <WorkspaceToolbar>
          <Button
            variant="contained"
            startIcon={<ProximityActionIcon name="ADD" />}
            onClick={onCreate}
            sx={{ borderRadius: 2.4, fontWeight: 900, px: 2.2, py: 1, textTransform: 'none', boxShadow: 'none' }}
          >
            Nuova procedura
          </Button>
        </WorkspaceToolbar>
      )}
    />
  )
}
