import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconCertificate,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconFileCheck,
  IconRefresh,
  IconShieldCheck,
} from '@tabler/icons-react';

import { getDeviceQualifications } from '../services/deviceQualificationApi';

const LEVEL_META = {
  QUALIFIED: { label: 'Qualificata', color: 'success', score: 100 },
  LIMITED: { label: 'Limitata', color: 'warning', score: 65 },
  TESTED: { label: 'Testata', color: 'info', score: 75 },
  DISCOVERED: { label: 'Rilevata', color: 'default', score: 35 },
  BROKEN: { label: 'Non funzionante', color: 'error', score: 0 },
  DEPRECATED: { label: 'Deprecata', color: 'default', score: 10 },
};

function formatDate(value) {
  if (!value) return 'Mai verificata';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('it-IT');
}

function capabilityLabel(code) {
  const labels = {
    'wifi.configuration': 'Configurazione WiFi',
    'wifi.scan.execute': 'Esecuzione scansione WiFi',
    'wifi.scan.results_exported': 'Esportazione reti vicine',
    'diagnostics.tr143.download': 'TR-143 Download',
    'diagnostics.tr143.upload': 'TR-143 Upload',
  };
  return labels[code] || code;
}

function capabilityArea(code) {
  if (String(code).startsWith('wifi.')) return 'WiFi';
  if (String(code).startsWith('diagnostics.')) return 'Diagnostics';
  if (String(code).startsWith('firmware.')) return 'Firmware';
  if (String(code).startsWith('acs.')) return 'ACS';
  if (String(code).startsWith('procedures.')) return 'Procedure';
  return 'Altro';
}

function levelMeta(level) {
  return LEVEL_META[level] || { label: level || 'N/D', color: 'default', score: 0 };
}

