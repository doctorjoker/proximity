import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  IconArrowsRight,
  IconCheck,
  IconRoute,
  IconTrash,
} from '@tabler/icons-react'

const TRANSITION_TYPES = [
  { value: 'SUCCESS', label: 'Successo', color: '#64748B', description: 'Percorso standard completato correttamente.' },
  { value: 'ERROR', label: 'Errore', color: '#DC2626', description: 'Percorso attivato quando la fase fallisce.' },
  { value: 'TIMEOUT', label: 'Timeout', color: '#EA580C', description: 'Percorso attivato allo scadere del timeout.' },
  { value: 'TRUE', label: 'Vero', color: '#16A34A', description: 'Ramo positivo di una decisione.' },
  { value: 'FALSE', label: 'Falso', color: '#B91C1C', description: 'Ramo negativo di una decisione.' },
]

const readTransitionType = (edge) =>
  String(edge?.data?.transition_type || edge?.transition_type || 'SUCCESS').toUpperCase()

const nodeLabel = (node, fallback) =>
  node?.properties?.name || node?.label || node?.phase?.name || fallback

export default function EdgeProperties({
  edge,
  sourceNode,
  targetNode,
  onChange,
  onRemove,
}) {
  const [form, setForm] = useState({ transitionType: 'SUCCESS', label: '', sortOrder: 0 })

  useEffect(() => {
    if (!edge) return
    const transitionType = readTransitionType(edge)
    setForm({
      transitionType,
      label: edge.label || '',
      sortOrder: Number(edge.data?.sort_order ?? edge.sort_order ?? 0),
    })
  }, [edge])

  const transition = useMemo(
    () => TRANSITION_TYPES.find((item) => item.value === form.transitionType) || TRANSITION_TYPES[0],
    [form.transitionType],
  )

  const update = (patch) => {
    const next = { ...form, ...patch }
    setForm(next)
    onChange?.({
      transition_type: next.transitionType,
      label: next.label,
      sort_order: Number(next.sortOrder || 0),
    })
  }

  if (!edge) return null

  return (
    <Paper
      variant="outlined"
      sx={{ minHeight: 560, borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}
    >
      <Box sx={{ px: 2.2, py: 1.8, bgcolor: transition.color, color: '#FFFFFF' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.82, fontWeight: 800 }}>
              Transizione
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.15 }}>
              {transition.label}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={form.transitionType}
            sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#FFFFFF', fontWeight: 900 }}
          />
        </Stack>
      </Box>

      <Stack spacing={2.2} sx={{ p: 2.2 }}>
        <Box>
          <Stack direction="row" spacing={1.1} alignItems="flex-start">
            <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: '#0F172A', color: '#FFFFFF' }}>
              <IconRoute size={18} stroke={1.9} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 900, color: '#1E293B' }}>
                Percorso
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Origine e destinazione della connessione selezionata.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <Chip label={nodeLabel(sourceNode, edge.source)} sx={{ maxWidth: 150, fontWeight: 800 }} />
            <IconArrowsRight size={20} color="#64748B" />
            <Chip label={nodeLabel(targetNode, edge.target)} sx={{ maxWidth: 150, fontWeight: 800 }} />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 900, color: '#1E293B' }}>
            Configurazione transizione
          </Typography>

          <Stack spacing={1.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Tipo transizione"
              value={form.transitionType}
              onChange={(event) => {
                const nextType = event.target.value
                const currentDefault = form.label === form.transitionType || form.label === ''
                update({
                  transitionType: nextType,
                  label: currentDefault && nextType !== 'SUCCESS' ? nextType : currentDefault ? '' : form.label,
                })
              }}
            >
              {TRANSITION_TYPES.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.value} · {item.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              size="small"
              label="Etichetta"
              value={form.label}
              placeholder={form.transitionType === 'SUCCESS' ? 'Nessuna etichetta' : form.transitionType}
              onChange={(event) => update({ label: event.target.value })}
              helperText="Lascia vuoto per usare l'etichetta automatica del tipo."
            />

            <TextField
              fullWidth
              size="small"
              type="number"
              label="Ordine di valutazione"
              value={form.sortOrder}
              inputProps={{ min: 0 }}
              onChange={(event) => update({ sortOrder: event.target.value })}
            />
          </Stack>
        </Box>

        <Alert severity="success" icon={<IconCheck size={20} />}>
          {transition.description} Le modifiche vengono salvate automaticamente.
        </Alert>

        <Button
          color="error"
          variant="outlined"
          startIcon={<IconTrash size={18} />}
          onClick={() => {
            if (!window.confirm('Eliminare la connessione selezionata?')) return
            onRemove?.(edge.id)
          }}
        >
          Elimina connessione
        </Button>
      </Stack>
    </Paper>
  )
}
