import {
  Box,
  Breadcrumbs,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SearchIcon from "@mui/icons-material/Search";
import { useLocation } from "react-router-dom";

import { resolveNavigation } from "../../config/navigation";

export default function TopBar() {
  const location = useLocation();
  const current = resolveNavigation(location.pathname);

  return (
    <Box
      component="header"
      sx={{
        minHeight: 64,
        px: 3,
        display: "flex",
        alignItems: "center",
        gap: 3,
        bgcolor: "#0f172a",
        color: "white",
        borderBottom: "1px solid #1e293b",
      }}
    >
      <Stack spacing={0.3} sx={{ minWidth: 280 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.15 }}>
          {current.label}
        </Typography>
        <Breadcrumbs
          separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
          sx={{
            color: "#94a3b8",
            "& .MuiBreadcrumbs-separator": { color: "#475569", mx: 0.4 },
          }}
        >
          {(current.breadcrumb || [current.label]).map((label) => (
            <Typography key={label} sx={{ color: "#94a3b8", fontSize: 11.5 }}>
              {label}
            </Typography>
          ))}
        </Breadcrumbs>
      </Stack>

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" spacing={1.7} alignItems="center">
        <TextField
          size="small"
          placeholder="Search customer, device, service..."
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "#64748b", fontSize: 20 }} />,
          }}
          sx={{
            width: 360,
            input: { color: "white", fontSize: 13.5 },
            "& .MuiOutlinedInput-root": {
              height: 40,
              bgcolor: "#111827",
              borderRadius: 2,
              "& fieldset": { borderColor: "#334155" },
              "&:hover fieldset": { borderColor: "#475569" },
              "&.Mui-focused fieldset": { borderColor: "#38bdf8" },
            },
          }}
        />

        <Chip size="small" label="LIVE" color="success" />

        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          Admin
        </Typography>
      </Stack>
    </Box>
  );
}
