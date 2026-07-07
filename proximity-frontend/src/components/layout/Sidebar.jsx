import {
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import {
  Analytics,
  Dashboard,
  Devices,
  Engineering,
  Groups,
  Memory,
  Settings,
  WifiTethering,
  AccountTree,
} from "@mui/icons-material";

import { Link, useLocation } from "react-router-dom";
import proximityLogo from "../../assets/proximity-logo.svg";

const items = [
  {
    label: "Dashboard",
    path: "/",
    icon: <Dashboard />,
  },
  {
    label: "Procedure Automatiche",
    path: "/procedures",
    icon: <AccountTree />,
    badge: 3,
  },
  {
    label: "Customers",
    path: "/customer-care",
    icon: <Groups />,
  },
  {
    label: "Devices",
    path: "/devices",
    icon: <Devices />,
  },
  {
    label: "Firmware",
    path: "/firmware",
    icon: <Memory />,
  },
  {
    label: "Diagnostics",
    path: "/diagnostics",
    icon: <WifiTethering />,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: <Analytics />,
  },
  {
    label: "Administration",
    path: "/settings",
    icon: <Settings />,
  },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <Box
      sx={{
        width: 260,
        minHeight: "calc(100vh - 112px)",
        bgcolor: "#0b1220",
        color: "white",
        borderRight: "1px solid #111827",
        display: "flex",
        flexDirection: "column",
      }}
    >
<Box sx={{ px: 2.5, py: 4, textAlign: "center" }}>
        <Box
          component="img"
          src={proximityLogo}
          alt="Proximity"
          sx={{
            width: 122,
            height: 122,
            objectFit: "contain",
            mx: "auto",
            mb: 1.5,
            filter: "drop-shadow(0 0 20px rgba(56,189,248,0.35))",
          }}
        />

        <Typography
          sx={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          PROXIMITY
        </Typography>

        <Typography
          sx={{
            color: "#38bdf8",
            fontSize: 14,
            fontWeight: 800,
            mt: 0.8,
          }}
        >
          by NOVASpace
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "#1f2937" }} />

      <List sx={{ p: 1.5, flex: 1 }}>
        {items.map((item) => {
          const selected = location.pathname === item.path;

          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={selected}
              sx={{
                mb: 0.6,
                borderRadius: 2,
                color: selected ? "white" : "#cbd5e1",
                bgcolor: selected ? "#1d4ed8" : "transparent",
                borderLeft: selected
                  ? "4px solid #38bdf8"
                  : "4px solid transparent",
                pl: selected ? 1.5 : 2,
                "&:hover": {
                  bgcolor: selected ? "#1d4ed8" : "#111827",
                },
                "&.Mui-selected": {
                  bgcolor: "#1d4ed8",
                },
                "&.Mui-selected:hover": {
                  bgcolor: "#1e40af",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 38,
                  color: selected ? "white" : "#94a3b8",
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: selected ? 800 : 500,
                  fontSize: 14,
                }}
              />

              {item.badge ? (
                <Chip
                  size="small"
                  label={item.badge}
                  sx={{
                    height: 20,
                    minWidth: 20,
                    bgcolor: selected ? "white" : "#dc2626",
                    color: selected ? "#1d4ed8" : "white",
                    fontWeight: 800,
                  }}
                />
              ) : null}
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: "1px solid #1f2937" }}>
        <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 1 }}>
          Platform Health
        </Typography>

        {["Backend", "Worker", "ACS", "Database"].map((item) => (
          <Box
            key={item}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 0.35,
            }}
          >
            <Typography variant="caption" sx={{ color: "#cbd5e1" }}>
              {item}
            </Typography>

            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "#22c55e",
                boxShadow: "0 0 8px rgba(34,197,94,0.8)",
              }}
            />
          </Box>
        ))}

        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: "1px solid #1f2937",
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              color: "#64748b",
              fontSize: 11,
              letterSpacing: 3,
            }}
          >
            VERSION
          </Typography>

          <Typography
            sx={{
              color: "#38bdf8",
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 1,
            }}
          >
            7.0
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
