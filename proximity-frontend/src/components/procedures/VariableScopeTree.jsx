import { useMemo } from 'react'
import { WorkspaceNavigationTree } from '../workspace'
import { VARIABLE_SCOPES } from './variableUtils'

export default function VariableScopeTree({ selectedScope, counts = {}, onSelect, accent = '#7c3aed' }) {
  const groups = useMemo(() => [{
    id: 'variable-scopes',
    title: 'Ambiti variabili',
    subtitle: 'Navigazione condivisa Procedure',
    color: accent,
    softColor: '#f5f3ff',
    defaultExpanded: true,
    count: VARIABLE_SCOPES.length,
    items: VARIABLE_SCOPES.map((scope) => ({ id: scope.value, primary: scope.label, badge: counts[scope.value] || 0 })),
  }], [accent, counts])
  return <WorkspaceNavigationTree groups={groups} selectedId={selectedScope} onSelect={(scope) => onSelect?.(scope)} searchable={false} width="100%" />
}
