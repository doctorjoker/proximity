import React, { Component, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconActivityHeartbeat,
  IconBrain,
  IconCertificate,
  IconFileAnalytics,
  IconHistory,
  IconRefresh,
  IconRouter,
  IconServer,
  IconSettings,
  IconShieldCheck,
  IconWifi,
} from "@tabler/icons-react";

import OverviewTab from "./tabs/OverviewTab";
import AcsTab from "./tabs/AcsTab";
import HealthTab from "./tabs/HealthTab";
import DiagnosticsTab from "./tabs/DiagnosticsTab";
import HistoryTab from "./tabs/HistoryTab";
import WiFiTab from "./tabs/WiFiTab";
import FirmwareTab from "./tabs/FirmwareTab";
import ProceduresTab from "./tabs/ProceduresTab";
import QualificationTab from "./tabs/QualificationTab";
import { Device360SharedStateProvider } from "./Device360SharedState";
import Device360OverviewWorkspace from "./Device360OverviewWorkspace";
import Device360DigitalTwinOverview from "./Device360DigitalTwinOverview";

const NAV_ITEMS = [
  { value: "overview", label: "Overview", icon: IconRouter, description: "Stato operativo e sintesi del CPE" },
  { value: "acs", label: "ACS", icon: IconServer, description: "Identità, parametri e operazioni ACS" },
  { value: "wifi", label: "WiFi", icon: IconWifi, description: "Configurazione, client e diagnostica radio" },
  { value: "health", label: "Health", icon: IconActivityHeartbeat, description: "Salute, risorse e stato PPP" },
  { value: "diagnostics", label: "Diagnostics", icon: IconFileAnalytics, description: "Test operativi e cronologia diagnostica" },
  { value: "firmware", label: "Firmware", icon: IconSettings, description: "Versione, compatibilità e aggiornamenti" },
  { value: "procedures", label: "Procedures", icon: IconShieldCheck, description: "Procedure automatiche disponibili" },
  { value: "history", label: "History", icon: IconHistory, description: "Eventi e attività del dispositivo" },
  { value: "qualification", label: "Qualification", icon: IconCertificate, description: "Capability, evidenze e qualificazione" },
  { value: "ai", label: "AI", icon: IconBrain, description: "Analisi e suggerimenti", disabled: true },
];

const safeText = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null) return String(value._value);
    return fallback;
  }
  return String(value);
};

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
};

class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.sectionKey !== this.props.sectionKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Alert severity="error" variant="outlined" sx={{ m: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          La sezione non può essere visualizzata.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
          {this.state.error?.message || "Errore React non identificato"}
        </Typography>
        <Button size="small" sx={{ mt: 1 }} onClick={() => window.location.reload()}>
          Ricarica pagina
        </Button>
      </Alert>
    );
  }
}

