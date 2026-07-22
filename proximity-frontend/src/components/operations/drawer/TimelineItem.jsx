import {
  Box,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

function icon(status) {
  switch (status) {
    case "SUCCESS":
      return <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 24 }} />;

    case "FAILED":
      return <ErrorIcon sx={{ color: "#dc2626", fontSize: 24 }} />;

    case "RUNNING":
      return <AutorenewIcon sx={{ color: "#2563eb", fontSize: 24 }} />;

    default:
      return <RadioButtonUncheckedIcon sx={{ color: "#94a3b8", fontSize: 24 }} />;
  }
}

function borderColor(status) {
  switch (status) {
    case "SUCCESS":
      return "#16a34a";

    case "FAILED":
      return "#dc2626";

    case "RUNNING":
      return "#2563eb";

    default:
      return "#cbd5e1";
  }
}

export default function TimelineItem({ event }) {
  const date = new Date(event.event_time);

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="stretch"
    >
      {/* Timeline */}
      <Box
        sx={{
          width: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box sx={{ flex: 1, width: 2, bgcolor: "#dbe3ef" }} />

        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            bgcolor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          {icon(event.event_status)}
        </Box>

        <Box sx={{ flex: 1, width: 2, bgcolor: "#dbe3ef" }} />
      </Box>

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          p: 2,
          mb: 1,
          borderRadius: 2,
          border: "1px solid #e2e8f0",
          borderLeft: `4px solid ${borderColor(event.event_status)}`,
          bgcolor: "white",
          transition: "0.2s",
          "&:hover": {
            boxShadow: 3,
          },
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          {event.title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
          }}
        >
          {event.description}
        </Typography>

        {event.worker_name && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1.5,
              color: "#475569",
              fontWeight: 600,
            }}
          >
            {event.worker_name}
          </Typography>
        )}

        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 1.5 }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "#334155",
            }}
          >
            {date.toLocaleTimeString("it-IT")}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
          >
            {date.toLocaleDateString("it-IT")}
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}
