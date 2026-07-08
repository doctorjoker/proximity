import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

export default function PhaseDiagram({
  phases,
  onEditPhase,
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 4,
        background: "rgba(30,90,168,0.03)",
      }}
    >
      <Stack
        alignItems="center"
        spacing={1.2}
      >
        <Chip
          label="START"
          color="success"
          sx={{ fontWeight: 900 }}
        />

        {phases.map((phase) => (
          <Stack
            key={phase.id ?? phase.phase_order}
            alignItems="center"
            spacing={1.2}
            sx={{ width: "100%" }}
          >
            <Box
              sx={{
                height: 22,
                width: 2,
                bgcolor: "divider",
              }}
            />

            <Paper
              variant="outlined"
              onClick={() => onEditPhase(phase)}
              sx={{
                cursor: "pointer",
                p: 2,
                borderRadius: 3,
                width: "min(100%,520px)",
                borderColor:
                  phase.status === "DRAFT"
                    ? "warning.main"
                    : "divider",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                spacing={2}
                alignItems="center"
              >
                <Box>
                  <Typography fontWeight={900}>
                    {phase.phase_order}. {phase.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {phase.action}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={phase.type}
                  variant="outlined"
                />
              </Stack>
            </Paper>
          </Stack>
        ))}

        <Box
          sx={{
            height: 22,
            width: 2,
            bgcolor: "divider",
          }}
        />

        <Chip
          label="END"
          color="primary"
          sx={{ fontWeight: 900 }}
        />
      </Stack>
    </Paper>
  );
}
