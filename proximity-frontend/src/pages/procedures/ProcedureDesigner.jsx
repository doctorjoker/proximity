import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import {
  addEdge,
  applyEdgeChanges,
} from '@xyflow/react'

import WorkspaceTemplate from '../../components/ui/WorkspaceTemplate'
import PropertiesPanel from './components/PropertiesPanel'
import StepExplorer from './components/StepExplorer'
import WorkflowCanvas from './components/WorkflowCanvas'
import SimulationPanel from './components/SimulationPanel'

const CATEGORY_STYLES = {
  provisioning: { color: '#2563EB', label: 'Provisioning' },
  acs: { color: '#7C3AED', label: 'ACS' },
  firmware: { color: '#EA580C', label: 'Firmware' },
  customer: { color: '#0891B2', label: 'Customer' },
  validation: { color: '#16A34A', label: 'Validation' },
  condition: { color: '#CA8A04', label: 'Condition' },
  notification: { color: '#DB2777', label: 'Notification' },
  integration: { color: '#4F46E5', label: 'Integration' },
  action: { color: '#2563EB', label: 'Azione' },
  default: { color: '#475569', label: 'Fase' },
}

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '')

const toTextList = (value) => {
  if (Array.isArray(value)) return value.join('\n')
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
  return value || ''
}

const normalizeCategory = (phase) => {
  const raw = firstDefined(
    phase.category,
    phase.category_code,
    phase.categoryCode,
    phase.type,
    phase.step_type,
    phase.stepType,
    phase.action_type,
    phase.actionType,
    'default',
  )

  return String(raw).trim().toLowerCase()
}

const getCategoryStyle = (phase) => {
  const category = normalizeCategory(phase)

  if (CATEGORY_STYLES[category]) return CATEGORY_STYLES[category]
  if (category.includes('acs')) return CATEGORY_STYLES.acs
  if (category.includes('firmware')) return CATEGORY_STYLES.firmware
  if (category.includes('customer')) return CATEGORY_STYLES.customer
  if (category.includes('valid')) return CATEGORY_STYLES.validation
  if (category.includes('condition')) return CATEGORY_STYLES.condition
  if (category.includes('notif')) return CATEGORY_STYLES.notification
  if (category.includes('provision')) return CATEGORY_STYLES.provisioning
  if (category.includes('integr')) return CATEGORY_STYLES.integration

  return {
    ...CATEGORY_STYLES.default,
    label: firstDefined(
      phase.category_label,
      phase.categoryLabel,
      phase.type_label,
      phase.typeLabel,
      String(firstDefined(phase.type, phase.step_type, 'Fase')),
    ),
  }
}

const getPhaseIdentity = (phase, index) =>
  String(firstDefined(
    phase.id,
    phase.phase_id,
    phase.phaseId,
    phase.code,
    phase.phase_code,
    phase.phaseCode,
    phase.key,
    `phase-${index + 1}`,
  ))

const getPhaseName = (phase, index) =>
  firstDefined(
    phase.name,
    phase.label,
    phase.title,
    phase.phase_name,
    phase.phaseName,
    phase.code,
    `Fase ${index + 1}`,
  )

const getPhaseOrder = (phase, index) => {
  const raw = firstDefined(
    phase.order,
    phase.position,
    phase.sequence,
    phase.sequence_number,
    phase.sequenceNumber,
    phase.sort_order,
    phase.sortOrder,
    index + 1,
  )

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : index + 1
}

const getTransitionValue = (phase, kind) => {
  if (kind === 'success') {
    return firstDefined(
      phase.success_transition,
      phase.successTransition,
      phase.on_success,
      phase.onSuccess,
      phase.next_phase,
      phase.nextPhase,
      phase.next_phase_id,
      phase.nextPhaseId,
    )
  }

  return firstDefined(
    phase.error_transition,
    phase.errorTransition,
    phase.failure_transition,
    phase.failureTransition,
    phase.on_error,
    phase.onError,
    phase.on_failure,
    phase.onFailure,
  )
}

const createDefaultProperties = (step) => ({
  name: step.label,
  description: step.description,
  timeout: 60,
  retries: 3,
  retryDelay: 5,
  rollbackEnabled: false,
  failurePolicy: 'STOP',
  inputVariables: 'service_code\ncustomer_id\nrouter_serial',
  outputVariables: 'status\nexecution_id\nlogs',
})

