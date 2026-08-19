import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";

import { useLocation } from "react-router-dom";

import { resolveNavigation } from "../../config/navigation";
import { useAuth } from "../../auth/AuthProvider";

export default function TopBar() {
  const location = useLocation();
  const current = resolveNavigation(location.pathname);

  const {
    displayName,
    username,
    realmRoles,
    logout,
  } = useAuth();

  const primaryRole =
    realmRoles.find((role) =>
      String(role).startsWith("NOVASPACE_")
    ) || null;

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
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 900,
            lineHeight: 1.15,
          }}
        >
          {current.label}
        </Typography>

        <Breadcrumbs
          separator={
            <NavigateNextIcon sx={{ fontSize: 14 }} />
          }
          sx={{
            color: "#94a3b8",
            "& .MuiBreadcrumbs-separator": {
              color: "#475569",
              mx: 0.4,
            },
          }}
        >
          {(current.breadcrumb || [current.label]).map(
            (label) => (
              <Typography
                key={label}
                sx={{
                  color: "#94a3b8",
                  fontSize: 11.5,
                }}
              >
                {label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      </Stack>

      <Box sx={{ flex: 1 }} />

      <Stack
        direction="row"
        spacing={1.4}
        alignItems="center"
      >
        <TextField
          size="small"
          placeholder="Search customer, device, service..."
          InputProps={{
            startAdornment: (
              <SearchIcon
                sx={{
                  mr: 1,
                  color: "#64748b",
                  fontSize: 20,
                }}
              />
            ),
          }}
          sx={{
            width: 360,
            input: {
              color: "white",
              fontSize: 13.5,
            },
            "& .MuiOutlinedInput-root": {
              height: 40,
              bgcolor: "#111827",
              borderRadius: 2,
              "& fieldset": {
                borderColor: "#334155",
              },
              "&:hover fieldset": {
                borderColor: "#475569",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#38bdf8",
              },
            },
          }}
        />

        <Chip
          size="small"
          label="LIVE"
          color="success"
        />

        <Stack
          spacing={0}
          sx={{
            minWidth: 120,
            alignItems: "flex-end",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {displayName || username || "NOVASpace User"}
          </Typography>

          {primaryRole && (
            <Typography
              sx={{
                fontSize: 9.5,
                color: "#94a3b8",
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {primaryRole}
            </Typography>
          )}
        </Stack>

        <Tooltip title="Logout NOVASpace IAS">
          <Button
            onClick={logout}
            size="small"
            aria-label="Logout"
            sx={{
              minWidth: 38,
              width: 38,
              height: 38,
              color: "#cbd5e1",
              border: "1px solid #334155",
              borderRadius: 2,
              "&:hover": {
                borderColor: "#64748b",
                bgcolor: "#1e293b",
              },
            }}
          >
            <LogoutIcon fontSize="small" />
          </Button>
        </Tooltip>
      </Stack>
    </Box>
  );
}
