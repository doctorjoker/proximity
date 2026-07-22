import {
  Box,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import TimelineItem from "./TimelineItem";

import { useEffect, useState } from "react";

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
        {events.map((event) => (
          <TimelineItem
            key={event.id}
            event={event}
          />
        ))}
      </Stack>
    </Box>
  );
}
