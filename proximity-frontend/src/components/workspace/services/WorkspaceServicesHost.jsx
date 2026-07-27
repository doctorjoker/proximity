import WorkspaceCommandPalette from './WorkspaceCommandPalette'
import WorkspaceNotificationCenter from './WorkspaceNotificationCenter'
import WorkspaceHotkeys from './WorkspaceHotkeys'

export default function WorkspaceServicesHost({ hotkeys = {}, commands }) {
  return (
    <>
      <WorkspaceHotkeys {...hotkeys} />
      <WorkspaceCommandPalette commands={commands} />
      <WorkspaceNotificationCenter />
    </>
  )
}
