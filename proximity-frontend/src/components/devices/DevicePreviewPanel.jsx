import React from 'react'
import { Box, Chip, Stack, Typography } from '@mui/material'
import { PrimaryActionButton, SecondaryActionButton, StatusChip, WorkspaceCard } from '../proximity'

export default function DevicePreviewPanel({
  device,
  customerName,
  placeName,
  safeText,
  score,
  healthTone,
  onOpen,
  onRefresh,
  onFirmwareUpgrade,
}) {
  if (!device) {
    return (
      <WorkspaceCard sx={{ mb: 3 }} contentSx={{ p: 3, textAlign: 'center' }}>
        <Typography fontWeight={900}>Nessun device disponibile</Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>Modifica ricerca o filtri per visualizzare un’anteprima.</Typography>
      </WorkspaceCard>
    )
  }

  return (
    <WorkspaceCard sx={{ mb: 3 }} contentSx={{ p: { xs: 2.5, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" fontWeight={950} noWrap>{customerName(device)}</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }} noWrap>{placeName(device)}</Typography>
            </Box>
            <StatusChip status={device.online ? 'ONLINE' : 'OFFLINE'} />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
            <Chip size="small" label={`Router ${safeText(device.manufacturer)} ${safeText(device.model)}`} sx={{ fontWeight: 800 }} />
            <Chip size="small" label={`FW ${safeText(device.software_version)}`} sx={{ fontWeight: 800 }} />
            <Chip size="small" label={`WAN ${safeText(device.wan_ip)}`} sx={{ fontWeight: 800 }} />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
            <PrimaryActionButton onClick={() => onOpen(device)}>Apri dettaglio</PrimaryActionButton>
            <SecondaryActionButton onClick={() => onRefresh(device)}>Refresh</SecondaryActionButton>
            <SecondaryActionButton onClick={() => onFirmwareUpgrade(device)}>Aggiorna FW</SecondaryActionButton>
          </Stack>
        </Box>

        <Box sx={{ minWidth: { xs: '100%', md: 250 }, p: 2.5, borderRadius: 4, background: healthTone.bg, border: `1px solid ${healthTone.bg}` }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 900 }}>WiFi Experience</Typography>
          <Typography variant="h3" fontWeight={950} sx={{ color: healthTone.fg, mt: 0.5 }}>{score !== null ? `${score}/100` : 'N/D'}</Typography>
          <Chip label={healthTone.label} size="small" sx={{ mt: 1, fontWeight: 900, color: healthTone.fg, background: 'rgba(255,255,255,0.72)' }} />
        </Box>
      </Stack>
    </WorkspaceCard>
  )
}
