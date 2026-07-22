import PropTypes from "prop-types";
import { Alert, Stack, Typography } from "@mui/material";

export default function OperationalAttention({ failed = 0, firmwareJobs = 0, errors = {} }) {
  const items = [];
  if (failed > 0) items.push({ severity: "error", text: `${failed} esecuzioni fallite richiedono verifica.` });
  if (firmwareJobs > 0) items.push({ severity: "warning", text: `${firmwareJobs} job firmware non sono ancora completati.` });
  Object.entries(errors || {}).forEach(([key, value]) => {
    if (value) items.push({ severity: "error", text: `${key}: ${String(value)}` });
  });

  if (!items.length) {
    return <Alert severity="success">Nessuna criticità operativa rilevata.</Alert>;
  }

  return (
    <Stack spacing={1}>
      {items.slice(0, 5).map((item, index) => (
        <Alert key={`${item.text}-${index}`} severity={item.severity}>
          <Typography variant="body2">{item.text}</Typography>
        </Alert>
      ))}
    </Stack>
  );
}

OperationalAttention.propTypes = { failed: PropTypes.number, firmwareJobs: PropTypes.number, errors: PropTypes.object };
