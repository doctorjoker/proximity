import { Box, Divider, InputAdornment, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material'
import ProximityActionIcon from '../icons/ProximityActionIcon'

export default function WorkspaceSidebar({ title, items = [], selectedKey, onSelect, search, onSearchChange, actions }) {
  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          {actions}
        </Stack>
        <TextField fullWidth size="small" placeholder="Cerca..." value={search} onChange={(event) => onSearchChange?.(event.target.value)} sx={{ mt: 2 }} InputProps={{ startAdornment: <InputAdornment position="start"><ProximityActionIcon name="SEARCH" size={16} /></InputAdornment> }} />
      </Box>
      <Divider />
      <List disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
        {items.map((item) => <ListItemButton key={item.key} selected={item.key === selectedKey} onClick={() => onSelect?.(item.key)} sx={{ px: 2, py: 1.25 }}><ListItemText primary={item.primary} secondary={item.secondary} primaryTypographyProps={{ fontWeight: item.key === selectedKey ? 700 : 500 }} /></ListItemButton>)}
      </List>
    </Stack>
  )
}
