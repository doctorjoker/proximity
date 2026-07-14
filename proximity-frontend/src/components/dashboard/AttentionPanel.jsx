import { Alert, Box, Paper, Stack, Typography } from '@mui/material';

export default function AttentionPanel({ executions = [], errors = {} }) {
  const failed = executions.filter((item) => {
    const status = String(item.workflow_record?.status || item.workflow_engine_status || item.status || '').toUpperCase();
    return ['FAILED', 'CANCELLED'].includes(status);
  });
  const endpointErrors = Object.entries(errors);

  return (
    <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3.2 }}>
      <Typography variant="h6" fontWeight={900}>Richiede attenzione</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.6 }}>
        Errori operativi ed endpoint non disponibili.
      </Typography>
      <Stack spacing={1.1}>
        {failed.slice(0, 4).map((item) => (
          <Alert key={item.execution_code} severity="error" variant="outlined">
            <strong>{item.execution_code}</strong> · {item.workflow_record?.error_message || item.result_json?.error_message || 'Esecuzione fallita'}
          </Alert>
        ))}
        {endpointErrors.map(([key, message]) => (
          <Alert key={key} severity="warning" variant="outlined">
            <strong>{key}</strong> · {message}
          </Alert>
        ))}
        {failed.length === 0 && endpointErrors.length === 0 && (
          <Box sx={{ py: 2.5, textAlign: 'center' }}>
            <Typography fontWeight={850}>Nessuna criticità rilevata</Typography>
            <Typography variant="body2" color="text.secondary">La piattaforma non richiede interventi immediati.</Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
