import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export default function PlatformHealthCard({ health, errors = {} }) {
  const services = [
    { label: 'Backend', ok: Boolean(health) && !errors.health },
    { label: 'Runtime', ok: !errors.executions },
    { label: 'Devices API', ok: !errors.devices },
    { label: 'Firmware API', ok: !errors.firmwareJobs },
  ];
  const allHealthy = services.every((item) => item.ok);

  return (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 2, md: 2.5 },
        py: { xs: 1.8, md: 2 },
        borderRadius: 3.2,
        background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,175,0.92))',
        color: 'white',
        border: 0,
      }}
    >
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ lg: 'center' }} spacing={2}>
        <Box>
          <Stack direction="row" spacing={1.1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h5" fontWeight={950}>Proximity Control Center</Typography>
            <Chip
              size="small"
              icon={allHealthy ? <CheckCircleIcon /> : <ErrorIcon />}
              label={allHealthy ? 'HEALTHY' : 'ATTENTION'}
              color={allHealthy ? 'success' : 'warning'}
              sx={{ fontWeight: 900 }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.45 }}>
            Network automation, customer operations e runtime in un'unica console.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(115px, 1fr))' }, gap: 0.8 }}>
          {services.map((service) => (
            <Box key={service.label} sx={{ px: 1.25, py: 0.85, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)' }}>
              <Typography variant="caption" sx={{ color: '#cbd5e1' }}>{service.label}</Typography>
              <Stack direction="row" spacing={0.65} alignItems="center" sx={{ mt: 0.2 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: service.ok ? '#22c55e' : '#f59e0b' }} />
                <Typography variant="body2" fontWeight={850}>{service.ok ? 'Online' : 'Check'}</Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      </Stack>
    </Paper>
  );
}
