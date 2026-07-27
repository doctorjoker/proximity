import { TextField } from '@mui/material'
import EditorShell from './EditorShell'

export default function GenericEditor({ form, setForm, type, ...props }) {
  const json = JSON.stringify(form.template_payload || {}, null, 2)
  const onChange = (value) => {
    try { setForm((current) => ({ ...current, template_payload: JSON.parse(value), rawJson: null, jsonError: '' })) }
    catch { setForm((current) => ({ ...current, rawJson: value, jsonError: 'JSON non valido' })) }
  }

  return (
    <EditorShell title={type?.name || type?.type_code || 'Configurazione'} subtitle="Editor generico del payload desiderato." error={form.jsonError || props.error} payload={form.template_payload} {...props}>
      <TextField label="Template payload JSON" value={form.rawJson ?? json} onChange={(event) => onChange(event.target.value)} disabled={!props.canEdit} multiline minRows={14} fullWidth sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }} />
    </EditorShell>
  )
}
