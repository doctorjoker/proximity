import { useCallback, useMemo, useRef } from 'react'
import { Box, Chip, Stack, Typography } from '@mui/material'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  IconLayoutGrid,
  IconTrash,
  IconX,
} from '@tabler/icons-react'

const GRID_SIZE = 20
const NODE_WIDTH = 250

function EnterpriseNode({ id, data, selected }) {
  const NodeIcon = data.icon
  const color = data.color || '#2563EB'
  const properties = data.properties || {}

  return (
    <Box
      sx={{
        width: NODE_WIDTH,
        bgcolor: '#FFFFFF',
        border: '2px solid',
        borderColor: selected ? color : '#CBD5E1',
        borderRadius: 2.5,
        boxShadow: selected
          ? `0 12px 30px ${color}2E`
          : '0 8px 20px rgba(15, 23, 42, 0.10)',
        overflow: 'visible',
        userSelect: 'none',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 12,
          height: 12,
          border: '2px solid #FFFFFF',
          background: '#334155',
        }}
      />

      <Box
        className="proximity-node-drag-handle"
        sx={{
          display: 'grid',
          gridTemplateColumns: '34px minmax(0, 1fr) 28px',
          gap: 1,
          alignItems: 'center',
          px: 1.1,
          py: 0.9,
          bgcolor: color,
          color: '#FFFFFF',
          cursor: 'grab',
          borderRadius: '8px 8px 0 0',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.16)',
          }}
        >
          {NodeIcon ? <NodeIcon size={19} stroke={1.9} /> : null}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', opacity: 0.78, fontWeight: 800, lineHeight: 1.1 }}
          >
            {data.categoryLabel || 'Step'}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 900, lineHeight: 1.2 }}>
            {properties.name || data.label}
          </Typography>
        </Box>

        <Box
          component="button"
          type="button"
          aria-label="Rimuovi nodo"
          className="nodrag"
          onClick={(event) => {
            event.stopPropagation()
            data.onRemove?.(id)
          }}
          sx={{
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            p: 0,
            border: 0,
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.12)',
            color: '#FFFFFF',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
          }}
        >
          <IconX size={16} stroke={2.2} />
        </Box>
      </Box>

      <Stack spacing={0.75} sx={{ px: 1.35, py: 1.15 }}>
        <Typography
          variant="caption"
          sx={{
            color: '#64748B',
            lineHeight: 1.25,
            minHeight: 31,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {properties.description || data.description}
        </Typography>

        <Stack direction="row" spacing={0.7} alignItems="center">
          <Chip
            size="small"
            label={`${properties.timeout ?? 60}s`}
            sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: '#E2E8F0', color: '#334155' }}
          />
          <Chip
            size="small"
            label={`Retry ${properties.retries ?? 3}`}
            sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: '#E2E8F0', color: '#334155' }}
          />
        </Stack>
      </Stack>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          border: '2px solid #FFFFFF',
          background: color,
        }}
      />
    </Box>
  )
}

const nodeTypes = {
  enterprise: EnterpriseNode,
}

