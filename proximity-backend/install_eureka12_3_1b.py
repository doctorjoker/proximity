#!/usr/bin/env python3
from pathlib import Path
import re
import shutil
import sys
from datetime import datetime

ROOT = Path('/opt/proximity')
BACKEND = ROOT / 'proximity-backend'
FRONTEND = ROOT / 'proximity-frontend'
HERE = Path(__file__).resolve().parent
STAMP = datetime.now().strftime('%Y%m%d-%H%M%S')


def backup(path: Path):
    dst = path.with_name(path.name + f'.bak-eureka12-3-1b-{STAMP}')
    shutil.copy2(path, dst)
    print(f'backup: {dst}')


def replace_file(src: Path, dst: Path):
    if not dst.exists():
        raise FileNotFoundError(dst)
    backup(dst)
    shutil.copy2(src, dst)
    print(f'updated: {dst}')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Blocco non trovato: {label}')
    return text.replace(old, new, 1)


def patch_schemas():
    path = BACKEND / 'app/modules/procedures/schemas.py'
    backup(path)
    text = path.read_text()
    text = replace_once(
        text,
        '    action: str = "noop"\n    type: str = "Action"\n',
        '    action: str = "noop"\n    type: str = "ACTION"\n    category: str = "CUSTOM"\n',
        'schemas create category',
    )
    text = replace_once(
        text,
        '    action: Optional[str] = None\n    type: Optional[str] = None\n',
        '    action: Optional[str] = None\n    type: Optional[str] = None\n    category: Optional[str] = None\n',
        'schemas update category',
    )
    path.write_text(text)
    print(f'updated: {path}')


def patch_repository():
    path = BACKEND / 'app/modules/procedures/repository.py'
    backup(path)
    text = path.read_text()

    text = replace_once(
        text,
        '                    action,\n                    type,\n                    timeout,',
        '                    action,\n                    type,\n                    category,\n                    timeout,',
        'repository insert columns',
    )
    text = replace_once(
        text,
        '                    %(action)s,\n                    %(type)s,\n                    %(timeout)s,',
        '                    %(action)s,\n                    %(type)s,\n                    %(category)s,\n                    %(timeout)s,',
        'repository insert values',
    )
    text = replace_once(
        text,
        '                "action": data.get("action", "noop"),\n                "type": data.get("type", "Action"),\n',
        '                "action": data.get("action", "noop"),\n                "type": str(data.get("type", "ACTION")).upper(),\n                "category": str(data.get("category", "CUSTOM")).upper(),\n',
        'repository insert payload',
    )
    text = replace_once(
        text,
        '        "action",\n        "type",\n        "timeout",',
        '        "action",\n        "type",\n        "category",\n        "timeout",',
        'repository allowed category',
    )
    path.write_text(text)
    print(f'updated: {path}')


