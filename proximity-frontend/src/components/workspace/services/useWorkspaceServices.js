import { useContext } from 'react'
import { WorkspaceServicesContext } from './WorkspaceServicesProvider'

export default function useWorkspaceServices() {
  const context = useContext(WorkspaceServicesContext)
  if (!context) {
    throw new Error('useWorkspaceServices must be used inside WorkspaceServicesProvider')
  }
  return context
}
