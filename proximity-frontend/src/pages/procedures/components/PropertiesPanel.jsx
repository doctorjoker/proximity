import { Box, Paper, Stack, Typography } from '@mui/material'
import { IconAdjustmentsHorizontal } from '@tabler/icons-react'

import EdgeProperties from './EdgeProperties'
import NodeProperties from './NodeProperties'

function EmptyPropertiesState() {
  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight: 560,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 3,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Stack spacing={1.2} alignItems="center">
        <Box
          sx={{
            width: 58,
            height: 58,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 3,
            bgcolor: '#0F172A',
            color: '#FFFFFF',
          }}
        >
          <IconAdjustmentsHorizontal size={29} stroke={1.7} />
        </Box>

        <Typography sx={{ fontWeight: 900, color: '#1E293B' }}>
          Properties Panel
        </Typography>

        <Typography variant="body2" sx={{ maxWidth: 320, color: '#64748B' }}>
          Seleziona una fase oppure una connessione nel canvas per configurarne le proprietà.
        </Typography>
      </Stack>
    </Paper>
  )
}

export default function PropertiesPanel({
  selectedStep,
  selectedEdge,
  sourceNode,
  targetNode,
  value,
  onChange,
  onSave,
  onEdgeChange,
  onRemoveEdge,
}) {
  if (selectedEdge) {
    return (
      <EdgeProperties
        edge={selectedEdge}
        sourceNode={sourceNode}
        targetNode={targetNode}
        onChange={onEdgeChange}
        onRemove={onRemoveEdge}
      />
    )
  }

  if (selectedStep) {
    return (
      <NodeProperties
        selectedStep={selectedStep}
        value={value}
        onChange={onChange}
        onSave={onSave}
      />
    )
  }

  return <EmptyPropertiesState />
}
