import {
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

import {
  CheckCircle,
  Error,
  PauseCircle,
  PlayCircle,
  Cancel,
  FiberManualRecord,
} from "@mui/icons-material";

import {
  formatDate,
  statusColor,
} from "./utils";

function EventIcon({ type, status }) {
  if (status === "FAILED") {
    return <Error sx={{ color: "#dc2626", fontSize: 20 }} />;
  }

  switch (type) {
    case "WORKFLOW_CREATED":
      return <FiberManualRecord sx={{ color: "#2563eb", fontSize: 18 }} />;

    case "WORKFLOW_COMPLETED":
      return <CheckCircle sx={{ color: "#16a34a", fontSize: 20 }} />;

    case "WORKFLOW_PAUSED":
      return <PauseCircle sx={{ color: "#f59e0b", fontSize: 20 }} />;

    case "WORKFLOW_RESUMED":
      return <PlayCircle sx={{ color: "#2563eb", fontSize: 20 }} />;

    case "WORKFLOW_CANCELLED":
      return <Cancel sx={{ color: "#dc2626", fontSize: 20 }} />;

    default:
      return <FiberManualRecord sx={{ color: "#64748b", fontSize: 16 }} />;
  }
}

export default function WorkflowTimeline({
  events = [],
}) {
  if (events.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nessun evento disponibile.
      </Typography>
    );
  }

  return (
    <Stack spacing={0}>
      {events.map((event, index) => (
        <Box
          key={event.id}
          sx={{
            display: "flex",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <EventIcon
              type={event.event_type}
              status={event.event_status}
            />

            {index < events.length - 1 && (
              <Box
                sx={{
                  width: 2,
                  minHeight: 34,
                  flex: 1,
                  bgcolor: "#dbe4ee",
                  my: .5,
                }}
              />
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              mb: 1.5,
              p: 1.5,
              bgcolor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 2,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography sx={{ fontWeight: 800 }}>
                {event.title}
              </Typography>

              <Chip
                size="small"
                label={event.event_status}
                color={statusColor(event.event_status)}
                variant="outlined"
              />
            </Stack>

            {event.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: .5 }}
              >
                {event.description}
              </Typography>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              {formatDate(event.event_time)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