const createPhaseProperties = (phase, index) => ({
  name: getPhaseName(phase, index),
  description: firstDefined(
    phase.description,
    phase.notes,
    phase.summary,
    '',
  ),
  timeout: parseFloat(firstDefined(
    phase.timeout,
    phase.timeout_seconds,
    phase.timeoutSeconds,
    60,
  )),
  retries: Number(firstDefined(
    phase.retries,
    phase.retry,
    phase.max_retries,
    phase.maxRetries,
    3,
  )),
  retryDelay: Number(firstDefined(
    phase.retry_delay,
    phase.retryDelay,
    phase.retry_delay_seconds,
    phase.retryDelaySeconds,
    5,
  )),
  rollbackEnabled: Boolean(firstDefined(
    phase.rollback_enabled,
    phase.rollbackEnabled,
    phase.has_rollback,
    phase.hasRollback,
    false,
  )),
  failurePolicy: firstDefined(
    phase.failure_policy,
    phase.failurePolicy,
    phase.error_policy,
    phase.errorPolicy,
    phase.continue_on_error || phase.continueOnError ? 'CONTINUE' : undefined,
    'STOP',
  ),
  inputVariables: toTextList(firstDefined(
    phase.input_variables,
    phase.inputVariables,
    phase.inputs,
    '',
  )),
  outputVariables: toTextList(firstDefined(
    phase.output_variables,
    phase.outputVariables,
    phase.outputs,
    '',
  )),
})

const mapPhasesToNodes = (phases = []) =>
  [...phases]
    .map((phase, originalIndex) => ({
      phase,
      originalIndex,
      order: getPhaseOrder(phase, originalIndex),
    }))
    .sort((left, right) => left.order - right.order)
    .map(({ phase, originalIndex }, visualIndex) => {
      const style = getCategoryStyle(phase)
      const name = getPhaseName(phase, originalIndex)

      return {
        id: getPhaseIdentity(phase, originalIndex),
        type: normalizeCategory(phase),
        label: name,
        description: firstDefined(phase.description, phase.notes, ''),
        categoryLabel: style.label,
        color: style.color,
        position: {
          x: 100 + (visualIndex % 2) * 330,
          y: 90 + Math.floor(visualIndex / 2) * 180,
        },
        properties: createPhaseProperties(phase, originalIndex),
        phase,
        phaseOrder: getPhaseOrder(phase, originalIndex),
      }
    })

const buildPhaseLookup = (nodes) => {
  const lookup = new Map()

  nodes.forEach((node, index) => {
    const phase = node.phase || {}
    const aliases = [
      node.id,
      phase.id,
      phase.phase_id,
      phase.phaseId,
      phase.code,
      phase.phase_code,
      phase.phaseCode,
      phase.key,
      phase.name,
      phase.label,
      phase.title,
      index,
      index + 1,
    ]

    aliases.forEach((alias) => {
      if (alias !== undefined && alias !== null && alias !== '') {
        lookup.set(String(alias).trim().toLowerCase(), node.id)
      }
    })
  })

  return lookup
}

const resolveTransitionTarget = (transition, lookup) => {
  if (transition === undefined || transition === null || transition === '') return null

  if (typeof transition === 'object') {
    const candidate = firstDefined(
      transition.target,
      transition.target_id,
      transition.targetId,
      transition.phase,
      transition.phase_id,
      transition.phaseId,
      transition.code,
      transition.id,
      transition.name,
    )

    if (candidate === undefined || candidate === null) return null
    return lookup.get(String(candidate).trim().toLowerCase()) || null
  }

  const normalized = String(transition).trim().toLowerCase()
  if (['stop', 'end', 'completed', 'complete', 'none', 'null'].includes(normalized)) {
    return null
  }

  return lookup.get(normalized) || null
}

const createMappedEdge = (source, target, kind) => ({
  id: `${kind}-${source}-${target}`,
  source,
  target,
  type: 'smoothstep',
  animated: kind === 'error',
  label: kind === 'error' ? 'Errore' : undefined,
  style: {
    stroke: kind === 'error' ? '#DC2626' : '#64748B',
    strokeWidth: 2,
  },
  labelStyle: kind === 'error'
    ? { fill: '#B91C1C', fontWeight: 700 }
    : undefined,
})

const mapTransitionsToEdges = (nodes = []) => {
  if (nodes.length < 2) return []

  const lookup = buildPhaseLookup(nodes)
  const edges = []
  let explicitTransitions = 0

  nodes.forEach((node) => {
    const successTransition = getTransitionValue(node.phase || {}, 'success')
    const errorTransition = getTransitionValue(node.phase || {}, 'error')

    if (successTransition !== undefined && successTransition !== null && successTransition !== '') {
      explicitTransitions += 1
      const target = resolveTransitionTarget(successTransition, lookup)
      if (target && target !== node.id) {
        edges.push(createMappedEdge(node.id, target, 'success'))
      }
    }

    if (errorTransition !== undefined && errorTransition !== null && errorTransition !== '') {
      explicitTransitions += 1
      const target = resolveTransitionTarget(errorTransition, lookup)
      if (target && target !== node.id) {
        edges.push(createMappedEdge(node.id, target, 'error'))
      }
    }
  })

  if (explicitTransitions === 0) {
    return nodes.slice(0, -1).map((node, index) =>
      createMappedEdge(node.id, nodes[index + 1].id, 'success'))
  }

  return edges.filter(
    (edge, index, collection) =>
      collection.findIndex((candidate) => candidate.id === edge.id) === index,
  )
}

const createNodeId = (type) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const createEdgeId = (source, target) =>
  `edge-${source}-${target}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`


