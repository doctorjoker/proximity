import React from 'react';
import {
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconActivityHeartbeat,
  IconAdjustments,
  IconCertificate,
  IconCpu,
  IconFileAnalytics,
  IconHistory,
  IconNetwork,
  IconRouter,
  IconServer,
  IconSettingsAutomation,
  IconSparkles,
  IconWifi,
} from '@tabler/icons-react';

const NAV_ITEMS = [
  { value: 'overview', label: 'Overview', icon: IconFileAnalytics },
  { value: 'acs', label: 'ACS', icon: IconServer },
  { value: 'wifi', label: 'WiFi', icon: IconWifi },
  { value: 'health', label: 'Health', icon: IconActivityHeartbeat },
  { value: 'diagnostics', label: 'Diagnostics', icon: IconNetwork },
  { value: 'firmware', label: 'Firmware', icon: IconCpu },
  { value: 'procedures', label: 'Procedures', icon: IconSettingsAutomation },
  { value: 'history', label: 'History', icon: IconHistory },
  { value: 'qualification', label: 'Qualification', icon: IconCertificate },
  { value: 'ai', label: 'AI', icon: IconSparkles, disabled: true },
];

function safeText(value, fallback = 'N/D') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object' && value?._value !== undefined) return String(value._value);
  return String(value);
}

export default function Device360Workspace({
  activeSection,
  onSectionChange,
  selected,
  overview,
  children,
}) {
  const manufacturer = safeText(overview?.manufacturer ?? selected?.manufacturer, 'Vendor');
  const model = safeText(overview?.model ?? selected?.model ?? overview?.product_class, 'Modello');
  const serial = safeText(overview?.serial_number ?? selected?.serial_number);
  const online = Boolean(overview?.online ?? selected?.online);
  const customer = safeText(overview?.customer_name ?? selected?.customer_name, 'LAB DEVICE');
  const service = safeText(overview?.service_code ?? selected?.service_code, 'Servizio Proximity');

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '250px minmax(0, 1fr)' }, minHeight: 'calc(100vh - 190px)' }}>
      <Paper
        square
        elevation={0}
        sx={{
          borderRight: { lg: '1px solid' },
          borderColor: 'divider',
          bgcolor: '#fff',
          display: { xs: 'none', lg: 'block' },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            DEVICE 360
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 950, mt: 0.2 }}>
            {manufacturer} {model}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
            {serial}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ mt: 1.2, flexWrap: 'wrap', gap: 0.75 }}>
            <Chip size="small" color={online ? 'success' : 'default'} label={online ? 'Online' : 'Offline'} />
            <Chip size="small" variant="outlined" label={customer} />
          </Stack>
        </Box>
        <Divider />
        <List dense disablePadding sx={{ py: 1 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <ListItemButton
                key={item.value}
                selected={activeSection === item.value}
                disabled={item.disabled}
                onClick={() => onSectionChange(item.value)}
                sx={{ mx: 1, borderRadius: 1.5, mb: 0.35 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}><Icon size={18} /></ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 800 }} />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconRouter size={18} />
            <Box>
              <Typography variant="caption" color="text.secondary">Servizio</Typography>
              <Typography variant="body2" sx={{ fontWeight: 850 }}>{service}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.4 }}>
            <IconAdjustments size={18} />
            <Box>
              <Typography variant="caption" color="text.secondary">Sezione attiva</Typography>
              <Typography variant="body2" sx={{ fontWeight: 850 }}>{NAV_ITEMS.find((x) => x.value === activeSection)?.label || activeSection}</Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ minWidth: 0, bgcolor: '#f8fafc' }}>
        <Box sx={{ p: { xs: 1.25, md: 2.25 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
