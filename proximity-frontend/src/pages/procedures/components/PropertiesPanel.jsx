import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconDeviceFloppy,
  IconRefresh,
  IconRotateClockwise,
} from '@tabler/icons-react'

const DEFAULT_VALUES = {
  name: '',
  description: '',
  timeout: 60,
  retries: 3,
  retryDelay: 5,
  rollbackEnabled: false,
  failurePolicy: 'STOP',
  inputVariables: 'service_code\ncustomer_id\nrouter_serial',
  outputVariables: 'status\nexecution_id\nlogs',
}

const FAILURE_POLICIES = [
  { value: 'STOP', label: 'Interrompi la procedura' },
  { value: 'CONTINUE', label: 'Continua con lo step successivo' },
  { value: 'ROLLBACK', label: 'Avvia rollback' },
]

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <Stack direction="row" spacing={1.1} alignItems="flex-start">
      <Box
        sx={{
          width: 34,
          height: 34,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 2,
          bgcolor: '#0F172A',
          color: '#FFFFFF',
        }}
      >
        <Icon size={18} stroke={1.9} />
      </Box>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 900, color: '#1E293B' }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {description}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  )
}

export default function PropertiesPanel({
  selectedStep,
  value,
  onChange,
  onSave,
}) {
  const [form, setForm] = useState(DEFAULT_VALUES)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!selectedStep) {
      setForm(DEFAULT_VALUES)
      setSaved(false)
      return
    }

    setForm({
      ...DEFAULT_VALUES,
      ...value,
      name: value?.name || selectedStep.label || '',
      description: value?.description || selectedStep.description || '',
    })
    setSaved(false)
  }, [selectedStep, value])

  const validation = useMemo(() => {
    const errors = []

    if (!form.name.trim()) errors.push('Il nome dello step è obbligatorio.')
    if (Number(form.timeout) < 1) errors.push('Il timeout deve essere almeno 1 secondo.')
    if (Number(form.retries) < 0) errors.push('Il numero di retry non può essere negativo.')
    if (Number(form.retryDelay) < 0) errors.push('Il ritardo retry non può essere negativo.')

    return {
      valid: errors.length === 0,
      errors,
    }
  }, [form])

  const updateField = (field) => (event) => {
    const nextValue =
      event.target.type === 'checkbox'
        ? event.target.checked
        : event.target.value

    const nextForm = {
      ...form,
      [field]: nextValue,
    }

    setForm(nextForm)
    setSaved(false)
    onChange?.(nextForm)
  }

  const handleSave = () => {
    if (!validation.valid || !selectedStep) return
    onSave?.(form)
    setSaved(true)
  }

  if (!selectedStep) {
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
            Seleziona uno step nello Step Explorer per configurarne proprietà,
            timeout, retry, input e output.
          </Typography>
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight: 560,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          px: 2.2,
          py: 1.8,
          bgcolor: selectedStep.color || '#2563EB',
          color: '#FFFFFF',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.82, fontWeight: 800 }}>
              {selectedStep.categoryLabel || 'Step'}
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.15 }}>
              {form.name || selectedStep.label}
            </Typography>
          </Box>

          <Chip
            size="small"
            label="Bozza"
            sx={{
              bgcolor: 'rgba(255,255,255,0.16)',
              color: '#FFFFFF',
              fontWeight: 900,
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          />
        </Stack>
      </Box>

      <Stack spacing={2.2} sx={{ p: 2.2 }}>
        <Box>
          <SectionTitle
            icon={IconAdjustmentsHorizontal}
            title="Configurazione generale"
            description="Identità e comportamento principale dello step."
          />

          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <TextField
              fullWidth
              required
              size="small"
              label="Nome step"
              value={form.name}
              onChange={updateField('name')}
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              label="Descrizione"
              value={form.description}
              onChange={updateField('description')}
            />

            <TextField
              fullWidth
              select
              size="small"
              label="Policy in caso di errore"
              value={form.failurePolicy}
              onChange={updateField('failurePolicy')}
            >
              {FAILURE_POLICIES.map((policy) => (
                <MenuItem key={policy.value} value={policy.value}>
                  {policy.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SectionTitle
            icon={IconClock}
            title="Timeout e retry"
            description="Controlla durata massima e tentativi automatici."
          />

          <Box
            sx={{
              mt: 1.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.3,
            }}
          >
            <TextField
              size="small"
              type="number"
              label="Timeout (s)"
              value={form.timeout}
              onChange={updateField('timeout')}
              inputProps={{ min: 1 }}
            />

            <TextField
              size="small"
              type="number"
              label="Retry"
              value={form.retries}
              onChange={updateField('retries')}
              inputProps={{ min: 0 }}
            />

            <TextField
              size="small"
              type="number"
              label="Ritardo (s)"
              value={form.retryDelay}
              onChange={updateField('retryDelay')}
              inputProps={{ min: 0 }}
            />
          </Box>

          <FormControlLabel
            sx={{ mt: 0.8 }}
            control={
              <Checkbox
                checked={Boolean(form.rollbackEnabled)}
                onChange={updateField('rollbackEnabled')}
              />
            }
            label="Abilita rollback automatico"
          />
        </Box>

        <Divider />

        <Box>
          <SectionTitle
            icon={IconRefresh}
            title="Variabili"
            description="Una variabile per riga. Il binding dinamico arriverà nel canvas."
          />

          <Box
            sx={{
              mt: 1.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 1.4,
            }}
          >
            <TextField
              fullWidth
              multiline
              minRows={5}
              size="small"
              label="Input"
              value={form.inputVariables}
              onChange={updateField('inputVariables')}
              placeholder="service_code"
            />

            <TextField
              fullWidth
              multiline
              minRows={5}
              size="small"
              label="Output"
              value={form.outputVariables}
              onChange={updateField('outputVariables')}
              placeholder="status"
            />
          </Box>
        </Box>

        <Divider />

        <Box>
          {validation.valid ? (
            <Alert
              severity="success"
              icon={<IconCheck size={20} />}
              sx={{ mb: 1.5 }}
            >
              Configurazione valida. Lo step può essere salvato.
            </Alert>
          ) : (
            <Alert
              severity="warning"
              icon={<IconAlertTriangle size={20} />}
              sx={{ mb: 1.5 }}
            >
              {validation.errors.join(' ')}
            </Alert>
          )}

          {saved ? (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Configurazione salvata nello stato locale del Designer.
            </Alert>
          ) : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
            <Button
              fullWidth
              variant="contained"
              disableElevation
              startIcon={<IconDeviceFloppy size={19} />}
              disabled={!validation.valid}
              onClick={handleSave}
              sx={{
                bgcolor: selectedStep.color || '#2563EB',
                fontWeight: 900,
                '&:hover': {
                  bgcolor: selectedStep.color || '#2563EB',
                  filter: 'brightness(0.92)',
                },
              }}
            >
              Salva proprietà
            </Button>

            <Button
              variant="outlined"
              startIcon={<IconRotateClockwise size={18} />}
              onClick={() => {
                const resetForm = {
                  ...DEFAULT_VALUES,
                  name: selectedStep.label || '',
                  description: selectedStep.description || '',
                }
                setForm(resetForm)
                setSaved(false)
                onChange?.(resetForm)
              }}
            >
              Ripristina
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}
