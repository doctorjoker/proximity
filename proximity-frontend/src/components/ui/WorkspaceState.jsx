import PropTypes from "prop-types";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

export function LoadingState({ label = "Caricamento dati..." }) {
  return <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 240 }}><CircularProgress size={30} /><Typography color="text.secondary">{label}</Typography></Stack>;
}

export function EmptyState({ title = "Nessun elemento", description, actionLabel, onAction, icon: Icon = InboxOutlinedIcon }) {
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderStyle: "dashed", boxShadow: "none" }}>
      <Box sx={{ width: 52, height: 52, mx: "auto", mb: 1.5, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "action.hover", color: "text.secondary" }}><Icon /></Box>
      <Typography variant="h6" fontWeight={750}>{title}</Typography>
      {description && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography>}
      {actionLabel && <Button variant="contained" onClick={onAction} sx={{ mt: 2 }}>{actionLabel}</Button>}
    </Paper>
  );
}

export function ErrorState({ title = "Impossibile caricare i dati", message, onRetry }) {
  return <Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Riprova</Button> : undefined}><Typography fontWeight={750}>{title}</Typography>{message && <Typography variant="body2">{message}</Typography>}</Alert>;
}

LoadingState.propTypes = { label: PropTypes.string };
EmptyState.propTypes = { title: PropTypes.string, description: PropTypes.string, actionLabel: PropTypes.string, onAction: PropTypes.func, icon: PropTypes.elementType };
ErrorState.propTypes = { title: PropTypes.string, message: PropTypes.string, onRetry: PropTypes.func };
