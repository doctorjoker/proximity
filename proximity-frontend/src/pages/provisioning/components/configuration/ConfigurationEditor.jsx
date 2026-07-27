import { useEffect, useMemo, useState } from 'react'
import { Alert, Box } from '@mui/material'
import { editorFor, labelOf, typeCodeOf, validateConfiguration } from './configurationRegistry'

function defaultPayload(code) {
  if (code === 'PPPOE') return { username: '${service.pppoe_username}', password: '${service.pppoe_password}' }
  if (code === 'VLAN') return { vlan_id: 101, priority: 0, tagged: true }
  if (code.startsWith('WIFI')) return { ssid: '${service.wifi_ssid}', password: '${service.wifi_password}', encryption: 'WPA2_WPA3', hidden: false, band_steering: true }
  return {}
}

function snapshot(form) {
  return JSON.stringify({
    template_payload: form?.template_payload || {},
    required: form?.required,
    enabled: form?.enabled,
    configuration_key: form?.configuration_key,
    sort_order: form?.sort_order,
  })
}

export default function ConfigurationEditor({ type, item, version, onSave, onDelete }) {
  const code = typeCodeOf(type)
  const [form, setForm] = useState(null)
  const [baseline, setBaseline] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const next = {
      template_payload: item?.template_payload || defaultPayload(code),
      required: item?.required ?? true,
      enabled: item?.enabled ?? true,
      configuration_key: item?.configuration_key || code.toLowerCase(),
      sort_order: item?.sort_order ?? 0,
      rawJson: null,
      jsonError: '',
    }
    setError('')
    setForm(next)
    setBaseline(snapshot(next))
  }, [code, item])

  const canEdit = version?.status === 'DRAFT'
  const Editor = useMemo(() => editorFor(type), [type])
  const validation = useMemo(() => validateConfiguration(code, form?.template_payload || {}), [code, form?.template_payload])
  const dirty = form ? snapshot(form) !== baseline : false

  if (!type || !form) return <Alert severity="info" sx={{ m: 3 }}>Seleziona un tipo di configurazione.</Alert>

  const setPayloadField = (key, value) => setForm((current) => ({ ...current, template_payload: { ...current.template_payload, [key]: value }, rawJson: null }))

  const save = async () => {
    if (form.jsonError || validation.errors.length) return
    setSaving(true)
    setError('')
    try {
      await onSave({
        item_code: item?.item_code || `${code}_DEFAULT`,
        configuration_type_code: code,
        configuration_key: form.configuration_key,
        template_payload: form.template_payload,
        required: form.required,
        enabled: form.enabled,
        sort_order: form.sort_order,
        metadata: item?.metadata || { editor: code.toLowerCase() },
      })
      setBaseline(snapshot(form))
    } catch (err) {
      setError(err.message || 'Salvataggio non riuscito')
    } finally {
      setSaving(false)
    }
  }

  const remove = item ? async () => {
    if (!window.confirm(`Eliminare ${labelOf(type)} dal profilo?`)) return
    setSaving(true)
    setError('')
    try { await onDelete(item) }
    catch (err) { setError(err.message || 'Eliminazione non riuscita') }
    finally { setSaving(false) }
  } : null

  return (
    <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
      <Editor
        type={type}
        form={form}
        setForm={setForm}
        setPayloadField={setPayloadField}
        required={form.required}
        enabled={form.enabled}
        onRequiredChange={(value) => setForm((current) => ({ ...current, required: value }))}
        onEnabledChange={(value) => setForm((current) => ({ ...current, enabled: value }))}
        onSave={save}
        onDelete={remove}
        saving={saving}
        canEdit={canEdit}
        error={error}
        validation={validation}
        dirty={dirty}
      />
    </Box>
  )
}
