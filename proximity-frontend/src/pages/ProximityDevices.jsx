import React, { useEffect, useMemo, useState } from "react";
import {
  KpiCard,
  KpiGrid,
  PrimaryActionButton,
  SecondaryActionButton,
  StatusChip,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceSection,
  WorkspaceTabs,
  WorkspaceToolbar,
} from "../components/proximity";
import { DevicePreviewPanel, DevicesFilters, DevicesTable } from "../components/devices";
import Device360Drawer from "../components/device360/Device360Drawer";
import ProximityActionIcon from "../components/icons/ProximityActionIcon";
import { getProximityActionIcon, getProximityIconConfig } from "../components/icons/proximityIconRegistry";
import DeviceFleetTable from "../components/devices/DeviceFleetTable";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

const API_BASE = "";

const DevicesIcon = getProximityIconConfig("ROUTER").icon;
const OnlineIcon = getProximityActionIcon("ACTIVE");
const OfflineIcon = getProximityIconConfig("DIAGNOSTICS").icon;
const FirmwareIcon = getProximityIconConfig("FIRMWARE").icon;
const UpgradeIcon = getProximityIconConfig("WORKFLOW").icon;
const RefreshIcon = getProximityIconConfig("DEVICE_REBOOT").icon;

const emptyFirmwareForm = {
  vendor: "TP-Link",
  model: "XC220-G3v",
  version: "",
  filename: "",
  url: "",
  stable: true,
  mandatory: false,
  notes: "",
};

const safeText = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null) return String(value._value);
    return fallback;
  }

  return String(value);
};

const safeNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null) value = value._value;
    else return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value) => {
  if (!value) return "N/D";

  try {
    return new Date(value).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (err) {
    return String(value);
  }
};

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
};

const isAssociatedCustomer = (device) =>
  Boolean(firstValue(
    device?.customer_name,
    device?.customer?.customer_name,
    device?.customer_registry?.customer_name,
    device?.wifi_analytics?.customer?.customer_name,
    device?.wifi_customer?.customer_name
  ));

const getCustomerName = (device) =>
  safeText(
    firstValue(
      device?.customer_name,
      device?.customer?.customer_name,
      device?.customer_registry?.customer_name,
      device?.wifi_analytics?.customer?.customer_name,
      device?.wifi_customer?.customer_name
    ),
    "LAB DEVICE"
  );

const getCustomerCode = (device) =>
  safeText(
    firstValue(
      device?.customer_code,
      device?.customer?.customer_code,
      device?.customer_registry?.customer_code,
      device?.wifi_analytics?.customer?.customer_code,
      device?.wifi_customer?.customer_code,
      device?.device_code
    ),
    "N/D"
  );

const getContractNumber = (device) =>
  safeText(
    firstValue(
      device?.contract_number,
      device?.customer?.contract_number,
      device?.customer_registry?.contract_number,
      device?.wifi_analytics?.customer?.contract_number,
      device?.wifi_customer?.contract_number,
      device?.service_code
    ),
    "Servizio Proximity"
  );

const getPlaceName = (device) =>
  safeText(
    firstValue(
      device?.site_address,
      device?.customer?.site_address,
      device?.customer_registry?.site_address,
      device?.wifi_analytics?.customer?.site_address,
      device?.wifi_customer?.site_address,
      getContractNumber(device),
      getCustomerCode(device)
    ),
    "Servizio Proximity"
  );

const getHealthTone = (score) => {
  const n = safeNumber(score, null);
  if (n === null) return { label: "Da verificare", color: "default", bg: "rgba(148,163,184,0.14)", fg: "#64748b" };
  if (n >= 80) return { label: "Ottimo", color: "success", bg: "rgba(16,185,129,0.13)", fg: "#059669" };
  if (n >= 60) return { label: "Attenzione", color: "warning", bg: "rgba(245,158,11,0.15)", fg: "#d97706" };
  return { label: "Critico", color: "error", bg: "rgba(239,68,68,0.13)", fg: "#dc2626" };
};

const SoftCard = ({ children, sx }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 5,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "rgba(255,255,255,0.86)",
      boxShadow: "0 24px 80px rgba(15,23,42,0.08)",
      backdropFilter: "blur(18px)",
      ...sx,
    }}
  >
    {children}
  </Card>
);

const SectionTitle = ({ title, subtitle, action }) => (
  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
    <Box>
      <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: -0.4 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Stack>
);

