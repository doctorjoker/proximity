import React from 'react';
import { Alert, Box, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import { IconCertificate, IconInfoCircle } from '@tabler/icons-react';

export default function DeviceCapabilityBadge({ capabilityState, compact = false }) {
  if (!capabilityState) return null;
  const { profile, resolution, qualificationStatus, loading, error } = capabilityState;

  if (loading) {
    return <CircularProgress size={16} />;
  }

  if (error) {
    return compact ? (
      <Tooltip title={error}><Chip size="small" color="warning" variant="outlined" label="Capability N/D" /></Tooltip>
    ) : <Alert severity="warning">{error}</Alert>;
  }

  const qualified = qualificationStatus === 'QUALIFIED' && resolution === 'PROFILE_MATCH';
  const label = qualified ? 'Profilo qualificato' : 'Profilo non qualificato';

  if (compact) {
    return (
      <Tooltip title={profile ? `${profile.vendor} ${profile.model} · ${profile.code}` : 'Nessun profilo CPE risolto'}>
        <Chip
          size="small"
          color={qualified ? 'success' : 'warning'}
          variant="outlined"
          icon={<IconCertificate size={15} />}
          label={label}
        />
      </Tooltip>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <IconCertificate size={18} />
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Capability Framework</Typography>
        <Chip size="small" color={qualified ? 'success' : 'warning'} label={label} />
        {profile?.data_models?.map((item) => <Chip key={item} size="small" variant="outlined" label={item} />)}
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
        <IconInfoCircle size={15} />
        <Typography variant="caption" color="text.secondary">
          {profile ? `${profile.vendor} ${profile.model} · ${profile.code}` : 'Nessun profilo associato al dispositivo'}
        </Typography>
      </Stack>
    </Box>
  );
}
