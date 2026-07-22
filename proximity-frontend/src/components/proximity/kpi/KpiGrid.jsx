import { Box } from '@mui/material'

export default function KpiGrid({ children, minWidth = 250, sx }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`,
        gap: 1.5,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}
