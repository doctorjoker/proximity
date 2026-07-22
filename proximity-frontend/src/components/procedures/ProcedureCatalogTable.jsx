import {
  Button,
  Chip,
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
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'

import { ProximityIcon, resolveProcedureIconDomain } from '../icons'
import { StatusChip } from '../proximity'
import {
  formatDate,
  getActiveVersion,
  getDeprecatedVersions,
  getDraftVersion,
  getVersions,
  operatorDescription,
  operatorName,
  procedureCode,
} from './catalogUtils'

const CATEGORY_CONFIG = {
  PROVISIONING: { label: 'Provisioning' },
  NETWORKING: { label: 'Networking' },
  ACS: { label: 'ACS' },
  CUSTOMER: { label: 'Customer' },
  MAINTENANCE: { label: 'Maintenance' },
  OTHER: { label: 'Altro' },
}

function lifecycleOf(procedure, versionsByCode) {
  const active = getActiveVersion(procedure, versionsByCode)
  const draft = getDraftVersion(procedure, versionsByCode)
  if (active) return { status: 'ACTIVE', label: 'Attiva', active, draft }
  if (draft) return { status: 'DRAFT', label: 'Bozza', active, draft }
  return { status: 'DEPRECATED', label: 'Storica', active, draft }
}

function procedureCategory(procedure) {
  const raw = String(procedure?.category || procedure?.domain || procedure?.procedure_category || '').toUpperCase()
  if (CATEGORY_CONFIG[raw]) return raw
  const code = procedureCode(procedure).toUpperCase()
  if (code.includes('ROUTER') || code.includes('ACS') || code.includes('DEVICE')) return 'ACS'
  if (code.includes('PROVISION') || code.includes('SERVICE')) return 'PROVISIONING'
  if (code.includes('CUSTOMER')) return 'CUSTOMER'
  return 'OTHER'
}

function triggerOf(procedure) {
  const raw = String(procedure?.trigger_type || procedure?.trigger || procedure?.start_mode || 'MANUAL').toUpperCase()
  if (raw.includes('SCHED') || raw.includes('CRON')) return 'SCHEDULED'
  if (raw.includes('EVENT')) return 'EVENT'
  if (raw.includes('API')) return 'API'
  return 'MANUAL'
}

function triggerLabel(value) {
  return { MANUAL: 'Manuale', EVENT: 'Evento', SCHEDULED: 'Scheduler', API: 'API' }[value] || value
}

function ownerOf(procedure) {
  return procedure?.owner_name || procedure?.owner || procedure?.created_by || 'Platform Operations'
}

function environmentOf(procedure) {
  return String(procedure?.environment || procedure?.target_environment || 'PROD').toUpperCase()
}

function latestUpdate(procedure, versions) {
  const latest = versions[0]
  return latest?.updated_at || latest?.created_at || procedure?.updated_at || procedure?.created_at
}

export function catalogMetadata(procedure, versionsByCode) {
  const versions = getVersions(procedure, versionsByCode)
  const lifecycle = lifecycleOf(procedure, versionsByCode)
  const latest = versions[0]
  return {
    code: procedureCode(procedure),
    name: operatorName(procedureCode(procedure), procedure?.name),
    description: operatorDescription(procedure),
    category: procedureCategory(procedure),
    iconDomain: resolveProcedureIconDomain({ ...procedure, code: procedureCode(procedure) }),
    trigger: triggerOf(procedure),
    owner: ownerOf(procedure),
    environment: environmentOf(procedure),
    lifecycle,
    versions,
    latest,
    phases: latest?.phase_count ?? latest?.steps_count ?? latest?.steps?.length ?? 0,
    updatedAt: latestUpdate(procedure, versions),
    historicalCount: getDeprecatedVersions(procedure, versionsByCode).length,
    errors24h: Number(procedure?.errors_24h || procedure?.failed_executions_24h || 0),
  }
}

function ProcedureIdentity({ metadata }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 300 }}>
      <ProximityIcon domain={metadata.iconDomain} />
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 950, color: 'text.primary', lineHeight: 1.25 }} noWrap>
          {metadata.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={800} noWrap>
          {metadata.code}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.3,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {metadata.description}
        </Typography>
      </Stack>
    </Stack>
  )
}

export default function ProcedureCatalogTable({ procedures, versionsByCode, selectedCode, onSelect, onOpenVersions }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)', minHeight: 300 }}>
        <Table stickyHeader sx={{ minWidth: 1180 }}>
          <TableHead>
            <TableRow>
              {['Procedura', 'Stato', 'Categoria / Trigger', 'Versione', 'Owner / Ambiente', 'Ultima modifica', 'Operatività', ''].map((label) => (
                <TableCell key={label} sx={{ bgcolor: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 950, letterSpacing: 0.35, textTransform: 'uppercase', borderBottomColor: '#dbe5f0' }}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {procedures.map((procedure) => {
              const metadata = catalogMetadata(procedure, versionsByCode)
              const selected = selectedCode === metadata.code
              const category = CATEGORY_CONFIG[metadata.category] || CATEGORY_CONFIG.OTHER
              return (
                <TableRow
                  hover
                  key={metadata.code}
                  selected={selected}
                  onClick={() => onSelect(procedure)}
                  sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: 'rgba(37,99,235,0.055)' }, '& td': { borderBottomColor: '#edf2f7' } }}
                >
                  <TableCell><ProcedureIdentity metadata={metadata} /></TableCell>
                  <TableCell>
                    <Stack spacing={0.7} alignItems="flex-start">
                      <StatusChip status={metadata.lifecycle.status} label={metadata.lifecycle.label} variant="outlined" sx={{ fontWeight: 900 }} />
                      {metadata.lifecycle.draft && metadata.lifecycle.active && (
                        <Chip size="small" label={`Bozza ${metadata.lifecycle.draft.version || ''}`} color="warning" variant="outlined" sx={{ fontWeight: 850 }} />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.65} alignItems="flex-start">
                      <Chip size="small" label={category.label} variant="outlined" sx={{ fontWeight: 850 }} />
                      <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                        <ScheduleOutlinedIcon sx={{ fontSize: 15 }} />
                        <Typography variant="caption" fontWeight={800}>{triggerLabel(metadata.trigger)}</Typography>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={950}>{metadata.lifecycle.active?.version || metadata.latest?.version || '-'}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>{metadata.versions.length} versioni · {metadata.phases} fasi</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={900}>{metadata.owner}</Typography>
                    <Chip size="small" label={metadata.environment} color={metadata.environment === 'PROD' ? 'primary' : 'default'} variant="outlined" sx={{ mt: 0.6, height: 22, fontWeight: 900 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={900}>{formatDate(metadata.updatedAt)}</Typography>
                    <Typography variant="caption" color="text.secondary">Catalogo versionato</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Stack spacing={0.65}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary" fontWeight={800}>Errori 24h</Typography>
                        <Typography variant="caption" color={metadata.errors24h ? 'error.main' : 'success.main'} fontWeight={950}>{metadata.errors24h}</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={metadata.errors24h ? Math.min(100, metadata.errors24h * 12) : 0} color={metadata.errors24h ? 'error' : 'success'} sx={{ height: 5, borderRadius: 99, bgcolor: '#e2e8f0' }} />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => onSelect(procedure)} sx={{ textTransform: 'none', fontWeight: 900 }}>Apri</Button>
                      <Tooltip title="Apri gestione versioni">
                        <IconButton size="small" onClick={() => onOpenVersions(procedure)}><MoreHorizIcon /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
