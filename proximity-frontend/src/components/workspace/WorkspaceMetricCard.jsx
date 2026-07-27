import ProximityKpiCard from '../ui/ProximityKpiCard'

/**
 * Canonical workspace KPI. It deliberately delegates to the Dashboard golden
 * reference so Dashboard, Procedure, Provisioning and future modules cannot drift.
 */
export default function WorkspaceMetricCard(props) {
  return <ProximityKpiCard {...props} />
}
