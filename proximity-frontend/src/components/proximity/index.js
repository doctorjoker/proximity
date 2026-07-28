/**
 * Proximity Frontend Public API.
 *
 * Pages and domain modules must import reusable UI primitives from this file.
 * The internal folder layout is intentionally hidden from consumers.
 */

// Workspace engine (implementation compatibility layer)
export { default as WorkspaceLayout } from '../workspace/WorkspaceLayout'
export { default as WorkspaceTabs } from '../workspace/WorkspaceTabs'
export { default as WorkspaceToolbar } from '../workspace/WorkspaceToolbar'
export { default as WorkspaceHeader } from '../workspace/WorkspaceHeader'
export { default as WorkspaceCard } from '../workspace/WorkspaceCard'
export { default as WorkspaceFooter } from '../workspace/WorkspaceFooter'
export { default as WorkspaceInspector } from '../workspace/WorkspaceInspector'
export { default as WorkspaceStatusPill } from '../workspace/WorkspaceStatusPill'
export { workspaceTokens, getWorkspaceDomainToken } from '../workspace/workspaceTokens'

// Layout
export { default as WorkspacePage } from './layout/WorkspacePage'
export { default as WorkspaceSection } from './layout/WorkspaceSection'
export { default as WorkspaceActions } from './layout/WorkspaceActions'
export { default as WorkspaceFilters } from './layout/WorkspaceFilters'
export { default as WorkspaceContent } from './layout/WorkspaceContent'
export { default as WorkspaceSidebar } from './layout/WorkspaceSidebar'

// KPI
export { default as KpiCard } from './kpi/KpiCard'
export { default as KpiGrid } from './kpi/KpiGrid'

// Tables
export { default as DataTable } from './tables/DataTable'
export { default as TableToolbar } from './tables/TableToolbar'
export { default as TableLoading } from './tables/TableLoading'
export { default as TableEmptyState } from './tables/TableEmptyState'

// Drawers
export { default as DetailDrawer } from './drawers/DetailDrawer'
export { default as DrawerSection } from './drawers/DrawerSection'

// Actions
export {
  ActionButton,
  PrimaryActionButton,
  SecondaryActionButton,
  TertiaryActionButton,
  DangerActionButton,
  SuccessActionButton,
  ActionIconButton,
} from './actions'

// Chips and statuses
export {
  StatusChip,
  SeverityChip,
  HealthChip,
  ConnectionChip,
  ProvisioningChip,
  ProgressChip,
} from './chips'

// Design tokens
export { proximityUiTokens } from './theme'
