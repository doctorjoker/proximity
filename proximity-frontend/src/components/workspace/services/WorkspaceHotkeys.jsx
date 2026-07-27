import { useEffect } from 'react'
import useWorkspaceServices from './useWorkspaceServices'

function isEditable(target) {
  const tag = target?.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || target?.isContentEditable
}

export default function WorkspaceHotkeys({
  onSave,
  onPublish,
  onRename,
  onDelete,
  onDuplicate,
  onEscape,
  enabled = true,
}) {
  const services = useWorkspaceServices()

  useEffect(() => {
    if (!enabled) return undefined

    const handler = (event) => {
      const primary = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (primary && key === 'k') {
        event.preventDefault()
        services.openCommandPalette()
        return
      }

      if (event.key === 'Escape') {
        services.closeCommandPalette()
        services.closeNotificationCenter()
        onEscape?.(event)
        return
      }

      if (isEditable(event.target)) return

      if (primary && key === 's') {
        event.preventDefault()
        onSave?.(event)
      } else if (primary && event.shiftKey && key === 'p') {
        event.preventDefault()
        onPublish?.(event)
      } else if (event.key === 'F2') {
        event.preventDefault()
        onRename?.(event)
      } else if (event.key === 'Delete') {
        onDelete?.(event)
      } else if (primary && key === 'd') {
        event.preventDefault()
        onDuplicate?.(event)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    enabled,
    onSave,
    onPublish,
    onRename,
    onDelete,
    onDuplicate,
    onEscape,
    services,
  ])

  return null
}
