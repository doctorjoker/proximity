import { Box, Chip, Stack, Typography } from "@mui/material";
import {
  CheckCircle,
  RadioButtonChecked,
  RadioButtonUnchecked,
  Cancel,
  Error,
} from "@mui/icons-material";

import {
  formatDate,
  formatDuration,
  statusColor,
  translateStep,
} from "./utils";

function StepIcon({ status }) {
  if (status === "SUCCESS" || status === "COMPLETED") {
    return <CheckCircle sx={{ color: "#16a34a" }} />;
  }

  if (status === "RUNNING") {
    return <RadioButtonChecked sx={{ color: "#2563eb" }} />;
  }

  if (status === "FAILED") {
    return <Error sx={{ color: "#dc2626" }} />;
  }

  if (status === "CANCELLED") {
    return <Cancel sx={{ color: "#dc2626" }} />;
  }

  return <RadioButtonUnchecked sx={{ color: "#94a3b8" }} />;
}

export default function WorkflowStepPipeline({ steps = [] }) {
  if (steps.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nessuno step registrato.
      </Typography>
    );
  }

  return (
    <Stack spacing={0} sx={{ mt: 1 }}>
      {steps.map((step, index) => {
        const isRunning = step.status === "RUNNING";
        const isSuccess = step.status === "SUCCESS" || step.status === "COMPLETED";

        return (
          <Box key={step.id} sx={{ display: "flex", gap: 1.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <StepIcon status={step.status} />

              {index < steps.length - 1 && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    minHeight: 34,
                    bgcolor: isSuccess ? "#16a34a" : "#cbd5e1",
                    my: 0.5,
                  }}
                />
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: isRunning ? "#eff6ff" : "white",
                border: isRunning ? "1px solid #2563eb" : "1px solid #e5e7eb",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontWeight: 900 }}>
                  {translateStep(step.step_name)}
                </Typography>

                <Chip
                  size="small"
                  label={step.status}
                  color={statusColor(step.status)}
                  variant="outlined"
                />
              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
                spacing={2}
                sx={{ mt: 0.75 }}
              >
                <Typography variant="caption" color="text.secondary">
                  {formatDate(step.started_at)}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  {formatDuration(step.duration_ms)}
                </Typography>
              </Stack>

              {step.error_message && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {step.error_message}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