function ScoreSummary({ payload, items }) {
  const score = Number(payload?.score?.score || 0);
  const qualified = Number(payload?.score?.qualified || 0);
  const total = Number(payload?.score?.total || items.length || 0);
  const limited = items.filter((item) => item?.level === 'LIMITED').length;
  const discovered = items.filter((item) => item?.level === 'DISCOVERED').length;
  const unsupported = items.filter((item) => item?.level === 'BROKEN').length;
  const areaScores = useMemo(() => {
    const grouped = {};
    items.forEach((item) => {
      const area = capabilityArea(item?.capability_code);
      grouped[area] = grouped[area] || [];
      grouped[area].push(item);
    });
    return Object.entries(grouped).map(([area, values]) => ({
      area,
      count: values.length,
      limited: values.filter((item) => item?.level === 'LIMITED').length,
      score: Math.round(values.reduce((sum, item) => sum + levelMeta(item?.level).score, 0) / values.length),
    }));
  }, [items]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="overline" sx={{ fontWeight: 900 }}>Riepilogo qualificazione</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(220px, .8fr) minmax(260px, .9fr) minmax(320px, 1.4fr)' }, gap: 2, mt: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Qualification score</Typography>
          <Typography variant="h3" sx={{ fontWeight: 950, lineHeight: 1.05 }}>{score}<Typography component="span" variant="h6">/100</Typography></Typography>
          <LinearProgress variant="determinate" value={score} sx={{ height: 8, borderRadius: 4, my: 1.25 }} />
          <Chip size="small" color={payload?.qualification_status === 'QUALIFIED' ? 'success' : 'warning'} label={payload?.qualification_status || 'N/D'} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Profilo {payload?.profile_code || 'N/D'}</Typography>
        </Box>
        <Stack spacing={1.15}>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Capacità qualificate</Typography><Typography sx={{ fontWeight: 900 }}>{qualified}/{total}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Capacità limitate</Typography><Typography sx={{ fontWeight: 900 }}>{limited}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Capacità scoperte</Typography><Typography sx={{ fontWeight: 900 }}>{discovered}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Non supportate</Typography><Typography sx={{ fontWeight: 900 }}>{unsupported}</Typography></Stack>
        </Stack>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Maturità per area</Typography>
          <Stack spacing={1.25}>
            {areaScores.map((entry) => (
              <Box key={entry.area}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{entry.area}</Typography>
                  <Chip size="small" label={`${entry.score}%`} color={entry.score >= 80 ? 'success' : entry.score >= 50 ? 'warning' : 'default'} />
                </Stack>
                <LinearProgress variant="determinate" value={entry.score} sx={{ height: 6, borderRadius: 3, mt: 0.6 }} />
                <Typography variant="caption" color="text.secondary">{entry.count} capability{entry.limited ? ` · ${entry.limited} limitata` : ''}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}

function CapabilityMatrix({ items }) {
  const [openCode, setOpenCode] = useState(null);
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Matrice capability</Typography></Box>
      <Divider />
      <TableContainer sx={{ maxHeight: 430 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>Capability</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>Livello</TableCell>
              <TableCell>Metodo</TableCell>
              <TableCell>Ultima verifica</TableCell>
              <TableCell align="center">Evidenze</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const code = item?.capability_code;
              const meta = levelMeta(item?.level);
              const evidence = Array.isArray(item?.evidence) ? item.evidence : [];
              const limitations = Array.isArray(item?.limitations) ? item.limitations : [];
              const firmware = Array.isArray(item?.validated_firmware) ? item.validated_firmware : [];
              const open = openCode === code;
              return (
                <React.Fragment key={code}>
                  <TableRow hover>
                    <TableCell><IconButton size="small" onClick={() => setOpenCode(open ? null : code)}>{open ? <IconChevronDown size={17} /> : <IconChevronRight size={17} />}</IconButton></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 850 }}>{capabilityLabel(code)}</Typography><Typography variant="caption" color="text.secondary">{code}</Typography></TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={capabilityArea(code)} /></TableCell>
                    <TableCell><Chip size="small" color={meta.color} label={meta.label} /></TableCell>
                    <TableCell><Typography variant="body2">{item?.method || 'N/D'}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{formatDate(item?.last_verified_at)}</Typography></TableCell>
                    <TableCell align="center"><Chip size="small" variant="outlined" label={evidence.length} /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, borderBottom: open ? undefined : 0 }}>
                      <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(220px,.7fr) minmax(260px,1fr) minmax(320px,1.3fr)' }, gap: 2 }}>
                            <Box><Typography variant="caption" color="text.secondary">Firmware validati</Typography>{firmware.length ? firmware.map((value) => <Typography key={value} variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>) : <Typography variant="body2">Non ancora validato</Typography>}</Box>
                            <Box><Typography variant="caption" color="text.secondary">Limitazioni</Typography>{limitations.length ? limitations.map((value) => <Typography key={value} variant="body2">• {value}</Typography>) : <Typography variant="body2">Nessuna limitazione nota</Typography>}</Box>
                            <Box><Typography variant="caption" color="text.secondary">Evidenze</Typography>{evidence.length ? evidence.map((entry) => <Box key={entry?.code || entry?.title} sx={{ mt: 0.5 }}><Typography variant="body2" sx={{ fontWeight: 800 }}>{entry?.title || entry?.code}</Typography><Typography variant="caption" color="text.secondary">{entry?.result}</Typography></Box>) : <Typography variant="body2">Nessuna evidenza registrata</Typography>}</Box>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" color="text.secondary">{items.length} capability</Typography></Box>
    </Paper>
  );
}

function SidePanels({ items }) {
  const limitations = useMemo(() => items.flatMap((item) => (item?.limitations || []).map((value) => ({ capability: item.capability_code, value }))), [items]);
  const evidence = useMemo(() => items.flatMap((item) => (item?.evidence || []).map((entry) => ({ ...entry, capability: item.capability_code }))).sort((a, b) => String(b?.observed_at || '').localeCompare(String(a?.observed_at || ''))), [items]);
  return (
    <Stack spacing={1.5}>
      <Accordion variant="outlined" disableGutters>
        <AccordionSummary expandIcon={<IconChevronDown size={17} />}><Stack direction="row" spacing={1} alignItems="center"><IconAlertTriangle size={17} /><Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Limitazioni note</Typography><Chip size="small" label={limitations.length} /></Stack></AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>{limitations.length ? limitations.map((entry) => <Alert key={`${entry.capability}-${entry.value}`} severity="warning" variant="outlined" sx={{ mb: 0.75 }}>{capabilityLabel(entry.capability)}: {entry.value}</Alert>) : <Alert severity="success" variant="outlined">Nessuna limitazione nota.</Alert>}</AccordionDetails>
      </Accordion>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><IconFileCheck size={17} /><Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Evidenze recenti</Typography></Stack>
        {evidence.slice(0, 3).map((entry, index) => <React.Fragment key={entry?.code || index}>{index > 0 ? <Divider sx={{ my: 1 }} /> : null}<Typography variant="caption" color="primary" sx={{ fontWeight: 850 }}>{entry?.code || capabilityLabel(entry.capability)}</Typography><Typography variant="body2" sx={{ fontWeight: 850 }}>{entry?.title || capabilityLabel(entry.capability)}</Typography><Typography variant="caption" color="text.secondary">{entry?.result || 'Nessun risultato'} · {formatDate(entry?.observed_at)}</Typography></React.Fragment>)}
        {!evidence.length ? <Typography variant="body2" color="text.secondary">Nessuna evidenza registrata.</Typography> : null}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><IconClock size={17} /><Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Cronologia qualificazione</Typography></Stack>
        {evidence.slice(0, 5).map((entry, index) => <Box key={`timeline-${entry?.code || index}`} sx={{ position: 'relative', pl: 2.5, pb: index === Math.min(4, evidence.length - 1) ? 0 : 1.5, '&:before': { content: '""', position: 'absolute', left: 6, top: 7, width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }, '&:after': index === Math.min(4, evidence.length - 1) ? undefined : { content: '""', position: 'absolute', left: 9.5, top: 15, bottom: 0, width: 1, bgcolor: 'divider' } }}><Typography variant="caption" color="text.secondary">{formatDate(entry?.observed_at)}</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{entry?.title || capabilityLabel(entry.capability)}</Typography></Box>)}
      </Paper>
    </Stack>
  );
}

export default function QualificationTab({ device, deviceId: explicitDeviceId }) {
  const deviceId = explicitDeviceId || device?.id || device?.device_id;
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!deviceId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    try { setPayload(await getDeviceQualifications(deviceId, controller.signal)); }
    catch (exc) { if (exc?.name !== 'AbortError') setError(exc?.message || 'Qualificazione non disponibile'); }
    finally { setLoading(false); }
    return () => controller.abort();
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return (
    <Stack spacing={1.5} sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
        <Box><Stack direction="row" spacing={1} alignItems="center"><IconCertificate size={21} /><Typography variant="h6" sx={{ fontWeight: 950 }}>Centro qualificazione</Typography>{payload?.qualification_status ? <Chip size="small" color={payload.qualification_status === 'QUALIFIED' ? 'success' : 'warning'} label={payload.qualification_status} /> : null}</Stack><Typography variant="body2" color="text.secondary">Capability, limitazioni ed evidenze del profilo CPE qualificato.</Typography></Box>
        <Button variant="contained" size="small" startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={16} />} onClick={load} disabled={loading}>Aggiorna qualificazione</Button>
      </Stack>
      {error ? <Alert severity="warning">{error}</Alert> : null}
      {!loading && !error && !payload ? <Alert severity="info">Nessun profilo di qualificazione associato al dispositivo.</Alert> : null}
      {payload ? <><ScoreSummary payload={payload} items={items} /><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 340px' }, gap: 1.5, alignItems: 'start' }}><CapabilityMatrix items={items} /><SidePanels items={items} /></Box></> : null}
    </Stack>
  );
}
