import { createElement, isValidElement } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { proximityTokens } from '../../../theme/proximityTokens'

const toneMap = {
  primary: {
    main: '#2563EB',
    border: 'rgba(37, 99, 235, 0.34)',
    shadow: 'rgba(37, 99, 235, 0.16)',
  },
  success: {
    main: '#16A34A',
    border: 'rgba(22, 163, 74, 0.34)',
    shadow: 'rgba(22, 163, 74, 0.16)',
  },
  warning: {
    main: '#D97706',
    border: 'rgba(217, 119, 6, 0.34)',
    shadow: 'rgba(217, 119, 6, 0.16)',
  },
  error: {
    main: '#DC2626',
    border: 'rgba(220, 38, 38, 0.34)',
    shadow: 'rgba(220, 38, 38, 0.16)',
  },
  info: {
    main: '#0891B2',
    border: 'rgba(8, 145, 178, 0.34)',
    shadow: 'rgba(8, 145, 178, 0.16)',
  },
  cyan: {
    main: '#0891B2',
    border: 'rgba(8, 145, 178, 0.34)',
    shadow: 'rgba(8, 145, 178, 0.16)',
  },
  neutral: {
    main: '#475569',
    border: 'rgba(71, 85, 105, 0.30)',
    shadow: 'rgba(71, 85, 105, 0.14)',
  },
}

function renderIcon(icon) {
  if (!icon) return null
  if (isValidElement(icon)) return icon

  if (
    typeof icon === 'function'
    || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)
  ) {
    return createElement(icon, {
      sx: { fontSize: 25 },
      size: 25,
      stroke: 1.9,
    })
  }

  return icon
}

export default function KpiCard({
  icon,
  label,
  value,
  helper,
  action,
  tone = 'primary',
  sx,
}) {
  const palette = toneMap[tone] || toneMap.primary

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '76px minmax(0, 1fr)',
        minHeight: 118,
        overflow: 'hidden',
        borderRadius: proximityTokens.shape.radiusLg,
        borderColor: palette.border,
        bgcolor: 'background.paper',
        boxShadow: `0 8px 24px ${palette.shadow}`,
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '0 auto 0 0',
          width: 4,
          bgcolor: palette.main,
        },
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: palette.main,
          boxShadow: `0 12px 30px ${palette.shadow}`,
        },
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          bgcolor: palette.main,
          color: '#FFFFFF',
        }}
      >
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.24)',
          }}
        >
          {renderIcon(icon)}
        </Box>
      </Box>

      <Stack spacing={0.3} sx={{ px: 2.1, py: 1.8, minWidth: 0, justifyContent: 'center' }}>
        <Typography
          variant="body2"
          sx={{
            color: '#334155',
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            color: palette.main,
            fontSize: { xs: 32, md: 36 },
            fontWeight: 850,
            letterSpacing: '-0.035em',
            lineHeight: 1,
          }}
        >
          {value}
        </Typography>

        {helper ? (
          <Typography
            variant="caption"
            sx={{
              color: '#64748B',
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
            {helper}
          </Typography>
        ) : null}

        {action ? <Box sx={{ pt: 0.45 }}>{action}</Box> : null}
      </Stack>
    </Paper>
  )
}
