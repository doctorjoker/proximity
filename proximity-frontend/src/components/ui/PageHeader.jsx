import { Box, Stack, Typography } from "@mui/material";

export default function PageHeader({ icon, title, subtitle, eyebrow, actions }) {
  return (
    <Box
      sx={{
        mb: 2.5,
        px: { xs: 2, md: 2.5 },
        py: { xs: 1.9, md: 2.1 },
        border: "1px solid rgba(148,163,184,.24)",
        borderRadius: 3,
        bgcolor: "#fff",
        boxShadow: "0 10px 30px rgba(15,23,42,.05)",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{ width: "100%" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
      >
        <Stack direction="row" spacing={1.4} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          {icon ? (
            <Box
              sx={{
                width: 46,
                height: 46,
                display: "grid",
                placeItems: "center",
                borderRadius: 2.5,
                color: "#2563eb",
                bgcolor: "#eff6ff",
                border: "1px solid #dbeafe",
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            {eyebrow ? (
              <Typography sx={{ color: "#2563eb", fontSize: 11, fontWeight: 950, letterSpacing: 1.1, textTransform: "uppercase" }}>
                {eyebrow}
              </Typography>
            ) : null}
            <Typography sx={{ fontSize: { xs: 27, md: 32 }, fontWeight: 950, color: "#0f172a", letterSpacing: -0.8, lineHeight: 1.1 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography sx={{ color: "#64748b", mt: 0.45, lineHeight: 1.45, fontSize: 14 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {actions ? <Box sx={{ flexShrink: 0, ml: { md: "auto" }, alignSelf: { xs: "stretch", md: "center" } }}>{actions}</Box> : null}
      </Stack>
    </Box>
  );
}
