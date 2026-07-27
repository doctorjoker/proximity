import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, CircularProgress } from '@mui/material'
import { workspaceTokens } from '../../../../components/workspace/workspaceTokens'
import ConfigurationTree from '../configuration/ConfigurationTree'
import ConfigurationEditor from '../configuration/ConfigurationEditor'
import { typeCodeOf } from '../configuration/configurationRegistry'

export default function ConfigurationTab({ version, items = [], types = [], loading, onCreateItem, onUpdateItem, onDeleteItem }) {
  const availableTypes = useMemo(() => {
    const map = new Map(types.map((type) => [typeCodeOf(type), type]))
    items.forEach((item) => {
      const code = String(item.configuration_type_code || '').toUpperCase()
      if (code && !map.has(code)) map.set(code, { type_code: code, name: item.configuration_type_name || code })
    })
    return [...map.values()]
  }, [types, items])

  const [selectedCode, setSelectedCode] = useState('')
  useEffect(() => {
    if (!availableTypes.length) { setSelectedCode(''); return }
    if (!availableTypes.some((type) => typeCodeOf(type) === selectedCode)) setSelectedCode(typeCodeOf(availableTypes[0]))
  }, [availableTypes, selectedCode])

  if (loading) return <Box sx={{ p: 4 }}><CircularProgress /></Box>
  if (!version) return <Alert severity="warning">Nessuna versione selezionata.</Alert>
  if (!availableTypes.length) return <Alert severity="warning">Il catalogo dei tipi di configurazione e vuoto.</Alert>

  const type = availableTypes.find((entry) => typeCodeOf(entry) === selectedCode)
  const item = items.find((entry) => String(entry.configuration_type_code).toUpperCase() === selectedCode)

  return (
    <Box sx={{ display: 'flex', minHeight: 620, height: 'calc(100vh - 278px)', border: `1px solid ${workspaceTokens.shell.border}`, borderRadius: 2.5, overflow: 'hidden', bgcolor: workspaceTokens.shell.surface, boxShadow: workspaceTokens.shadow.card }}>
      <ConfigurationTree types={availableTypes} items={items} selectedCode={selectedCode} onSelect={setSelectedCode} />
      <ConfigurationEditor type={type} item={item} version={version} onSave={(payload) => item ? onUpdateItem(item.id, payload) : onCreateItem(payload)} onDelete={onDeleteItem} />
    </Box>
  )
}
