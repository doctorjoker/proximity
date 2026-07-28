import React from 'react'
import { Box, Checkbox, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material'
import { PrimaryActionButton, SecondaryActionButton, StatusChip, TableEmptyState, WorkspaceCard } from '../proximity'

export default function DevicesTable({
  devices = [], filteredCount, selectedIds = [], previewDeviceId,
  page, rowsPerPage, onPageChange, onRowsPerPageChange,
  onToggleSelection, onSelectVisible, onPreview, onOpen, onRefresh,
  onMassUpgrade, customerName, customerCode, placeName, safeText, formatDate,
}) {
  const allSelected = devices.length > 0 && devices.every((device) => selectedIds.includes(device.id))
  const partiallySelected = devices.some((device) => selectedIds.includes(device.id)) && !allSelected

  return (
    <WorkspaceCard
      title="Rete clienti"
      subtitle={`${filteredCount} risultati filtrati. Seleziona device per upgrade massivo o apri il dettaglio cliente.`}
      actions={
        <Stack direction="row" spacing={1}>
          <SecondaryActionButton onClick={onSelectVisible}>Seleziona pagina</SecondaryActionButton>
          <PrimaryActionButton onClick={onMassUpgrade}>Upgrade selezionati ({selectedIds.length})</PrimaryActionButton>
        </Stack>
      }
      contentSx={{ p: 0 }}
    >
      <TableContainer sx={{ maxHeight: 640 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ fontWeight: 900, background: '#f8fafc' }}>
                <Checkbox checked={allSelected} indeterminate={partiallySelected} onChange={onSelectVisible} />
              </TableCell>
              {['Cliente', 'Servizio', 'Router', 'Firmware', 'Stato', 'Ultimo contatto'].map((label) => (
                <TableCell key={label} sx={{ fontWeight: 950, background: '#f8fafc' }}>{label}</TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 950, background: '#f8fafc' }}>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => (
              <TableRow
                key={device.id}
                hover
                sx={{ '& td': { borderColor: 'rgba(15,23,42,0.06)', py: 1.2 }, cursor: 'pointer' }}
                onClick={() => onPreview(device.id)}
                onDoubleClick={() => onOpen(device)}
                selected={previewDeviceId === device.id}
              >
                <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                  <Checkbox checked={selectedIds.includes(device.id)} onChange={() => onToggleSelection(device.id)} />
                </TableCell>
                <TableCell>
                  <Typography fontWeight={900} sx={{ color: '#0f172a' }}>{customerName(device)}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>{customerCode(device)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={800} noWrap sx={{ maxWidth: 260 }}>{placeName(device)}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>WAN {safeText(device.wan_ip)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={900}>{safeText(device.manufacturer)} {safeText(device.model)}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>{safeText(device.serial_number)}</Typography>
                </TableCell>
                <TableCell><Chip size="small" label={safeText(device.software_version)} sx={{ fontWeight: 900, background: '#eef2ff', color: '#3730a3' }} /></TableCell>
                <TableCell><StatusChip status={device.online ? 'ONLINE' : 'OFFLINE'} /></TableCell>
                <TableCell><Typography variant="body2" fontWeight={800}>{formatDate(device.last_seen || device.updated_at || device.last_inform)}</Typography></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <PrimaryActionButton size="compact" onClick={(event) => { event.stopPropagation(); onOpen(device) }}>Apri</PrimaryActionButton>
                    <SecondaryActionButton size="compact" onClick={(event) => { event.stopPropagation(); onRefresh(device) }}>Refresh</SecondaryActionButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow><TableCell colSpan={8}><Box sx={{ p: 2 }}><TableEmptyState title="Nessun risultato" description="Cambia ricerca o filtri." /></Box></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[25, 50, 100, 250]}
      />
    </WorkspaceCard>
  )
}
