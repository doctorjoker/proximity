import { useEffect, useMemo } from 'react'
import {
  WorkspaceServicesHost,
  useWorkspaceServices,
} from '../services'
import WorkspaceUXDock from './WorkspaceUXDock'

const DEFAULT_COMMANDS = [
  { id: 'nav-dashboard', label: 'Apri Dashboard', description: 'Control Center operativo', group: 'Navigazione', path: '/', keywords: ['home', 'control center'] },
  { id: 'nav-procedures', label: 'Apri Procedure', description: 'Libreria e designer delle procedure', group: 'Navigazione', path: '/procedures', keywords: ['workflow', 'automation'] },
  { id: 'nav-provisioning', label: 'Apri Provisioning', description: 'Profili e configurazioni desiderate', group: 'Navigazione', path: '/provisioning', keywords: ['profiles', 'configuration'] },
  { id: 'nav-executions', label: 'Apri Esecuzioni', description: 'Centro operativo delle esecuzioni', group: 'Navigazione', path: '/procedure-executions', keywords: ['runtime', 'operations'] },
  { id: 'nav-devices', label: 'Apri Devices', description: 'Inventario CPE e router', group: 'Navigazione', path: '/devices', keywords: ['router', 'cpe', 'acs'] },
  { id: 'nav-firmware', label: 'Apri Firmware', description: 'Catalogo e campagne firmware', group: 'Navigazione', path: '/firmware', keywords: ['upgrade', 'campaign'] },
  { id: 'nav-customers', label: 'Apri Clienti', description: 'Customer workspace', group: 'Navigazione', path: '/customers', keywords: ['customer', 'care'] },
  { id: 'nav-diagnostics', label: 'Apri Diagnostics', description: 'Diagnostica e assurance', group: 'Navigazione', path: '/diagnostics', keywords: ['assurance', 'health'] },
]

function navigate(path) {
  if (!path || window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function WorkspaceUXBootstrap({ commands = [] }) {
  const services = useWorkspaceServices()

  const registeredCommands = useMemo(() => (
    [...DEFAULT_COMMANDS, ...commands].map((command) => ({
      ...command,
      onExecute: command.onExecute || (() => navigate(command.path)),
    }))
  ), [commands])

  useEffect(() => services.registerCommands(registeredCommands), [registeredCommands, services.registerCommands])

  useEffect(() => {
    services.setCurrentWorkspace({
      path: window.location.pathname,
      activatedAt: new Date().toISOString(),
      release: 'EUREKA17.0.0',
    })
  }, [services.setCurrentWorkspace])

  return (
    <>
      <WorkspaceServicesHost />
      <WorkspaceUXDock />
    </>
  )
}