const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || '',
).replace(/\/$/, '')

const buildVersionUrl = (procedureCode, versionLabel) =>
  `${API_BASE_URL}/api/v1/procedures/${encodeURIComponent(
    procedureCode,
  )}/versions/${encodeURIComponent(versionLabel)}`

const buildDesignerUrl = (procedureCode, versionLabel) =>
  `${buildVersionUrl(procedureCode, versionLabel)}/designer`

const buildPhasesUrl = (procedureCode, versionLabel) =>
  `${buildVersionUrl(procedureCode, versionLabel)}/phases`

const readApiPayload = async (response) => {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.detail ||
      payload?.message ||
      `Errore HTTP ${response.status}`,
    )
  }

  return payload
}

const normalizeTimeoutForApi = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return '60s'
  return /^\d+(?:\.\d+)?$/.test(text) ? `${text}s` : text
}

const phaseTypeForStep = (step) => {
  const category = String(step?.category || step?.id || '').toLowerCase()
  if (category.includes('logic') || category.includes('condition')) return 'CONDITION'
  if (category.includes('flow')) return 'FLOW'
  if (category.includes('notification') || category.includes('customer')) return 'NOTIFICATION'
  return 'ACTION'
}

const isPersistedPhaseId = (value) => /^\d+$/.test(String(value || ''))

const getTransitionType = (edge) =>
  String(firstDefined(
    edge.transition_type,
    edge.transitionType,
    edge.data?.transition_type,
    edge.data?.transitionType,
    edge.label,
    'SUCCESS',
  )).trim().toUpperCase()

const TRANSITION_STYLES = {
  SUCCESS: { stroke: '#64748B', label: '#475569', animated: false },
  ERROR: { stroke: '#DC2626', label: '#B91C1C', animated: true },
  TIMEOUT: { stroke: '#EA580C', label: '#C2410C', animated: true },
  TRUE: { stroke: '#16A34A', label: '#15803D', animated: false },
  FALSE: { stroke: '#B91C1C', label: '#991B1B', animated: false },
}

const styleEdge = (edge, transitionType, explicitLabel) => {
  const normalizedType = String(transitionType || 'SUCCESS').toUpperCase()
  const visual = TRANSITION_STYLES[normalizedType] || TRANSITION_STYLES.SUCCESS
  const cleanLabel = String(explicitLabel ?? '').trim()

  return {
    ...edge,
    transition_type: normalizedType,
    animated: visual.animated,
    label: cleanLabel || (normalizedType === 'SUCCESS' ? undefined : normalizedType),
    data: {
      ...(edge.data || {}),
      transition_type: normalizedType,
    },
    style: {
      ...(edge.style || {}),
      stroke: visual.stroke,
      strokeWidth: 2,
    },
    labelStyle: {
      ...(edge.labelStyle || {}),
      fill: visual.label,
      fontWeight: 800,
    },
  }
}

const mapDesignerNode = (designerNode, index) => {
  const phase = designerNode?.data || designerNode?.phase || {}
  const style = getCategoryStyle(phase)
  const name = getPhaseName(phase, index)

  return {
    id: String(firstDefined(designerNode?.id, phase.id, `phase-${index + 1}`)),
    type: normalizeCategory(phase),
    label: name,
    description: firstDefined(phase.description, phase.notes, ''),
    categoryLabel: style.label,
    color: style.color,
    position: {
      x: Number(firstDefined(
        designerNode?.position?.x,
        phase.position_x,
        100 + (index % 2) * 330,
      )),
      y: Number(firstDefined(
        designerNode?.position?.y,
        phase.position_y,
        90 + Math.floor(index / 2) * 180,
      )),
    },
    properties: createPhaseProperties(phase, index),
    phase,
    phaseOrder: getPhaseOrder(phase, index),
  }
}

const mapDesignerEdge = (edge, index) => {
  const transitionType = getTransitionType(edge)
  const mapped = {
    id: String(firstDefined(edge.id, `edge-${index + 1}`)),
    source: String(edge.source),
    target: String(edge.target),
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: firstDefined(edge.type, 'smoothstep'),
    data: {
      ...(edge.data || {}),
      transition_type: transitionType,
      sort_order: Number(firstDefined(edge.sort_order, edge.data?.sort_order, index)),
      metadata: edge.metadata || edge.data?.metadata || {},
    },
  }

  return styleEdge(mapped, transitionType, edge.label)
}

