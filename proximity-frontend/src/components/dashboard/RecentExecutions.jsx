import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from 'react-router-dom';

function statusColor(status) {
  const value = String(status || '').toUpperCase();
  if (['FAILED', 'CANCELLED'].includes(value)) return 'error';
  if (['COMPLETED', 'SUCCESS'].includes(value)) return 'success';
  if (['RUNNING', 'RETRYING'].includes(value)) return 'info';
  return 'warning';
}

function fmt(value) {
  if (!value) return 'n/d';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('it-IT');
}

export default function RecentExecutions({ items = [] }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3.2, overflow: 'hidden' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.2, py: 1.8 }}>
        <Box>
          <Typography variant="h6" fontWeight={900}>Esecuzioni recenti</Typography>
          <Typography variant="body2" color="text.secondary">Runtime e Workflow Engine correlati</Typography>
        </Box>
        <Button component={Link} to="/procedure-executions" endIcon={<ArrowForwardIcon />} sx={{ textTransform: 'none', fontWeight: 800 }}>
          Apri center
        </Button>
      </Stack>
      <Divider />
      <Stack divider={<Divider flexItem />}>
        {items.slice(0, 6).map((item) => {
          const status = item.workflow_record?.status || item.workflow_engine_status || item.status;
          return (
            <Stack key={item.execution_code} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.2} sx={{ px: 2.2, py: 1.55 }}>
              <Box>
                <Typography fontWeight={900}>{item.execution_code}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.procedure_code || item.workflow_type || 'Procedura'} · {fmt(item.requested_at || item.created_at)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={item.mode || 'LIVE'} variant="outlined" />
                <Chip size="small" label={status || 'UNKNOWN'} color={statusColor(status)} sx={{ fontWeight: 800 }} />
              </Stack>
            </Stack>
          );
        })}
        {items.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Nessuna esecuzione disponibile.</Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