export default function ProximityDevices() {
  const [devices, setDevices] = useState([]);
  const [firmwareCatalog, setFirmwareCatalog] = useState([]);
  const [jobs, setJobs] = useState([]);

  const [selected, setSelected] = useState(null);
  const [previewDeviceId, setPreviewDeviceId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [wifi, setWifi] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [clients, setClients] = useState(null);
  const [wifiAdvisor, setWifiAdvisor] = useState(null);
  const [wifiNeighbors, setWifiNeighbors] = useState(null);
  const [wifiQuality, setWifiQuality] = useState(null);
  const [wifiQualityHistory, setWifiQualityHistory] = useState(null);

  const [newSSID, setNewSSID] = useState("");
  const [newWifiPassword, setNewWifiPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [wifiScanLoading, setWifiScanLoading] = useState(false);
  const [wifiOptimizeLoading, setWifiOptimizeLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modelFilter, setModelFilter] = useState("ALL");
  const [activeView, setActiveView] = useState("customers");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [massFirmwareId, setMassFirmwareId] = useState("");
  const [massUpgradeOpen, setMassUpgradeOpen] = useState(false);
  const [massUpgradeLoading, setMassUpgradeLoading] = useState(false);
  const [lastMassResult, setLastMassResult] = useState(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const [firmwareUploadOpen, setFirmwareUploadOpen] = useState(false);
  const [firmwareForm, setFirmwareForm] = useState(emptyFirmwareForm);
  const [firmwareFile, setFirmwareFile] = useState(null);
  const [firmwareUploadLoading, setFirmwareUploadLoading] = useState(false);
  const [firmwareDeleteTarget, setFirmwareDeleteTarget] = useState(null);
  const [firmwareDeleteLoading, setFirmwareDeleteLoading] = useState(false);

  const models = useMemo(() => {
    const values = new Set();
    devices.forEach((device) => {
      const label = `${safeText(device.manufacturer, "")}${safeText(device.model, "")}`.trim();
      if (label) values.add(`${safeText(device.manufacturer, "N/D")} ${safeText(device.model, "N/D")}`);
    });
    return Array.from(values).sort();
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const text = query.trim().toLowerCase();

    return devices.filter((device) => {
      if (statusFilter === "ONLINE" && !device.online) return false;
      if (statusFilter === "OFFLINE" && device.online) return false;

      const modelLabel = `${safeText(device.manufacturer, "N/D")} ${safeText(device.model, "N/D")}`;
      if (modelFilter !== "ALL" && modelLabel !== modelFilter) return false;

      if (!text) return true;

      const haystack = [
        getCustomerName(device),
        getCustomerCode(device),
        getContractNumber(device),
        getPlaceName(device),
        device.customer_name,
        device.customer_code,
        device.contract_number,
        device.service_code,
        device.site_address,
        device.manufacturer,
        device.model,
        device.serial_number,
        device.device_code,
        device.software_version,
        device.wan_ip,
        device.acs_device_id,
      ]
        .map((v) => safeText(v, ""))
        .join(" ")
        .toLowerCase();

      return haystack.includes(text);
    });
  }, [devices, query, statusFilter, modelFilter]);

  const pagedDevices = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredDevices.slice(start, start + rowsPerPage);
  }, [filteredDevices, page, rowsPerPage]);

  const kpi = useMemo(() => {
    const online = devices.filter((d) => d.online).length;
    const offline = devices.length - online;
    const jobFailures = jobs.filter((job) => job.status === "FAILED").length;
    return {
      devices: devices.length,
      online,
      offline,
      firmware: firmwareCatalog.length,
      jobs: jobs.length,
      failed: jobFailures,
      onlineRate: devices.length ? Math.round((online / devices.length) * 100) : 0,
    };
  }, [devices, firmwareCatalog, jobs]);

  const featuredDevices = useMemo(() => {
    return [...devices]
      .filter((device) => isAssociatedCustomer(device))
      .sort((a, b) => Number(Boolean(b.online)) - Number(Boolean(a.online)));
  }, [devices]);

  const previewDevice = useMemo(() => {
    if (previewDeviceId) {
      const current = devices.find((device) => device.id === previewDeviceId);
      if (current) return current;
    }
    return featuredDevices[0] || filteredDevices[0] || null;
  }, [devices, featuredDevices, filteredDevices, previewDeviceId]);

  const loadDevices = async () => {
    try {
      const [devicesRes, wifiRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/devices`),
        fetch(`${API_BASE}/api/v1/wifi-analytics/summary`).catch(() => null),
      ]);

      const data = await devicesRes.json();
      let wifiData = null;

      try {
        wifiData = wifiRes ? await wifiRes.json() : null;
      } catch (wifiErr) {
        console.warn("WiFi analytics enrichment unavailable", wifiErr);
      }

      const wifiByDeviceId = new Map();
      (wifiData?.items || []).forEach((item) => {
        if (item?.device?.id) wifiByDeviceId.set(item.device.id, item);
      });

      const enriched = (data.items || []).map((device) => {
        const wifiItem = wifiByDeviceId.get(device.id);
        if (!wifiItem) return device;

        return {
          ...device,
          customer_name: firstValue(device.customer_name, wifiItem.customer?.customer_name),
          customer_code: firstValue(device.customer_code, wifiItem.customer?.customer_code),
          contract_number: firstValue(device.contract_number, wifiItem.customer?.contract_number),
          site_address: firstValue(device.site_address, wifiItem.customer?.site_address),
          pppoe_username: firstValue(device.pppoe_username, wifiItem.device?.pppoe_username),
          wan_ip: firstValue(device.wan_ip, wifiItem.device?.wan_ip),
          wifi_analytics: wifiItem,
          wifi_customer: wifiItem.customer,
        };
      });

      setDevices(enriched);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFirmwareCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/firmware/catalog`);
      const data = await res.json();
      setFirmwareCatalog(data.items || []);
      if (!massFirmwareId && data.items?.length) setMassFirmwareId(data.items[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFirmwareJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/firmware/jobs`);
      const data = await res.json();
      setJobs(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setPageLoading(true);
    await Promise.all([loadDevices(), loadFirmwareCatalog(), loadFirmwareJobs()]);
    setPageLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openDevice = async (device) => {
    setSelected(device);
    setLoading(true);
    setWifi(null);
    setDiagnostics(null);
    setClients(null);
    setWifiAdvisor(null);
    setWifiNeighbors(null);
    setWifiQuality(null);
    setWifiQualityHistory(null);
    setParameters([]);
    setNewSSID("");
    setNewWifiPassword("");
    setTechnicalOpen(false);

    try {
      const [
        overviewRes,
        parametersRes,
        wifiRes,
        diagnosticsRes,
        clientsRes,
        advisorRes,
        neighborsRes,
        qualityRes,
        qualityHistoryRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/v1/devices/${device.id}/overview`),
        fetch(`${API_BASE}/api/v1/devices/${device.id}/parameters`),
        fetch(`${API_BASE}/api/v1/devices/${device.id}/wifi`),
        fetch(`${API_BASE}/api/v1/devices/${device.id}/diagnostics`),
        fetch(`${API_BASE}/api/v1/devices/${device.id}/clients`),
        fetch(`${API_BASE}/api/v1/devices/${device.id}/wifi/advisor`),
        fetch(`${API_BASE}/api/v1/devices/${device.id}/wifi/neighbors`),
        fetch(`${API_BASE}/api/v1/devices/${device.id}/wifi/quality`),
        fetch(`${API_BASE}/api/v1/devices/${device.id}/wifi/quality/history`),
      ]);

      const overviewData = await overviewRes.json();
      const parametersData = await parametersRes.json();
      const wifiData = await wifiRes.json();
      const diagnosticsData = await diagnosticsRes.json();
      const clientsData = await clientsRes.json();
      const advisorData = await advisorRes.json();
      const neighborsData = await neighborsRes.json();
      const qualityData = await qualityRes.json();
      const qualityHistoryData = await qualityHistoryRes.json();

      const wifiPayload = wifiData?.wifi || null;
      const primaryWifi = wifiPayload?.primary || null;

      setOverview(overviewData.item || device);
      setParameters(parametersData.items || []);
      setWifi(wifiPayload);
      setDiagnostics(diagnosticsData?.diagnostics || null);
      setClients(clientsData || null);
      setWifiAdvisor(advisorData || null);
      setWifiNeighbors(neighborsData || null);
      setWifiQuality(qualityData || null);
      setWifiQualityHistory(qualityHistoryData || null);
      setNewSSID(primaryWifi?.ssid || "");
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const closeDrawer = () => {
    setSelected(null);
    setOverview(null);
    setParameters([]);
    setWifi(null);
    setDiagnostics(null);
    setClients(null);
    setWifiAdvisor(null);
    setWifiNeighbors(null);
    setWifiQuality(null);
    setWifiQualityHistory(null);
    setNewSSID("");
    setNewWifiPassword("");
    setWifiScanLoading(false);
    setWifiOptimizeLoading(false);
  };

  const runTask = async (deviceId, taskName) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/tasks/${taskName}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data?.detail || `Errore task ${taskName}`);

      alert(`${taskName.toUpperCase()} inviato\n\nTask ID: ${data?.result?._id || "N/D"}`);

      if (taskName === "refresh") {
        setLoading(true);
        window.setTimeout(async () => {
          try {
            await fetch(`${API_BASE}/api/v1/acs/discovery/sync`, { method: "POST" });
            await loadDevices();
            if (selected) await openDevice(selected);
          } catch (syncErr) {
            console.error(syncErr);
          } finally {
            setLoading(false);
          }
        }, 70000);
      }
    } catch (err) {
      console.error(err);
      alert(`Errore esecuzione task ${taskName}: ${err.message}`);
    }
  };

  const loadWifiQualityData = async (deviceId) => {
    try {
      const [qualityRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/devices/${deviceId}/wifi/quality`),
        fetch(`${API_BASE}/api/v1/devices/${deviceId}/wifi/quality/history`),
      ]);

      const qualityData = await qualityRes.json();
      const historyData = await historyRes.json();
      setWifiQuality(qualityData || null);
      setWifiQualityHistory(historyData || null);
      return { quality: qualityData, history: historyData };
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const runWifiScan = async (deviceId) => {
    try {
      setWifiScanLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/wifi/scan`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore WiFi Scan");

      alert("WiFi Scan avviato. I risultati verranno aggiornati al prossimo Inform ACS.");
      window.setTimeout(async () => {
        try {
          await fetch(`${API_BASE}/api/v1/devices/${deviceId}/tasks/refresh`, { method: "POST" });
          window.setTimeout(async () => {
            try {
              await fetch(`${API_BASE}/api/v1/acs/discovery/sync`, { method: "POST" });
              await loadDevices();
              if (selected) await openDevice(selected);
            } finally {
              setWifiScanLoading(false);
              setWifiOptimizeLoading(false);
            }
          }, 70000);
        } catch (refreshErr) {
          console.error(refreshErr);
          setWifiScanLoading(false);
        }
      }, 90000);
    } catch (err) {
      console.error(err);
      setWifiScanLoading(false);
      alert(`Errore WiFi Scan: ${err.message}`);
    }
  };

  const runWifiOptimize = async (deviceId) => {
    const beforeScore = safeNumber(wifiQuality?.score);
    const beforeRating = safeText(wifiQuality?.rating, "N/D");

    try {
      setWifiOptimizeLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/wifi/optimize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore ottimizzazione WiFi");

      if (!data.optimized) {
        alert(data.message || "WiFi già ottimizzato.");
        setWifiOptimizeLoading(false);
        return;
      }

      const changesText = (data.changes || []).map((change) => `${change.radio}: CH ${change.old} -> CH ${change.new}`).join("\n");
      alert(`Ottimizzazione inviata\n\n${changesText}\n\nScore prima: ${beforeScore !== null ? `${beforeScore}/100 ${beforeRating}` : "N/D"}`);

      window.setTimeout(async () => {
        try {
          await fetch(`${API_BASE}/api/v1/devices/${deviceId}/tasks/refresh`, { method: "POST" });
          window.setTimeout(async () => {
            try {
              await fetch(`${API_BASE}/api/v1/acs/discovery/sync`, { method: "POST" });
              await loadDevices();
              if (selected) await openDevice(selected);
              await loadWifiQualityData(deviceId);
            } finally {
              setWifiOptimizeLoading(false);
            }
          }, 70000);
        } catch (refreshErr) {
          console.error(refreshErr);
          setWifiOptimizeLoading(false);
        }
      }, 30000);
    } catch (err) {
      console.error(err);
      setWifiOptimizeLoading(false);
      alert(`Errore ottimizzazione WiFi: ${err.message}`);
    }
  };

  const updateSSID = async () => {
    if (!overview?.id) return alert("Device non selezionato");
    const ssid = newSSID.trim();
    if (!ssid) return alert("Inserisci un SSID valido");

    try {
      const res = await fetch(`${API_BASE}/api/v1/devices/${overview.id}/wifi/ssid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore aggiornamento SSID");
      alert(`SSID inviato\n\nNuovo SSID: ${data.new_ssid || ssid}`);
    } catch (err) {
      console.error(err);
      alert(`Errore aggiornamento SSID: ${err.message}`);
    }
  };

  const updatePassword = async () => {
    if (!overview?.id) return alert("Device non selezionato");
    const password = newWifiPassword.trim();
    if (password.length < 8) return alert("La password WiFi deve avere almeno 8 caratteri");

    try {
      const res = await fetch(`${API_BASE}/api/v1/devices/${overview.id}/wifi/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore aggiornamento password WiFi");
      alert("Password WiFi inviata. Attendere il prossimo Inform ACS per l'applicazione.");
      setNewWifiPassword("");
    } catch (err) {
      console.error(err);
      alert(`Errore aggiornamento password WiFi: ${err.message}`);
    }
  };

  const createFirmware = async () => {
    if (!firmwareForm.vendor || !firmwareForm.model || !firmwareForm.version) {
      return alert("Compila vendor, modello e versione.");
    }

    if (!firmwareFile) {
      return alert("Seleziona un file firmware .bin.");
    }

    try {
      setFirmwareUploadLoading(true);

      const formData = new FormData();
      formData.append("vendor", firmwareForm.vendor);
      formData.append("model", firmwareForm.model);
      formData.append("version", firmwareForm.version);
      formData.append("stable", String(Boolean(firmwareForm.stable)));
      formData.append("mandatory", String(Boolean(firmwareForm.mandatory)));
      formData.append("notes", firmwareForm.notes || "");
      formData.append("file", firmwareFile);

      const res = await fetch(`${API_BASE}/api/v1/firmware/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.detail || "Errore upload firmware");
      }

      setFirmwareUploadOpen(false);
      setFirmwareForm(emptyFirmwareForm);
      setFirmwareFile(null);
      await loadFirmwareCatalog();

      alert(`Firmware caricato: ${data.filename}
URL: ${data.url}`);
    } catch (err) {
      console.error(err);
      alert(`Errore firmware: ${err.message}`);
    } finally {
      setFirmwareUploadLoading(false);
    }
  };

  const deleteFirmware = async () => {
    if (!firmwareDeleteTarget?.id) return;

    try {
      setFirmwareDeleteLoading(true);

      const res = await fetch(`${API_BASE}/api/v1/firmware/catalog/${firmwareDeleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.detail || "Errore eliminazione firmware");
      }

      setFirmwareDeleteTarget(null);
      await loadFirmwareCatalog();

      alert(`Firmware eliminato: ${firmwareDeleteTarget.version}`);
    } catch (err) {
      console.error(err);
      alert(`Errore eliminazione firmware: ${err.message}`);
    } finally {
      setFirmwareDeleteLoading(false);
    }
  };

  const runSingleFirmwareUpgrade = async (deviceId, firmwareId = null) => {
    try {
      const body = firmwareId ? JSON.stringify({ firmware_id: firmwareId }) : JSON.stringify({});
      const res = await fetch(`${API_BASE}/api/v1/firmware/devices/${deviceId}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore upgrade firmware");
      alert(`Upgrade firmware inviato\n\nTask ID: ${data?.result?._id || "N/D"}`);
      await loadFirmwareJobs();
    } catch (err) {
      console.error(err);
      alert(`Errore upgrade firmware: ${err.message}`);
    }
  };

  const toggleDeviceSelection = (deviceId) => {
    setSelectedDeviceIds((current) =>
      current.includes(deviceId) ? current.filter((id) => id !== deviceId) : [...current, deviceId]
    );
  };

  const selectVisibleDevices = () => {
    const visibleIds = pagedDevices.map((device) => device.id);
    const allSelected = visibleIds.every((id) => selectedDeviceIds.includes(id));

    setSelectedDeviceIds((current) => {
      if (allSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const runMassUpgrade = async () => {
    if (!massFirmwareId) return alert("Seleziona un firmware");
    if (selectedDeviceIds.length === 0) return alert("Seleziona almeno un dispositivo");

    try {
      setMassUpgradeLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/firmware/campaigns/mass-upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmware_id: massFirmwareId,
          device_ids: selectedDeviceIds,
          created_by: "BACKOFFICE_UI",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore upgrade massivo");
      setLastMassResult(data);
      await loadFirmwareJobs();
    } catch (err) {
      console.error(err);
      alert(`Errore upgrade massivo: ${err.message}`);
    } finally {
      setMassUpgradeLoading(false);
    }
  };

  const customerName = (device) => getCustomerName(device);
  const placeName = (device) => getPlaceName(device);

  const heroGradient = "linear-gradient(135deg, #0f172a 0%, #1e3a8a 44%, #0891b2 100%)";

  return (
    <>
      <WorkspaceLayout
        header={
          <WorkspaceHeader
            iconDomain="ROUTER"
            breadcrumbs={["Operations", "Devices"]}
            eyebrow="DEVICE MANAGEMENT"
            title="Devices Workspace"
            subtitle="Inventario CPE, diagnostica, firmware, Wi-Fi e operazioni ACS."
            status={`${kpi.online}/${kpi.devices} online`}
            metadata={[
              { label: "Dispositivi", value: kpi.devices },
              { label: "Offline", value: kpi.offline },
              { label: "Firmware", value: kpi.firmware },
              { label: "Upgrade", value: kpi.jobs },
            ]}
            actions={
              <WorkspaceToolbar>
                <PrimaryActionButton startIcon={<RefreshIcon size={18} stroke={1.9} />} onClick={loadAll}>
                  Aggiorna
                </PrimaryActionButton>
                <SecondaryActionButton startIcon={<ProximityActionIcon name="PUBLISH" />} onClick={() => setFirmwareUploadOpen(true)}>
                  Carica firmware
                </SecondaryActionButton>
                <SecondaryActionButton startIcon={<ProximityActionIcon name="ADD" />} onClick={() => setMassUpgradeOpen(true)}>
                  Nuova campagna
                </SecondaryActionButton>
              </WorkspaceToolbar>
            }
          />
        }
        tabs={
          <WorkspaceTabs
            value={activeView}
            onChange={(value) => {
              setActiveView(value);
              setPage(0);
            }}
            items={[
              { value: "customers", label: "Customer view" },
              { value: "devices", label: "Inventory", status: kpi.devices },
              { value: "firmware", label: "Firmware", status: kpi.firmware },
              { value: "campaigns", label: "Campaigns", status: kpi.jobs },
            ]}
          />
        }
      >
        <Box sx={{ maxWidth: 1560, mx: "auto", width: "100%" }}>
          {pageLoading && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}

        <WorkspaceSection
          eyebrow="Operations"
          title="Device management"
          description="Stato operativo dell'inventario CPE, connettività, firmware e campagne di upgrade."
          sx={{ mb: 3 }}
        >
          <KpiGrid>
            <KpiCard
              label="Clienti gestiti"
              value={kpi.devices}
              helper={`${kpi.onlineRate}% online`}
              icon={DevicesIcon}
              tone="primary"
            />
            <KpiCard
              label="Online"
              value={kpi.online}
              helper="Router raggiungibili"
              icon={OnlineIcon}
              tone="success"
            />
            <KpiCard
              label="Da verificare"
              value={kpi.offline}
              helper="Offline o non aggiornati"
              icon={OfflineIcon}
              tone="warning"
            />
            <KpiCard
              label="Firmware"
              value={kpi.firmware}
              helper="Versioni a catalogo"
              icon={FirmwareIcon}
              tone="info"
            />
            <KpiCard
              label="Upgrade"
              value={kpi.jobs}
              helper={`${kpi.failed} falliti`}
              icon={UpgradeIcon}
              tone={kpi.failed > 0 ? "error" : "neutral"}
            />
          </KpiGrid>
        </WorkspaceSection>

        <DevicesFilters
          query={query}
          onQueryChange={(value) => { setQuery(value); setPage(0); }}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => { setStatusFilter(value); setPage(0); }}
          modelFilter={modelFilter}
          onModelFilterChange={(value) => { setModelFilter(value); setPage(0); }}
          models={models}
        />

        {/* EUREKA25.3.3_DEVICE_FLEET */}


        {activeView === "devices" && (


          <DeviceFleetTable


            devices={devices || []}


            onOpenDevice={openDevice}


          />


        )}


        {activeView === "customers" && (
          <>
            <SectionTitle
              title="Anteprima cliente e device"
              subtitle="La tabella sottostante è l’unico elenco operativo. Qui resta visibile solo il contesto del device selezionato."
            />
            <DevicePreviewPanel
              device={previewDevice}
              customerName={customerName}
              placeName={placeName}
              safeText={safeText}
              score={previewDevice ? (previewDevice.online ? safeNumber(previewDevice.wifi_score, 82) : safeNumber(previewDevice.wifi_score, null)) : null}
              healthTone={getHealthTone(previewDevice ? (previewDevice.online ? safeNumber(previewDevice.wifi_score, 82) : safeNumber(previewDevice.wifi_score, null)) : null)}
              onOpen={openDevice}
              onRefresh={(device) => runTask(device.id, "refresh")}
              onFirmwareUpgrade={(device) => runSingleFirmwareUpgrade(device.id)}
            />
          </>
        )}
        {activeView === "customers" && (
          <DevicesTable
            devices={pagedDevices}
            filteredCount={filteredDevices.length}
            selectedIds={selectedDeviceIds}
            previewDeviceId={previewDevice?.id || null}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); }}
            onToggleSelection={toggleDeviceSelection}
            onSelectVisible={selectVisibleDevices}
            onPreview={setPreviewDeviceId}
            onOpen={openDevice}
            onRefresh={(device) => runTask(device.id, "refresh")}
            onMassUpgrade={() => setMassUpgradeOpen(true)}
            customerName={customerName}
            customerCode={getCustomerCode}
            placeName={placeName}
            safeText={safeText}
            formatDate={formatDate}
          />
        )}

        {activeView === "firmware" && (
          <SoftCard>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle
                title="Firmware Repository"
                subtitle="Catalogo firmware, versioni supportate e rollout verso i CPE."
                action={
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Button variant="outlined" onClick={() => setFirmwareUploadOpen(true)} sx={{ borderRadius: 999, fontWeight: 900 }}>
                      Carica firmware
                    </Button>
                  </Stack>
                }
              />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }, gap: 2 }}>
                {firmwareCatalog.map((fw) => (
                  <Card key={fw.id} elevation={0} sx={{ borderRadius: 4, border: "1px solid rgba(15,23,42,0.08)", background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6" fontWeight={950}>{safeText(fw.vendor)} {safeText(fw.model)}</Typography>
                          <Typography variant="h4" fontWeight={950} sx={{ mt: 1, color: "#1d4ed8" }}>{safeText(fw.version)}</Typography>
                        </Box>
                        <Chip label={fw.stable ? "Stable" : "Lab"} color={fw.stable ? "success" : "default"} sx={{ fontWeight: 900 }} />
                      </Stack>
                      <Box sx={{ mt: 2, p: 1.5, borderRadius: 3, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)" }}>
                        <Typography variant="body2" sx={{ color: "#334155", fontWeight: 850 }} noWrap>
                          File: {safeText(fw.filename)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }} noWrap>
                          Size: {fw.file_size ? `${Math.round(Number(fw.file_size) / 1024)} KB` : "N/D"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }} noWrap>
                          URL: {safeText(fw.url)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
                        <Button variant="contained" onClick={() => { setMassFirmwareId(fw.id); setMassUpgradeOpen(true); }} sx={{ borderRadius: 999, fontWeight: 900 }}>
                          Usa
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => setFirmwareDeleteTarget(fw)} sx={{ borderRadius: 999, fontWeight: 900 }}>
                          Elimina
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </SoftCard>
        )}

        {activeView === "campaigns" && (
          <SoftCard>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, pb: 1 }}>
                <SectionTitle
                  title="Campaign Manager"
                  subtitle="Campagne firmware, target CPE, avanzamento e storico rollout."
                  action={<Button variant="contained" onClick={() => setMassUpgradeOpen(true)} sx={{ borderRadius: 999, fontWeight: 900 }}>Nuova campagna</Button>}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 950 }}>Job</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Device</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Task GenieACS</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Stato</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Creato da</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Data</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell><Typography fontWeight={900}>{job.job_code}</Typography></TableCell>
                        <TableCell>{job.acs_device_id}</TableCell>
                        <TableCell><Chip size="small" label={safeText(job.task_id)} sx={{ fontWeight: 800 }} /></TableCell>
                        <TableCell><Chip size="small" label={job.status} color={job.status === "FAILED" ? "error" : "success"} sx={{ fontWeight: 900 }} /></TableCell>
                        <TableCell>{safeText(job.created_by)}</TableCell>
                        <TableCell>{formatDate(job.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {jobs.length === 0 && (
                      <TableRow><TableCell colSpan={6}><Box sx={{ p: 4, textAlign: "center" }}>Nessuna campagna ancora creata.</Box></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </SoftCard>
        )}
      </Box>
      </WorkspaceLayout>

      <Dialog open={Boolean(firmwareDeleteTarget)} onClose={() => setFirmwareDeleteTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Elimina firmware</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
            Questa operazione elimina il firmware dal catalogo e prova a rimuovere il file dal repository.
          </Alert>

          {firmwareDeleteTarget && (
            <Box sx={{ p: 2, borderRadius: 3, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)" }}>
              <Typography sx={{ fontWeight: 950 }}>
                {safeText(firmwareDeleteTarget.vendor)} {safeText(firmwareDeleteTarget.model)}
              </Typography>
              <Typography sx={{ color: "#1d4ed8", fontWeight: 950, fontSize: 24, mt: 0.5 }}>
                {safeText(firmwareDeleteTarget.version)}
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", mt: 1 }}>
                File: {safeText(firmwareDeleteTarget.filename)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setFirmwareDeleteTarget(null)} sx={{ borderRadius: 999, fontWeight: 900 }}>
            Annulla
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={deleteFirmware}
            disabled={firmwareDeleteLoading}
            sx={{ borderRadius: 999, fontWeight: 900 }}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={firmwareUploadOpen} onClose={() => setFirmwareUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Carica firmware</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>
            Carica il file firmware sul server Proximity: il backend genera automaticamente URL pubblico e record catalogo.
          </Alert>

          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField fullWidth label="Vendor" value={firmwareForm.vendor} onChange={(event) => setFirmwareForm({ ...firmwareForm, vendor: event.target.value })} />
              <TextField fullWidth label="Modello" value={firmwareForm.model} onChange={(event) => setFirmwareForm({ ...firmwareForm, model: event.target.value })} />
            </Stack>
            <TextField fullWidth label="Versione" placeholder="es. TEST-3.0" value={firmwareForm.version} onChange={(event) => setFirmwareForm({ ...firmwareForm, version: event.target.value })} />
            <Button
              variant="outlined"
              component="label"
              sx={{ borderRadius: 999, fontWeight: 900, alignSelf: "flex-start" }}
            >
              Scegli file firmware
              <input
                hidden
                type="file"
                accept=".bin,.img,.trx,.chk,.zip,.tar,.gz,.fw"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setFirmwareFile(file);
                  if (file) setFirmwareForm({ ...firmwareForm, filename: file.name });
                }}
              />
            </Button>

            <TextField
              fullWidth
              label="File selezionato"
              value={firmwareFile?.name || ""}
              placeholder="Nessun file selezionato"
              InputProps={{ readOnly: true }}
            />

            <TextField fullWidth multiline rows={2} label="Note" value={firmwareForm.notes} onChange={(event) => setFirmwareForm({ ...firmwareForm, notes: event.target.value })} />
            <Stack direction="row" spacing={2}>
              <FormControlLabel control={<Switch checked={firmwareForm.stable} onChange={(event) => setFirmwareForm({ ...firmwareForm, stable: event.target.checked })} />} label="Stable" />
              <FormControlLabel control={<Switch checked={firmwareForm.mandatory} onChange={(event) => setFirmwareForm({ ...firmwareForm, mandatory: event.target.checked })} />} label="Mandatory" />
            </Stack>
            {firmwareUploadLoading && <LinearProgress />}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setFirmwareUploadOpen(false)} sx={{ borderRadius: 999, fontWeight: 900 }}>Annulla</Button>
          <Button variant="contained" onClick={createFirmware} disabled={firmwareUploadLoading} sx={{ borderRadius: 999, fontWeight: 900 }}>Salva firmware</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={massUpgradeOpen} onClose={() => setMassUpgradeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Upgrade firmware massivo</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>
            Seleziona il firmware e conferma. Verranno creati task GenieACS download per i device selezionati.
          </Alert>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Firmware</InputLabel>
              <Select label="Firmware" value={massFirmwareId} onChange={(event) => setMassFirmwareId(event.target.value)}>
                {firmwareCatalog.map((fw) => (
                  <MenuItem key={fw.id} value={fw.id}>
                    {fw.vendor} {fw.model} - {fw.version} - {fw.filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ p: 2, borderRadius: 3, background: "#f8fafc" }}>
              <Typography fontWeight={900}>Device selezionati: {selectedDeviceIds.length}</Typography>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Puoi selezionare altri device dalla tabella principale.
              </Typography>
            </Box>
            {massUpgradeLoading && <LinearProgress />}
            {lastMassResult && (
              <Alert severity={lastMassResult.failed > 0 ? "warning" : "success"} sx={{ borderRadius: 3 }}>
                Upgrade creato: {lastMassResult.created} task creati, {lastMassResult.failed} falliti.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setMassUpgradeOpen(false)} sx={{ borderRadius: 999, fontWeight: 900 }}>Chiudi</Button>
          <Button variant="contained" onClick={runMassUpgrade} disabled={massUpgradeLoading} sx={{ borderRadius: 999, fontWeight: 900 }}>
            Avvia upgrade
          </Button>
        </DialogActions>
      </Dialog>

      <Device360Drawer
        open={Boolean(selected)}
        onClose={closeDrawer}
        loading={loading}
        selected={selected}
        overview={overview}
        parameters={parameters}
        wifiQuality={wifiQuality}
        diagnostics={diagnostics}
        clients={clients}
        newSSID={newSSID}
        onSSIDChange={(event) => setNewSSID(event.target.value)}
        newWifiPassword={newWifiPassword}
        onWifiPasswordChange={(event) => setNewWifiPassword(event.target.value)}
        technicalOpen={technicalOpen}
        onToggleTechnical={() => setTechnicalOpen((value) => !value)}
        wifiScanLoading={wifiScanLoading}
        wifiOptimizeLoading={wifiOptimizeLoading}
        onWifiOptimize={() => overview?.id && runWifiOptimize(overview.id)}
        onWifiScan={() => overview?.id && runWifiScan(overview.id)}
        onRefresh={() => overview?.id && runTask(overview.id, "refresh")}
        onReboot={() => overview?.id && runTask(overview.id, "reboot")}
        onFirmwareUpgrade={() => overview?.id && runSingleFirmwareUpgrade(overview.id)}
        onUpdateSSID={updateSSID}
        onUpdatePassword={updatePassword}
        heroGradient={heroGradient}
      />
    </>
  );
}
