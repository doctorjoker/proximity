import EditorShell from './EditorShell'
import VariableTemplateField from '../VariableTemplateField'

export default function PPPoEEditor({ form, setPayloadField, ...props }) {
  return (
    <EditorShell
      title="Credenziali PPPoE"
      subtitle="Parametri desiderati per l'autenticazione Internet del servizio."
      payload={form.template_payload}
      {...props}
    >
      <VariableTemplateField
        label="Username template"
        value={form.template_payload.username || ''}
        onChange={(value) => setPayloadField('username', value)}
        disabled={!props.canEdit}
        helperText="Esempio: ${service.pppoe_username}"
      />
      <VariableTemplateField
        label="Password template"
        value={form.template_payload.password || ''}
        onChange={(value) => setPayloadField('password', value)}
        disabled={!props.canEdit}
        helperText="Esempio: ${service.pppoe_password}"
      />
    </EditorShell>
  )
}
