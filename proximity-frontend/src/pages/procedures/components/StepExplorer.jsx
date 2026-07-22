import { useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  IconArrowsSplit,
  IconChevronDown,
  IconClockPause,
  IconCloudCog,
  IconDeviceDesktopCog,
  IconDeviceFloppy,
  IconGitBranch,
  IconMail,
  IconMessage,
  IconNetwork,
  IconPlayerPlay,
  IconPower,
  IconRefresh,
  IconRepeat,
  IconRouter,
  IconSearch,
  IconSettingsAutomation,
  IconShieldCheck,
  IconTicket,
  IconUserCog,
  IconVersions,
  IconWifi,
} from '@tabler/icons-react'

const actionStep = (id, label, description, icon, runtimeCategory, action) => ({
  id,
  label,
  description,
  icon,
  phaseType: 'ACTION',
  runtimeCategory,
  action,
})

const structuralStep = (
  id,
  label,
  description,
  icon,
  phaseType,
  runtimeCategory,
  action,
) => ({
  id,
  label,
  description,
  icon,
  phaseType,
  runtimeCategory,
  action,
})

const STEP_GROUPS = [
  {
    id: 'provisioning',
    label: 'Provisioning',
    description: 'Configurazione servizi e apparati',
    color: '#2563EB',
    icon: IconSettingsAutomation,
    items: [
      actionStep('router-config', 'Configura router', 'Applica configurazioni al CPE', IconRouter, 'ACS', 'router_config'),
      actionStep('pppoe-config', 'Configura PPPoE', 'Imposta credenziali e interfaccia', IconUserCog, 'ACS', 'provision_pppoe'),
      actionStep('vlan-config', 'Configura VLAN', 'Imposta tagging e profilo servizio', IconNetwork, 'ACS', 'configure_vlan'),
      actionStep('wifi-config', 'Configura Wi-Fi', 'SSID, sicurezza e canali radio', IconWifi, 'ACS', 'configure_wifi'),
    ],
  },
  {
    id: 'acs',
    label: 'ACS',
    description: 'Azioni operative GenieACS',
    color: '#0891B2',
    icon: IconCloudCog,
    items: [
      actionStep('acs-refresh', 'Aggiorna parametri', 'Richiede un refresh dei parametri', IconRefresh, 'ACS', 'refresh_parameters'),
      actionStep('acs-reboot', 'Riavvia dispositivo', 'Invia il comando di reboot', IconPower, 'ACS', 'reboot_device'),
      actionStep('acs-verify', 'Verifica configurazione', 'Controlla i valori runtime', IconShieldCheck, 'VALIDATION', 'verify_runtime'),
    ],
  },
  {
    id: 'firmware',
    label: 'Firmware',
    description: 'Upgrade e verifica software',
    color: '#7C3AED',
    icon: IconDeviceDesktopCog,
    items: [
      actionStep('firmware-upgrade', 'Aggiorna firmware', 'Avvia il download e l’upgrade', IconDeviceFloppy, 'ACS', 'firmware_upgrade'),
      actionStep('firmware-verify', 'Verifica versione', 'Controlla la versione installata', IconVersions, 'VALIDATION', 'verify_firmware_version'),
    ],
  },
  {
    id: 'customer',
    label: 'Customer',
    description: 'Comunicazioni e customer care',
    color: '#D97706',
    icon: IconUserCog,
    items: [
      actionStep('customer-email', 'Invia e-mail', 'Invia una comunicazione al cliente', IconMail, 'OSS', 'send_customer_email'),
      actionStep('customer-sms', 'Invia SMS', 'Invia una notifica testuale', IconMessage, 'OSS', 'send_customer_sms'),
      actionStep('customer-ticket', 'Crea ticket', 'Apre una richiesta di assistenza', IconTicket, 'OSS', 'create_customer_ticket'),
    ],
  },
  {
    id: 'logic',
    label: 'Logic',
    description: 'Condizioni e controllo esecuzione',
    color: '#DC2626',
    icon: IconGitBranch,
    items: [
      structuralStep('logic-if', 'Condizione IF', 'Dirama il flusso su una condizione', IconGitBranch, 'DECISION', 'VALIDATION', 'evaluate_condition'),
      structuralStep('logic-delay', 'Attesa', 'Sospende temporaneamente il flusso', IconClockPause, 'WAIT', 'EVENT', 'wait_duration'),
      actionStep('logic-retry', 'Retry', 'Ripete una fase in errore', IconRepeat, 'CUSTOM', 'retry_phase'),
    ],
  },
  {
    id: 'flow',
    label: 'Flow',
    description: 'Struttura della procedura',
    color: '#16A34A',
    icon: IconArrowsSplit,
    items: [
      structuralStep('flow-start', 'Start', 'Punto iniziale della procedura', IconPlayerPlay, 'START', 'CUSTOM', 'noop'),
      structuralStep('flow-decision', 'Decisione', 'Dirama il flusso in base a una condizione', IconGitBranch, 'DECISION', 'VALIDATION', 'evaluate_condition'),
      structuralStep('flow-wait', 'Attesa', 'Sospende il flusso fino a un evento o timeout', IconClockPause, 'WAIT', 'EVENT', 'wait_event'),
      structuralStep('flow-end', 'Fine', 'Punto conclusivo della procedura', IconPower, 'END', 'CUSTOM', 'noop'),
      actionStep('flow-parallel', 'Esecuzione parallela', 'Avvia più rami contemporaneamente', IconArrowsSplit, 'CUSTOM', 'parallel_execution'),
    ],
  },
]

