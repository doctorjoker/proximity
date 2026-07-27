import { FormControlLabel, Switch, TextField } from '@mui/material'
import EditorShell from './EditorShell'

export default function VlanEditor({ form, setPayloadField, ...props }) {
  return (
    <EditorShell title="VLAN di servizio" subtitle="Definisce tagging e priorita della connettivita WAN." payload={form.template_payload} {...props}>
      <TextField label="VLAN ID" type="number" value={form.template_payload.vlan_id ?? ''} onChange={(event) => setPayloadField('vlan_id', event.target.value === '' ? '' : Number(event.target.value))} inputProps={{ min: 1, max: 4094 }} disabled={!props.canEdit} fullWidth />
      <TextField label="Priorita 802.1p" type="number" value={form.template_payload.priority ?? 0} onChange={(event) => setPayloadField('priority', Number(event.target.value))} inputProps={{ min: 0, max: 7 }} disabled={!props.canEdit} fullWidth />
      <FormControlLabel control={<Switch checked={Boolean(form.template_payload.tagged ?? true)} onChange={(event) => setPayloadField('tagged', event.target.checked)} disabled={!props.canEdit} />} label="Traffico tagged" />
    </EditorShell>
  )
}
