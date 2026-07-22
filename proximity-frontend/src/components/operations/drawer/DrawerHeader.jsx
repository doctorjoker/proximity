import {
  Box,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";

export default function DrawerHeader({
  title,
  subtitle,
  status,
  operationCode,
  onClose,
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {title}
          </Typography>

          <Typography
            sx={{
              mt: .5,
              color: "text.secondary",
            }}
          >
            {subtitle}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2 }}
          >
            <Chip
              color={
                status === "FAILED"
                  ? "error"
                  : status === "COMPLETED"
                  ? "success"
                  : status === "RUNNING"
                  ? "info"
                  : "warning"
              }
              label={status}
            />

            <Chip
              variant="outlined"
              label={operationCode}
            />
          </Stack>
        </Box>

        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}
