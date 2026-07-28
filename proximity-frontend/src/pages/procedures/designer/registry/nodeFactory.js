import { resolveWorkflowDefinition } from './workflowRegistry'

export const createDefaultProperties = (step) => {
  const definition = resolveWorkflowDefinition(step)
  return {
    name: definition.label,
    description: definition.description,
    ...definition.defaultProperties,
  }
}

export const phaseTypeForStep = (step) => {
  const definition = resolveWorkflowDefinition(step)
  if (definition.phaseType) return definition.phaseType

  const category = String(definition.category || definition.id || '').toLowerCase()
  if (category.includes('logic') || category.includes('condition')) return 'CONDITION'
  if (category.includes('flow')) return 'FLOW'
  if (category.includes('notification') || category.includes('customer')) return 'NOTIFICATION'
  return 'ACTION'
}

export const createPhasePayload = (step, position) => {
  const definition = resolveWorkflowDefinition(step)
  return {
    name: definition.label,
    description: definition.description || null,
    type: definition.phaseType || phaseTypeForStep(definition),
    category: definition.runtimeCategory || 'CUSTOM',
    action: definition.action || definition.id,
    position,
  }
}
