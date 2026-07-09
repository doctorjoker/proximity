import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const SCOPES = ["Input", "Output", "Secret", "Costante"];
const TYPES = ["string", "number", "integer", "boolean", "json", "secret"];

export default function VariableDrawer({
  open,
  variable,
  onClose,
  onSave,
  onDelete,
  saving = false,
}) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!variable) {
      setDraft(null);
      return;
    }

    setDraft({
      ...variable,
      defaultValue: variable.defaultValue ?? variable.default_value ?? "",
      description: variable.description ?? "",
      required: Boolean(variable.required),
    });
  }, [variable]);

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    if (draft && !saving) {
      onSave(draft);
    }
  };

  const handleDelete = () => {
    if (draft && !saving) {
      onDelete(draft);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 500 }, maxWidth: "100%" } }}
    >
      <Stack sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start" sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <div>
            <Typography variant="overline" color="text.secondary" fontWeight={900}>
              Editor variabile
            </Typography>
            <Typography variant="h5" fontWeight={950} sx={{ mt: 0.2 }}>
              {draft?.isNew ? "Nuova variabile" : draft?.name || "Variabile"}
            </Typography>
            {draft && (
              <Typography variant="body2" color="text.secondary">
                {draft.scope} · {draft.type}
              </Typography>
            )}
          </div>

          <IconButton onClick={onClose} size="small" disabled={saving}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>

        {draft && (
          <Stack spacing={2.2} sx={{ p: 2.5, overflow: "auto", flex: 1 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} gutterBottom>
                Definizione
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Nome variabile"
                  value={draft.name || ""}
                  onChange={(event) => updateDraft("name", event.target.value.toUpperCase())}
                  fullWidth
                  size="small"
                />

                <TextField
                  select
                  label="Scope"
                  value={draft.scope || "Input"}
                  onChange={(event) => updateDraft("scope", event.target.value)}
                  fullWidth
                  size="small"
                >
                  {SCOPES.map((scope) => (
                    <MenuItem key={scope} value={scope}>{scope}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Tipo"
                  value={draft.type || "string"}
                  onChange={(event) => updateDraft("type", event.target.value)}
                  fullWidth
                  size="small"
                >
                  {TYPES.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} gutterBottom>
                Valori e validazione
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Valore default"
                  value={draft.defaultValue || ""}
                  onChange={(event) => updateDraft("defaultValue", event.target.value)}
                  fullWidth
                  size="small"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(draft.required)}
                      onChange={(event) => updateDraft("required", event.target.checked)}
                    />
                  }
                  label="Variabile obbligatoria"
                />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} gutterBottom>
                Descrizione
              </Typography>

              <TextField
                label="Descrizione operativa"
                value={draft.description || ""}
                onChange={(event) => updateDraft("description", event.target.value)}
                fullWidth
                multiline
                minRows={4}
                size="small"
              />
            </Paper>
          </Stack>
        )}

        <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={saving || !draft || draft.isNew}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            Elimina
          </Button>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={onClose} disabled={saving} sx={{ textTransform: "none", fontWeight: 800 }}>
              Annulla
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving || !draft?.name} sx={{ textTransform: "none", fontWeight: 850 }}>
              {saving ? "Salvataggio..." : "Salva variabile"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  );
}
