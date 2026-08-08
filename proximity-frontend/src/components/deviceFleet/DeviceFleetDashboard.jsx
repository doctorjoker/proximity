import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconAntennaBars5,
  IconDevices,
  IconSearch,
  IconServer,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react';

const API_BASE = '/api/v1';

function SummaryCard({ icon, label, value, helper }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 0, height: '100%' }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800, lineHeight: 1 }}>
              {value}
            </Typography>
            {helper ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                {helper}
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 2, bgcolor: 'action.hover' }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}


function normalizePresenceForLegacyTable(item) {
  const presenceState = String(item?.presence_state || item?.status || 'NEVER_SEEN').toUpperCase();
  const operationallyRecent = presenceState === 'ONLINE' || presenceState === 'STALE';

  return {
    ...item,
    // Preserve the authoritative state for new UI components.
    presence_state: presenceState,
    // Compatibility for the legacy operational table and selected-device preview,
    // which still understand only the old binary online/offline fields.
    online: operationallyRecent,
    status: operationallyRecent ? 'ONLINE' : presenceState,
    presence_label: presenceState === 'STALE' ? 'Recente' : undefined,
    presence_is_recent: presenceState === 'STALE',
  };
}

function PresenceChip({ state }) {
  const normalized = String(state || 'NEVER_SEEN').toUpperCase();
  const map = {
    ONLINE: { label: 'Online', color: 'success' },
    STALE: { label: 'Recente', color: 'warning' },
    OFFLINE: { label: 'Offline', color: 'default' },
    NEVER_SEEN: { label: 'Mai visto', color: 'default' },
  };
  const item = map[normalized] || map.NEVER_SEEN;
  return <Chip size="small" label={item.label} color={item.color} variant={normalized === 'OFFLINE' || normalized === 'NEVER_SEEN' ? 'outlined' : 'filled'} />;
}

