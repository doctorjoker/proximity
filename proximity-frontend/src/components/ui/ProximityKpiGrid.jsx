import { Box } from "@mui/material";

/** Shared responsive grid used by Dashboard KPI groups. */
export default function ProximityKpiGrid({ children, columns = 4, sx }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          xl: `repeat(${columns}, minmax(0, 1fr))`,
        },
        gap: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
