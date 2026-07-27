import { Box, Tab, Tabs } from '@mui/material'
import WorkspaceStatusPill from './WorkspaceStatusPill'
import { workspaceTokens } from './workspaceTokens'

export default function WorkspaceTabs({ value, onChange, items = [] }) {
  return (
    <Box sx={{ px: { xs: 1.25, md: 3 }, bgcolor: workspaceTokens.shell.surface, borderBottom: `1px solid ${workspaceTokens.shell.border}` }}>
      <Tabs
        value={value}
        onChange={(_, next) => onChange?.(next)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 54,
          '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: workspaceTokens.shell.primary },
          '& .MuiTab-root': {
            minHeight: 54,
            px: 1.75,
            color: workspaceTokens.shell.textMuted,
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'none',
            letterSpacing: 0.1,
            borderRadius: '8px 8px 0 0',
            transition: 'background-color 140ms ease, color 140ms ease',
            '&:hover': { color: workspaceTokens.shell.text, bgcolor: workspaceTokens.shell.surfaceMuted },
            '&.Mui-selected': { color: workspaceTokens.shell.primary, bgcolor: workspaceTokens.shell.primarySoft },
          },
        }}
      >
        {items.map((item) => (
          <Tab
            key={item.value}
            value={item.value}
            label={(
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <span>{item.label}</span>
                {item.status && <WorkspaceStatusPill label={item.status} tone={item.statusTone} compact />}
              </Box>
            )}
          />
        ))}
      </Tabs>
    </Box>
  )
}