const serializeDesigner = (nodes, edges) => {
  const persistedNodeIds = new Set(
    nodes
      .filter((node) => isPersistedPhaseId(node.id))
      .map((node) => String(node.id)),
  )

  return {
    nodes: nodes
      .filter((node) => persistedNodeIds.has(String(node.id)))
      .map((node) => ({
        id: String(node.id),
        position: {
          x: Number(node.position?.x || 0),
          y: Number(node.position?.y || 0),
        },
      })),
    edges: edges
      .filter(
        (edge) =>
          persistedNodeIds.has(String(edge.source)) &&
          persistedNodeIds.has(String(edge.target)),
      )
      .map((edge, index) => {
        const transitionType = getTransitionType(edge)

        return {
          id: String(edge.id),
          source: String(edge.source),
          target: String(edge.target),
          transition_type: transitionType,
          label: firstDefined(
            edge.label,
            transitionType === 'SUCCESS' ? undefined : transitionType,
          ),
          sort_order: Number(firstDefined(
            edge.data?.sort_order,
            edge.sort_order,
            index,
          )),
          metadata: edge.data?.metadata || edge.metadata || {},
        }
      }),
  }
}


const SIMULATION_STEP_DELAY_MS = 1100

const findSimulationStartNode = (nodes, edges) => {
  if (!nodes.length) return null
  const targets = new Set(edges.map((edge) => String(edge.target)))
  return nodes.find((node) => !targets.has(String(node.id))) || nodes[0]
}

const selectSimulationEdge = (edges, sourceNodeId) => {
  const outgoing = edges
    .filter((edge) => String(edge.source) === String(sourceNodeId))
    .sort((left, right) => Number(left.data?.sort_order || 0) - Number(right.data?.sort_order || 0))

  if (!outgoing.length) return null

  return outgoing.find((edge) => getTransitionType(edge) === 'SUCCESS') || outgoing[0]
}