export default function DeviceFleetDashboard({
  onOpenDevice,
  renderDeviceTable,
  autoRefreshSeconds = 30,
}) {
  const [items, setItems] = useState([]);
  const [technicalCount, setTechnicalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [presence, setPresence] = useState('ALL');
  const [vendor, setVendor] = useState('ALL');
  const [model, setModel] = useState('ALL');
  const [identityDevice, setIdentityDevice] = useState(null);
  const [identities, setIdentities] = useState([]);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState('');

  const openIdentities = async (event, item) => {
    event?.stopPropagation?.();
    setIdentityDevice(item);
    setIdentities([]);
    setIdentityError('');
    setIdentityLoading(true);
    try {
      const response = await fetch(`${API_BASE}/devices/${item.id}/acs-identities`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Impossibile caricare le identità ACS');
      const payload = await response.json();
      setIdentities(Array.isArray(payload?.items) ? payload.items : []);
    } catch (exc) {
      setIdentityError(exc?.message || 'Errore durante il caricamento delle identità ACS');
    } finally {
      setIdentityLoading(false);
    }
  };

  const closeIdentities = () => {
    setIdentityDevice(null);
    setIdentities([]);
    setIdentityError('');
  };

  const load = async () => {
    try {
      setError('');
      const [fleetResponse, allResponse] = await Promise.all([
        fetch(`${API_BASE}/devices`, { headers: { Accept: 'application/json' } }),
        fetch(`${API_BASE}/devices?include_technical=true`, { headers: { Accept: 'application/json' } }),
      ]);
      if (!fleetResponse.ok || !allResponse.ok) throw new Error('Impossibile caricare l’inventario dispositivi');
      const fleetPayload = await fleetResponse.json();
      const allPayload = await allResponse.json();
      const fleet = Array.isArray(fleetPayload?.items) ? fleetPayload.items : [];
      const all = Array.isArray(allPayload?.items) ? allPayload.items : [];
      setItems(fleet);
      setTechnicalCount(all.filter((item) => String(item.inventory_kind || '').startsWith('TECHNICAL_')).length);
    } catch (exc) {
      setError(exc?.message || 'Errore durante il caricamento della flotta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, Math.max(10, autoRefreshSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefreshSeconds]);

  const vendors = useMemo(() => [...new Set(items.map((item) => item.manufacturer).filter(Boolean))].sort(), [items]);
  const models = useMemo(() => [...new Set(items.map((item) => item.model).filter(Boolean))].sort(), [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const haystack = [
        item.device_code,
        item.serial_number,
        item.manufacturer,
        item.model,
        item.customer_name,
        item.customer_code,
        item.service_code,
        item.acs_device_id,
      ].filter(Boolean).join(' ').toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (presence !== 'ALL' && String(item.presence_state || '').toUpperCase() !== presence) return false;
      if (vendor !== 'ALL' && item.manufacturer !== vendor) return false;
      if (model !== 'ALL' && item.model !== model) return false;
      return true;
    });
  }, [items, model, presence, query, vendor]);

  const legacyCompatibleItems = useMemo(
    () => filtered.map(normalizePresenceForLegacyTable),
    [filtered],
  );

  const summary = useMemo(() => ({
    total: items.length,
    online: items.filter((item) => item.presence_state === 'ONLINE').length,
    offline: items.filter((item) => ['OFFLINE', 'NEVER_SEEN'].includes(item.presence_state)).length,
    stale: items.filter((item) => item.presence_state === 'STALE').length,
    multiIdentity: items.filter((item) => item.has_multiple_acs_identities).length,
  }), [items]);

  const fallbackTable = (
    <Stack spacing={1.25}>
      {filtered.map((item) => (
        <Card
          key={item.id || item.device_code}
          variant="outlined"
          onClick={() => onOpenDevice?.(item)}
          sx={{ cursor: onOpenDevice ? 'pointer' : 'default', '&:hover': { borderColor: 'primary.main', boxShadow: 1 } }}
        >
          <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {item.manufacturer || 'Vendor N/D'} {item.model || 'Modello N/D'}
                  </Typography>
                  <PresenceChip state={item.presence_state} />
                  {item.has_multiple_acs_identities ? (
                    <Chip
                      size="small"
                      color="warning"
                      clickable
                      onClick={(event) => openIdentities(event, item)}
                      icon={<IconAlertTriangle size={14} />}
                      label={`${item.acs_identity_count} identità ACS`}
                    />
                  ) : null}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Seriale {item.serial_number || 'N/D'} · {item.device_code}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Ultimo contatto: {item.last_seen ? new Date(item.last_seen).toLocaleString('it-IT') : 'mai'}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ))}
      {!filtered.length ? <Alert severity="info">Nessun dispositivo corrisponde ai filtri selezionati.</Alert> : null}
    </Stack>
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Device Fleet</Typography>
        <Typography variant="body2" color="text.secondary">
          Inventario fisico riconciliato, stato presenza reale e accesso diretto a Device360.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(5, 1fr)' }, gap: 1.5 }}>
        <SummaryCard label="Customer CPE" value={summary.total} helper="Apparati fisici" icon={<IconDevices size={23} />} />
        <SummaryCard label="Online" value={summary.online} helper="Inform entro 5 min" icon={<IconWifi size={23} />} />
        <SummaryCard label="Offline" value={summary.offline} helper={summary.stale ? `${summary.stale} recenti` : 'Oltre 30 min'} icon={<IconWifiOff size={23} />} />
        <SummaryCard label="Dispositivi tecnici" value={technicalCount} helper="Esclusi dalla flotta" icon={<IconServer size={23} />} />
        <SummaryCard label="Multi identità" value={summary.multiIdentity} helper="TR-098 / TR-181" icon={<IconAntennaBars5 size={23} />} />
      </Box>

      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25}>
            <TextField
              fullWidth
              size="small"
              label="Cerca seriale, cliente, modello o ACS ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Presenza</InputLabel>
              <Select value={presence} label="Presenza" onChange={(event) => setPresence(event.target.value)}>
                <MenuItem value="ALL">Tutti</MenuItem>
                <MenuItem value="ONLINE">Online</MenuItem>
                <MenuItem value="STALE">Recenti</MenuItem>
                <MenuItem value="OFFLINE">Offline</MenuItem>
                <MenuItem value="NEVER_SEEN">Mai visti</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Vendor</InputLabel>
              <Select value={vendor} label="Vendor" onChange={(event) => setVendor(event.target.value)}>
                <MenuItem value="ALL">Tutti</MenuItem>
                {vendors.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Modello</InputLabel>
              <Select value={model} label="Modello" onChange={(event) => setModel(event.target.value)}>
                <MenuItem value="ALL">Tutti</MenuItem>
                {models.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box> : null}
      {!loading && !error ? (
        typeof renderDeviceTable === 'function'
          ? renderDeviceTable({ items: legacyCompatibleItems, onOpenDevice, PresenceChip, openIdentities })
          : fallbackTable
      ) : null}

      <Dialog open={Boolean(identityDevice)} onClose={closeIdentities} fullWidth maxWidth="md">
        <DialogTitle>
          Identità ACS · {identityDevice?.manufacturer || 'Vendor N/D'} {identityDevice?.model || 'Modello N/D'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Apparato fisico {identityDevice?.serial_number || 'seriale N/D'}. Le identità sono rappresentazioni tecniche dello stesso CPE e non dispositivi distinti.
            </Typography>
            {identityLoading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={28} /></Box> : null}
            {identityError ? <Alert severity="error">{identityError}</Alert> : null}
            {!identityLoading && !identityError && identities.map((identity, index) => (
              <Card key={identity.id || identity.acs_device_id} variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={1}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {identity.data_model || identity.product_class || `Identità ${index + 1}`}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {identity.acs_device_id}
                        </Typography>
                      </Box>
                      <PresenceChip state={identity.presence_state} />
                    </Stack>
                    <Divider />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                      <Typography variant="caption" color="text.secondary">
                        ProductClass: {identity.product_class || 'N/D'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Firmware: {identity.software_version || 'N/D'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ultimo Inform: {identity.last_seen ? new Date(identity.last_seen).toLocaleString('it-IT') : 'mai'}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {!identityLoading && !identityError && !identities.length ? (
              <Alert severity="info">Nessuna identità ACS registrata per questo apparato.</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeIdentities}>Chiudi</Button>
          {identityDevice && onOpenDevice ? (
            <Button variant="contained" onClick={() => { closeIdentities(); onOpenDevice(identityDevice); }}>
              Apri Device360
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