function WorkflowCanvasInner({
  nodes = [],
  edges = [],
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onAddNode,
  onMoveNode,
  onRemoveNode,
  onClear,
  onConnect,
  onEdgesChange,
  onRemoveEdge,
}) {
  const wrapperRef = useRef(null)
  const { screenToFlowPosition } = useReactFlow()

  const flowNodes = useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: 'enterprise',
        position: node.position,
        selected: node.id === selectedNodeId,
        dragHandle: '.proximity-node-drag-handle',
        data: {
          ...node,
          onRemove: onRemoveNode,
        },
      })),
    [nodes, selectedNodeId, onRemoveNode],
  )

  const handleNodesChange = useCallback(
    (changes) => {
      const nextNodes = applyNodeChanges(changes, flowNodes)

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging !== true) {
          onMoveNode?.(change.id, change.position)
        }
        if (change.type === 'remove') {
          onRemoveNode?.(change.id)
        }
        if (change.type === 'select' && change.selected) {
          onSelectNode?.(change.id)
        }
      })

      return nextNodes
    },
    [flowNodes, onMoveNode, onRemoveNode, onSelectNode],
  )

  const handleEdgesChange = useCallback(
    (changes) => {
      if (onEdgesChange) {
        onEdgesChange(changes)
        return
      }

      applyEdgeChanges(changes, edges)
    },
    [edges, onEdgesChange],
  )

  const handleConnect = useCallback(
    (connection) => {
      if (onConnect) {
        onConnect(connection)
        return
      }

      addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: false,
        },
        edges,
      )
    },
    [edges, onConnect],
  )

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()

      const rawStep = event.dataTransfer.getData('application/proximity-step')
      if (!rawStep) return

      try {
        const step = JSON.parse(rawStep)
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        onAddNode?.(step, {
          x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
          y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
        })
      } catch (error) {
        console.error('Payload step non valido', error)
      }
    },
    [onAddNode, screenToFlowPosition],
  )

  return (
    <Box
      sx={{
        minHeight: 560,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: '#F8FAFC',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 1.6,
          py: 1.2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#FFFFFF',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 34,
              height: 34,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1.8,
              bgcolor: '#0F172A',
              color: '#FFFFFF',
            }}
          >
            <IconLayoutGrid size={19} stroke={1.9} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 900, color: '#1E293B' }}>
              Workflow Canvas
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              React Flow: trascina, collega, sposta e seleziona i nodi
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.8} alignItems="center">
          <Chip
            size="small"
            label={`${nodes.length} nodi`}
            sx={{ fontWeight: 800, bgcolor: '#E2E8F0', color: '#334155' }}
          />
          <Chip
            size="small"
            label={`${edges.length} connessioni`}
            sx={{ fontWeight: 800, bgcolor: '#E2E8F0', color: '#334155' }}
          />

          {selectedEdgeId ? (
            <Box
              component="button"
              type="button"
              onClick={() => {
                if (!window.confirm('Eliminare la connessione selezionata?')) return
                onRemoveEdge?.(selectedEdgeId)
              }}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1,
                height: 30,
                border: '1px solid #FCA5A5',
                borderRadius: 1.5,
                bgcolor: '#FEF2F2',
                color: '#B91C1C',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                '&:hover': { borderColor: '#DC2626', bgcolor: '#FEE2E2' },
              }}
            >
              <IconTrash size={15} />
              Elimina connessione
            </Box>
          ) : null}

          {nodes.length > 0 ? (
            <Box
              component="button"
              type="button"
              onClick={onClear}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1,
                height: 30,
                border: '1px solid #CBD5E1',
                borderRadius: 1.5,
                bgcolor: '#FFFFFF',
                color: '#475569',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                '&:hover': { borderColor: '#DC2626', color: '#DC2626' },
              }}
            >
              <IconTrash size={15} />
              Svuota
            </Box>
          ) : null}
        </Stack>
      </Box>

      <Box ref={wrapperRef} sx={{ flex: 1, minHeight: 500 }}>
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeClick={(_, node) => onSelectNode?.(node.id)}
          onPaneClick={() => {
            onSelectNode?.(null)
            onSelectEdge?.(null)
          }}
          onEdgeClick={(_, edge) => onSelectEdge?.(edge.id)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          snapToGrid
          snapGrid={[GRID_SIZE, GRID_SIZE]}
          fitView
          minZoom={0.3}
          maxZoom={1.8}
          deleteKeyCode={['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: '#64748B', strokeWidth: 2 },
          }}
        >
          <Background gap={GRID_SIZE} size={1} color="#CBD5E1" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => node.data?.color || '#2563EB'}
            maskColor="rgba(248, 250, 252, 0.78)"
          />
        </ReactFlow>
      </Box>
    </Box>
  )
}

export default function WorkflowCanvas(props) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}