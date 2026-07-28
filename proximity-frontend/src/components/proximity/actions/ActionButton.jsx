import React from 'react'
import { Button, CircularProgress } from '@mui/material'
import { proximityUiTokens } from '../theme'

const { colors, radius, action } = proximityUiTokens

const intents = Object.freeze({
  primary: {
    variant: 'contained',
    color: colors.surface,
    background: colors.primary,
    border: colors.primary,
    hover: colors.primaryHover,
  },
  secondary: {
    variant: 'outlined',
    color: colors.primary,
    background: colors.surface,
    border: colors.primaryBorder,
    hover: colors.primarySoft,
    hoverBorder: colors.primary,
  },
  tertiary: {
    variant: 'text',
    color: colors.primary,
    background: 'transparent',
    border: 'transparent',
    hover: 'rgba(30, 90, 168, 0.08)',
  },
  danger: {
    variant: 'contained',
    color: colors.surface,
    background: colors.danger,
    border: colors.danger,
    hover: colors.dangerHover,
  },
  success: {
    variant: 'contained',
    color: colors.surface,
    background: colors.success,
    border: colors.success,
    hover: colors.successHover,
  },
})

export default function ActionButton({
  intent = 'secondary',
  size = 'normal',
  loading = false,
  disabled = false,
  startIcon,
  endIcon,
  children,
  sx,
  ...props
}) {
  const visual = intents[intent] || intents.secondary
  const dimensions = action[size] || action.normal
  const solid = ['primary', 'danger', 'success'].includes(intent)

  return (
    <Button
      {...props}
      variant={visual.variant}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      endIcon={endIcon}
      sx={{
        minWidth: 0,
        minHeight: dimensions.minHeight,
        px: dimensions.px,
        py: dimensions.py,
        borderRadius: `${radius.md}px`,
        borderColor: visual.border,
        color: visual.color,
        bgcolor: visual.background,
        boxShadow: 'none',
        textTransform: 'none',
        fontSize: dimensions.fontSize,
        fontWeight: 800,
        letterSpacing: 0,
        whiteSpace: 'nowrap',
        '&:hover': {
          boxShadow: 'none',
          bgcolor: visual.hover,
          borderColor: visual.hoverBorder || visual.border,
        },
        '&.Mui-disabled': {
          opacity: 0.58,
          color: solid ? colors.disabledSolidText : colors.disabledText,
        },
        ...sx,
      }}
    >
      {children}
    </Button>
  )
}

export const PrimaryActionButton = (props) => <ActionButton intent="primary" {...props} />
export const SecondaryActionButton = (props) => <ActionButton intent="secondary" {...props} />
export const TertiaryActionButton = (props) => <ActionButton intent="tertiary" {...props} />
export const DangerActionButton = (props) => <ActionButton intent="danger" {...props} />
export const SuccessActionButton = (props) => <ActionButton intent="success" {...props} />
