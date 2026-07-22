import { Box, Chip, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  executionCode,
  executionDuration,
  executionStartedAt,
  executionStatus,
  executionStatusColor,
  executionStatusLabel,
  formatExecutionDate,
} from "./executionUtils";

export default function ExecutionList({ items, selected, onSelect }) {
  if (!items.length) {
    return (
      <Box sx={{ p: 3, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 2.4, bgcolor: "#f8fafc" }}>
        <PlayArrowIcon sx={{ fontSize: 34, color: "#94a3b8" }} />
        <Typography sx={{ mt: 0.8, fontWeight: 950, color: "#0f172a" }}>Nessuna esecuzione trovata</Typography>
        <Typography variant="body2" sx={{ mt: 0.45, color: "#64748b" }}>Modifica ricerca o filtri per ampliare i risultati.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={0.85}>
      {items.map((item) => {
        const code = executionCode(item);
        const status = executionStatus(item);
        const active = executionCode(selected) === code;
        return (
          <Box
            key={code}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(item)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(item); }}
            sx={{
              p: 1.2,
              border: active ? "1px solid #7dd3fc" : "1px solid #dbe5f0",
              borderRadius: 2.2,
              bgcolor: active ? "#f0f9ff" : "#fff",
              cursor: "pointer",
              outline: "none",
              transition: "all 140ms ease",
              "&:hover": { borderColor: "#7dd3fc", boxShadow: "0 5px 15px rgba(15, 23, 42, 0.05)" },
              "&:focus-visible": { boxShadow: "0 0 0 3px rgba(14, 165, 233, 0.18)" },
            }}
          >
            <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 950, color: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowWrap: "anywhere" }}>{code}</Typography>
                <Typography variant="caption" sx={{ mt: 0.35, display: "block", color: "#64748b", fontWeight: 750 }}>{formatExecutionDate(executionStartedAt(item))}</Typography>
              </Box>
              <Chip label={executionStatusLabel(status)} size="small" color={executionStatusColor(status)} variant="outlined" sx={{ height: 23, fontWeight: 900, bgcolor: "#fff" }} />
            </Stack>
            <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" sx={{ mt: 0.9 }}>
              {item?.procedure_version && <Chip label={item.procedure_version} size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 850, bgcolor: "#f8fafc" }} />}
              {item?.mode && <Chip label={item.mode} size="small" variant="outlined" sx={{ height: 21, fontSize: 10.5, fontWeight: 850 }} />}
              <Chip label={executionDuration(item)} size="small" variant="outlined" sx={{ height: 21, fontSize: 10.5, fontWeight: 850 }} />
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
