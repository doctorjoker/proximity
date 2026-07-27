import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material'
import ProximityActionIcon from '../icons/ProximityActionIcon'
import { proximityDesignTokens } from '../../theme'

/**
 * Golden Reference KPI card from the Proximity Dashboard.
 * This is the one implementation used by Dashboard and WorkspaceMetricCard.
 */
export default function ProximityKpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'primary',
  actionLabel = 'Apri',
  onClick,
}) {
  const palette = proximityDesignTokens.colors.tones[tone]
    || proximityDesignTokens.colors.tones.primary

  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight: 138,
        borderRadius: proximityDesignTokens.radius.large,
        borderColor: 'divider',
        overflow: 'hidden',
        transition: proximityDesignTokens.transitions.card,
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: proximityDesignTokens.shadows.hover,
              borderColor: palette.main,
            }
          : undefined,
      }}
    >
      <ButtonBase
        onClick={onClick}
        disabled={!onClick}
        sx={{
          width: '100%',
          minHeight: 138,
          p: 0,
          textAlign: 'left',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}
      >
        <Box
          sx={{
            width: 76,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: palette.soft,
            color: palette.main,
            borderRight: '1px solid',
            borderColor: 'divider',
          }}
        >
          {Icon ? <Icon size={34} stroke={1.8} /> : null}
        </Box>

        <Stack sx={{ flex: 1, minWidth: 0, px: 2.1, py: 1.8 }} justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={proximityDesignTokens.typography.weights.bold}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={proximityDesignTokens.typography.weights.display} sx={{ mt: 0.3, lineHeight: 1.05 }}>
              {value ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.45 }}>
              {helper}
            </Typography>
          </Box>

          {onClick ? (
            <Stack direction="row" spacing={0.45} alignItems="center" justifyContent="flex-end" sx={{ color: palette.main }}>
              <Typography variant="caption" fontWeight={proximityDesignTokens.typography.weights.strong}>
                {actionLabel}
              </Typography>
              <ProximityActionIcon name="OPEN" size={15} />
            </Stack>
          ) : null}
        </Stack>
      </ButtonBase>
    </Paper>
  )
}
