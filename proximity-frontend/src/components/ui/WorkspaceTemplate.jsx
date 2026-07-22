import { Box, Stack } from "@mui/material";

export default function WorkspaceTemplate({
  children,
  maxWidth = 1560,
  spacing = 2.4,
  sx,
}) {
  return (
    <Box sx={{ width: "100%", maxWidth, mx: "auto", ...sx }}>
      <Stack spacing={spacing}>{children}</Stack>
    </Box>
  );
}
