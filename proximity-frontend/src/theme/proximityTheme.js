import { createTheme } from '@mui/material/styles'
import { proximityTokens } from './proximityTokens'

export const createProximityTheme = (options = {}) =>
  createTheme({
    shape: { borderRadius: proximityTokens.shape.radiusMd },
    typography: {
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 800, letterSpacing: '-0.015em' },
      h6: { fontWeight: 750 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 700 },
        },
      },
    },
    ...options,
  })

export default createProximityTheme
