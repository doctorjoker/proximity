import { useMemo } from 'react'
import ProximityIcon from '../../../../components/icons/ProximityIcon'
import { WorkspaceNavigationTree, getWorkspaceDomainToken } from '../../../../components/workspace'
import { CATEGORY_ORDER, categoryOf, domainOfCategory, labelOf, statusOf, typeCodeOf } from './configurationRegistry'

const toneFromStatus = (status) => {
  const value = String(status?.color || status?.tone || '').toLowerCase()
  if (value.includes('success') || value.includes('green')) return 'success'
  if (value.includes('warning') || value.includes('orange')) return 'warning'
  if (value.includes('error') || value.includes('red')) return 'error'
  if (value.includes('info') || value.includes('blue')) return 'info'
  return 'neutral'
}

export default function ConfigurationTree({ types = [], items = [], selectedCode, onSelect }) {
  const itemByType = useMemo(() => new Map(items.map((item) => [String(item.configuration_type_code).toUpperCase(), item])), [items])
  const groups = useMemo(() => {
    const byCategory = new Map()
    types.forEach((type) => {
      const category = categoryOf(type)
      if (!byCategory.has(category)) byCategory.set(category, [])
      byCategory.get(category).push(type)
    })
    return [...byCategory.entries()]
      .sort(([a], [b]) => {
        const ai = CATEGORY_ORDER.indexOf(a); const bi = CATEGORY_ORDER.indexOf(b)
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b)
      })
      .map(([category, categoryTypes]) => {
        const configuredCount = categoryTypes.filter((type) => itemByType.has(typeCodeOf(type))).length
        const progress = categoryTypes.length ? Math.round((configuredCount / categoryTypes.length) * 100) : 0
        const domain = domainOfCategory(category)
        const token = getWorkspaceDomainToken(domain)
        return {
          id: category,
          title: category,
          subtitle: `${configuredCount}/${categoryTypes.length} configurate`,
          count: categoryTypes.length,
          progress,
          color: token.color,
          softColor: token.soft,
          icon: <ProximityIcon domain={domain} size={28} iconSize={15} stroke={1.7} />,
          items: categoryTypes.map((type) => {
            const code = typeCodeOf(type)
            const status = statusOf(type, itemByType.get(code))
            return { id: code, primary: labelOf(type), secondary: code, status: status.label, tone: toneFromStatus(status) }
          }),
        }
      })
  }, [itemByType, types])

  return <WorkspaceNavigationTree title="Desired Configuration" subtitle="Stato immediato per dominio e parametro" groups={groups} selectedId={selectedCode} onSelect={(code) => onSelect?.(code)} searchPlaceholder="Cerca configurazione..." />
}
