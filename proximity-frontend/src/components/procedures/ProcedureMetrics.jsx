import { useMemo } from 'react'
import { WorkspaceKPIBar, WorkspaceMetricCard } from '../workspace'
import { getProximityActionIcon } from '../icons/proximityIconRegistry'
import { getActiveVersion, getDeprecatedVersions, getDraftVersion } from './catalogUtils'

const ProcedureCatalogIcon = getProximityActionIcon('CATALOG')
const ActiveProcedureIcon = getProximityActionIcon('ACTIVE')
const DraftProcedureIcon = getProximityActionIcon('DRAFT')
const HistoryProcedureIcon = getProximityActionIcon('HISTORY')

export default function ProcedureMetrics({ procedures = [], versionsByCode = {} }) {
  const stats = useMemo(() => {
    const activeCount = procedures.filter((procedure) => Boolean(getActiveVersion(procedure, versionsByCode))).length
    const draftCount = procedures.filter((procedure) => Boolean(getDraftVersion(procedure, versionsByCode))).length
    const historicalCount = procedures.filter((procedure) => getDeprecatedVersions(procedure, versionsByCode).length > 0).length

    return [
      {
        label: 'Procedure',
        value: procedures.length,
        helper: 'Modelli presenti nel catalogo',
        icon: ProcedureCatalogIcon,
        tone: 'primary',
      },
      {
        label: 'Procedure attive',
        value: activeCount,
        helper: 'Versioni pubblicate e operative',
        icon: ActiveProcedureIcon,
        tone: 'success',
      },
      {
        label: 'Con bozza',
        value: draftCount,
        helper: 'Modifiche ancora da pubblicare',
        icon: DraftProcedureIcon,
        tone: 'warning',
      },
      {
        label: 'Storiche',
        value: historicalCount,
        helper: 'Procedure con versioni archiviate',
        icon: HistoryProcedureIcon,
        tone: 'cyan',
      },
    ]
  }, [procedures, versionsByCode])

  return (
    <WorkspaceKPIBar columns={4}>
      {stats.map((item) => <WorkspaceMetricCard key={item.label} {...item} />)}
    </WorkspaceKPIBar>
  )
}
