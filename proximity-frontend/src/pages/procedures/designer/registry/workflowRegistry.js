import {
  IconAdjustments,
  IconBell,
  IconBolt,
  IconClock,
  IconFlag,
  IconGitBranch,
  IconPlayerPlay,
  IconPlugConnected,
  IconRoute,
  IconSearch,
  IconShieldCheck,
  IconTool,
} from '@tabler/icons-react'

export const WORKFLOW_NODE_CATEGORIES = {
  FLOW: {
    id: 'flow',
    label: 'Flusso',
    color: '#475569',
    icon: IconRoute,
  },
  ACTION: {
    id: 'action',
    label: 'Azioni',
    color: '#2563EB',
    icon: IconBolt,
  },
  CONDITION: {
    id: 'condition',
    label: 'Condizioni',
    color: '#CA8A04',
    icon: IconGitBranch,
  },
  PROVISIONING: {
    id: 'provisioning',
    label: 'Provisioning',
    color: '#2563EB',
    icon: IconPlugConnected,
  },
  ACS: {
    id: 'acs',
    label: 'ACS',
    color: '#7C3AED',
    icon: IconAdjustments,
  },
  VALIDATION: {
    id: 'validation',
    label: 'Validazione',
    color: '#16A34A',
    icon: IconShieldCheck,
  },
  NOTIFICATION: {
    id: 'notification',
    label: 'Notifiche',
    color: '#DB2777',
    icon: IconBell,
  },
}

const DEFAULT_PROPERTIES = {
  timeout: 60,
  retries: 3,
  retryDelay: 5,
  rollbackEnabled: false,
  failurePolicy: 'STOP',
  inputVariables: 'service_code\ncustomer_id\nrouter_serial',
  outputVariables: 'status\nexecution_id\nlogs',
}

export const WORKFLOW_REGISTRY = {
  START: {
    id: 'START',
    label: 'Avvio',
    description: 'Punto iniziale della procedura.',
    category: 'flow',
    categoryLabel: 'Flusso',
    color: '#475569',
    icon: IconPlayerPlay,
    phaseType: 'FLOW',
    runtimeCategory: 'FLOW',
    action: 'START',
  },

  END: {
    id: 'END',
    label: 'Fine',
    description: 'Punto finale della procedura.',
    category: 'flow',
    categoryLabel: 'Flusso',
    color: '#475569',
    icon: IconFlag,
    phaseType: 'FLOW',
    runtimeCategory: 'FLOW',
    action: 'END',
  },

  ACTION: {
    id: 'ACTION',
    label: 'Azione',
    description: 'Azione generica della procedura.',
    category: 'action',
    categoryLabel: 'Azioni',
    color: '#2563EB',
    icon: IconTool,
    phaseType: 'ACTION',
    runtimeCategory: 'CUSTOM',
    action: 'ACTION',
  },

  CONDITION: {
    id: 'CONDITION',
    label: 'Condizione',
    description: 'Valuta una condizione e seleziona il ramo successivo.',
    category: 'condition',
    categoryLabel: 'Condizioni',
    color: '#CA8A04',
    icon: IconGitBranch,
    phaseType: 'CONDITION',
    runtimeCategory: 'LOGIC',
    action: 'CONDITION',
  },

  DELAY: {
    id: 'DELAY',
    label: 'Attesa',
    description: 'Sospende temporaneamente il flusso.',
    category: 'flow',
    categoryLabel: 'Flusso',
    color: '#475569',
    icon: IconClock,
    phaseType: 'FLOW',
    runtimeCategory: 'FLOW',
    action: 'DELAY',
  },

  PROVISION_PPP: {
    id: 'PROVISION_PPP',
    label: 'Provisioning PPPoE',
    description: 'Configura i parametri PPPoE sul dispositivo.',
    category: 'provisioning',
    categoryLabel: 'Provisioning',
    color: '#2563EB',
    icon: IconPlugConnected,
    phaseType: 'ACTION',
    runtimeCategory: 'PROVISIONING',
    action: 'PROVISION_PPP',
  },

  VERIFY_SERVICE: {
    id: 'VERIFY_SERVICE',
    label: 'Verifica servizio',
    description: 'Verifica lo stato operativo del servizio.',
    category: 'validation',
    categoryLabel: 'Validazione',
    color: '#16A34A',
    icon: IconShieldCheck,
    phaseType: 'ACTION',
    runtimeCategory: 'VALIDATION',
    action: 'VERIFY_SERVICE',
  },

  SET_PARAMETER: {
    id: 'SET_PARAMETER',
    label: 'Imposta parametro ACS',
    description: 'Imposta un parametro tramite ACS.',
    category: 'acs',
    categoryLabel: 'ACS',
    color: '#7C3AED',
    icon: IconAdjustments,
    phaseType: 'ACTION',
    runtimeCategory: 'ACS',
    action: 'SET_PARAMETER',
  },

  GET_PARAMETER: {
    id: 'GET_PARAMETER',
    label: 'Leggi parametro ACS',
    description: 'Legge un parametro tramite ACS.',
    category: 'acs',
    categoryLabel: 'ACS',
    color: '#7C3AED',
    icon: IconSearch,
    phaseType: 'ACTION',
    runtimeCategory: 'ACS',
    action: 'GET_PARAMETER',
  },

  NOTIFICATION: {
    id: 'NOTIFICATION',
    label: 'Notifica',
    description: 'Invia una notifica al destinatario configurato.',
    category: 'notification',
    categoryLabel: 'Notifiche',
    color: '#DB2777',
    icon: IconBell,
    phaseType: 'NOTIFICATION',
    runtimeCategory: 'NOTIFICATION',
    action: 'NOTIFICATION',
  },
}

export const getWorkflowDefinition = (type) => {
  const key = String(type || '').trim().toUpperCase()
  return WORKFLOW_REGISTRY[key] || null
}

export const resolveWorkflowDefinition = (step) => {
  const source = typeof step === 'string' ? { id: step } : (step || {})
  const registryDefinition = getWorkflowDefinition(
    source.id || source.action,
  )

  const merged = {
    ...(registryDefinition || {}),
    ...source,
  }

  return {
    ...merged,
    id: merged.id || merged.action || 'ACTION',
    label: merged.label || merged.name || 'Nuova fase',
    description: merged.description || '',
    category: merged.category || 'action',
    categoryLabel: merged.categoryLabel || 'Azione',
    color: merged.color || '#2563EB',
    icon: merged.icon || IconTool,
    phaseType: merged.phaseType || 'ACTION',
    runtimeCategory: merged.runtimeCategory || 'CUSTOM',
    action: merged.action || merged.id || 'ACTION',
    defaultProperties: {
      ...DEFAULT_PROPERTIES,
      ...(registryDefinition?.defaultProperties || {}),
      ...(source.defaultProperties || {}),
    },
  }
}

export const getWorkflowDefinitions = () =>
  Object.values(WORKFLOW_REGISTRY)

export const getWorkflowDefinitionGroups = () => {
  const definitions = getWorkflowDefinitions()

  return Object.values(WORKFLOW_NODE_CATEGORIES)
    .map((category) => ({
      ...category,
      items: definitions.filter(
        (definition) => definition.category === category.id,
      ),
    }))
    .filter((group) => group.items.length > 0)
}
