import { Box, Stack, Typography } from "@mui/material";
import { VARIABLE_SCOPES } from "./variableUtils";

export default function VariableScopeTree({ selectedScope, counts, onSelect, accent = "#7c3aed" }) {
  return (
    <Stack spacing={0.65}>
      {VARIABLE_SCOPES.map((scope) => {
        const selected = selectedScope === scope.value;
        return (
          <Box
            key={scope.value}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(scope.value)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(scope.value); }}
            sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
              px: 1.1, py: 0.85, borderRadius: 1.8, cursor: "pointer", outline: "none",
              bgcolor: selected ? "#f5f3ff" : "transparent", color: selected ? accent : "#475569",
              border: selected ? `1px solid ${accent}` : "1px solid transparent",
              "&:hover": { bgcolor: selected ? "#eff6ff" : "#f8fafc" },
              "&:focus-visible": { boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.16)" },
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: 13.5 }}>{scope.label}</Typography>
            <Box sx={{ minWidth: 24, height: 22, px: 0.7, borderRadius: 11, bgcolor: selected ? "#dbeafe" : "#eef2f7", fontSize: 11, lineHeight: "22px", fontWeight: 950, textAlign: "center" }}>
              {counts[scope.value] || 0}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
