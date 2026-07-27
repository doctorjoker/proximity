import { WorkspaceServicesProvider } from '../services'
import WorkspaceUXBootstrap from './WorkspaceUXBootstrap'

export default function EnterpriseUXRoot({ children, commands = [], initialValue = {} }) {
  return (
    <WorkspaceServicesProvider initialValue={initialValue}>
      {children}
      <WorkspaceUXBootstrap commands={commands} />
    </WorkspaceServicesProvider>
  )
}
