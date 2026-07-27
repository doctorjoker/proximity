import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Dialog,
  DialogContent,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import ProximityIcon from '../../icons/ProximityIcon'
import useWorkspaceServices from './useWorkspaceServices'

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

export default function WorkspaceCommandPalette({ commands, placeholder = 'Cerca pagine, azioni ed entità…' }) {
  const services = useWorkspaceServices()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const source = commands || services.commands

  const filtered = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return source
    return source.filter((command) => normalize([
      command.label,
      command.description,
      command.group,
      ...(command.keywords || []),
    ].join(' ')).includes(needle))
  }, [query, source])

  useEffect(() => setActiveIndex(0), [query, services.commandPaletteOpen])

  const run = (command) => {
    if (!command || command.disabled) return
    services.closeCommandPalette()
    setQuery('')
    command.onExecute?.(command)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      run(filtered[activeIndex])
    }
  }

  return (
    <Dialog
      open={services.commandPaletteOpen}
      onClose={services.closeCommandPalette}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', mt: '-18vh' } }}
    >
      <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 1.5, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <ProximityIcon domain="OTHER" size={34} iconSize={18} />
        <InputBase
          autoFocus
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          inputProps={{ 'aria-label': placeholder }}
        />
        <Typography variant="caption" color="text.secondary">ESC</Typography>
      </Box>
      <DialogContent sx={{ p: 0, maxHeight: 420 }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Nessun risultato</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((command, index) => (
              <ListItemButton
                key={command.id}
                selected={index === activeIndex}
                disabled={command.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => run(command)}
                sx={{ px: 2, py: 1.1 }}
              >
                <ListItemText
                  primary={command.label}
                  secondary={command.description || command.group}
                  primaryTypographyProps={{ fontWeight: 700 }}
                />
                {command.shortcut && (
                  <Typography variant="caption" color="text.secondary">{command.shortcut}</Typography>
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  )
}
