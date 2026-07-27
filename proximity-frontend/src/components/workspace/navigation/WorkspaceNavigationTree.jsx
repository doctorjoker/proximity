import { useMemo, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import WorkspaceNavigationSearch from './WorkspaceNavigationSearch'
import WorkspaceNavigationGroup from './WorkspaceNavigationGroup'
import WorkspaceNavigationItem from './WorkspaceNavigationItem'
import WorkspaceNavigationEmptyState from './WorkspaceNavigationEmptyState'
import WorkspaceNavigationLoading from './WorkspaceNavigationLoading'

function normalize(value) { return String(value || '').trim().toLowerCase() }

export default function WorkspaceNavigationTree({
  title,
  subtitle,
  groups = [],
  selectedId,
  onSelect,
  onOpen,
  onContextMenu,
  searchable = true,
  searchPlaceholder = 'Cerca...',
  loading = false,
  width = 340,
  stickyGroups = false,
  emptyTitle,
  emptyDescription,
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(() => Object.fromEntries(groups.map((group) => [group.id, group.defaultExpanded !== false])))
  const itemRefs = useRef(new Map())

  const visibleGroups = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return groups
    return groups.map((group) => ({ ...group, items: (group.items || []).filter((item) => normalize(`${item.primary} ${item.secondary} ${item.status} ${group.title}`).includes(needle)) })).filter((group) => group.items.length)
  }, [groups, query])

  const flatItems = useMemo(() => visibleGroups.flatMap((group) => (expanded[group.id] === false ? [] : group.items || [])), [visibleGroups, expanded])
  const activeIndex = Math.max(0, flatItems.findIndex((item) => item.id === selectedId))

  const focusItem = (index) => {
    const next = flatItems[index]
    if (!next) return
    onSelect?.(next.id, next)
    requestAnimationFrame(() => itemRefs.current.get(next.id)?.focus())
  }

  const handleKeyDown = (event) => {
    if (!flatItems.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); focusItem(Math.min(flatItems.length - 1, activeIndex + 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusItem(Math.max(0, activeIndex - 1)) }
    else if (event.key === 'Home') { event.preventDefault(); focusItem(0) }
    else if (event.key === 'End') { event.preventDefault(); focusItem(flatItems.length - 1) }
    else if (event.key === 'Enter' && selectedId) { event.preventDefault(); const item = flatItems.find((candidate) => candidate.id === selectedId); onOpen?.(selectedId, item) }
    else if (event.key === 'Escape' && query) { event.preventDefault(); setQuery('') }
  }

  return (
    <Box role="tree" aria-label={title || 'Workspace navigation'} onKeyDown={handleKeyDown} sx={{ width, minWidth: width, height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', bgcolor: '#f8fafc', overflow: 'hidden' }}>
      {(title || searchable) && <Box sx={{ px: 1.5, py: 1.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        {title && <Typography sx={{ fontWeight: 950, color: '#1e293b' }}>{title}</Typography>}
        {subtitle && <Typography variant="caption" sx={{ color: '#64748b' }}>{subtitle}</Typography>}
        {searchable && <Box sx={{ mt: title ? 1.25 : 0 }}><WorkspaceNavigationSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} /></Box>}
      </Box>}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {loading ? <WorkspaceNavigationLoading /> : visibleGroups.length === 0 ? <WorkspaceNavigationEmptyState title={emptyTitle} description={emptyDescription} /> : visibleGroups.map((group) => (
          <WorkspaceNavigationGroup key={group.id} {...group} sticky={stickyGroups} expanded={expanded[group.id] !== false} onToggle={() => setExpanded((current) => ({ ...current, [group.id]: current[group.id] === false }))}>
            {(group.items || []).map((item) => <WorkspaceNavigationItem key={item.id} {...item} selected={selectedId === item.id} tabIndex={selectedId === item.id ? 0 : -1} itemRef={(node) => { if (node) itemRefs.current.set(item.id, node); else itemRefs.current.delete(item.id) }} onClick={() => onSelect?.(item.id, item)} onDoubleClick={() => onOpen?.(item.id, item)} onContextMenu={(event) => onContextMenu?.(event, item, group)} />)}
          </WorkspaceNavigationGroup>
        ))}
      </Box>
    </Box>
  )
}
