import { Box, Button, Stack, Typography } from '@mui/material'
import ProximityIcon from '../icons/ProximityIcon'
import WorkspaceStatusPill from './WorkspaceStatusPill'
import { workspaceTokens } from './workspaceTokens'

/**
 * Canonical Proximity workspace header.
 * Visual source of truth: Dashboard design language.
 * Domain pages provide content only; spacing, icon treatment and metadata live here.
 */
export default function WorkspaceHeader({
  eyebrow,
  title,
  subtitle,
  metadata = [],
  status,
  actions,
  onMenuClick,
  iconDomain,
  breadcrumbs = [],
}) {
  return (
    <Box
      component="header"
      sx={{
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        bgcolor: workspaceTokens.shell.surface,
        borderBottom: `1px solid ${workspaceTokens.shell.border}`,
      }}
    >
      <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ lg: 'center' }} justifyContent="space-between" gap={2.5}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" minWidth={0}>
          {onMenuClick && (
            <Button
              size="small"
              variant="outlined"
              onClick={onMenuClick}
              sx={{ display: { md: 'none' }, minWidth: 0, px: 1.25, textTransform: 'none', fontWeight: 800 }}
            >
              Menu
            </Button>
          )}

          {iconDomain ? <ProximityIcon domain={iconDomain} size={48} iconSize={24} /> : null}

          <Box minWidth={0}>
            {breadcrumbs.length > 0 && (
              <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.35 }}>
                {breadcrumbs.filter(Boolean).map((item, index) => (
                  <Typography key={`${item}-${index}`} variant="caption" sx={{ color: workspaceTokens.shell.textMuted, fontWeight: 750 }}>
                    {index > 0 ? `/ ${item}` : item}
                  </Typography>
                ))}
              </Stack>
            )}

            {eyebrow && (
              <Typography variant="overline" sx={{ color: workspaceTokens.shell.primary, fontWeight: 900, letterSpacing: 1.15 }}>
                {eyebrow}
              </Typography>
            )}

            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="h4" sx={{ color: workspaceTokens.shell.text, fontWeight: 850, letterSpacing: -0.55, lineHeight: 1.18 }}>
                {title}
              </Typography>
              {status && <WorkspaceStatusPill label={status} />}
            </Stack>

            {subtitle && (
              <Typography variant="body2" sx={{ color: workspaceTokens.shell.textMuted, mt: 0.55 }}>
                {subtitle}
              </Typography>
            )}

            {metadata.length > 0 && (
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                {metadata.filter(Boolean).map((item) => (
                  <Box
                    key={`${item.label}-${item.value}`}
                    sx={{
                      display: 'inline-flex',
                      gap: 0.55,
                      alignItems: 'center',
                      px: 1,
                      py: 0.45,
                      borderRadius: 1.5,
                      bgcolor: workspaceTokens.shell.surfaceMuted,
                      border: `1px solid ${workspaceTokens.shell.border}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: workspaceTokens.shell.textMuted, fontWeight: 700 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: workspaceTokens.shell.text, fontWeight: 800 }}>
                      {item.value || '—'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>

        {actions && <Box flexShrink={0}>{actions}</Box>}
      </Stack>
    </Box>
  )
}
