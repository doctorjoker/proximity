import React from 'react'
import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material'
import { WorkspaceCard } from '../proximity'

export default function DevicesFilters({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  modelFilter,
  onModelFilterChange,
  models = [],
}) {
  return (
    <WorkspaceCard sx={{ mb: 3 }} contentSx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField
          fullWidth
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Cerca cliente, indirizzo, seriale, modello, firmware, IP..."
          variant="outlined"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, background: '#f8fafc', fontWeight: 700 } }}
        />
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Stato</InputLabel>
          <Select label="Stato" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} sx={{ borderRadius: 3, background: '#f8fafc', fontWeight: 800 }}>
            <MenuItem value="ALL">Tutti</MenuItem>
            <MenuItem value="ONLINE">Online</MenuItem>
            <MenuItem value="OFFLINE">Offline</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel>Modello</InputLabel>
          <Select label="Modello" value={modelFilter} onChange={(event) => onModelFilterChange(event.target.value)} sx={{ borderRadius: 3, background: '#f8fafc', fontWeight: 800 }}>
            <MenuItem value="ALL">Tutti</MenuItem>
            {models.map((model) => <MenuItem key={model} value={model}>{model}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
    </WorkspaceCard>
  )
}