def patch_designer():
    path = FRONTEND / 'src/pages/procedures/ProcedureDesigner.jsx'
    backup(path)
    text = path.read_text()

    old_default = '''const createDefaultProperties = (step) => ({
  name: step.label,
  description: step.description,
  timeout: 60,
  retries: 3,
  retryDelay: 5,
  rollbackEnabled: false,
  failurePolicy: 'STOP',
  inputVariables: 'service_code\\ncustomer_id\\nrouter_serial',
  outputVariables: 'status\\nexecution_id\\nlogs',
})'''
    new_default = '''const createDefaultProperties = (step) => ({
  name: step.label,
  description: step.description,
  nodeType: String(step.nodeType || 'ACTION').toUpperCase(),
  category: String(step.category || 'CUSTOM').toUpperCase(),
  action: step.action || 'noop',
  timeout: 30,
  retries: 0,
  continueOnError: false,
  inputVariables: '',
  outputVariables: '',
})'''
    text = replace_once(text, old_default, new_default, 'designer default properties')

    text = replace_once(
        text,
        "  name: getPhaseName(phase, index),\n  description:",
        "  name: getPhaseName(phase, index),\n  nodeType: String(firstDefined(phase.type, 'ACTION')).toUpperCase(),\n  category: String(firstDefined(phase.category, 'CUSTOM')).toUpperCase(),\n  action: firstDefined(phase.action, 'noop'),\n  description:",
        'designer phase meta fields',
    )

    marker = '''const buildDesignerUrl = (procedureCode, versionLabel) =>
  `${API_BASE_URL}/api/v1/procedures/${encodeURIComponent(
    procedureCode,
  )}/versions/${encodeURIComponent(versionLabel)}/designer`
'''
    addition = marker + '''
const buildPhasesUrl = (procedureCode, versionLabel) =>
  `${API_BASE_URL}/api/v1/procedures/${encodeURIComponent(
    procedureCode,
  )}/versions/${encodeURIComponent(versionLabel)}/phases`

const phasePayloadFromNode = (node, properties = node.properties || {}) => ({
  name: properties.name || node.label || 'Nuova fase',
  description: properties.description || node.description || '',
  type: String(properties.nodeType || node.nodeType || 'ACTION').toUpperCase(),
  category: String(properties.category || node.category || 'CUSTOM').toUpperCase(),
  action: properties.action || node.action || 'noop',
  timeout: `${Math.max(1, Number(properties.timeout || 30))}s`,
  retry: Math.max(0, Number(properties.retries || 0)),
  continue_on_error: Boolean(properties.continueOnError),
  input_variables: properties.inputVariables || '',
  output_variables: properties.outputVariables || '',
  position: node.position || { x: 120, y: 120 },
})
'''
    text = replace_once(text, marker, addition, 'designer phases URL helpers')

    old_add = '''  const addNode = useCallback((step, position) => {
    const node = {
      ...step,
      id: createNodeId(step.id),
      type: step.id,
      position: position || {
        x: 80 + (nodes.length % 3) * 280,
        y: 80 + Math.floor(nodes.length / 3) * 150,
      },
      properties: createDefaultProperties(step),
    }

    setNodes((current) => [...current, node])
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
  }, [nodes.length])'''
    new_add = '''  const addNode = useCallback(async (step, position) => {
    if (!procedureCode || !versionLabel) return

    const temporaryNode = {
      ...step,
      id: createNodeId(step.id),
      type: String(step.nodeType || 'ACTION').toLowerCase(),
      nodeType: String(step.nodeType || 'ACTION').toUpperCase(),
      category: String(step.category || 'CUSTOM').toUpperCase(),
      action: step.action || 'noop',
      position: position || {
        x: 80 + (nodes.length % 3) * 280,
        y: 80 + Math.floor(nodes.length / 3) * 150,
      },
      properties: createDefaultProperties(step),
    }

    setNodes((current) => [...current, temporaryNode])
    setSelectedNodeId(temporaryNode.id)
    setSelectedEdgeId(null)

    try {
      const response = await fetch(buildPhasesUrl(procedureCode, versionLabel), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(phasePayloadFromNode(temporaryNode)),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.detail || payload?.message || `Errore HTTP ${response.status}`)
      }

      const persisted = mapDesignerNode(payload.item || payload, nodes.length)
      setNodes((current) => current.map((node) => node.id === temporaryNode.id ? persisted : node))
      setSelectedNodeId(persisted.id)
      markDirty()
    } catch (error) {
      setNodes((current) => current.filter((node) => node.id !== temporaryNode.id))
      setSelectedNodeId(null)
      setDesignerError(`Creazione fase non riuscita: ${error.message}`)
    }
  }, [markDirty, nodes.length, procedureCode, versionLabel])'''
    text = replace_once(text, old_add, new_add, 'designer addNode CRUD')

    old_remove = '''  const handleRemoveNode = useCallback((nodeId) => {
    setNodes((current) => current.filter((node) => node.id !== nodeId))
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    )
    setSelectedNodeId((current) => current === nodeId ? null : current)
    markDirty()
  }, [markDirty])'''
    new_remove = '''  const handleRemoveNode = useCallback(async (nodeId) => {
    if (isPersistedPhaseId(nodeId) && procedureCode && versionLabel) {
      try {
        const response = await fetch(`${buildPhasesUrl(procedureCode, versionLabel)}/${nodeId}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.detail || payload?.message || `Errore HTTP ${response.status}`)
        }
      } catch (error) {
        setDesignerError(`Eliminazione fase non riuscita: ${error.message}`)
        return
      }
    }

    setNodes((current) => current.filter((node) => node.id !== nodeId))
    setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    setSelectedNodeId((current) => current === nodeId ? null : current)
    markDirty()
  }, [markDirty, procedureCode, versionLabel])'''
    text = replace_once(text, old_remove, new_remove, 'designer delete CRUD')

    old_change = '''  const handlePropertiesChange = useCallback(
    (nextProperties) => {
      if (!selectedNodeId) return

      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                label: nextProperties.name || node.label,
                description: nextProperties.description || node.description,
                properties: nextProperties,
              }
            : node,
        ),
      )
    },
    [selectedNodeId],
  )'''
    new_change = '''  const handlePropertiesChange = useCallback((nextProperties) => {
    if (!selectedNodeId) return
    setNodes((current) => current.map((node) => node.id === selectedNodeId
      ? {
          ...node,
          label: nextProperties.name || node.label,
          description: nextProperties.description || node.description,
          nodeType: nextProperties.nodeType,
          category: nextProperties.category,
          action: nextProperties.action,
          properties: nextProperties,
        }
      : node))
  }, [selectedNodeId])

  const handlePropertiesSave = useCallback(async (nextProperties) => {
    if (!selectedNodeId || !isPersistedPhaseId(selectedNodeId)) return
    const node = nodes.find((item) => item.id === selectedNodeId)
    if (!node || !procedureCode || !versionLabel) return

    const response = await fetch(`${buildPhasesUrl(procedureCode, versionLabel)}/${selectedNodeId}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(phasePayloadFromNode(node, nextProperties)),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.detail || payload?.message || `Errore HTTP ${response.status}`)
    }

    const persisted = mapDesignerNode(payload.item || payload, 0)
    setNodes((current) => current.map((item) => item.id === selectedNodeId
      ? { ...item, ...persisted, position: item.position }
      : item))
    markDirty()
  }, [markDirty, nodes, procedureCode, selectedNodeId, versionLabel])'''
    text = replace_once(text, old_change, new_change, 'designer property CRUD')

    text = replace_once(
        text,
        '          onSave={handlePropertiesChange}\n',
        '          onSave={handlePropertiesSave}\n',
        'designer PropertiesPanel save',
    )

    path.write_text(text)
    print(f'updated: {path}')


def main():
    if not ROOT.exists():
        print('ERRORE: /opt/proximity non trovato', file=sys.stderr)
        return 1

    replace_file(HERE / 'components/StepExplorer.jsx', FRONTEND / 'src/pages/procedures/components/StepExplorer.jsx')
    replace_file(HERE / 'components/PropertiesPanel.jsx', FRONTEND / 'src/pages/procedures/components/PropertiesPanel.jsx')
    replace_file(HERE / 'components/WorkflowCanvas.jsx', FRONTEND / 'src/pages/procedures/components/WorkflowCanvas.jsx')
    patch_schemas()
    patch_repository()
    patch_designer()
    print('\nEUREKA 12.3.1b installata. Eseguire i test indicati nel README.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
