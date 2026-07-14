import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";

import proximityLogo from "../../assets/proximity-logo.svg";
import {
  isNavigationItemSelected,
  navigationSections,
} from "../../config/navigation";

function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        px: 2,
        pt: 2.1,
        pb: 0.7,
        color: "#64748b",
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1.8,
      }}
    >
      {children}
    </Typography>
  );
}

export default function Sidebar() {
  const location = useLocation();

  return (
    <Box
      component="aside"
      sx={{
        width: 260,
        minWidth: 260,
        minHeight: "calc(100vh - 112px)",
        bgcolor: "#0b1220",
        color: "white",
        borderRight: "1px solid #111827",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ px: 2.5, py: 3, textAlign: "center" }}>
        <Box
          component="img"
          src={proximityLogo}
          alt="Proximity"
          sx={{
            width: 104,
            height: 104,
            objectFit: "contain",
            mx: "auto",
            mb: 1.2,
            filter: "drop-shadow(0 0 20px rgba(56,189,248,0.35))",
          }}
        />

        <Typography
          sx={{
            fontSize: 21,
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
            fontSize: 13,
            fontWeight: 800,
            mt: 0.8,
          }}
        >
          by NOVASpace
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "#1f2937" }} />

      <Box sx={{ flex: 1, overflowY: "auto", py: 0.7 }}>
        {navigationSections.map((section, sectionIndex) => (
          <Box key={section.key}>
            {sectionIndex > 0 && (
              <Divider sx={{ mx: 1.5, mt: 1, borderColor: "#172033" }} />
            )}

            {section.label && <SectionLabel>{section.label}</SectionLabel>}

            <List disablePadding sx={{ px: 1.5 }}>
              {section.items.map((item) => {
                const selected = isNavigationItemSelected(item, location.pathname);
                const Icon = item.icon;

                return (
                  <ListItemButton
                    key={item.path}
                    component={Link}
                    to={item.path}
                    selected={selected}
                    sx={{
                      mb: 0.55,
                      minHeight: 43,
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
                      "&.Mui-selected": { bgcolor: "#1d4ed8" },
                      "&.Mui-selected:hover": { bgcolor: "#1e40af" },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 38,
                        color: selected ? "white" : "#94a3b8",
                      }}
                    >
                      <Icon fontSize="small" />
                    </ListItemIcon>

                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: selected ? 800 : 600,
                        fontSize: 14,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: "1px solid #1f2937" }}>
        <Typography
          variant="caption"
          sx={{ color: "#94a3b8", display: "block", mb: 1 }}
        >
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
            mt: 2.5,
            pt: 1.7,
            borderTop: "1px solid #1f2937",
            textAlign: "center",
          }}
        >
          <Typography sx={{ color: "#64748b", fontSize: 10, letterSpacing: 2.5 }}>
            EUREKA
          </Typography>
          <Typography
            sx={{
              color: "#38bdf8",
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: 1,
            }}
          >
            10.0
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