export default function ProcedureDesigner({
  procedure,
  version,
  phases = [],
  variables = [],
}) {
  const fallbackNodes = useMemo(() => mapPhasesToNodes(phases), [phases])
  const fallbackEdges = useMemo(
    () => mapTransitionsToEdges(fallbackNodes),
    [fallbackNodes],
  )

  const procedureCode = firstDefined(
    procedure?.code,
    procedure?.procedure_code,
  )
  const versionLabel = firstDefined(
    version?.version,
    version?.version_code,
    typeof version === 'string' ? version : undefined,
  )

  const designerUrl = useMemo(
    () => procedureCode && versionLabel
      ? buildDesignerUrl(procedureCode, versionLabel)
      : null,
    [procedureCode, versionLabel],
  )

  const [nodes, setNodes] = useState(fallbackNodes)
  const [edges, setEdges] = useState(fallbackEdges)
  const [designerVariables, setDesignerVariables] = useState(variables)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [loadState, setLoadState] = useState('idle')
  const [saveState, setSaveState] = useState('idle')
  const [designerError, setDesignerError] = useState('')
  const [saveRevision, setSaveRevision] = useState(0)
  const [authoringState, setAuthoringState] = useState('idle')
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [simulation, setSimulation] = useState({
    status: 'idle',
    currentNodeId: null,
    currentEdgeId: null,
    history: [],
  })

  const loadedRef = useRef(false)
  const dirtyRef = useRef(false)
  const saveTimerRef = useRef(null)
  const loadAbortRef = useRef(null)
  const saveAbortRef = useRef(null)
  const simulationTimerRef = useRef(null)

  const markDirty = useCallback(() => {
    if (!loadedRef.current) return
    dirtyRef.current = true
    setSaveRevision((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!designerUrl) {
      loadedRef.current = true
      setLoadState('fallback')
      return undefined
    }

    if (loadAbortRef.current) loadAbortRef.current.abort()
    const controller = new AbortController()
    loadAbortRef.current = controller

    loadedRef.current = false
    dirtyRef.current = false
    setLoadState('loading')
    setSaveState('idle')
    setDesignerError('')
    setSelectedNodeId(null)
    setSelectedEdgeId(null)

    const loadDesigner = async () => {
      try {
        const response = await fetch(designerUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.success === false) {
          throw new Error(
            payload?.detail ||
            payload?.message ||
            `Errore HTTP ${response.status}`,
          )
        }

        const apiNodes = Array.isArray(payload.nodes)
          ? payload.nodes.map(mapDesignerNode)
          : []
        const apiEdges = Array.isArray(payload.edges)
          ? payload.edges.map(mapDesignerEdge)
          : []

        setNodes(apiNodes)
        setEdges(apiEdges)
        setDesignerVariables(
          Array.isArray(payload.variables) ? payload.variables : [],
        )
        setLoadState('loaded')
        loadedRef.current = true
      } catch (error) {
        if (error.name === 'AbortError') return

        setNodes(fallbackNodes)
        setEdges(fallbackEdges)
        setDesignerVariables(variables)
        setLoadState('error')
        setDesignerError(
          `Caricamento Designer non riuscito: ${error.message}`,
        )
        loadedRef.current = true
      }
    }

    loadDesigner()

    return () => controller.abort()
  }, [designerUrl, fallbackEdges, fallbackNodes, variables])

  useEffect(() => {
    if (!designerUrl || !loadedRef.current || !dirtyRef.current) return undefined

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveState('pending')

    saveTimerRef.current = setTimeout(async () => {
      if (saveAbortRef.current) saveAbortRef.current.abort()
      const controller = new AbortController()
      saveAbortRef.current = controller

      setSaveState('saving')
      setDesignerError('')

      try {
        const response = await fetch(designerUrl, {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(serializeDesigner(nodes, edges)),
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.success === false) {
          throw new Error(
            payload?.detail ||
            payload?.message ||
            `Errore HTTP ${response.status}`,
          )
        }

        dirtyRef.current = false
        setSaveState('saved')
      } catch (error) {
        if (error.name === 'AbortError') return
        setSaveState('error')
        setDesignerError(`Salvataggio non riuscito: ${error.message}`)
      }
    }, 1000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [designerUrl, edges, nodes, saveRevision])

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current)
    if (loadAbortRef.current) loadAbortRef.current.abort()
    if (saveAbortRef.current) saveAbortRef.current.abort()
  }, [])

  const handleResetSimulation = useCallback(() => {
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current)
    setSimulation({
      status: 'idle',
      currentNodeId: null,
      currentEdgeId: null,
      history: [],
      traversedEdgeIds: [],
      totalNodes: nodes.length,
    })
  }, [])

  const handleStartSimulation = useCallback(() => {
    const startNode = findSimulationStartNode(nodes, edges)
    if (!startNode) {
      setDesignerError('Simulazione non disponibile: la procedura non contiene fasi.')
      return
    }

    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setDesignerError('')
    setSimulation({
      status: 'running',
      currentNodeId: startNode.id,
      currentEdgeId: null,
      history: [{
        nodeId: startNode.id,
        label: startNode.label,
        completed: false,
        transitionType: null,
      }],
      traversedEdgeIds: [],
      totalNodes: nodes.length,
    })
  }, [edges, nodes])

  const handleNextSimulation = useCallback(() => {
    setSimulation((current) => {
      if (current.status !== 'running' || !current.currentNodeId) return current

      const edge = selectSimulationEdge(edges, current.currentNodeId)
      if (!edge) {
        return {
          ...current,
          status: 'completed',
          currentNodeId: current.currentNodeId,
          currentEdgeId: null,
          traversedEdgeIds: current.traversedEdgeIds || [],
          totalNodes: current.totalNodes || nodes.length,
          history: current.history.map((item, index) =>
            index === current.history.length - 1 ? { ...item, completed: true } : item,
          ),
        }
      }

      const targetNode = nodes.find((node) => String(node.id) === String(edge.target))
      if (!targetNode) {
        return { ...current, status: 'error', currentEdgeId: String(edge.id) }
      }

      const completedHistory = current.history.map((item, index) =>
        index === current.history.length - 1
          ? { ...item, completed: true, transitionType: getTransitionType(edge) }
          : item,
      )

      return {
        status: 'running',
        currentNodeId: targetNode.id,
        currentEdgeId: String(edge.id),
        traversedEdgeIds: [
          ...(current.traversedEdgeIds || []),
          String(edge.id),
        ].filter((edgeId, index, collection) => collection.indexOf(edgeId) === index),
        totalNodes: current.totalNodes || nodes.length,
        history: [
          ...completedHistory,
          {
            nodeId: targetNode.id,
            label: targetNode.label,
            completed: false,
            transitionType: null,
          },
        ],
      }
    })
  }, [edges, nodes])

  const handleStopSimulation = useCallback(() => {
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current)
    setSimulation((current) => ({
      ...current,
      status: current.status === 'running' ? 'stopped' : current.status,
      currentEdgeId: null,
    }))
  }, [])

  useEffect(() => {
    if (simulation.status !== 'running') return undefined

    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current)
    simulationTimerRef.current = setTimeout(() => {
      handleNextSimulation()
    }, Math.max(180, Math.round(SIMULATION_STEP_DELAY_MS / simulationSpeed)))

    return () => {
      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current)
    }
  }, [handleNextSimulation, simulation.currentNodeId, simulation.status, simulationSpeed])

  const handleReplaySimulation = useCallback(() => {
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current)
    const startNode = findSimulationStartNode(nodes, edges)
    if (!startNode) return

    setSimulation({
      status: 'running',
      currentNodeId: startNode.id,
      currentEdgeId: null,
      history: [{
        nodeId: startNode.id,
        label: startNode.label,
        completed: false,
        transitionType: null,
      }],
      traversedEdgeIds: [],
      totalNodes: nodes.length,
    })
  }, [edges, nodes])

  const simulationNodes = useMemo(
    () => nodes.map((node) => {
      const active = String(node.id) === String(simulation.currentNodeId || '')
      const completed = simulation.history.some(
        (item) => String(item.nodeId) === String(node.id) && item.completed,
      )

      return {
        ...node,
        simulationState: active ? 'active' : completed ? 'completed' : null,
        style: active
          ? {
              ...(node.style || {}),
              border: '3px solid #2563EB',
              boxShadow: '0 0 0 5px rgba(37, 99, 235, 0.18), 0 12px 30px rgba(37, 99, 235, 0.28)',
            }
          : completed
            ? {
                ...(node.style || {}),
                border: '2px solid #16A34A',
              }
            : node.style,
      }
    }),
    [nodes, simulation.currentNodeId, simulation.history],
  )

  const simulationEdges = useMemo(
    () => edges.map((edge) => {
      const active = String(edge.id) === String(simulation.currentEdgeId || '')
      const traversed = (simulation.traversedEdgeIds || []).some(
        (edgeId) => String(edgeId) === String(edge.id),
      )

      if (active) {
        return {
          ...edge,
          animated: true,
          style: {
            ...(edge.style || {}),
            stroke: '#2563EB',
            strokeWidth: 5,
            strokeDasharray: '10 7',
            filter: 'drop-shadow(0 0 6px rgba(37, 99, 235, 0.85))',
          },
          labelStyle: {
            ...(edge.labelStyle || {}),
            fill: '#1D4ED8',
            fontWeight: 900,
            fontSize: 13,
          },
        }
      }

      if (traversed) {
        return {
          ...edge,
          animated: false,
          style: {
            ...(edge.style || {}),
            stroke: '#16A34A',
            strokeWidth: 4,
            filter: 'drop-shadow(0 0 3px rgba(22, 163, 74, 0.55))',
          },
          labelStyle: {
            ...(edge.labelStyle || {}),
            fill: '#15803D',
            fontWeight: 900,
            fontSize: 12,
          },
        }
      }

      return edge
    }),
    [edges, simulation.currentEdgeId, simulation.traversedEdgeIds],
  )

  const designerContext = useMemo(
    () => ({
      procedure,
      version,
      phases,
      variables: designerVariables,
    }),
    [procedure, version, phases, designerVariables],
  )

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  )

  const selectedEdge = useMemo(
    () => edges.find((edge) => String(edge.id) === String(selectedEdgeId)) || null,
    [edges, selectedEdgeId],
  )

  const selectedEdgeSourceNode = useMemo(
    () => selectedEdge
      ? nodes.find((node) => String(node.id) === String(selectedEdge.source)) || null
      : null,
    [nodes, selectedEdge],
  )

  const selectedEdgeTargetNode = useMemo(
    () => selectedEdge
      ? nodes.find((node) => String(node.id) === String(selectedEdge.target)) || null
      : null,
    [nodes, selectedEdge],
  )

  const addNode = useCallback(async (step, position) => {
    if (!procedureCode || !versionLabel) {
      setDesignerError('Impossibile creare la fase: contesto procedura/versione non disponibile.')
      return
    }

    const targetPosition = position || {
      x: 80 + (nodes.length % 3) * 280,
      y: 80 + Math.floor(nodes.length / 3) * 150,
    }

    setAuthoringState('creating')
    setDesignerError('')

    try {
      const response = await fetch(buildPhasesUrl(procedureCode, versionLabel), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: step.label,
          description: step.description || null,
          type: step.phaseType || phaseTypeForStep(step),
          category: step.runtimeCategory || 'CUSTOM',
          action: step.action || step.id,
          position: targetPosition,
        }),
      })

      const payload = await readApiPayload(response)
      if (!payload?.node) throw new Error('Il backend non ha restituito il nodo creato.')

      const createdNode = mapDesignerNode(payload.node, nodes.length)
      const style = getCategoryStyle({
        ...payload.node.data,
        category: step.category,
      })

      const nextNode = {
        ...createdNode,
        type: step.category || createdNode.type,
        color: step.color || style.color,
        categoryLabel: step.categoryLabel || style.label,
        properties: {
          ...createDefaultProperties(step),
          ...createdNode.properties,
        },
        phase: {
          ...createdNode.phase,
          type:
            step.phaseType ||
            createdNode.phase?.type ||
            'ACTION',
          category:
            step.runtimeCategory ||
            createdNode.phase?.category ||
            'CUSTOM',
          action:
            step.action ||
            createdNode.phase?.action ||
            step.id,
          handler:
            step.action ||
            createdNode.phase?.handler ||
            step.id,
          explorerCategory: step.category,
        },
      }

      setNodes((current) => [...current, nextNode])
      setSelectedNodeId(nextNode.id)
      setSelectedEdgeId(null)
      setAuthoringState('created')
    } catch (error) {
      setAuthoringState('error')
      setDesignerError(`Creazione fase non riuscita: ${error.message}`)
    }
  }, [nodes.length, procedureCode, versionLabel])

  const handleExplorerSelect = useCallback(
    (step) => addNode(step),
    [addNode],
  )

  const handleMoveNode = useCallback((nodeId, position) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId ? { ...node, position } : node,
      ),
    )
    markDirty()
  }, [markDirty])

  const handleRemoveNode = useCallback(async (nodeId) => {
    if (!isPersistedPhaseId(nodeId)) {
      setNodes((current) => current.filter((node) => node.id !== nodeId))
      setEdges((current) =>
        current.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        ),
      )
      setSelectedNodeId((current) => current === nodeId ? null : current)
      markDirty()
      return
    }

    if (!procedureCode || !versionLabel) {
      setDesignerError('Impossibile eliminare la fase: contesto procedura/versione non disponibile.')
      return
    }

    setAuthoringState('deleting')
    setDesignerError('')

    try {
      const response = await fetch(
        `${buildPhasesUrl(procedureCode, versionLabel)}/${encodeURIComponent(nodeId)}`,
        { method: 'DELETE', headers: { Accept: 'application/json' } },
      )
      await readApiPayload(response)

      setNodes((current) => current.filter((node) => node.id !== nodeId))
      setEdges((current) =>
        current.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        ),
      )
      setSelectedNodeId((current) => current === nodeId ? null : current)
      setSelectedEdgeId(null)
      markDirty()
      setAuthoringState('deleted')
    } catch (error) {
      setAuthoringState('error')
      setDesignerError(`Eliminazione fase non riuscita: ${error.message}`)
    }
  }, [markDirty, procedureCode, versionLabel])

  const handlePropertiesChange = useCallback(
    (nextProperties) => {
      if (!selectedNodeId) return

      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                label: nextProperties.name || node.label,
                description: nextProperties.description || node.description,
                properties: nextProperties,
              }
            : node,
        ),
      )
    },
    [selectedNodeId],
  )

  const handlePropertiesSave = useCallback(async (nextProperties) => {
    if (!selectedNodeId || !isPersistedPhaseId(selectedNodeId)) return
    if (!procedureCode || !versionLabel) {
      setDesignerError('Impossibile salvare la fase: contesto procedura/versione non disponibile.')
      return
    }

    setAuthoringState('updating')
    setDesignerError('')

    try {
      const response = await fetch(
        `${buildPhasesUrl(procedureCode, versionLabel)}/${encodeURIComponent(selectedNodeId)}`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: nextProperties.name,
            description: nextProperties.description || null,
            timeout: normalizeTimeoutForApi(nextProperties.timeout),
            retry: Number(nextProperties.retries || 0),
            continue_on_error: nextProperties.failurePolicy === 'CONTINUE',
            input_variables: nextProperties.inputVariables || null,
            output_variables: nextProperties.outputVariables || null,
          }),
        },
      )

      const payload = await readApiPayload(response)
      if (!payload?.node) throw new Error('Il backend non ha restituito la fase aggiornata.')

      const persistedNode = mapDesignerNode(payload.node, 0)
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                ...persistedNode,
                type: node.type,
                color: node.color,
                categoryLabel: node.categoryLabel,
                properties: {
                  ...nextProperties,
                  ...persistedNode.properties,
                },
                phase: {
                  ...node.phase,
                  ...persistedNode.phase,
                },
              }
            : node,
        ),
      )
      setAuthoringState('updated')
    } catch (error) {
      setAuthoringState('error')
      setDesignerError(`Aggiornamento fase non riuscito: ${error.message}`)
    }
  }, [procedureCode, selectedNodeId, versionLabel])

  const handleConnect = useCallback((connection) => {
    if (!connection.source || !connection.target) return
    if (connection.source === connection.target) return

    let inserted = false
    setEdges((current) => {
      const alreadyExists = current.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          edge.sourceHandle === connection.sourceHandle &&
          edge.targetHandle === connection.targetHandle,
      )

      if (alreadyExists) return current
      inserted = true

      return addEdge(
        styleEdge(
          {
            ...connection,
            id: createEdgeId(connection.source, connection.target),
            type: 'smoothstep',
            data: { transition_type: 'SUCCESS', sort_order: current.length, metadata: {} },
          },
          'SUCCESS',
          '',
        ),
        current,
      )
    })

    if (inserted) markDirty()
    setSelectedNodeId(null)
  }, [markDirty])

  const handleEdgesChange = useCallback((changes) => {
    setEdges((current) => applyEdgeChanges(changes, current))

    const removedEdgeIds = changes
      .filter((change) => change.type === 'remove')
      .map((change) => String(change.id))

    if (removedEdgeIds.length) {
      setSelectedEdgeId((current) =>
        current && removedEdgeIds.includes(String(current)) ? null : current,
      )
    }

    if (changes.some((change) => change.type !== 'select')) {
      markDirty()
    }
  }, [markDirty])

  const handleEdgePropertiesChange = useCallback((nextProperties) => {
    if (!selectedEdgeId) return

    setEdges((current) =>
      current.map((edge) => {
        if (String(edge.id) !== String(selectedEdgeId)) return edge

        const transitionType = String(
          nextProperties.transition_type || getTransitionType(edge),
        ).toUpperCase()

        const updated = styleEdge(
          {
            ...edge,
            data: {
              ...(edge.data || {}),
              sort_order: Number(nextProperties.sort_order ?? edge.data?.sort_order ?? 0),
            },
          },
          transitionType,
          nextProperties.label,
        )

        return updated
      }),
    )

    markDirty()
  }, [markDirty, selectedEdgeId])

  const handleRemoveEdge = useCallback((edgeId) => {
    if (!edgeId) return

    setEdges((current) =>
      current.filter((edge) => String(edge.id) !== String(edgeId)),
    )
    setSelectedEdgeId((current) =>
      String(current || '') === String(edgeId) ? null : current,
    )
    markDirty()
  }, [markDirty])

  const handleSelectNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
  }, [])

  const handleSelectEdge = useCallback((edgeId) => {
    setSelectedEdgeId(edgeId)
    setSelectedNodeId(null)
  }, [])

  const handleClear = useCallback(async () => {
    if (!nodes.length) return
    if (!window.confirm('Eliminare tutte le fasi della versione? L’operazione non è reversibile.')) return
    if (!procedureCode || !versionLabel) {
      setDesignerError('Impossibile svuotare il workflow: contesto procedura/versione non disponibile.')
      return
    }

    setAuthoringState('deleting')
    setDesignerError('')

    const failures = []
    for (const node of nodes) {
      if (!isPersistedPhaseId(node.id)) continue
      try {
        const response = await fetch(
          `${buildPhasesUrl(procedureCode, versionLabel)}/${encodeURIComponent(node.id)}`,
          { method: 'DELETE', headers: { Accept: 'application/json' } },
        )
        await readApiPayload(response)
      } catch (error) {
        failures.push(`${node.label || node.id}: ${error.message}`)
      }
    }

    if (failures.length) {
      setAuthoringState('error')
      setDesignerError(`Svuotamento incompleto: ${failures.join(' · ')}`)
      return
    }

    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    markDirty()
    setAuthoringState('deleted')
  }, [markDirty, nodes, procedureCode, versionLabel])

  const persistenceLabel = useMemo(() => {
    if (authoringState === 'creating') return 'Creazione fase nel backend...'
    if (authoringState === 'updating') return 'Aggiornamento proprietà nel backend...'
    if (authoringState === 'deleting') return 'Eliminazione fase dal backend...'
    if (authoringState === 'created') return 'Fase creata nel backend'
    if (authoringState === 'updated') return 'Proprietà salvate nel backend'
    if (authoringState === 'deleted') return 'Fase eliminata dal backend'
    if (loadState === 'loading') return 'Caricamento workflow dal backend...'
    if (saveState === 'pending') return 'Modifiche in attesa di salvataggio...'
    if (saveState === 'saving') return 'Salvataggio automatico...'
    if (saveState === 'saved') return 'Salvato nel backend'
    if (loadState === 'fallback') return 'Modalità locale: contesto API non disponibile'
    if (loadState === 'error' || saveState === 'error') return designerError
    return 'Workflow sincronizzato con il backend'
  }, [authoringState, designerError, loadState, saveState])

  const persistenceColor =
    loadState === 'error' || saveState === 'error' || authoringState === 'error'
      ? '#B91C1C'
      : saveState === 'saved'
        ? '#15803D'
        : '#64748B'

  return (
    <WorkspaceTemplate
      spacing={2.4}
      data-procedure-code={designerContext.procedure?.code}
      data-version={designerContext.version?.version}
    >
      <Stack spacing={0.6}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 900, color: '#1E293B' }}
        >
          Procedure Designer
        </Typography>

        <Typography variant="body2" sx={{ color: '#64748B' }}>
          {procedure?.name
            ? `${procedure.name} · ${procedure.code} · ${versionLabel || ''}`
            : 'Progetta e configura le procedure automatiche di Proximity.'}
        </Typography>

        <Typography
          variant="caption"
          sx={{ color: persistenceColor, fontWeight: 700 }}
        >
          {persistenceLabel}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            xl: '330px minmax(560px, 1fr) 420px',
          },
          gap: 2.4,
          alignItems: 'stretch',
        }}
      >
        <StepExplorer onSelectStep={handleExplorerSelect} />

        <SimulationPanel
          simulation={simulation}
          speed={simulationSpeed}
          onSpeedChange={setSimulationSpeed}
          onStart={handleStartSimulation}
          onNext={handleNextSimulation}
          onStop={handleStopSimulation}
          onReset={handleResetSimulation}
          onReplay={handleReplaySimulation}
        />
        <WorkflowCanvas
          nodes={simulationNodes}
          edges={simulationEdges}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          onAddNode={addNode}
          onMoveNode={handleMoveNode}
          onRemoveNode={handleRemoveNode}
          onClear={handleClear}
          onConnect={handleConnect}
          onEdgesChange={handleEdgesChange}
          onRemoveEdge={handleRemoveEdge}
        />

        <PropertiesPanel
          selectedStep={selectedNode}
          selectedEdge={selectedEdge}
          sourceNode={selectedEdgeSourceNode}
          targetNode={selectedEdgeTargetNode}
          value={selectedNode?.properties}
          onChange={handlePropertiesChange}
          onSave={handlePropertiesSave}
          onEdgeChange={handleEdgePropertiesChange}
          onRemoveEdge={handleRemoveEdge}
        />
      </Box>
    </WorkspaceTemplate>
  )
}
