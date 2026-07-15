import React, { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Drawer, IconButton, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Build, Close, Info, Person, Router, Storage, SupportAgent, Timeline, Wifi } from "@mui/icons-material";
import SurfaceCard from "../ui/SurfaceCard";
import Customer360Summary from "./Customer360Summary";
import CustomerOverviewTab from "./tabs/CustomerOverviewTab";
import CustomerServicesTab from "./tabs/CustomerServicesTab";
import CustomerDevicesTab from "./tabs/CustomerDevicesTab";
import CustomerWifiTab from "./tabs/CustomerWifiTab";
import CustomerFirmwareTab from "./tabs/CustomerFirmwareTab";
import CustomerProvisioningTab from "./tabs/CustomerProvisioningTab";
import CustomerTimelineTab from "./tabs/CustomerTimelineTab";
import CustomerCareTab from "./tabs/CustomerCareTab";

const safe = (value, fallback = "N/D") => value === null || value === undefined || value === "" ? fallback : String(value);

export default function Customer360Drawer({ open, customer, detail, loading, onClose, onOpenRouter }) {
  const [tab, setTab] = useState(0);
  const devices = detail?.devices || [];
  const title = safe(detail?.customer?.customer_name || customer?.customer_name, "Customer360");
  const subtitle = [detail?.customer?.contract_number || customer?.contract_number, detail?.customer?.profile || customer?.profile].filter(Boolean).join(" · ");

  useEffect(() => {
    if (open) setTab(0);
  }, [open, customer?.id]);

  const tabItems = useMemo(() => [
    { label: "Overview", icon: <Person fontSize="small" /> },
    { label: "Servizi", icon: <Info fontSize="small" /> },
    { label: "Router", icon: <Router fontSize="small" /> },
    { label: "WiFi", icon: <Wifi fontSize="small" /> },
    { label: "Firmware", icon: <Storage fontSize="small" /> },
    { label: "Provisioning", icon: <Build fontSize="small" /> },
    { label: "Timeline", icon: <Timeline fontSize="small" /> },
    { label: "Care", icon: <SupportAgent fontSize="small" /> },
  ], []);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 760 }, bgcolor: "#f8fafc" } }}>
      <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ p: 2.5, bgcolor: "#0f172a", color: "white", position: "sticky", top: 0, zIndex: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ color: "#60a5fa", fontWeight: 900, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" }}>Customer360 Workspace</Typography>
              <Typography sx={{ fontSize: 26, fontWeight: 950, mt: 0.3 }} noWrap>{title}</Typography>
              <Typography sx={{ color: "#cbd5e1", mt: 0.35 }} noWrap>{subtitle || "Cliente Proximity"}</Typography>
              {detail && !detail.error ? <Customer360Summary detail={detail} /> : null}
            </Box>
            <IconButton onClick={onClose} sx={{ color: "white" }}><Close /></IconButton>
          </Stack>

          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mt: 2, minHeight: 38, "& .MuiTabs-indicator": { bgcolor: "#60a5fa" }, "& .MuiTab-root": { minHeight: 38, color: "#cbd5e1", textTransform: "none", fontWeight: 800, px: 1.3 }, "& .Mui-selected": { color: "white !important" } }}>
            {tabItems.map((item) => <Tab key={item.label} icon={item.icon} iconPosition="start" label={item.label} />)}
          </Tabs>
        </Box>

        <Box sx={{ p: 2.5, flex: 1 }}>
          {loading ? (
            <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
          ) : detail?.error ? (
            <SurfaceCard sx={{ borderColor: "#fecaca", bgcolor: "#fff7f7" }}><Box sx={{ p: 2, color: "#b91c1c", fontWeight: 800 }}>{detail.error}</Box></SurfaceCard>
          ) : detail ? (
            <>
              {tab === 0 ? <CustomerOverviewTab detail={detail} /> : null}
              {tab === 1 ? <CustomerServicesTab /> : null}
              {tab === 2 ? <CustomerDevicesTab devices={devices} onOpenRouter={onOpenRouter} /> : null}
              {tab === 3 ? <CustomerWifiTab /> : null}
              {tab === 4 ? <CustomerFirmwareTab /> : null}
              {tab === 5 ? <CustomerProvisioningTab /> : null}
              {tab === 6 ? <CustomerTimelineTab /> : null}
              {tab === 7 ? <CustomerCareTab /> : null}
            </>
          ) : null}
        </Box>
      </Box>
    </Drawer>
  );
}