function enrichStep(item, group) {
  return {
    ...item,
    category: group.id,
    categoryLabel: group.label,
    color: group.color,
  }
}

function StepItem({ item, color, group, onSelect }) {
  const ItemIcon = item.icon

  return (
    <Box
      role="button"
      tabIndex={0}
      draggable
      onClick={() => onSelect?.(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(item)
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          'application/proximity-step',
          JSON.stringify(enrichStep(item, group)),
        )
        event.dataTransfer.effectAllowed = 'copy'
      }}
      sx={{
        display: 'grid',
        gridTemplateColumns: '38px minmax(0, 1fr)',
        gap: 1.2,
        alignItems: 'center',
        px: 1.15,
        py: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        cursor: 'grab',
        transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        '&:hover': {
          transform: 'translateX(2px)',
          borderColor: color,
          boxShadow: `0 6px 18px ${color}1F`,
        },
        '&:active': {
          cursor: 'grabbing',
        },
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 2,
          bgcolor: color,
          color: '#FFFFFF',
        }}
      >
        <ItemIcon size={20} stroke={1.9} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 800,
            color: '#1E293B',
            lineHeight: 1.15,
          }}
        >
          {item.label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.25,
            color: '#64748B',
            lineHeight: 1.2,
          }}
        >
          {item.description}
        </Typography>
      </Box>
    </Box>
  )
}

export default function StepExplorer({ onSelectStep }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(STEP_GROUPS.map((group) => group.id))

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) return STEP_GROUPS

    return STEP_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [
          item.label,
          item.description,
          item.phaseType,
          item.runtimeCategory,
          item.action,
          group.label,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    })).filter((group) => group.items.length > 0)
  }, [query])

  const totalSteps = STEP_GROUPS.reduce((total, group) => total + group.items.length, 0)

  const handleAccordionChange = (groupId) => (_, isExpanded) => {
    setExpanded((current) =>
      isExpanded
        ? [...new Set([...current, groupId])]
        : current.filter((id) => id !== groupId),
    )
  }

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 560,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#1E293B' }}>
              Step Explorer
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Trascina o seleziona una fase
            </Typography>
          </Box>

          <Chip
            size="small"
            label={`${totalSteps} step`}
            sx={{
              fontWeight: 800,
              bgcolor: '#E2E8F0',
              color: '#334155',
            }}
          />
        </Stack>

        <TextField
          fullWidth
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca step..."
          sx={{ mt: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} stroke={1.9} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.2 }}>
        {filteredGroups.map((group) => {
          const GroupIcon = group.icon
          const isExpanded = expanded.includes(group.id)

          return (
            <Accordion
              key={group.id}
              disableGutters
              expanded={isExpanded}
              onChange={handleAccordionChange(group.id)}
              elevation={0}
              sx={{
                mb: 1,
                border: '1px solid',
                borderColor: isExpanded ? `${group.color}66` : 'divider',
                borderRadius: '12px !important',
                overflow: 'hidden',
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<IconChevronDown size={18} stroke={2} />}
                sx={{
                  minHeight: 58,
                  px: 1.2,
                  '& .MuiAccordionSummary-content': {
                    my: 1,
                    alignItems: 'center',
                    gap: 1.2,
                  },
                }}
              >
                <Badge
                  badgeContent={group.items.length}
                  color="default"
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: group.color,
                      color: '#FFFFFF',
                      fontWeight: 800,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: group.color,
                      color: '#FFFFFF',
                    }}
                  >
                    <GroupIcon size={21} stroke={1.9} />
                  </Box>
                </Badge>

                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#1E293B' }}>
                    {group.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    {group.description}
                  </Typography>
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 1.1, pt: 0.2, pb: 1.1 }}>
                <Stack spacing={0.85}>
                  {group.items.map((item) => (
                    <StepItem
                      key={item.id}
                      item={item}
                      color={group.color}
                      group={group}
                      onSelect={(selectedItem) =>
                        onSelectStep?.(enrichStep(selectedItem, group))
                      }
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )
        })}

        {filteredGroups.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 8, px: 2 }}>
            <IconSearch size={34} stroke={1.5} color="#94A3B8" />
            <Typography sx={{ fontWeight: 800, color: '#475569' }}>
              Nessuno step trovato
            </Typography>
            <Typography variant="caption" align="center" sx={{ color: '#64748B' }}>
              Modifica il testo di ricerca per visualizzare altri step.
            </Typography>
          </Stack>
        ) : null}
      </Box>
    </Box>
  )
}

export { STEP_GROUPS }
