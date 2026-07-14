import { Button, Paper, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import RouterIcon from '@mui/icons-material/Router';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { Link } from 'react-router-dom';

export default function QuickActions() {
  const actions = [
    { label: 'Nuova procedura', to: '/procedures', icon: AddIcon, variant: 'contained' },
    { label: 'Execution Center', to: '/procedure-executions', icon: PlayCircleIcon },
    { label: 'Cerca device', to: '/devices', icon: RouterIcon },
    { label: 'Firmware', to: '/firmware', icon: SystemUpdateAltIcon },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              component={Link}
              to={action.to}
              variant={action.variant || 'outlined'}
              startIcon={<Icon />}
              sx={{
                minWidth: { xs: '100%', sm: 172 },
                height: 40,
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontWeight: 850,
                borderRadius: 2.1,
              }}
            >
              {action.label}
            </Button>
          );
        })}
      </Stack>
    </Paper>
  );
}
