import { Box, Chip, Stack, TextField, Typography } from '@mui/material'
import { TEMPLATE_VARIABLES } from './configurationRegistry'

export default function VariableTemplateField({ label, value, onChange, disabled, helperText, type = 'text' }) {
  const insertVariable = (variable) => {
    const token = `\${${variable}}`
    const current = String(value || '')
    onChange(current ? `${current}${token}` : token)
  }

  return (
    <Stack spacing={1}>
      <TextField
        label={label}
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        helperText={helperText}
        fullWidth
      />
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          Variabili disponibili
        </Typography>
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {TEMPLATE_VARIABLES.map((variable) => (
            <Chip
              key={variable}
              size="small"
              variant="outlined"
              label={variable}
              onClick={() => insertVariable(variable)}
              disabled={disabled}
              sx={{ fontFamily: 'monospace', fontSize: 11 }}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  )
}
