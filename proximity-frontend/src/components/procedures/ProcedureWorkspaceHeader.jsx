import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function ProcedureWorkspaceHeader({ onCreate }) {
  return (
    <Box component="section">
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1.5}
      >
        <Box>
          <Typography
            variant="overline"
            color="primary"
            fontWeight={900}
            letterSpacing={1.1}
            lineHeight={1.2}
          >
            Automation
          </Typography>

          <Typography variant="h5" fontWeight={950} sx={{ mt: 0.2 }}>
            Procedure Automatiche
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
            Gestisci i modelli procedurali, le versioni e il relativo ciclo di vita.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreate}
          sx={{
            borderRadius: 2.4,
            fontWeight: 900,
            px: 2.2,
            py: 1,
            textTransform: "none",
            alignSelf: { xs: "flex-start", md: "center" },
            boxShadow: "none",
          }}
        >
          Nuova procedura
        </Button>
      </Stack>
    </Box>
  );
}
