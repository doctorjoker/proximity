 import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import {
  getProximityActionIcon,
  getProximityIconConfig,
} from '../../icons/proximityIconRegistry'

const AcsIcon = getProximityIconConfig('ACS').icon
const ActiveIcon = getProximityActionIcon('ACTIVE')
const HistoricalIcon = getProximityIconConfig('DIAGNOSTICS').icon

function formatDate(value) {
  if (!value) return 'N/D'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date)
}

function resolveDeviceId(props) {
  return (
    props.deviceId ||
    props.device?.id ||
    props.device?.device_id ||
    props.device?.deviceId ||
    props.selectedDevice?.id ||
    props.selected?.id ||
    props.overview?.id ||
    null
  )
}

export default function AcsTab(props) {
  const deviceId = useMemo(() => resolveDeviceId(props), [props])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!deviceId) {
      setData(null)
      setError('Identificativo dispositivo non disponibile.')
      return undefined
    }

    const controller = new AbortController()
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(
          `/api/v1/devices/${encodeURIComponent(deviceId)}/acs-identities`,
          { signal: controller.signal },
        )
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.detail || `Errore API ${response.status}`)
        }
        const payload = await response.json()
        if (mounted) setData(payload)
      } catch (err) {
        if (err.name !== 'AbortError' && mounted) {
          setError(err.message || 'Impossibile caricare le identità ACS.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
      controller.abort()
    }
  }, [deviceId])

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 260 }}>
        <CircularProgress size={30} />
      </Stack>
    )
  }

  if (error) return <Alert severity="error">{error}</Alert>
  if (!data) return null

  return (
    <Stack spacing={2.25}>
      <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <AcsIcon size={20} />
              <Typography variant="h6" fontWeight={700}>
                Identità ACS
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Il CPE fisico resta l'identità stabile; gli ACS ID rappresentano le sue identità operative.
            </Typography>
          </Box>
          <Chip label={`${data.identity_count} identità`} variant="outlined" size="small" />
        </Stack>
      </Paper>

      <Stack spacing={1.5}>
        {(data.identities || []).map((identity) => (
          <Paper
            key={identity.id || identity.acs_device_id}
            variant="outlined"
            sx={{
              p: 2.25,
              borderRadius: 3,
              borderWidth: identity.preferred ? 2 : 1,
            }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                spacing={1.25}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    ACS Device ID
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {identity.acs_device_id}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {identity.preferred && (
                    <Chip
                      icon={<ActiveIcon size={16} />}
                      label="Preferita"
                      size="small"
                      color="primary"
                    />
                  )}
                  <Chip
                    icon={
                      identity.active
                        ? <ActiveIcon size={16} />
                        : <HistoricalIcon size={16} />
                    }
                    label={identity.active ? 'Attiva' : 'Storica'}
                    size="small"
                    color={identity.active ? 'success' : 'default'}
                    variant={identity.active ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label={identity.product_class || 'ProductClass N/D'}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Stack>

              <Divider />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 1.5,
                }}
              >
                <Info label="Prima rilevazione" value={formatDate(identity.first_seen)} />
                <Info label="Ultima rilevazione" value={formatDate(identity.last_seen)} />
                <Info label="Firmware" value={identity.software_version || 'N/D'} />
                <Info label="Hardware" value={identity.hardware_version || 'N/D'} />
              </Box>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  )
}

function Info({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Box>
  )
}
