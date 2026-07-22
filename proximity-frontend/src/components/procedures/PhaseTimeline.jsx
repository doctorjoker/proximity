import { Box, Chip, Stack, Typography } from "@mui/material";

function PhaseTimelineItem({ phase, selected, isLast, onSelect, accent }) {
  return (
    <Box sx={{ position: "relative", pl: 3.2 }}>
      {!isLast && <Box sx={{ position: "absolute", left: 10, top: 28, bottom: -11, width: 2, bgcolor: "#dbe5f0" }} />}
      <Box sx={{ position: "absolute", left: 1, top: 10, width: 20, height: 20, borderRadius: "50%", bgcolor: selected ? accent : "#ffffff", color: selected ? "#ffffff" : "#475569", border: selected ? `1px solid ${accent}` : "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 950, zIndex: 1 }}>
        {phase.order}
      </Box>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => onSelect(phase)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(phase); }}
        sx={{
          border: selected ? `1px solid ${accent}` : "1px solid #dbe5f0",
          borderLeft: selected ? `4px solid ${accent}` : "4px solid transparent",
          borderRadius: 2,
          bgcolor: selected ? "#fff7ed" : "#ffffff",
          px: 1.05,
          py: 0.95,
          cursor: "pointer",
          outline: "none",
          transition: "all 140ms ease",
          "&:hover": { borderColor: "#fdba74", boxShadow: "0 5px 14px rgba(15, 23, 42, 0.05)" },
          "&:focus-visible": { boxShadow: "0 0 0 3px rgba(234, 88, 12, 0.16)" },
        }}
      >
        <Typography sx={{ color: "#0f172a", fontWeight: 950, lineHeight: 1.2 }}>{phase.name}</Typography>
        <Typography variant="caption" sx={{ mt: 0.25, display: "block", color: "#64748b", fontWeight: 750, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowWrap: "anywhere" }}>
          {phase.action}
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.65 }}>
          <Chip label={phase.type} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 850, bgcolor: "#fff" }} />
          <Chip label={`${phase.timeout}s`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: "#f8fafc" }} />
        </Stack>
      </Box>
    </Box>
  );
}

export default function PhaseTimeline({ phases, selectedPhase, onSelect, accent = "#ea580c" }) {
  return (
    <Stack spacing={1}>
      <Chip label="START" size="small" color="success" sx={{ alignSelf: "flex-start", fontWeight: 950 }} />
      {phases.map((phase, index) => (
        <PhaseTimelineItem
          key={phase?.id || `${phase.order}-${phase.name}`}
          phase={phase}
          selected={selectedPhase?.id ? selectedPhase.id === phase.id : selectedPhase?.order === phase.order}
          isLast={index === phases.length - 1}
          onSelect={onSelect}
          accent={accent}
        />
      ))}
      <Chip label="END" size="small" sx={{ alignSelf: "flex-start", ml: 3.2, fontWeight: 950, bgcolor: accent, color: "#fff" }} />
    </Stack>
  );
}
