export * from './tokens'

import { proximityColors } from './tokens/colors'
import { proximitySpacing } from './tokens/spacing'
import { proximityRadius } from './tokens/radius'
import { proximityShadows } from './tokens/shadows'
import { proximityTypography } from './tokens/typography'
import { proximityTransitions } from './tokens/transitions'

/** Single immutable design-token object for all Proximity modules. */
export const proximityDesignTokens = Object.freeze({
  colors: proximityColors,
  spacing: proximitySpacing,
  radius: proximityRadius,
  shadows: proximityShadows,
  typography: proximityTypography,
  transitions: proximityTransitions,
})
