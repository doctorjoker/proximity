import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";
import { StatusChip } from "../proximity";
import Device360Tabs from "./Device360Tabs";
import OverviewTab from "./tabs/OverviewTab";
import AcsTab from "./tabs/AcsTab";
import HealthTab from "./tabs/HealthTab";
import DiagnosticsTab from "./tabs/DiagnosticsTab";
import HistoryTab from "./tabs/HistoryTab";

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

const getCustomerName = (device) =>
  safeText(firstValue(
    device?.customer_name,
    device?.customer?.customer_name,
    device?.customer_registry?.customer_name,
    device?.wifi_analytics?.customer?.customer_name,
    device?.wifi_customer?.customer_name
  ), "LAB DEVICE");

const getCustomerCode = (device) =>
  safeText(firstValue(
    device?.customer_code,
    device?.customer?.customer_code,
    device?.customer_registry?.customer_code,
    device?.wifi_analytics?.customer?.customer_code,
    device?.wifi_customer?.customer_code,
    device?.device_code
  ), "N/D");

const getContractNumber = (device) =>
  safeText(firstValue(
    device?.contract_number,
    device?.customer?.contract_number,
    device?.customer_registry?.contract_number,
    device?.wifi_analytics?.customer?.contract_number,
    device?.wifi_customer?.contract_number,
    device?.service_code
  ), "Servizio Proximity");

const getPlaceName = (device) =>
  safeText(firstValue(
    device?.site_address,
    device?.customer?.site_address,
    device?.customer_registry?.site_address,
    device?.wifi_analytics?.customer?.site_address,
    device?.wifi_customer?.site_address,
    getContractNumber(device),
    getCustomerCode(device)
  ), "Servizio Proximity");

export default function Device360Drawer(props) {
  const {
    open,
    onClose,
    loading,
    selected,
    overview,
    parameters,
    heroGradient,
  } = props;

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!open) setActiveTab("overview");
  }, [open]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: 920 },
          p: 0,
          background: "#f8fafc",
        },
      }}
    >
      {loading && (
        <Box sx={{ p: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && overview && (
        <Box>
          <Box
            sx={{
              p: 3,
              background: heroGradient || "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0ea5e9 100%)",
              color: "white",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" fontWeight={950} noWrap>
                  {safeText(
                    firstValue(
                      overview.customer_name,
                      selected?.customer_name,
                      selected?.wifi_customer?.customer_name
                    ),
                    getCustomerName(selected)
                  )}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.78)", mt: 0.5 }} noWrap>
                  {safeText(
                    firstValue(
                      overview.site_address,
                      selected?.site_address,
                      selected?.wifi_customer?.site_address
                    ),
                    getPlaceName(selected)
                  )}
                </Typography>
              </Box>
              <StatusChip status={overview.online ? "ONLINE" : "OFFLINE"} />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
              <Chip label={`${safeText(overview.manufacturer)} ${safeText(overview.model || overview.hardware_version)}`} sx={{ color: "white", background: "rgba(255,255,255,0.16)", fontWeight: 900 }} />
              <Chip label={`FW ${safeText(overview.software_version)}`} sx={{ color: "white", background: "rgba(255,255,255,0.16)", fontWeight: 900 }} />
            </Stack>
          </Box>

          <Device360Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
          />

          <Box sx={{ p: 3 }}>
            {activeTab === "overview" && <OverviewTab {...props} />}
            {activeTab === "acs" && (
              <AcsTab
                overview={overview}
                selected={selected}
                parameters={parameters}
                onRefresh={props.onRefresh}
                onReboot={props.onReboot}
              />
            )}
            {activeTab === "health" && (
              <HealthTab
                overview={overview}
                diagnostics={props.diagnostics}
                wifiQuality={props.wifiQuality}
                clients={props.clients}
              />
            )}
              {activeTab === "diagnostics" && (
                <DiagnosticsTab device={selected} overview={overview} />
              )}
            {/* EUREKA28.1.1b_HISTORY_MOUNT */}
            {activeTab === "history" && (
              <HistoryTab selected={selected} overview={overview} />
            )}

          </Box>
        </Box>
      )}
    </Drawer>
  );
}
