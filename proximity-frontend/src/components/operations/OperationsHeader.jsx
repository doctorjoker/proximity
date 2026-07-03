import {
  Box,
  Stack,
  Typography,
} from "@mui/material";

export default function OperationsHeader({
  title,
  subtitle,
}) {
  return (
    <Box
      sx={{
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              letterSpacing: -.5,
            }}
          >
            {title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: .5 }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
