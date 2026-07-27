import { FormControlLabel, MenuItem, Switch, TextField } from '@mui/material'
import EditorShell from './EditorShell'
import VariableTemplateField from '../VariableTemplateField'

export default function WifiEditor({ form, setPayloadField, type, ...props }) {
  return (
    <EditorShell title={type?.name || 'Configurazione Wi-Fi'} subtitle="Identita e criteri della rete wireless desiderata." payload={form.template_payload} {...props}>
      <VariableTemplateField label="SSID template" value={form.template_payload.ssid || ''} onChange={(value) => setPayloadField('ssid', value)} disabled={!props.canEdit} helperText="Esempio: ${service.wifi_ssid}" />
      <VariableTemplateField label="Password template" value={form.template_payload.password || ''} onChange={(value) => setPayloadField('password', value)} disabled={!props.canEdit} helperText="Esempio: ${service.wifi_password}" />
      <TextField select label="Cifratura" value={form.template_payload.encryption || 'WPA2_WPA3'} onChange={(event) => setPayloadField('encryption', event.target.value)} disabled={!props.canEdit} fullWidth>
        <MenuItem value="WPA2">WPA2</MenuItem>
        <MenuItem value="WPA3">WPA3</MenuItem>
        <MenuItem value="WPA2_WPA3">WPA2/WPA3</MenuItem>
      </TextField>
      <FormControlLabel control={<Switch checked={Boolean(form.template_payload.hidden)} onChange={(event) => setPayloadField('hidden', event.target.checked)} disabled={!props.canEdit} />} label="SSID nascosto" />
      <FormControlLabel control={<Switch checked={Boolean(form.template_payload.band_steering)} onChange={(event) => setPayloadField('band_steering', event.target.checked)} disabled={!props.canEdit} />} label="Band steering" />
    </EditorShell>
  )
}
