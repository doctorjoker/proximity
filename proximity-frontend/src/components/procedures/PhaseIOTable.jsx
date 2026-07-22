import { Box, Divider, Stack, Typography } from "@mui/material";

function renderValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function IOBlock({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.55 }}>
        {label}
      </Typography>
      <Box component="pre" sx={{ mt: 0.7, mb: 0, p: 1.25, minHeight: 48, maxHeight: 170, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#f8fafc", color: "#334155", fontSize: 12, lineHeight: 1.55, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {renderValue(value)}
      </Box>
    </Box>
  );
}

export default function PhaseIOTable({ input, output }) {
  return (
    <Stack spacing={1.4}>
      <IOBlock label="Input" value={input} />
      <Divider />
      <IOBlock label="Output" value={output} />
    </Stack>
  );
}