function WorkspaceSidebar({ value, onChange }) {
  return (
    <Paper
      square
      elevation={0}
      sx={{
        width: 180,
        flexShrink: 0,
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "#ffffff",
        display: { xs: "none", lg: "block" },
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
          Device 360
        </Typography>
      </Box>
      <List disablePadding sx={{ px: 1, pb: 2 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.value}
              selected={value === item.value}
              disabled={item.disabled}
              onClick={() => onChange(item.value)}
              sx={{
                borderRadius: 1.5,
                mb: 0.35,
                minHeight: 44,
                "&.Mui-selected": {
                  bgcolor: "rgba(25,118,210,.08)",
                  color: "primary.main",
                  "& .MuiListItemIcon-root": { color: "primary.main" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>
                <Icon size={19} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 850 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}

function MobileNav({ value, onChange }) {
  return (
    <Box
      sx={{
        display: { xs: "flex", lg: "none" },
        overflowX: "auto",
        gap: 0.75,
        px: 1.5,
        py: 1,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {NAV_ITEMS.filter((item) => !item.disabled).map((item) => (
        <Chip
          key={item.value}
          label={item.label}
          color={value === item.value ? "primary" : "default"}
          variant={value === item.value ? "filled" : "outlined"}
          onClick={() => onChange(item.value)}
          sx={{ fontWeight: 800 }}
        />
      ))}
    </Box>
  );
}

function OverviewPulse({ overview, selected, diagnostics, clients, wifiQuality }) {
  const pppStatus = firstValue(diagnostics?.ppp_status, diagnostics?.ppp?.status, overview?.wan_status);
  const wanIp = firstValue(diagnostics?.wan_ip, diagnostics?.ppp?.wan_ip, overview?.wan_ip);
  const clientCount = Array.isArray(clients) ? clients.length : Number(firstValue(wifiQuality?.client_count, overview?.client_count, 0));
  const health = firstValue(diagnostics?.health_score, overview?.health_score, 100);
  const firmware = firstValue(overview?.software_version, selected?.software_version);
  const metrics = [
    { label: "Salute", value: `${health}/100`, helper: "Stato complessivo" },
    { label: "WAN", value: pppStatus || (wanIp ? "Connected" : "N/D"), helper: wanIp || "IP non disponibile" },
    { label: "Client WiFi", value: String(clientCount || 0), helper: "Client rilevati" },
    { label: "Firmware", value: firmware || "N/D", helper: "Versione installata" },
  ];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(4,minmax(0,1fr))" }, gap: 1.25, mb: 1.5 }}>
      {metrics.map((metric) => (
        <Paper key={metric.label} variant="outlined" sx={{ p: 1.6, minWidth: 0, bgcolor: "background.paper" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 850 }}>{metric.label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 950, mt: 0.25, overflowWrap: "anywhere" }}>{metric.value}</Typography>
          <Typography variant="caption" color="text.secondary">{metric.helper}</Typography>
        </Paper>
      ))}
    </Box>
  );
}


function CompactDevice360Header({ selected, overview, section, onClose, onRefresh }) {
  const current = NAV_ITEMS.find((item) => item.value === section) || NAV_ITEMS[0];
  const title = firstValue(
    overview?.display_name,
    selected?.display_name,
    overview?.model,
    selected?.model,
    overview?.device_code,
    selected?.device_code,
    "Device360"
  );
  const serial = firstValue(overview?.serial_number, selected?.serial_number);
  const manufacturer = firstValue(overview?.manufacturer, selected?.manufacturer);
  const model = firstValue(overview?.model, selected?.model);
  const status = firstValue(overview?.online, selected?.online) ? "ONLINE" : "OFFLINE";

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 2 },
        py: 1.25,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 950,
                lineHeight: 1.1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {safeText(title)}
            </Typography>
            <Chip
              size="small"
              label={status}
              color={status === "ONLINE" ? "success" : "default"}
              sx={{ fontWeight: 900, flexShrink: 0 }}
            />
            <Chip
              size="small"
              label={current.label}
              variant="outlined"
              color="primary"
              sx={{ fontWeight: 800, flexShrink: 0 }}
            />
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 0.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {[manufacturer, model, serial].filter(Boolean).join(" · ")}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconRefresh size={16} />}
            onClick={onRefresh}
          >
            Aggiorna
          </Button>
          <Button size="small" onClick={onClose}>
            Chiudi
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default function Device360Drawer(props) {
  const { open, onClose, loading, selected, overview, parameters } = props;
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    if (!open) setActiveSection("overview");
  }, [open]);

  const selectedDevice = selected || overview || null;
  const deviceId = firstValue(selectedDevice?.id, selectedDevice?.device_id, overview?.id, overview?.device_id);

  const refreshCurrent = () => {
    window.dispatchEvent(new CustomEvent("device360:refresh", { detail: { deviceId, scope: activeSection, activeTab: activeSection } }));
    if (typeof props.onRefresh === "function") props.onRefresh();
  };

  const renderContent = () => {
    if (activeSection === "overview") {
      return (
        <Device360DigitalTwinOverview
          device={selectedDevice}
          deviceId={deviceId}
        />
      );
    }
    if (activeSection === "acs") {
      return <AcsTab overview={overview} selected={selected} parameters={parameters} onRefresh={props.onRefresh} onReboot={props.onReboot} />;
    }
    if (activeSection === "wifi") {
      return (
        <WiFiTab
          {...props}
          key={`wifi-${deviceId || "device"}`}
          device={selectedDevice}
          deviceId={deviceId}
          selected={selectedDevice}
          overview={overview}
          diagnostics={props.diagnostics}
          wifiQuality={props.wifiQuality}
          clients={props.clients}
        />
      );
    }
    if (activeSection === "health") {
      return (
        <HealthTab
          device={selectedDevice}
          deviceId={deviceId}
          overview={overview}
          diagnostics={props.diagnostics}
          wifiQuality={props.wifiQuality}
          clients={props.clients}
        />
      );
    }
    if (activeSection === "diagnostics") return <DiagnosticsTab device={selectedDevice} deviceId={deviceId} overview={overview} />;
    if (activeSection === "firmware") return <FirmwareTab selected={selectedDevice} overview={overview} />;
    if (activeSection === "procedures") return <ProceduresTab selected={selectedDevice} overview={overview} />;
    if (activeSection === "history") return <HistoryTab selected={selectedDevice} overview={overview} />;
    if (activeSection === "qualification") return <QualificationTab device={selectedDevice} deviceId={deviceId} />;
    return null;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: {
            xs: "100%",
            md: "78vw",
          },
          minWidth: {
            md: 1100,
          },
          maxWidth: {
            xs: "100%",
            md: 1450,
          },
          height: {
            xs: "100%",
            md: "calc(100vh - 24px)",
          },
          top: {
            xs: 0,
            md: 12,
          },
          right: {
            xs: 0,
            md: 12,
          },
          bottom: "auto",
          boxSizing: "border-box",
          borderRadius: {
            xs: 0,
            md: "14px 0 0 14px",
          },
          boxShadow: "-12px 0 32px rgba(15, 23, 42, 0.22)",
          p: 0,
          overflow: "hidden",
          background: "#f5f7fb",
        },
      }}
    >
      {loading && <Box sx={{ p: 6, display: "grid", placeItems: "center", minHeight: 320 }}><CircularProgress /></Box>}

      {!loading && overview && (
        <Device360SharedStateProvider
          device={selectedDevice}
          overview={overview}
          diagnostics={props.diagnostics}
          wifi={props.wifi}
          wifiQuality={props.wifiQuality}
          clients={props.clients}
          capabilities={props.capabilities}
          qualification={props.qualification}
          activeSection={activeSection}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <CompactDevice360Header
              selected={selectedDevice}
              overview={overview}
              section={activeSection}
              onClose={onClose}
              onRefresh={refreshCurrent}
            />

            <MobileNav value={activeSection} onChange={setActiveSection} />

            <Box
              sx={{
                display: "flex",
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                minHeight: 0,
                flex: 1,
                overflow: "hidden",
              }}
            >
              <WorkspaceSidebar value={activeSection} onChange={setActiveSection} />
              <Box
                component="main"
                sx={{
                  minWidth: 0,
                  flex: 1,
                  overflowX: "hidden",
                  overflowY: "auto",
                  bgcolor: "#f5f7fb",
                }}
              >
                <Box sx={{ p: { xs: 1.25, md: 1.75 }, minWidth: 0 }}>
                  <SectionErrorBoundary sectionKey={activeSection}>
                    {renderContent()}
                  </SectionErrorBoundary>
                </Box>
              </Box>
            </Box>
          </Box>
        </Device360SharedStateProvider>
      )}
    </Drawer>
  );
}
