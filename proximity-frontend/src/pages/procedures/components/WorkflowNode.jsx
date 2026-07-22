import { Box, Chip, Stack, Typography } from '@mui/material'
import { IconGripVertical, IconX } from '@tabler/icons-react'

export const NODE_WIDTH = 250
export const NODE_HEIGHT = 112

export default function WorkflowNode({
  node,
  selected,
  onSelect,
  onRemove,
  onPointerDown,
}) {
  const NodeIcon = node.icon

  return (
    <Box
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.(node.id)
      }}
      sx={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        bgcolor: '#FFFFFF',
        border: '2px solid',
        borderColor: selected ? node.color : '#CBD5E1',
        borderRadius: 2.5,
        boxShadow: selected
          ? `0 12px 30px ${node.color}2E`
          : '0 8px 20px rgba(15, 23, 42, 0.10)',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        zIndex: selected ? 3 : 2,
      }}
    >
      <Box
        onPointerDown={(event) => onPointerDown?.(event, node.id)}
        sx={{
          display: 'grid',
          gridTemplateColumns: '34px minmax(0, 1fr) 28px',
          gap: 1,
          alignItems: 'center',
          px: 1.1,
          py: 0.9,
          bgcolor: node.color,
          color: '#FFFFFF',
          cursor: 'grab',
          touchAction: 'none',
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
          {NodeIcon ? <NodeIcon size={19} stroke={1.9} /> : <IconGripVertical size={19} />}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', opacity: 0.78, fontWeight: 800, lineHeight: 1.1 }}
          >
            {node.categoryLabel || 'Step'}
          </Typography>
          <Typography
            variant="body2"
            noWrap
            sx={{ fontWeight: 900, lineHeight: 1.2 }}
          >
            {node.properties?.name || node.label}
          </Typography>
        </Box>

        <Box
          component="button"
          type="button"
          aria-label="Rimuovi nodo"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onRemove?.(node.id)
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
          {node.properties?.description || node.description}
        </Typography>

        <Stack direction="row" spacing={0.7} alignItems="center">
          <Chip
            size="small"
            label={`${node.properties?.timeout ?? 60}s`}
            sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: '#E2E8F0', color: '#334155' }}
          />
          <Chip
            size="small"
            label={`Retry ${node.properties?.retries ?? 3}`}
            sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: '#E2E8F0', color: '#334155' }}
          />
        </Stack>
      </Stack>
    </Box>
  )
}
