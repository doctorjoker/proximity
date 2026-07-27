import ProximityKpiGrid from '../ui/ProximityKpiGrid'

/** Canonical responsive KPI container shared by every Proximity workspace. */
export default function WorkspaceKPIBar({ children, columns = 4, sx }) {
  return (
    <ProximityKpiGrid columns={columns} sx={sx}>
      {children}
    </ProximityKpiGrid>
  )
}
