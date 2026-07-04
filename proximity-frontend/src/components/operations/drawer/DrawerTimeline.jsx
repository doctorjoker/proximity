import {
  Box,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import { useEffect, useState } from "react";

function icon(status) {
  switch (status) {
    case "SUCCESS":
      return <CheckCircleIcon color="success" />;
    case "FAILED":
      return <ErrorIcon color="error" />;
    case "RUNNING":
      return <AutorenewIcon color="primary" />;
    default:
      return <RadioButtonUncheckedIcon color="disabled" />;
  }
}

export default function DrawerTimeline({ workflowCode }) {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    if (!workflowCode) return;

    fetch(`/api/v1/service-workflows/${workflowCode}/timeline`)
      .then((response) => response.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]));
  }, [workflowCode]);

  if (events === null) {
    return (
      <Box sx={{ py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="overline" sx={{ fontWeight: 800, color: "#475569" }}>
        Timeline
      </Typography>

      <Stack spacing={2} sx={{ mt: 2 }}>
        {events.map((e) => (
          <Stack key={e.id} direction="row" spacing={2} alignItems="flex-start">
            {icon(e.event_status)}

            <Box>
              <Typography fontWeight={700}>{e.title}</Typography>

              <Typography variant="body2" color="text.secondary">
                {e.description}
              </Typography>

              <Typography variant="caption" color="text.secondary">
                {new Date(e.event_time).toLocaleString("it-IT")}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
