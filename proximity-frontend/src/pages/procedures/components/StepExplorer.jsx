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

const STEP_GROUPS = [
  {
    id: 'provisioning',
    label: 'Provisioning',
    description: 'Configurazione servizi e apparati',
    color: '#2563EB',
    icon: IconSettingsAutomation,
    items: [
      { id: 'router-config', label: 'Configura router', description: 'Applica configurazioni al CPE', icon: IconRouter },
      { id: 'pppoe-config', label: 'Configura PPPoE', description: 'Imposta credenziali e interfaccia', icon: IconUserCog },
      { id: 'vlan-config', label: 'Configura VLAN', description: 'Imposta tagging e profilo servizio', icon: IconNetwork },
      { id: 'wifi-config', label: 'Configura Wi-Fi', description: 'SSID, sicurezza e canali radio', icon: IconWifi },
    ],
  },
  {
    id: 'acs',
    label: 'ACS',
    description: 'Azioni operative GenieACS',
    color: '#0891B2',
    icon: IconCloudCog,
    items: [
      { id: 'acs-refresh', label: 'Aggiorna parametri', description: 'Richiede un refresh dei parametri', icon: IconRefresh },
      { id: 'acs-reboot', label: 'Riavvia dispositivo', description: 'Invia il comando di reboot', icon: IconPower },
      { id: 'acs-verify', label: 'Verifica configurazione', description: 'Controlla i valori runtime', icon: IconShieldCheck },
    ],
  },
  {
    id: 'firmware',
    label: 'Firmware',
    description: 'Upgrade e verifica software',
    color: '#7C3AED',
    icon: IconDeviceDesktopCog,
    items: [
      { id: 'firmware-upgrade', label: 'Aggiorna firmware', description: 'Avvia il download e l’upgrade', icon: IconDeviceFloppy },
      { id: 'firmware-verify', label: 'Verifica versione', description: 'Controlla la versione installata', icon: IconVersions },
    ],
  },
  {
    id: 'customer',
    label: 'Customer',
    description: 'Comunicazioni e customer care',
    color: '#D97706',
    icon: IconUserCog,
    items: [
      { id: 'customer-email', label: 'Invia e-mail', description: 'Invia una comunicazione al cliente', icon: IconMail },
      { id: 'customer-sms', label: 'Invia SMS', description: 'Invia una notifica testuale', icon: IconMessage },
      { id: 'customer-ticket', label: 'Crea ticket', description: 'Apre una richiesta di assistenza', icon: IconTicket },
    ],
  },
  {
    id: 'logic',
    label: 'Logic',
    description: 'Condizioni e controllo esecuzione',
    color: '#DC2626',
    icon: IconGitBranch,
    items: [
      { id: 'logic-if', label: 'Condizione IF', description: 'Dirama il flusso su una condizione', icon: IconGitBranch },
      { id: 'logic-delay', label: 'Attesa', description: 'Sospende temporaneamente il flusso', icon: IconClockPause },
      { id: 'logic-retry', label: 'Retry', description: 'Ripete una fase in errore', icon: IconRepeat },
    ],
  },
  {
    id: 'flow',
    label: 'Flow',
    description: 'Struttura della procedura',
    color: '#16A34A',
    icon: IconArrowsSplit,
    items: [
      { id: 'flow-start', label: 'Start', description: 'Punto iniziale della procedura', icon: IconPlayerPlay },
      { id: 'flow-parallel', label: 'Esecuzione parallela', description: 'Avvia più rami contemporaneamente', icon: IconArrowsSplit },
    ],
  },
]

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
          JSON.stringify({
            ...item,
            category: group.id,
            categoryLabel: group.label,
            color: group.color,
          }),
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
        [item.label, item.description, group.label]
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
                        onSelectStep?.({
                          ...selectedItem,
                          category: group.id,
                          categoryLabel: group.label,
                          color: group.color,
                        })
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
