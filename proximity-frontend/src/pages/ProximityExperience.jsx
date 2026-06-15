import React, { useEffect, useMemo, useState } from "react";
import Customers from "./Customers";
import ProximityDevices from "./ProximityDevices";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  Analytics,
  Campaign,
  Close,
  CloudUpload,
  Dashboard,
  Devices,
  Favorite,
  NotificationsNone,
  Person,
  Phone,
  Public,
  Refresh,
  Router,
  Search,
  SignalWifi4Bar,
  Storage,
  SupportAgent,
  Tune,
  Wifi,
} from "@mui/icons-material";

const API_BASE = window.location.hostname
  ? `http://${window.location.hostname}:8010`
  : "http://10.40.0.22:8010";

const accent = "#2563eb";
const navy = "#0f172a";
const muted = "#64748b";
const border = "rgba(148, 163, 184, 0.28)";
const softShadow = "0 18px 50px rgba(15, 23, 42, 0.06)";

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


const DEVICE_IMAGES = {
  "XC220-G3v": "/devices/tplink-xc220-g3v.png",
  "XC220": "/devices/tplink-xc220-g3v.png",
  "EG8145X6": "/devices/huawei-eg8145x6.png",
  "H6645P": "/devices/zte-h6645p.png",
  "FRITZ!Box 7590": "/devices/fritzbox-7590.png",
  "7590": "/devices/fritzbox-7590.png",
};

const getDeviceImage = (device) => {
  const model = safe(device?.model, "");
  const product = `${safe(device?.manufacturer, "")} ${model}`.trim();

  const matchKey = Object.keys(DEVICE_IMAGES).find((key) =>
    product.toLowerCase().includes(key.toLowerCase()) ||
    model.toLowerCase().includes(key.toLowerCase())
  );

  return matchKey ? DEVICE_IMAGES[matchKey] : null;
};

const safe = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value?._value ?? fallback;
  return String(value);
};

const shortText = (value, max = 22) => {
  const text = safe(value, "");
  if (!text) return "N/D";
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const dateText = (value) => {
  if (!value) return "N/D";
  try {
    return new Date(value).toLocaleString("it-IT");
  } catch {
    return String(value);
  }
};

function SoftCard({ children, sx }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${border}`,
        borderRadius: 4,
        background: "#fff",
        boxShadow: softShadow,
        overflow: "hidden",
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}

function ActionButton({ color = "blue", icon, label, onClick }) {
  const styles = {
    blue: {
      background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
      color: "#fff",
      boxShadow: "0 14px 30px rgba(37,99,235,.22)",
      border: "1px solid transparent",
    },
    green: {
      background: "linear-gradient(135deg,#16a34a,#059669)",
      color: "#fff",
      boxShadow: "0 14px 30px rgba(22,163,74,.18)",
      border: "1px solid transparent",
    },
    purple: {
      background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
      color: "#fff",
      boxShadow: "0 14px 30px rgba(124,58,237,.18)",
      border: "1px solid transparent",
    },
    white: {
      background: "#fff",
      color: navy,
      boxShadow: "none",
      border: `1px solid ${border}`,
    },
  };

  return (
    <Button
      onClick={onClick}
      startIcon={icon}
      sx={{
        ...styles[color],
        borderRadius: 2.4,
        px: 2.6,
        py: 1.35,
        minWidth: 165,
        textTransform: "none",
        fontWeight: 950,
        whiteSpace: "nowrap",
        "&:hover": {
          transform: "translateY(-1px)",
          filter: color === "white" ? "none" : "brightness(.98)",
          background: styles[color].background,
        },
      }}
    >
      {label}
    </Button>
  );
}

function KpiCard({ icon, title, value, subtitle, tone = "blue", onClick }) {
  const tones = {
    blue: ["#dbeafe", "#2563eb"],
    green: ["#dcfce7", "#16a34a"],
    purple: ["#ede9fe", "#7c3aed"],
    amber: ["#fef3c7", "#f59e0b"],
    cyan: ["#ccfbf1", "#0f766e"],
  };
  const [bg, color] = tones[tone] || tones.blue;

  return (
    <SoftCard
      sx={{
        cursor: onClick ? "pointer" : "default",
        transition: "all .18s ease",
        "&:hover": onClick
          ? {
              transform: "translateY(-2px)",
              boxShadow: "0 22px 60px rgba(15,23,42,.1)",
            }
          : {},
      }}
    >
      <CardContent onClick={onClick} sx={{ p: 2.3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              background: bg,
              color,
              flex: "0 0 auto",
            }}
          >
            {icon}
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 27, fontWeight: 950, color: navy, lineHeight: 1 }}>
              {value}
            </Typography>
            <Typography sx={{ mt: 0.65, fontWeight: 850, color: navy, whiteSpace: "nowrap" }}>
              {title}
            </Typography>
            <Typography sx={{ mt: 0.25, color: muted, fontSize: 13 }}>
              {subtitle}
            </Typography>
          </Box>

          <Typography sx={{ color: muted, fontSize: 26, lineHeight: 1 }}>›</Typography>
        </Stack>
      </CardContent>
    </SoftCard>
  );
}

function StatusDot({ online }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "50%",
        mr: 0.7,
        background: online ? "#16a34a" : "#f59e0b",
      }}
    />
  );
}

function DeviceIllustration({ device, index = 0 }) {
  const image = getDeviceImage(device);
  const useWifi = index % 2 === 0;

  return (
    <Box
      sx={{
        height: 110,
        borderRadius: 3,
        background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
        border: "1px solid rgba(148,163,184,.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mb: 1.4,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {image ? (
        <CardMedia
          component="img"
          src={image}
          alt={safe(device?.model, "Router")}
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallback = event.currentTarget.parentElement?.querySelector("[data-device-fallback='true']");
            if (fallback) fallback.style.display = "grid";
          }}
          sx={{
            width: "88%",
            height: "88%",
            objectFit: "contain",
            filter: "drop-shadow(0 14px 18px rgba(15,23,42,.18))",
          }}
        />
      ) : null}

      <Box
        data-device-fallback="true"
        sx={{
          display: image ? "none" : "grid",
          width: 70,
          height: 70,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#ffffff,#e2e8f0)",
          border: "1px solid rgba(148,163,184,.35)",
          placeItems: "center",
          color: "#94a3b8",
          boxShadow: "inset 0 -8px 20px rgba(15,23,42,.05)",
        }}
      >
        {useWifi ? <Wifi sx={{ fontSize: 36 }} /> : <Router sx={{ fontSize: 36 }} />}
      </Box>
    </Box>
  );
}

function DeviceCard({ device, index, onOpen }) {
  const online = Boolean(device.online);
  return (
    <Box
      sx={{
        height: "100%",
        border: `1px solid rgba(148,163,184,.25)`,
        borderRadius: 3,
        p: 1.6,
        background: "#fff",
        transition: "all .16s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 16px 35px rgba(15,23,42,.08)",
        },
      }}
    >
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.5 }}>
        <Typography
          sx={{
            color: online ? "#16a34a" : "#f59e0b",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          <StatusDot online={online} />
          {online ? "Online" : "Offline"}
        </Typography>
      </Stack>

      <DeviceIllustration device={device} index={index} />

      <Typography sx={{ mt: 1.5, fontWeight: 950, fontSize: 16, minHeight: 42 }}>
        {shortText(`${safe(device.manufacturer, "TP-Link")} ${safe(device.model, "Device")}`, 22)}
      </Typography>

      <Typography sx={{ color: muted, fontSize: 13, mt: 1 }}>
        {safe(device.customer_name, "🧪 LAB DEVICE")}
      </Typography>
      {device.wifi_analytics?.wifi_score ? (
        <Stack direction="row" spacing={0.8} sx={{ mt: 0.8, flexWrap: "wrap", gap: 0.6 }}>
          <Chip
            size="small"
            label={`WiFi ${device.wifi_analytics.wifi_score.score}/100`}
            color={device.wifi_analytics.wifi_score.score >= 75 ? "success" : "warning"}
            sx={{ fontWeight: 850 }}
          />
          <Chip
            size="small"
            label={`${device.wifi_analytics.kpi?.unique_active_clients ?? 0} client`}
            variant="outlined"
            sx={{ fontWeight: 850 }}
          />
        </Stack>
      ) : null}
      <Typography sx={{ color: "#334155", fontSize: 13, mt: 0.6 }}>
        {safe(device.wan_ip, safe(device.lan_ip, "—"))}
      </Typography>
      <Typography sx={{ color: muted, fontSize: 13, mt: 0.6 }}>
        Firmware {shortText(device.software_version, 18)}
      </Typography>

      <Button
        fullWidth
        variant="outlined"
        onClick={onOpen}
        sx={{
          mt: 2,
          borderRadius: 2,
          py: 0.85,
          textTransform: "none",
          fontWeight: 900,
        }}
      >
        {online ? "Apri" : "Dettagli"}
      </Button>
    </Box>
  );
}

function FeedItem({ icon, title, subtitle, time, tone = "blue" }) {
  const tones = {
    blue: ["#dbeafe", "#2563eb"],
    green: ["#dcfce7", "#16a34a"],
    purple: ["#ede9fe", "#7c3aed"],
    amber: ["#fef3c7", "#f59e0b"],
    red: ["#fee2e2", "#ef4444"],
  };
  const [bg, color] = tones[tone] || tones.blue;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto",
        gap: 1.5,
        alignItems: "center",
        py: 1.35,
        borderBottom: `1px solid rgba(148,163,184,.18)`,
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2.5,
          background: bg,
          color,
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 900, fontSize: 14 }}>
          {title}
        </Typography>
        <Typography sx={{ color: muted, fontSize: 13 }}>
          {subtitle}
        </Typography>
      </Box>
      <Typography sx={{ color: muted, fontSize: 12, whiteSpace: "nowrap" }}>
        {time}
      </Typography>
    </Box>
  );
}

function CampaignRow({ name, target, progress, status, color = "blue" }) {
  const isComplete = color === "green" || progress >= 100;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1.2fr .8fr 1fr .8fr",
        gap: 1,
        alignItems: "center",
        px: 0.5,
        py: 1.15,
        borderBottom: `1px solid rgba(148,163,184,.16)`,
      }}
    >
      <Typography sx={{ fontWeight: 900, fontSize: 13 }}>{name}</Typography>
      <Typography sx={{ color: navy, fontSize: 13 }}>{target}</Typography>
      <Box>
        <Typography sx={{ fontSize: 12, color: muted, mb: 0.5 }}>{progress}%</Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 7,
            borderRadius: 10,
            background: "#e2e8f0",
            "& .MuiLinearProgress-bar": {
              borderRadius: 10,
              background: isComplete ? "#16a34a" : accent,
            },
          }}
        />
      </Box>
      <Chip
        size="small"
        label={status}
        color={isComplete ? "success" : "primary"}
        sx={{ fontWeight: 850 }}
      />
    </Box>
  );
}


function formatUptimeSeconds(seconds) {
  if (!seconds && seconds !== 0) return "N/D";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}g ${h}h ${m}m`;
}

function calculateHealth(device) {
  return device?.device_assurance?.health_score ?? 0;
}

function healthColor(score) {
  if (score >= 90) return "success";
  if (score >= 70) return "warning";
  return "error";
}

function riskColor(level) {
  if (level === "LOW") return "success";
  if (level === "MEDIUM") return "warning";
  return "error";
}

function cxColor(status) {
  if (status === "EXCELLENT") return "success";
  if (status === "GOOD") return "info";
  if (status === "WARNING") return "warning";
  return "error";
}

function wanRiskColor(level) {
  if (level === "LOW") return "success";
  if (level === "MEDIUM") return "warning";
  return "error";
}

function internetStatusColor(status) {
  if (status === "EXCELLENT") return "success";
  if (status === "GOOD") return "info";
  if (status === "WARNING") return "warning";
  return "error";
}

function voipStatusColor(status) {
  if (status === "OK") return "success";
  if (status === "DEGRADED") return "warning";
  if (status === "NOT_SUPPORTED") return "default";
  return "error";
}

function pctText(value) {
  if (value === null || value === undefined || value === "") return "N/D";
  return `${Math.round(Number(value))}%`;
}


function InfoLine({ label, value }) {
  return (
    <Box>
      <Typography sx={{ color: muted, fontSize: 12, fontWeight: 800 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 850, overflowWrap: "anywhere" }}>{value}</Typography>
    </Box>
  );
}

export default function ProximityExperience() {
  const [active, setActive] = useState("home");
  const [devices, setDevices] = useState([]);
  const [firmware, setFirmware] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wifiSummary, setWifiSummary] = useState(null);
  const [deviceAssuranceById, setDeviceAssuranceById] = useState({});
  const [customerExperience, setCustomerExperience] = useState([]);
  const [selectedCX, setSelectedCX] = useState(null);
  const [wanSummary, setWanSummary] = useState(null);
  const [selectedWAN, setSelectedWAN] = useState(null);
  const [internetSummary, setInternetSummary] = useState(null);
  const [selectedInternet, setSelectedInternet] = useState(null);
  const [voipSummary, setVoipSummary] = useState(null);
  const [selectedVoip, setSelectedVoip] = useState(null);

  const [firmwareDialog, setFirmwareDialog] = useState(false);
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [firmwareForm, setFirmwareForm] = useState(emptyFirmwareForm);
  const [campaignFirmwareId, setCampaignFirmwareId] = useState("");
  const [campaignDeviceIds, setCampaignDeviceIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [deviceRes, firmwareRes, jobsRes, wifiRes, cxRes, wanRes, internetRes, voipRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/devices`),
        fetch(`${API_BASE}/api/v1/firmware/catalog`),
        fetch(`${API_BASE}/api/v1/firmware/jobs`),
        fetch(`${API_BASE}/api/v1/wifi-analytics/summary`),
        fetch(`${API_BASE}/api/v1/customer-experience/customers`),
        fetch(`${API_BASE}/api/v1/wan-assurance/summary`),
        fetch(`${API_BASE}/api/v1/internet-experience/summary`),
        fetch(`${API_BASE}/api/v1/voip-assurance/summary`),
      ]);

      const campaignsRes = await fetch(`${API_BASE}/api/v1/firmware/campaigns`);

      const [deviceData, firmwareData, jobsData, wifiData, cxData, wanData, internetData, voipData, campaignsData] = await Promise.all([
        deviceRes.json(),
        firmwareRes.json(),
        jobsRes.json(),
        wifiRes.json(),
        cxRes.json(),
        wanRes.json(),
        internetRes.json(),
        voipRes.json(),
        campaignsRes.json(),
      ]);

      setDevices(deviceData.items || []);
      setFirmware(firmwareData.items || []);
      setJobs(jobsData.items || []);
      setWifiSummary(wifiData?.success ? wifiData : null);
      setCustomerExperience(cxData?.success ? cxData.items || [] : []);
      setWanSummary(wanData?.success ? wanData : null);
      setInternetSummary(internetData?.success ? internetData : null);
      setVoipSummary(voipData?.success ? voipData : null);
      setCampaigns(campaignsData.items || []);
    } catch (err) {
      console.error(err);
      alert(`Errore caricamento dati: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!campaignFirmwareId && firmware.length > 0) {
      setCampaignFirmwareId(firmware[0].id);
    }
  }, [firmware, campaignFirmwareId]);

  const stats = useMemo(() => {
    const online = devices.filter((d) => d.online).length;
    const offline = Math.max(devices.length - online, 0);
    const errors = jobs.filter((j) => j.status === "FAILED").length;
    const onlinePct = devices.length ? Math.round((online / devices.length) * 100) : 0;
    return {
      online,
      offline,
      onlinePct,
      errors,
      jobs: jobs.length,
      firmware: firmware.length,
    };
  }, [devices, jobs, firmware]);

  const wifiDevicesById = useMemo(() => {
    const map = new Map();
    (wifiSummary?.items || []).forEach((item) => {
      if (item?.device?.id) map.set(item.device.id, item);
    });
    return map;
  }, [wifiSummary]);

  const enrichedDevices = useMemo(() => {
    return devices.map((device) => {
      const wifiItem = wifiDevicesById.get(device.id);
      if (!wifiItem) return device;
      return {
        ...device,
        customer_name: wifiItem.customer?.customer_name || device.customer_name,
        customer_code: wifiItem.customer?.customer_code || device.customer_code,
        contract_number: wifiItem.customer?.contract_number || device.contract_number,
        pppoe_username: wifiItem.device?.pppoe_username || device.pppoe_username,
        wan_ip: wifiItem.device?.wan_ip || device.wan_ip,
        wifi_analytics: wifiItem,
      };
    });
  }, [devices, wifiDevicesById]);

  const recentDevices = useMemo(() => enrichedDevices.slice(0, 4), [enrichedDevices]);
  const latestFirmware = useMemo(() => firmware.slice(0, 4), [firmware]);
  const latestJobs = useMemo(() => jobs.slice(0, 4), [jobs]);

  const cxStats = useMemo(() => {
    const total = customerExperience.length;
    const average = total
      ? Math.round(customerExperience.reduce((sum, item) => sum + Number(item.cx_score || 0), 0) / total)
      : 0;

    return {
      total,
      average,
      excellent: customerExperience.filter((item) => item.cx_status === "EXCELLENT").length,
      good: customerExperience.filter((item) => item.cx_status === "GOOD").length,
      warning: customerExperience.filter((item) => item.cx_status === "WARNING").length,
      critical: customerExperience.filter((item) => item.cx_status === "CRITICAL").length,
    };
  }, [customerExperience]);


  const createFirmware = async () => {
    if (
      !firmwareForm.vendor ||
      !firmwareForm.model ||
      !firmwareForm.version ||
      !firmwareForm.filename ||
      !firmwareForm.url
    ) {
      alert("Compila vendor, modello, versione, filename e URL.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/firmware/catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firmwareForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Errore creazione firmware");
      }

      setFirmwareDialog(false);
      setFirmwareForm(emptyFirmwareForm);
      await loadAll();
      alert(`Firmware caricato: ${data.firmware_id}`);
    } catch (err) {
      console.error(err);
      alert(`Errore firmware: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const createCampaign = async () => {
    if (!campaignFirmwareId) {
      alert("Seleziona un firmware.");
      return;
    }
    if (campaignDeviceIds.length === 0) {
      alert("Seleziona almeno un dispositivo.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/firmware/campaigns/mass-upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmware_id: campaignFirmwareId,
          device_ids: campaignDeviceIds,
          created_by: "BACKOFFICE",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Errore creazione campagna");
      }

      setCampaignDialog(false);
      setCampaignDeviceIds([]);
      await loadAll();
      alert(`Campagna avviata. Task creati: ${data.created}, errori: ${data.failed}`);
    } catch (err) {
      console.error(err);
      alert(`Errore campagna: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleCampaignDevice = (id) => {
    setCampaignDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };


  const openDeviceDrawer = async (device) => {
    const cachedAssurance = deviceAssuranceById[device.id];
    setSelectedDevice({
      ...device,
      device_assurance: cachedAssurance || device.device_assurance,
    });

    try {
      const res = await fetch(`${API_BASE}/api/v1/device-assurance/devices/${device.id}`);
      const data = await res.json();

      if (res.ok && data?.success && data?.item) {
        setDeviceAssuranceById((prev) => ({
          ...prev,
          [device.id]: data.item,
        }));
        setSelectedDevice((current) => {
          if (!current || current.id !== device.id) return current;
          return {
            ...current,
            device_assurance: data.item,
          };
        });
      }
    } catch (err) {
      console.error("Device assurance load failed", err);
    }
  };

  const sidebarGroups = [
    {
      title: "Operations",
      items: [
        ["home", "Home", <Dashboard />],
        ["customers", "Customers", <Person />],
        ["customer-care", "Customer Care", <SupportAgent />],
        ["devices", "CPE Operations", <Devices />],
      ],
    },
    {
      title: "Assurance",
      items: [
        ["wifi", "WiFi Analytics", <Wifi />],
        ["cx", "Customer Experience", <Favorite />],
        ["wan", "WAN Assurance", <Public />],
        ["internet", "Internet Experience", <SignalWifi4Bar />],
        ["voip", "VoIP Assurance", <Phone />],
      ],
    },
  ];

  const handleSidebarClick = (key) => {
    if (key === "customer-care") {
      window.location.href = "/customer-care";
      return;
    }

    setActive(key);
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc", display: "flex", color: navy }}>
      <Box
        sx={{
          width: 248,
          flex: "0 0 248px",
          borderRight: `1px solid ${border}`,
          background: "#fff",
          p: 2.5,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Box
          sx={{
            mb: 3,
            p: 1.4,
            borderRadius: 4,
            background: "linear-gradient(145deg,#0f172a,#1d4ed8)",
            color: "#fff",
            boxShadow: "0 18px 40px rgba(37,99,235,.20)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                background: "rgba(255,255,255,.16)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.22)",
              }}
            >
              <Router />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 950, fontSize: 20, letterSpacing: -0.5 }}>
                PROXIMITY
              </Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,.72)", mt: -0.4 }}>
                by NovaSpace
              </Typography>
            </Box>
          </Stack>
          <Chip
            size="small"
            label="Operations Console"
            sx={{
              mt: 1.4,
              height: 24,
              fontWeight: 900,
              color: "#dbeafe",
              background: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.16)",
            }}
          />
        </Box>

        <Stack spacing={2.1}>
          {sidebarGroups.map((group) => (
            <Box key={group.title}>
              <Typography
                sx={{
                  px: 1.2,
                  mb: 0.75,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  fontWeight: 950,
                  color: "#94a3b8",
                }}
              >
                {group.title}
              </Typography>

              <Stack spacing={0.55}>
                {group.items.map(([key, label, icon]) => {
                  const selected = active === key || (key === "customer-care" && window.location.pathname === "/customer-care");

                  return (
                    <Button
                      key={key}
                      onClick={() => handleSidebarClick(key)}
                      startIcon={
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 2,
                            display: "grid",
                            placeItems: "center",
                            color: selected ? "#fff" : "#64748b",
                            background: selected ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#f1f5f9",
                            "& svg": { fontSize: 18 },
                          }}
                        >
                          {icon}
                        </Box>
                      }
                      sx={{
                        justifyContent: "flex-start",
                        borderRadius: 2.6,
                        py: 0.95,
                        px: 1.05,
                        textTransform: "none",
                        fontWeight: selected ? 950 : 850,
                        color: selected ? "#0f172a" : "#334155",
                        background: selected ? "linear-gradient(90deg,#eff6ff,#ffffff)" : "transparent",
                        border: selected ? "1px solid rgba(37,99,235,.18)" : "1px solid transparent",
                        boxShadow: selected ? "0 12px 28px rgba(37,99,235,.10)" : "none",
                        "&:hover": {
                          background: "#f8fafc",
                          borderColor: "rgba(148,163,184,.25)",
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, textAlign: "left" }}>{label}</Box>
                      {selected ? (
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: accent }} />
                      ) : null}
                    </Button>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>

        <Box sx={{ mt: "auto" }}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 3 }}>
            <Avatar sx={{ width: 38, height: 38, bgcolor: "#dbeafe", color: accent, fontWeight: 950 }}>
              AD
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: 13 }}>Admin</Typography>
              <Typography sx={{ fontSize: 12, color: muted }}>admin@novaspace.it</Typography>
            </Box>
          </Stack>
          <Typography sx={{ fontWeight: 850, fontSize: 13, color: navy }}>Proximity v2.1.0</Typography>
          <Typography sx={{ fontSize: 12, color: muted }}>© NovaSpace Srl</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            height: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            px: { xs: 2, lg: 4 },
            borderBottom: `1px solid ${border}`,
            background: "rgba(255,255,255,0.86)",
            backdropFilter: "blur(16px)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton><Search /></IconButton>
            <IconButton><NotificationsNone /></IconButton>
            <Chip label="AD" sx={{ fontWeight: 900, background: "#dbeafe", color: accent }} />
          </Stack>
        </Box>

        <Box sx={{ px: { xs: 2, lg: 4 }, py: 3, maxWidth: 1620, mx: "auto" }}>
          {active === "customers" ? (
            <Customers />
          ) : active === "devices" ? (
            <ProximityDevices />
          ) : active === "wifi" ? (
            <>
              <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} spacing={2.2} sx={{ mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: { xs: 34, lg: 40 }, fontWeight: 950, letterSpacing: -1.3 }}>WiFi Analytics</Typography>
                  <Typography sx={{ color: muted, mt: 0.6, lineHeight: 1.6 }}>Analisi reale da ACS: SSID, radio, host attivi, duplicati TP-Link e score WiFi.</Typography>
                </Box>
                <ActionButton color="white" icon={<Refresh />} label="Aggiorna dati" onClick={loadAll} />
              </Stack>
              <Grid container spacing={2.2} sx={{ mb: 2.3 }}>
                <Grid item xs={12} md={3}><KpiCard icon={<Analytics />} value={wifiSummary?.average_score !== null && wifiSummary?.average_score !== undefined ? `${wifiSummary.average_score}/100` : "—"} title="Score medio" subtitle={`${wifiSummary?.excellent ?? 0} eccellenti`} tone="cyan" /></Grid>
                <Grid item xs={12} md={3}><KpiCard icon={<Devices />} value={wifiSummary?.total_devices ?? 0} title="Router analizzati" subtitle={`${wifiSummary?.online_devices ?? 0} online`} tone="blue" /></Grid>
                <Grid item xs={12} md={3}><KpiCard icon={<Wifi />} value={wifiSummary?.total_unique_active_clients ?? 0} title="Client attivi unici" subtitle={`${wifiSummary?.total_active_clients ?? 0} record ACS attivi`} tone="green" /></Grid>
                <Grid item xs={12} md={3}><KpiCard icon={<Tune />} value={wifiSummary?.total_duplicate_clients ?? 0} title="Duplicati filtrati" subtitle="Deduplica per MAC" tone="amber" /></Grid>
              </Grid>
              <SoftCard>
                <CardContent sx={{ p: 2.6 }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 950, mb: 2 }}>Dispositivi WiFi</Typography>
                  <Stack spacing={1.2}>
                    {(wifiSummary?.items || []).map((item) => (
                      <Box key={item.device.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.4fr .8fr .8fr .8fr .8fr auto" }, gap: 1.2, alignItems: "center", p: 1.4, border: `1px solid rgba(148,163,184,.22)`, borderRadius: 2.4, background: "#fff" }}>
                        <Box>
                          <Typography sx={{ fontWeight: 950 }}>{safe(item.customer?.customer_name, "Cliente non associato")}</Typography>
                          <Typography sx={{ color: muted, fontSize: 13 }}>{safe(item.device.manufacturer)} {safe(item.device.model)} · {safe(item.device.serial_number)}</Typography>
                        </Box>
                        <Chip label={`${item.wifi_score?.score ?? "—"}/100`} color={(item.wifi_score?.score ?? 0) >= 75 ? "success" : "warning"} sx={{ fontWeight: 900 }} />
                        <Typography sx={{ fontWeight: 850 }}>Client {item.kpi?.unique_active_clients ?? 0}/{item.kpi?.unique_total_clients ?? 0}</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>SSID {item.kpi?.ssid_count ?? 0}</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>Dup {item.kpi?.duplicate_clients ?? 0}</Typography>
                        <Button variant="outlined" onClick={() => { const matched = enrichedDevices.find((device) => device.id === item.device.id); openDeviceDrawer(matched || { ...item.device, wifi_analytics: item }); }} sx={{ textTransform: "none", fontWeight: 900 }}>Apri</Button>
                      </Box>
                    ))}
                    {(wifiSummary?.items || []).length === 0 && <Typography sx={{ color: muted }}>Nessun dato WiFi disponibile.</Typography>}
                  </Stack>
                </CardContent>
              </SoftCard>
            </>
          ) : active === "cx" ? (
            <>
              <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} spacing={2.2} sx={{ mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: { xs: 34, lg: 40 }, fontWeight: 950, letterSpacing: -1.3 }}>
                    Customer Experience
                  </Typography>
                  <Typography sx={{ color: muted, mt: 0.6, lineHeight: 1.6 }}>
                    Score commerciale cliente basato su Internet, WiFi, Device Health e ACS Assurance.
                  </Typography>
                </Box>
                <ActionButton color="white" icon={<Refresh />} label="Aggiorna CX" onClick={loadAll} />
              </Stack>

              <Grid container spacing={2.2} sx={{ mb: 2.3 }}>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Favorite />} value={cxStats.average ? `${cxStats.average}/100` : "—"} title="CX medio" subtitle={`${cxStats.total} clienti monitorati`} tone="cyan" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Devices />} value={cxStats.total} title="CPE nel ranking" subtitle={`${stats.online} online`} tone="blue" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Analytics />} value={cxStats.excellent} title="Excellent" subtitle={`${cxStats.good} good`} tone="green" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Tune />} value={cxStats.warning + cxStats.critical} title="Warning/Critical" subtitle={`${cxStats.critical} critical`} tone="amber" />
                </Grid>
              </Grid>

              <SoftCard>
                <CardContent sx={{ p: 2.6 }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 950, mb: 2 }}>Customer Experience Ranking</Typography>
                  <Stack spacing={1.2}>
                    {customerExperience.map((item) => (
                      <Box
                        key={item.device_id}
                        onClick={() => setSelectedCX(item)}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", lg: "1.5fr .9fr .7fr .7fr .7fr auto auto" },
                          gap: 1.2,
                          alignItems: "center",
                          p: 1.4,
                          border: `1px solid rgba(148,163,184,.22)`,
                          borderRadius: 2.4,
                          background: "#fff",
                          cursor: "pointer",
                          transition: "all .16s ease",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: "0 14px 28px rgba(15,23,42,.08)",
                          },
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 950 }}>{safe(item.customer_name, "Cliente non associato")}</Typography>
                          <Typography sx={{ color: muted, fontSize: 13 }}>
                            {safe(item.contract_number, "N/D")} · {safe(item.pppoe_username, "N/D")}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: "#334155", fontWeight: 850 }}>{safe(item.router)}</Typography>
                        <Typography sx={{ fontWeight: 950 }}>{item.cx_score}/100</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>WiFi {item.wifi_score}</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>Device {item.device_score}</Typography>
                        <Chip label={item.cx_status} color={cxColor(item.cx_status)} sx={{ fontWeight: 900 }} />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedCX(item);
                          }}
                          sx={{ textTransform: "none", fontWeight: 900 }}
                        >
                          Dettaglio
                        </Button>
                      </Box>
                    ))}

                    {customerExperience.length === 0 && (
                      <Typography sx={{ color: muted }}>Nessun dato Customer Experience disponibile.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </SoftCard>
            </>
          ) : active === "wan" ? (
            <>
              <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} spacing={2.2} sx={{ mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: { xs: 34, lg: 40 }, fontWeight: 950, letterSpacing: -1.3 }}>
                    WAN Assurance
                  </Typography>
                  <Typography sx={{ color: muted, mt: 0.6, lineHeight: 1.6 }}>
                    Diagnostica WAN reale da ACS/TR-181: PPPoE, WAN IP, stato connessione, errori e rischio operativo.
                  </Typography>
                </Box>
                <ActionButton color="white" icon={<Refresh />} label="Aggiorna WAN" onClick={loadAll} />
              </Stack>

              <Grid container spacing={2.2} sx={{ mb: 2.3 }}>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Public />} value={wanSummary?.connected ?? 0} title="WAN Connected" subtitle={`${wanSummary?.devices ?? 0} dispositivi analizzati`} tone="green" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Devices />} value={wanSummary?.degraded ?? 0} title="WAN Degraded" subtitle="Connessioni non ottimali" tone="amber" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Analytics />} value={wanSummary?.risk_low ?? 0} title="Low Risk" subtitle={`${wanSummary?.risk_medium ?? 0} medium`} tone="cyan" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Tune />} value={wanSummary?.risk_high ?? 0} title="High Risk" subtitle="Priorità NOC" tone="purple" />
                </Grid>
              </Grid>

              <SoftCard>
                <CardContent sx={{ p: 2.6 }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 950, mb: 2 }}>WAN Assurance Ranking</Typography>
                  <Stack spacing={1.2}>
                    {(wanSummary?.items || []).map((item) => (
                      <Box
                        key={item.device_id}
                        onClick={() => setSelectedWAN(item)}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", lg: "1.35fr .9fr .9fr .8fr .8fr auto auto" },
                          gap: 1.2,
                          alignItems: "center",
                          p: 1.4,
                          border: `1px solid rgba(148,163,184,.22)`,
                          borderRadius: 2.4,
                          background: "#fff",
                          cursor: "pointer",
                          transition: "all .16s ease",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: "0 14px 28px rgba(15,23,42,.08)",
                          },
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 950 }}>{safe(item.customer_name, "Cliente non associato")}</Typography>
                          <Typography sx={{ color: muted, fontSize: 13 }}>{safe(item.contract_number, "N/D")} · {safe(item.model)}</Typography>
                        </Box>
                        <Typography sx={{ color: "#334155", fontWeight: 850 }}>{safe(item.wan_ip)}</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>{safe(item.pppoe_username)}</Typography>
                        <Chip label={item.wan_status} color={item.wan_status === "CONNECTED" ? "success" : "warning"} sx={{ fontWeight: 900 }} />
                        <Typography sx={{ color: muted, fontSize: 13 }}>{safe(item.connection_status)}</Typography>
                        <Chip label={item.risk_level} color={wanRiskColor(item.risk_level)} sx={{ fontWeight: 900 }} />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedWAN(item);
                          }}
                          sx={{ textTransform: "none", fontWeight: 900 }}
                        >
                          Dettaglio
                        </Button>
                      </Box>
                    ))}
                    {(wanSummary?.items || []).length === 0 && (
                      <Typography sx={{ color: muted }}>Nessun dato WAN Assurance disponibile.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </SoftCard>
            </>
          ) : active === "internet" ? (
            <>
              <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} spacing={2.2} sx={{ mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: { xs: 34, lg: 40 }, fontWeight: 950, letterSpacing: -1.3 }}>
                    Internet Experience
                  </Typography>
                  <Typography sx={{ color: muted, mt: 0.6, lineHeight: 1.6 }}>
                    Qualità Internet cliente basata su PPPoE, WAN IP, ACS, uptime sessione e risk engine.
                  </Typography>
                </Box>
                <ActionButton color="white" icon={<Refresh />} label="Aggiorna Internet" onClick={loadAll} />
              </Stack>

              <Grid container spacing={2.2} sx={{ mb: 2.3 }}>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<SignalWifi4Bar />} value={internetSummary?.average_internet_score !== null && internetSummary?.average_internet_score !== undefined ? `${internetSummary.average_internet_score}/100` : "—"} title="Internet Score medio" subtitle={`${internetSummary?.devices ?? 0} dispositivi`} tone="cyan" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Public />} value={internetSummary?.connected ?? 0} title="PPP Connected" subtitle={`${internetSummary?.risk_low ?? 0} low risk`} tone="green" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Analytics />} value={internetSummary?.excellent ?? 0} title="Excellent" subtitle={`${internetSummary?.good ?? 0} good`} tone="blue" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Tune />} value={(internetSummary?.warning ?? 0) + (internetSummary?.critical ?? 0)} title="Warning/Critical" subtitle={`${internetSummary?.risk_high ?? 0} high risk`} tone="amber" />
                </Grid>
              </Grid>

              <SoftCard>
                <CardContent sx={{ p: 2.6 }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 950, mb: 2 }}>Internet Experience Ranking</Typography>
                  <Stack spacing={1.2}>
                    {(internetSummary?.items || []).map((item) => (
                      <Box
                        key={item.device_id}
                        onClick={() => setSelectedInternet(item)}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", lg: "1.35fr .9fr .8fr .8fr .8fr auto auto" },
                          gap: 1.2,
                          alignItems: "center",
                          p: 1.4,
                          border: `1px solid rgba(148,163,184,.22)`,
                          borderRadius: 2.4,
                          background: "#fff",
                          cursor: "pointer",
                          transition: "all .16s ease",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: "0 14px 28px rgba(15,23,42,.08)",
                          },
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 950 }}>{safe(item.customer_name, "Cliente non associato")}</Typography>
                          <Typography sx={{ color: muted, fontSize: 13 }}>
                            {safe(item.contract_number, "N/D")} · {safe(item.model)}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: "#334155", fontWeight: 850 }}>{safe(item.wan_ip)}</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>{safe(item.pppoe_username)}</Typography>
                        <Typography sx={{ fontWeight: 950 }}>{item.internet_score}/100</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>{safe(item.ppp_status)}</Typography>
                        <Chip label={item.internet_status} color={internetStatusColor(item.internet_status)} sx={{ fontWeight: 900 }} />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedInternet(item);
                          }}
                          sx={{ textTransform: "none", fontWeight: 900 }}
                        >
                          Dettaglio
                        </Button>
                      </Box>
                    ))}
                    {(internetSummary?.items || []).length === 0 && (
                      <Typography sx={{ color: muted }}>Nessun dato Internet Experience disponibile.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </SoftCard>
            </>
          ) : active === "voip" ? (
            <>
              <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} spacing={2.2} sx={{ mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: { xs: 34, lg: 40 }, fontWeight: 950, letterSpacing: -1.3 }}>
                    VoIP Assurance
                  </Typography>
                  <Typography sx={{ color: muted, mt: 0.6, lineHeight: 1.6 }}>
                    Diagnostica VoIP da ACS/TR-181: VoiceService, SIP, Line, Registrar, numero, credenziali e rischio servizio.
                  </Typography>
                </Box>
                <ActionButton color="white" icon={<Refresh />} label="Aggiorna VoIP" onClick={loadAll} />
              </Stack>

              <Grid container spacing={2.2} sx={{ mb: 2.3 }}>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Phone />} value={voipSummary?.voice_supported ?? 0} title="Voice Supported" subtitle={`${voipSummary?.voice_not_supported ?? 0} solo dati`} tone="blue" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Analytics />} value={voipSummary?.average_voip_score !== null && voipSummary?.average_voip_score !== undefined ? `${voipSummary.average_voip_score}/100` : "—"} title="VoIP Score medio" subtitle={`${voipSummary?.devices ?? 0} dispositivi`} tone="cyan" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Public />} value={voipSummary?.ok ?? 0} title="OK" subtitle={`${voipSummary?.degraded ?? 0} degraded`} tone="green" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KpiCard icon={<Tune />} value={voipSummary?.critical ?? 0} title="Critical" subtitle={`${voipSummary?.risk_high ?? 0} high risk`} tone="amber" />
                </Grid>
              </Grid>

              <SoftCard>
                <CardContent sx={{ p: 2.6 }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 950, mb: 2 }}>VoIP Assurance Ranking</Typography>
                  <Stack spacing={1.2}>
                    {(voipSummary?.items || []).map((item) => (
                      <Box
                        key={item.device_id}
                        onClick={() => setSelectedVoip(item)}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", lg: "1.25fr .8fr .8fr .8fr .8fr auto auto" },
                          gap: 1.2,
                          alignItems: "center",
                          p: 1.4,
                          border: `1px solid rgba(148,163,184,.22)`,
                          borderRadius: 2.4,
                          background: "#fff",
                          cursor: "pointer",
                          transition: "all .16s ease",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: "0 14px 28px rgba(15,23,42,.08)",
                          },
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 950 }}>{safe(item.customer_name, "Cliente non associato")}</Typography>
                          <Typography sx={{ color: muted, fontSize: 13 }}>{safe(item.contract_number, "N/D")} · {safe(item.model)}</Typography>
                        </Box>
                        <Typography sx={{ color: "#334155", fontWeight: 850 }}>{safe(item.directory_number, "N/D")}</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>{safe(item.registrar_server, "N/D")}</Typography>
                        <Typography sx={{ fontWeight: 950 }}>{item.voip_score !== null && item.voip_score !== undefined ? `${item.voip_score}/100` : "—"}</Typography>
                        <Typography sx={{ color: muted, fontSize: 13 }}>{item.has_voice ? "Voice" : "Solo dati"}</Typography>
                        <Chip label={item.voip_status} color={voipStatusColor(item.voip_status)} sx={{ fontWeight: 900 }} />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedVoip(item);
                          }}
                          sx={{ textTransform: "none", fontWeight: 900 }}
                        >
                          Dettaglio
                        </Button>
                      </Box>
                    ))}
                    {(voipSummary?.items || []).length === 0 && (
                      <Typography sx={{ color: muted }}>Nessun dato VoIP Assurance disponibile.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </SoftCard>
            </>
          ) : (
            <>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "flex-start" }}
            spacing={2.2}
            sx={{ mb: 3 }}
          >
            <Box sx={{ maxWidth: 620 }}>
              <Typography sx={{ fontSize: { xs: 34, lg: 40 }, fontWeight: 950, letterSpacing: -1.3 }}>
                Operations Center
              </Typography>
              <Typography sx={{ color: muted, mt: 0.6, lineHeight: 1.6 }}>
                Customer experience, WiFi quality, firmware lifecycle e ACS operations in un’unica console.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.4} sx={{ flexWrap: "wrap", gap: 1.4, justifyContent: { xs: "flex-start", lg: "flex-end" } }}>
              <ActionButton color="white" icon={<Refresh />} label="Aggiorna dashboard" onClick={loadAll} />
            </Stack>
          </Stack>

          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

          <Grid container spacing={2.2} sx={{ mb: 2.3 }}>
            <Grid item xs={12} sm={6} lg={2.4}>
              <KpiCard onClick={() => setActive("devices")} icon={<Storage />} value={devices.length || "—"} title="CPE gestiti" subtitle="↑ 18 questa settimana" tone="blue" />
            </Grid>
            <Grid item xs={12} sm={6} lg={2.4}>
              <KpiCard onClick={() => setActive("devices")} icon={<Wifi />} value={`${stats.onlinePct}%`} title="Online" subtitle={`${stats.online} online · ${stats.offline} offline`} tone="green" />
            </Grid>
            <Grid item xs={12} sm={6} lg={2.4}>
              <KpiCard icon={<CloudUpload />} value={stats.firmware || "—"} title="Firmware catalogati" subtitle="Gestiti in CPE Operations" tone="purple" />
            </Grid>
            <Grid item xs={12} sm={6} lg={2.4}>
              <KpiCard icon={<Refresh />} value={stats.jobs || "—"} title="Upgrade jobs" subtitle="Gestiti in CPE Operations" tone="amber" />
            </Grid>
            <Grid item xs={12} sm={6} lg={2.4}>
              <KpiCard
                onClick={() => setActive("wifi")}
                icon={<Analytics />}
                value={wifiSummary?.average_score !== null && wifiSummary?.average_score !== undefined ? `${wifiSummary.average_score} / 100` : "—"}
                title="WiFi Score medio"
                subtitle={`${wifiSummary?.total_unique_active_clients ?? 0} client attivi unici`}
                tone="cyan"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2.2}>
            <Grid item xs={12} xl={7}>
              <SoftCard sx={{ height: "100%" }}>
                <CardContent sx={{ p: 2.6 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.1 }}>
                    <Typography sx={{ fontSize: 19, fontWeight: 950 }}>CPE recenti</Typography>
                    <Button onClick={() => setActive("devices")} sx={{ textTransform: "none", fontWeight: 900 }}>
                      Vedi tutti ›
                    </Button>
                  </Stack>

                  <Grid container spacing={1.5}>
                    {recentDevices.map((device, index) => (
                      <Grid item xs={12} sm={6} lg={3} key={device.id}>
                        <DeviceCard device={device} index={index} onOpen={() => openDeviceDrawer(device)} />
                      </Grid>
                    ))}

                    {recentDevices.length === 0 && (
                      <Grid item xs={12}>
                        <Box sx={{ py: 5, textAlign: "center", color: muted }}>
                          Nessun dispositivo trovato.
                        </Box>
                      </Grid>
                    )}
                  </Grid>

                  <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 2 }}>
                    <Box sx={{ width: 18, height: 8, borderRadius: 5, background: accent }} />
                    <Box sx={{ width: 12, height: 8, borderRadius: 5, background: "#cbd5e1" }} />
                    <Box sx={{ width: 12, height: 8, borderRadius: 5, background: "#cbd5e1" }} />
                    <Box sx={{ width: 12, height: 8, borderRadius: 5, background: "#cbd5e1" }} />
                  </Stack>
                </CardContent>
              </SoftCard>
            </Grid>

            <Grid item xs={12} xl={5}>
              <SoftCard sx={{ height: "100%" }}>
                <CardContent sx={{ p: 2.6 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.6 }}>
                    <Typography sx={{ fontSize: 19, fontWeight: 950 }}>Operations Feed</Typography>
                    <Button size="small" onClick={loadAll} sx={{ textTransform: "none", fontWeight: 900 }}>
                      Vedi tutto ›
                    </Button>
                  </Stack>

                  <Stack>
                    <FeedItem icon={<CloudUpload />} title="Firmware TEST-2.0 caricato con successo" subtitle="TP-Link XC220-G3v" time="2 min fa" tone="blue" />
                    <FeedItem icon={<Campaign />} title='Campagna "Upgrade Giugno" avviata' subtitle={`${devices.length || 120} dispositivi target`} time="15 min fa" tone="purple" />
                    <FeedItem icon={<Wifi />} title="5 reti WiFi da analizzare" subtitle="Score basso rilevato" time="32 min fa" tone="green" />
                    {stats.offline > 0 ? (
                      <FeedItem icon={<Router />} title={`${stats.offline} CPE offline`} subtitle="Verifica ultimo inform ACS" time="1 h fa" tone="red" />
                    ) : (
                      <FeedItem icon={<Router />} title="Backup configurazione completato" subtitle="ACS Configuration" time="2 h fa" tone="green" />
                    )}
                  </Stack>
                </CardContent>
              </SoftCard>
            </Grid>

            <Grid item xs={12} lg={4}>
              <SoftCard sx={{ height: "100%" }}>
                <CardContent sx={{ p: 2.6, height: "100%", display: "flex", flexDirection: "column" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 19, fontWeight: 950 }}>Firmware Center</Typography>
                    <Button size="small" onClick={() => setActive("devices")} sx={{ textTransform: "none", fontWeight: 900 }}>Apri CPE Operations ›</Button>
                  </Stack>

                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 84px 78px", gap: 1, px: 0.5, py: 1, color: muted, fontSize: 12, fontWeight: 900 }}>
                    <Box>Versione</Box>
                    <Box>Modello</Box>
                    <Box>Stato</Box>
                    <Box>Data</Box>
                  </Box>

                  <Stack spacing={0.2}>
                    {latestFirmware.map((fw) => (
                      <Box key={fw.id} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 84px 78px", gap: 1, alignItems: "center", px: 0.5, py: 1.1, borderBottom: `1px solid rgba(148,163,184,.16)` }}>
                        <Typography sx={{ fontWeight: 900, fontSize: 14 }}>{safe(fw.version)}</Typography>
                        <Typography sx={{ color: navy, fontSize: 13 }}>{shortText(`${safe(fw.vendor)} ${safe(fw.model)}`, 18)}</Typography>
                        <Chip size="small" label={fw.stable ? "Stable" : "Test"} color={fw.stable ? "success" : "default"} sx={{ fontWeight: 850 }} />
                        <Typography sx={{ color: muted, fontSize: 12 }}>{fw.created_at ? new Date(fw.created_at).toLocaleDateString("it-IT") : "—"}</Typography>
                      </Box>
                    ))}
                    {latestFirmware.length === 0 && (
                      <Typography sx={{ color: muted, py: 2 }}>Nessun firmware catalogato.</Typography>
                    )}
                  </Stack>

                  <Button fullWidth variant="outlined" onClick={() => setActive("devices")} sx={{ mt: "auto", py: 1.05, borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}>
                    Apri Firmware in CPE Operations
                  </Button>
                </CardContent>
              </SoftCard>
            </Grid>

            <Grid item xs={12} lg={4}>
              <SoftCard sx={{ height: "100%" }}>
                <CardContent sx={{ p: 2.6, height: "100%", display: "flex", flexDirection: "column" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 19, fontWeight: 950 }}>Campaign Center</Typography>
                    <Button size="small" onClick={() => setActive("devices")} sx={{ textTransform: "none", fontWeight: 900 }}>Apri CPE Operations ›</Button>
                  </Stack>

                  <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr .8fr 1fr .8fr", gap: 1, px: 0.5, py: 1, color: muted, fontSize: 12, fontWeight: 900 }}>
                    <Box>Campagna</Box>
                    <Box>Target</Box>
                    <Box>Progresso</Box>
                    <Box>Stato</Box>
                  </Box>

                  {campaigns.slice(0,5).map((c) => {
                    const progress = c.total_devices ? Math.round(((c.completed_jobs || 0) / c.total_devices) * 100) : 0;
                    return (
                      <CampaignRow
                        key={c.id}
                        name={c.name}
                        target={`${c.total_devices || 0} dispositivi`}
                        progress={progress}
                        status={c.status}
                        color={progress >= 100 ? "green" : "blue"}
                      />
                    );
                  })}

                  {campaigns.length === 0 && (
                    <Box sx={{ py: 3, textAlign: "center", color: "#64748b" }}>
                      Nessuna campagna disponibile
                    </Box>
                  )}

                  <Button fullWidth variant="outlined" color="success" onClick={() => setActive("devices")} sx={{ mt: "auto", py: 1.05, borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}>
                    Apri Campaigns in CPE Operations
                  </Button>
                </CardContent>
              </SoftCard>
            </Grid>

            <Grid item xs={12} lg={4}>
              <SoftCard sx={{ height: "100%" }}>
                <CardContent sx={{ p: 2.6, height: "100%", display: "flex", flexDirection: "column" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 19, fontWeight: 950 }}>WiFi Analytics</Typography>
                    <Button size="small" onClick={() => setActive("wifi")} sx={{ textTransform: "none", fontWeight: 900 }}>Vedi analytics ›</Button>
                  </Stack>

                  <Stack direction="row" spacing={2.5} alignItems="center" sx={{ flex: 1 }}>
                    <Box sx={{ width: 140, textAlign: "center" }}>
                      <Box
                        sx={{
                          width: 120,
                          height: 70,
                          mx: "auto",
                          borderTopLeftRadius: 120,
                          borderTopRightRadius: 120,
                          border: "14px solid #22c55e",
                          borderBottom: 0,
                          position: "relative",
                          "&:after": {
                            content: `"${wifiSummary?.average_score !== null && wifiSummary?.average_score !== undefined ? wifiSummary.average_score : "—"} /100"`,
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: -20,
                            fontWeight: 950,
                            fontSize: 18,
                            color: navy,
                          },
                        }}
                      />
                      <Typography sx={{ mt: 4, fontWeight: 900 }}>WiFi Score medio</Typography>
                      <Typography sx={{ color: "#16a34a", fontSize: 13 }}>
                        {wifiSummary?.total_unique_active_clients ?? 0} client attivi unici
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ color: muted, fontSize: 13, mb: 1 }}>
                        Dati reali ACS · {wifiSummary?.total_duplicate_clients ?? 0} duplicati filtrati
                      </Typography>
                      <Box
                        sx={{
                          height: 132,
                          borderRadius: 3,
                          background: "linear-gradient(180deg,rgba(34,197,94,.14),rgba(34,197,94,.02))",
                          border: "1px solid rgba(34,197,94,.18)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            left: 20,
                            right: 20,
                            top: 62,
                            height: 3,
                            borderRadius: 4,
                            background: "linear-gradient(90deg,#16a34a,#22c55e)",
                            transform: "rotate(-4deg)",
                          }}
                        />
                        {[18, 36, 52, 68, 84].map((left, idx) => (
                          <Box key={left} sx={{ position: "absolute", left: `${left}%`, top: `${60 - idx * 4}px`, width: 9, height: 9, borderRadius: "50%", background: "#16a34a" }} />
                        ))}
                      </Box>
                    </Box>
                  </Stack>

                  <Grid container spacing={1.2} sx={{ mt: 2 }}>
                    <Grid item xs={4}>
                      <Box sx={{ p: 1.2, border: `1px solid ${border}`, borderRadius: 2.2 }}>
                        <Typography sx={{ color: muted, fontSize: 12 }}>Device</Typography>
                        <Typography sx={{ fontWeight: 950 }}>{wifiSummary?.total_devices ?? 0}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ p: 1.2, border: `1px solid ${border}`, borderRadius: 2.2 }}>
                        <Typography sx={{ color: muted, fontSize: 12 }}>Client unici</Typography>
                        <Typography sx={{ fontWeight: 950 }}>{wifiSummary?.total_unique_active_clients ?? 0}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ p: 1.2, border: `1px solid ${border}`, borderRadius: 2.2 }}>
                        <Typography sx={{ color: muted, fontSize: 12 }}>Duplicati</Typography>
                        <Typography sx={{ fontWeight: 950 }}>{wifiSummary?.total_duplicate_clients ?? 0}</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Button fullWidth variant="outlined" color="success" startIcon={<SignalWifi4Bar />} onClick={loadAll} sx={{ mt: 2, py: 1.05, borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}>
                    Aggiorna WiFi Analytics
                  </Button>
                </CardContent>
              </SoftCard>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Stack direction="row" justifyContent="space-between" sx={{ color: muted, fontSize: 13 }}>
            <Typography>Ultimo aggiornamento: {new Date().toLocaleString("it-IT")}</Typography>
            <Typography>Timezone: Europe/Rome</Typography>
          </Stack>
            </>
          )}
        </Box>
      </Box>

      <Dialog open={firmwareDialog} onClose={() => setFirmwareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Carica firmware</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Vendor" value={firmwareForm.vendor} onChange={(e) => setFirmwareForm({ ...firmwareForm, vendor: e.target.value })} />
              <TextField fullWidth label="Modello" value={firmwareForm.model} onChange={(e) => setFirmwareForm({ ...firmwareForm, model: e.target.value })} />
            </Stack>
            <TextField fullWidth label="Versione" placeholder="es. 1.2.3" value={firmwareForm.version} onChange={(e) => setFirmwareForm({ ...firmwareForm, version: e.target.value })} />
            <TextField fullWidth label="Filename" placeholder="firmware.bin" value={firmwareForm.filename} onChange={(e) => setFirmwareForm({ ...firmwareForm, filename: e.target.value })} />
            <TextField fullWidth label="URL firmware" placeholder="https://acs.speednetwifi.it/firmware/..." value={firmwareForm.url} onChange={(e) => setFirmwareForm({ ...firmwareForm, url: e.target.value })} />
            <TextField fullWidth label="Note" multiline rows={2} value={firmwareForm.notes} onChange={(e) => setFirmwareForm({ ...firmwareForm, notes: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <FormControlLabel control={<Switch checked={firmwareForm.stable} onChange={(e) => setFirmwareForm({ ...firmwareForm, stable: e.target.checked })} />} label="Stable" />
              <FormControlLabel control={<Switch checked={firmwareForm.mandatory} onChange={(e) => setFirmwareForm({ ...firmwareForm, mandatory: e.target.checked })} />} label="Mandatory" />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setFirmwareDialog(false)} sx={{ textTransform: "none", fontWeight: 800 }}>Annulla</Button>
          <Button disabled={busy} variant="contained" onClick={createFirmware} sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2 }}>
            Salva firmware
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={campaignDialog} onClose={() => setCampaignDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Crea campagna firmware</DialogTitle>
        <DialogContent>
          <Stack spacing={2.2} sx={{ mt: 1 }}>
            <Select fullWidth value={campaignFirmwareId} onChange={(e) => setCampaignFirmwareId(e.target.value)}>
              {firmware.map((fw) => (
                <MenuItem key={fw.id} value={fw.id}>
                  {safe(fw.vendor)} {safe(fw.model)} · {safe(fw.version)}
                </MenuItem>
              ))}
            </Select>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 900 }}>Seleziona dispositivi</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setCampaignDeviceIds(devices.map((d) => d.id))} sx={{ textTransform: "none", fontWeight: 800 }}>
                  Tutti
                </Button>
                <Button size="small" onClick={() => setCampaignDeviceIds([])} sx={{ textTransform: "none", fontWeight: 800 }}>
                  Nessuno
                </Button>
              </Stack>
            </Stack>

            <Box sx={{ border: `1px solid ${border}`, borderRadius: 3, maxHeight: 350, overflow: "auto" }}>
              {devices.map((device) => {
                const checked = campaignDeviceIds.includes(device.id);
                return (
                  <Box
                    key={device.id}
                    onClick={() => toggleCampaignDevice(device.id)}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "42px 1fr auto",
                      alignItems: "center",
                      p: 1.4,
                      borderBottom: `1px solid rgba(148,163,184,.18)`,
                      cursor: "pointer",
                      background: checked ? "#eff6ff" : "#fff",
                    }}
                  >
                    <Switch checked={checked} size="small" />
                    <Box>
                      <Typography sx={{ fontWeight: 850 }}>{safe(device.device_code, "Device")}</Typography>
                      <Typography sx={{ color: muted, fontSize: 13 }}>{safe(device.manufacturer)} {safe(device.model)} · {safe(device.serial_number)}</Typography>
                    </Box>
                    <Chip size="small" label={device.online ? "Online" : "Offline"} color={device.online ? "success" : "default"} />
                  </Box>
                );
              })}
            </Box>

            <Typography sx={{ color: muted, fontSize: 13 }}>
              Selezionati: {campaignDeviceIds.length} dispositivi.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCampaignDialog(false)} sx={{ textTransform: "none", fontWeight: 800 }}>Annulla</Button>
          <Button disabled={busy} variant="contained" onClick={createCampaign} sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2 }}>
            Avvia campagna
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={Boolean(selectedVoip)}
        onClose={() => setSelectedVoip(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 3 } }}
      >
        {selectedVoip && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 950 }}>
                  {safe(selectedVoip.customer_name, "Cliente non associato")}
                </Typography>
                <Typography sx={{ color: muted }}>
                  {safe(selectedVoip.contract_number, "Nessun contratto associato")}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedVoip(null)}><Close /></IconButton>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Stack spacing={2}>
              <Box sx={{ p: 1.6, border: `1px solid ${border}`, borderRadius: 3, background: "linear-gradient(135deg,#f5f3ff,#ffffff)" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900 }}>VoIP Assurance Score</Typography>
                    <Typography sx={{ fontSize: 38, fontWeight: 950, lineHeight: 1.1 }}>
                      {selectedVoip.voip_score !== null && selectedVoip.voip_score !== undefined ? `${selectedVoip.voip_score}/100` : "N/D"}
                    </Typography>
                  </Box>
                  <Chip
                    label={selectedVoip.voip_status}
                    color={voipStatusColor(selectedVoip.voip_status)}
                    sx={{ fontWeight: 950 }}
                  />
                </Stack>
              </Box>

              <Typography sx={{ fontWeight: 950 }}>Voice Service</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="Supporto VoIP" value={selectedVoip.has_voice ? "Sì" : "No"} /></Grid>
                <Grid item xs={6}><InfoLine label="Risk" value={safe(selectedVoip.risk_level)} /></Grid>
                <Grid item xs={6}><InfoLine label="Service/Profile/Line" value={`${safe(selectedVoip.voice_service_id, "—")}/${safe(selectedVoip.voice_profile_id, "—")}/${safe(selectedVoip.line_id, "—")}`} /></Grid>
                <Grid item xs={6}><InfoLine label="Line Enable" value={selectedVoip.line_enable === null || selectedVoip.line_enable === undefined ? "N/D" : selectedVoip.line_enable ? "Sì" : "No"} /></Grid>
                <Grid item xs={6}><InfoLine label="Line Status" value={safe(selectedVoip.line_status)} /></Grid>
                <Grid item xs={6}><InfoLine label="Call State" value={safe(selectedVoip.call_state)} /></Grid>
                <Grid item xs={6}><InfoLine label="Numero" value={safe(selectedVoip.directory_number)} /></Grid>
                <Grid item xs={6}><InfoLine label="Auth Username" value={safe(selectedVoip.auth_username)} /></Grid>
              </Grid>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>SIP</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="Registrar" value={safe(selectedVoip.registrar_server)} /></Grid>
                <Grid item xs={6}><InfoLine label="Registrar Port" value={safe(selectedVoip.registrar_port)} /></Grid>
                <Grid item xs={6}><InfoLine label="Transport" value={safe(selectedVoip.registrar_transport)} /></Grid>
                <Grid item xs={6}><InfoLine label="Proxy" value={safe(selectedVoip.proxy_server)} /></Grid>
                <Grid item xs={6}><InfoLine label="Outbound Proxy" value={safe(selectedVoip.outbound_proxy)} /></Grid>
                <Grid item xs={6}><InfoLine label="Register Expires" value={`${safe(selectedVoip.register_expires, "—")}s`} /></Grid>
                <Grid item xs={6}><InfoLine label="Retry Interval" value={`${safe(selectedVoip.register_retry_interval, "—")}s`} /></Grid>
                <Grid item xs={6}><InfoLine label="DTMF" value={safe(selectedVoip.dtmf_method)} /></Grid>
                <Grid item xs={6}><InfoLine label="DSCP" value={safe(selectedVoip.dscp_mark)} /></Grid>
                <Grid item xs={6}><InfoLine label="Call Waiting" value={selectedVoip.call_waiting_enable === null || selectedVoip.call_waiting_enable === undefined ? "N/D" : selectedVoip.call_waiting_enable ? "Sì" : "No"} /></Grid>
              </Grid>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>Findings</Typography>
              <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4, background: "#f8fafc" }}>
                <Stack spacing={0.6}>
                  {(selectedVoip.findings || []).map((item, index) => (
                    <Typography key={`voip-finding-${index}`} sx={{ fontSize: 13, fontWeight: 800, color: navy }}>• {item}</Typography>
                  ))}
                </Stack>
              </Box>

              <Typography sx={{ fontWeight: 950 }}>Recommendations</Typography>
              <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4, background: "#fff" }}>
                <Stack spacing={0.6}>
                  {(selectedVoip.recommendations || []).map((item, index) => (
                    <Typography key={`voip-recommendation-${index}`} sx={{ fontSize: 13, color: "#334155" }}>• {item}</Typography>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>ACS / Router</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="ACS Online" value={selectedVoip.acs_online ? "Sì" : "No"} /></Grid>
                <Grid item xs={6}><InfoLine label="Inform interval" value={`${safe(selectedVoip.periodic_inform_interval, "—")}s`} /></Grid>
                <Grid item xs={6}><InfoLine label="Router" value={`${safe(selectedVoip.manufacturer)} ${safe(selectedVoip.model)}`} /></Grid>
                <Grid item xs={6}><InfoLine label="Seriale" value={safe(selectedVoip.serial_number)} /></Grid>
                <Grid item xs={12}><InfoLine label="Connection Request" value={safe(selectedVoip.connection_request_url)} /></Grid>
              </Grid>
            </Stack>
          </>
        )}
      </Drawer>

      <Drawer
        anchor="right"
        open={Boolean(selectedInternet)}
        onClose={() => setSelectedInternet(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 3 } }}
      >
        {selectedInternet && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 950 }}>
                  {safe(selectedInternet.customer_name, "Cliente non associato")}
                </Typography>
                <Typography sx={{ color: muted }}>
                  {safe(selectedInternet.contract_number, "Nessun contratto associato")}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedInternet(null)}><Close /></IconButton>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Stack spacing={2}>
              <Box sx={{ p: 1.6, border: `1px solid ${border}`, borderRadius: 3, background: "linear-gradient(135deg,#eff6ff,#ffffff)" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900 }}>Internet Experience Score</Typography>
                    <Typography sx={{ fontSize: 38, fontWeight: 950, lineHeight: 1.1 }}>
                      {selectedInternet.internet_score}/100
                    </Typography>
                  </Box>
                  <Chip
                    label={selectedInternet.internet_status}
                    color={internetStatusColor(selectedInternet.internet_status)}
                    sx={{ fontWeight: 950 }}
                  />
                </Stack>
              </Box>

              <Typography sx={{ fontWeight: 950 }}>Sessione Internet</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="PPP Status" value={safe(selectedInternet.ppp_status)} /></Grid>
                <Grid item xs={6}><InfoLine label="Risk" value={safe(selectedInternet.risk_level)} /></Grid>
                <Grid item xs={6}><InfoLine label="WAN IP" value={safe(selectedInternet.wan_ip)} /></Grid>
                <Grid item xs={6}><InfoLine label="PPPoE" value={safe(selectedInternet.pppoe_username)} /></Grid>
                <Grid item xs={6}><InfoLine label="Trigger" value={safe(selectedInternet.connection_trigger)} /></Grid>
                <Grid item xs={6}><InfoLine label="Last Error" value={safe(selectedInternet.last_connection_error)} /></Grid>
                <Grid item xs={6}><InfoLine label="Auth" value={safe(selectedInternet.authentication_protocol)} /></Grid>
                <Grid item xs={6}><InfoLine label="Uptime sessione" value={formatUptimeSeconds(selectedInternet.session_uptime_seconds)} /></Grid>
              </Grid>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>WAN / IP</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="PPP Interface" value={safe(selectedInternet.ppp_ref)} /></Grid>
                <Grid item xs={6}><InfoLine label="IP Interface" value={safe(selectedInternet.ip_interface_ref)} /></Grid>
                <Grid item xs={6}><InfoLine label="IPv4 Status" value={safe(selectedInternet.ipv4_status)} /></Grid>
                <Grid item xs={6}><InfoLine label="IPv6 Status" value={safe(selectedInternet.ipv6_status)} /></Grid>
                <Grid item xs={6}><InfoLine label="IPv4 Address" value={safe(selectedInternet.ipv4_address)} /></Grid>
                <Grid item xs={6}><InfoLine label="DNS" value={(selectedInternet.dns_servers || []).length ? selectedInternet.dns_servers.join(", ") : "N/D"} /></Grid>
              </Grid>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>Findings</Typography>
              <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4, background: "#f8fafc" }}>
                <Stack spacing={0.6}>
                  {(selectedInternet.findings || []).map((item, index) => (
                    <Typography key={`internet-finding-${index}`} sx={{ fontSize: 13, fontWeight: 800, color: navy }}>• {item}</Typography>
                  ))}
                </Stack>
              </Box>

              <Typography sx={{ fontWeight: 950 }}>Recommendations</Typography>
              <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4, background: "#fff" }}>
                <Stack spacing={0.6}>
                  {(selectedInternet.recommendations || []).map((item, index) => (
                    <Typography key={`internet-recommendation-${index}`} sx={{ fontSize: 13, color: "#334155" }}>• {item}</Typography>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>ACS</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="ACS Online" value={selectedInternet.acs_online ? "Sì" : "No"} /></Grid>
                <Grid item xs={6}><InfoLine label="Inform interval" value={`${safe(selectedInternet.periodic_inform_interval, "—")}s`} /></Grid>
                <Grid item xs={12}><InfoLine label="ACS URL" value={safe(selectedInternet.acs_url)} /></Grid>
                <Grid item xs={12}><InfoLine label="Connection Request" value={safe(selectedInternet.connection_request_url)} /></Grid>
              </Grid>
            </Stack>
          </>
        )}
      </Drawer>

      <Drawer
        anchor="right"
        open={Boolean(selectedWAN)}
        onClose={() => setSelectedWAN(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 3 } }}
      >
        {selectedWAN && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 950 }}>
                  {safe(selectedWAN.customer_name, "Cliente non associato")}
                </Typography>
                <Typography sx={{ color: muted }}>
                  {safe(selectedWAN.contract_number, "Nessun contratto associato")}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedWAN(null)}><Close /></IconButton>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Stack spacing={2}>
              <Box sx={{ p: 1.6, border: `1px solid ${border}`, borderRadius: 3, background: "linear-gradient(135deg,#ecfdf5,#ffffff)" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900 }}>WAN Status</Typography>
                    <Typography sx={{ fontSize: 32, fontWeight: 950, lineHeight: 1.1 }}>{safe(selectedWAN.wan_status)}</Typography>
                  </Box>
                  <Chip label={selectedWAN.risk_level} color={wanRiskColor(selectedWAN.risk_level)} sx={{ fontWeight: 950 }} />
                </Stack>
              </Box>

              <Typography sx={{ fontWeight: 950 }}>WAN Connection</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="WAN IP" value={safe(selectedWAN.wan_ip)} /></Grid>
                <Grid item xs={6}><InfoLine label="PPPoE" value={safe(selectedWAN.pppoe_username)} /></Grid>
                <Grid item xs={6}><InfoLine label="Connection Status" value={safe(selectedWAN.connection_status)} /></Grid>
                <Grid item xs={6}><InfoLine label="Last Error" value={safe(selectedWAN.last_connection_error)} /></Grid>
                <Grid item xs={6}><InfoLine label="Trigger" value={safe(selectedWAN.connection_trigger)} /></Grid>
                <Grid item xs={6}><InfoLine label="Auth" value={safe(selectedWAN.authentication_protocol)} /></Grid>
              </Grid>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>TR-181 Interfaces</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="PPP Interface" value={safe(selectedWAN.ppp_ref)} /></Grid>
                <Grid item xs={6}><InfoLine label="IP Interface" value={safe(selectedWAN.ip_interface_ref)} /></Grid>
                <Grid item xs={6}><InfoLine label="IPv4 Status" value={safe(selectedWAN.ipv4_status)} /></Grid>
                <Grid item xs={6}><InfoLine label="Lower Layers" value={safe(selectedWAN.lower_layers)} /></Grid>
                <Grid item xs={6}><InfoLine label="IPv4 Address" value={safe(selectedWAN.ipv4_address)} /></Grid>
                <Grid item xs={6}><InfoLine label="DNS" value={(selectedWAN.dns_servers || []).length ? selectedWAN.dns_servers.join(", ") : "N/D"} /></Grid>
              </Grid>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>WAN Risk</Typography>
              <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4, background: "#f8fafc" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ color: muted, fontSize: 12 }}>Risk Score</Typography>
                    <Typography sx={{ fontWeight: 950, fontSize: 22 }}>{selectedWAN.risk_score ?? "—"}</Typography>
                  </Box>
                  <Chip label={selectedWAN.risk_level} color={wanRiskColor(selectedWAN.risk_level)} sx={{ fontWeight: 900 }} />
                </Stack>

                <Divider sx={{ my: 1.4 }} />

                <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900, mb: 0.8 }}>Findings</Typography>
                <Stack spacing={0.6}>
                  {(selectedWAN.findings || []).map((item, index) => (
                    <Typography key={`wan-finding-${index}`} sx={{ fontSize: 13, fontWeight: 800, color: navy }}>• {item}</Typography>
                  ))}
                </Stack>

                <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900, mt: 1.4, mb: 0.8 }}>Recommendations</Typography>
                <Stack spacing={0.6}>
                  {(selectedWAN.recommendations || []).map((item, index) => (
                    <Typography key={`wan-recommendation-${index}`} sx={{ fontSize: 13, color: "#334155" }}>• {item}</Typography>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>ACS / Service</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="ACS Online" value={selectedWAN.acs_online ? "Sì" : "No"} /></Grid>
                <Grid item xs={6}><InfoLine label="Inform interval" value={`${safe(selectedWAN.periodic_inform_interval, "—")}s`} /></Grid>
                <Grid item xs={12}><InfoLine label="ACS URL" value={safe(selectedWAN.acs_url)} /></Grid>
                <Grid item xs={12}><InfoLine label="Connection Request" value={safe(selectedWAN.connection_request_url)} /></Grid>
              </Grid>
            </Stack>
          </>
        )}
      </Drawer>

      <Drawer
        anchor="right"
        open={Boolean(selectedCX)}
        onClose={() => setSelectedCX(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 3 } }}
      >
        {selectedCX && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 950 }}>
                  {safe(selectedCX.customer_name, "Cliente non associato")}
                </Typography>
                <Typography sx={{ color: muted }}>
                  {safe(selectedCX.contract_number, "Nessun contratto associato")}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedCX(null)}><Close /></IconButton>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Stack spacing={2}>
              <Box sx={{ p: 1.6, border: `1px solid ${border}`, borderRadius: 3, background: "linear-gradient(135deg,#eff6ff,#ffffff)" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900 }}>Customer Experience Score</Typography>
                    <Typography sx={{ fontSize: 38, fontWeight: 950, lineHeight: 1.1 }}>
                      {selectedCX.cx_score}/100
                    </Typography>
                  </Box>
                  <Chip
                    label={selectedCX.cx_status}
                    color={cxColor(selectedCX.cx_status)}
                    sx={{ fontWeight: 950 }}
                  />
                </Stack>
              </Box>

              <Typography sx={{ fontWeight: 950 }}>Score Breakdown</Typography>
              <Grid container spacing={1.2}>
                {[
                  ["Internet", selectedCX.internet_score],
                  ["WiFi", selectedCX.wifi_score],
                  ["Device Health", selectedCX.device_score],
                  ["ACS Stability", selectedCX.acs_score],
                ].map(([label, value]) => (
                  <Grid item xs={6} key={label}>
                    <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                      <Typography sx={{ color: muted, fontSize: 12 }}>{label}</Typography>
                      <Typography sx={{ fontWeight: 950, fontSize: 22 }}>{value ?? "—"}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>Findings</Typography>
              <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4, background: "#f8fafc" }}>
                <Stack spacing={0.8}>
                  {(selectedCX.findings || []).map((item, index) => (
                    <Typography key={`cx-finding-${index}`} sx={{ fontSize: 13, fontWeight: 850, color: navy }}>
                      • {item}
                    </Typography>
                  ))}
                  {(selectedCX.findings || []).length === 0 && (
                    <Typography sx={{ color: muted, fontSize: 13 }}>Nessun finding rilevato.</Typography>
                  )}
                </Stack>
              </Box>

              <Typography sx={{ fontWeight: 950 }}>Recommendations</Typography>
              <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4, background: "#fff" }}>
                <Stack spacing={0.8}>
                  {(selectedCX.recommendations || []).map((item, index) => (
                    <Typography key={`cx-recommendation-${index}`} sx={{ fontSize: 13, color: "#334155" }}>
                      • {item}
                    </Typography>
                  ))}
                  {(selectedCX.recommendations || []).length === 0 && (
                    <Typography sx={{ color: muted, fontSize: 13 }}>Nessuna azione suggerita.</Typography>
                  )}
                </Stack>
              </Box>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>Technical Indicators</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>CPU</Typography>
                    <Typography sx={{ fontWeight: 950 }}>{pctText(selectedCX.cpu_usage)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>RAM</Typography>
                    <Typography sx={{ fontWeight: 950 }}>{pctText(selectedCX.memory_usage)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>Client WiFi attivi</Typography>
                    <Typography sx={{ fontWeight: 950 }}>{selectedCX.active_wifi_clients ?? 0}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>Client deboli / duplicati</Typography>
                    <Typography sx={{ fontWeight: 950 }}>
                      {selectedCX.poor_wifi_clients ?? 0} / {selectedCX.duplicate_clients ?? 0}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>Service Information</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}><InfoLine label="Cliente" value={safe(selectedCX.customer_name)} /></Grid>
                <Grid item xs={6}><InfoLine label="Codice cliente" value={safe(selectedCX.customer_code)} /></Grid>
                <Grid item xs={6}><InfoLine label="Contratto" value={safe(selectedCX.contract_number)} /></Grid>
                <Grid item xs={6}><InfoLine label="PPPoE" value={safe(selectedCX.pppoe_username)} /></Grid>
                <Grid item xs={6}><InfoLine label="WAN IP" value={safe(selectedCX.wan_ip)} /></Grid>
                <Grid item xs={6}><InfoLine label="Router" value={safe(selectedCX.router)} /></Grid>
                <Grid item xs={6}><InfoLine label="Seriale" value={safe(selectedCX.serial_number)} /></Grid>
                <Grid item xs={6}><InfoLine label="ACS online" value={selectedCX.acs_online ? "Sì" : "No"} /></Grid>
              </Grid>
            </Stack>
          </>
        )}
      </Drawer>

      <Drawer
        anchor="right"
        open={Boolean(selectedDevice)}
        onClose={() => setSelectedDevice(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, p: 3 } }}
      >
        {selectedDevice && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 950 }}>{safe(selectedDevice.customer_name, "🧪 LAB DEVICE")}</Typography>
                <Typography sx={{ color: muted }}>{safe(selectedDevice.device_code)}</Typography>
              </Box>
              <IconButton onClick={() => setSelectedDevice(null)}><Close /></IconButton>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Stack spacing={2}>
              <Chip label={selectedDevice.online ? "Internet OK" : "Offline"} color={selectedDevice.online ? "success" : "warning"} sx={{ alignSelf: "flex-start", fontWeight: 900 }} />

              <InfoLine label="Router" value={`${safe(selectedDevice.manufacturer)} ${safe(selectedDevice.model, "")}`} />
              <InfoLine label="Seriale" value={safe(selectedDevice.serial_number)} />
              <InfoLine label="Firmware" value={safe(selectedDevice.software_version)} />
              <InfoLine label="ACS ID" value={safe(selectedDevice.acs_device_id)} />
              <InfoLine label="Last seen" value={dateText(selectedDevice.last_seen)} />

              {selectedDevice.wifi_analytics ? (
                <>
                  <Divider />
                  <Typography sx={{ fontWeight: 950 }}>WiFi Analytics real-time ACS</Typography>
                  <Grid container spacing={1.2}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                        <Typography sx={{ color: muted, fontSize: 12 }}>Score</Typography>
                        <Typography sx={{ fontWeight: 950, fontSize: 22 }}>{selectedDevice.wifi_analytics.wifi_score?.score ?? "—"} / 100</Typography>
                        <Typography sx={{ color: muted, fontSize: 12 }}>{selectedDevice.wifi_analytics.wifi_score?.status ?? "N/D"}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                        <Typography sx={{ color: muted, fontSize: 12 }}>Client attivi unici</Typography>
                        <Typography sx={{ fontWeight: 950, fontSize: 22 }}>{selectedDevice.wifi_analytics.kpi?.unique_active_clients ?? 0}</Typography>
                        <Typography sx={{ color: muted, fontSize: 12 }}>{selectedDevice.wifi_analytics.kpi?.duplicate_clients ?? 0} duplicati filtrati</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                        <Typography sx={{ color: muted, fontSize: 12 }}>SSID</Typography>
                        <Typography sx={{ fontWeight: 950, fontSize: 22 }}>{selectedDevice.wifi_analytics.kpi?.ssid_count ?? 0}</Typography>
                        <Typography sx={{ color: muted, fontSize: 12 }}>2.4G {selectedDevice.wifi_analytics.kpi?.radio24_ssid_count ?? 0} · 5G {selectedDevice.wifi_analytics.kpi?.radio5_ssid_count ?? 0}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                        <Typography sx={{ color: muted, fontSize: 12 }}>Host conosciuti</Typography>
                        <Typography sx={{ fontWeight: 950, fontSize: 22 }}>{selectedDevice.wifi_analytics.kpi?.unique_total_clients ?? 0}</Typography>
                        <Typography sx={{ color: muted, fontSize: 12 }}>{selectedDevice.wifi_analytics.kpi?.total_clients ?? 0} record ACS</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Typography sx={{ fontWeight: 950, mt: 1 }}>Client WiFi attivi</Typography>
                  <Stack spacing={1}>
                    {(selectedDevice.wifi_analytics.hosts?.unique_active || []).map((host) => (
                      <Box key={`${host.mac_address}-${host.ip_address}`} sx={{ p: 1.2, border: `1px solid rgba(148,163,184,.22)`, borderRadius: 2.2, background: "#f8fafc" }}>
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 900 }}>{safe(host.hostname, "Unknown")}</Typography>
                            <Typography sx={{ color: muted, fontSize: 12 }}>{safe(host.ip_address)} · {safe(host.mac_address)}</Typography>
                          </Box>
                          <Chip size="small" color="success" label="Online" sx={{ fontWeight: 850 }} />
                        </Stack>
                        <Typography sx={{ mt: 0.6, color: "#334155", fontSize: 12 }}>RSSI {safe(host.rssi, "—")} · RX {safe(host.rx_rate, "—")} · TX {safe(host.tx_rate, "—")}</Typography>
                      </Box>
                    ))}
                    {(selectedDevice.wifi_analytics.hosts?.unique_active || []).length === 0 && (
                      <Typography sx={{ color: muted, fontSize: 13 }}>Nessun client attivo rilevato.</Typography>
                    )}
                  </Stack>
                </>
              ) : null}

              
              <Divider />

              <Typography sx={{ fontWeight: 950 }}>Device Assurance real-time ACS</Typography>
              <Grid container spacing={1.2}>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>Health Score</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontWeight: 950, fontSize: 22 }}>
                        {calculateHealth(selectedDevice)}
                      </Typography>
                      <Chip
                        size="small"
                        color={healthColor(calculateHealth(selectedDevice))}
                        label={selectedDevice.device_assurance?.health_status || "N/D"}
                        sx={{ fontWeight: 850 }}
                      />
                    </Stack>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>ACS</Typography>
                    <Typography sx={{ fontWeight: 950, fontSize: 22 }}>
                      {selectedDevice.device_assurance?.acs_online ? "ONLINE" : selectedDevice.online ? "ONLINE" : "OFFLINE"}
                    </Typography>
                    <Typography sx={{ color: muted, fontSize: 12 }}>
                      Inform {selectedDevice.device_assurance?.periodic_inform_interval ?? "—"}s
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>CPU</Typography>
                    <Typography sx={{ fontWeight: 950, fontSize: 22 }}>
                      {pctText(selectedDevice.device_assurance?.cpu_usage)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>RAM</Typography>
                    <Typography sx={{ fontWeight: 950, fontSize: 22 }}>
                      {pctText(selectedDevice.device_assurance?.memory_usage)}
                    </Typography>
                    <Typography sx={{ color: muted, fontSize: 12 }}>
                      {selectedDevice.device_assurance?.memory_free ?? "—"} / {selectedDevice.device_assurance?.memory_total ?? "—"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>Uptime / Last Inform</Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      {selectedDevice.device_assurance?.uptime_human || formatUptimeSeconds(selectedDevice.device_assurance?.uptime_seconds)}
                    </Typography>
                    <Typography sx={{ color: muted, fontSize: 12 }}>
                      Last seen {dateText(selectedDevice.last_seen)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {selectedDevice.device_assurance ? (
                <>
                  <Divider />

                  <Typography sx={{ fontWeight: 950 }}>Network Assurance</Typography>
                  <Box sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: 2.4, background: "#f8fafc" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Box>
                        <Typography sx={{ color: muted, fontSize: 12 }}>Risk Score</Typography>
                        <Typography sx={{ fontWeight: 950, fontSize: 22 }}>
                          {selectedDevice.device_assurance.risk_score ?? "—"}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={riskColor(selectedDevice.device_assurance.risk_level)}
                        label={selectedDevice.device_assurance.risk_level || "N/D"}
                        sx={{ fontWeight: 900 }}
                      />
                    </Stack>

                    <Divider sx={{ my: 1.4 }} />

                    <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900, mb: 0.8 }}>
                      Findings
                    </Typography>
                    <Stack spacing={0.6}>
                      {(selectedDevice.device_assurance.findings || []).map((item, index) => (
                        <Typography key={`finding-${index}`} sx={{ fontSize: 13, fontWeight: 800, color: navy }}>
                          • {item}
                        </Typography>
                      ))}
                    </Stack>

                    <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900, mt: 1.4, mb: 0.8 }}>
                      Recommendations
                    </Typography>
                    <Stack spacing={0.6}>
                      {(selectedDevice.device_assurance.recommendations || []).map((item, index) => (
                        <Typography key={`recommendation-${index}`} sx={{ fontSize: 13, color: "#334155" }}>
                          • {item}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                </>
              ) : null}

              <Divider />

              <Typography sx={{ fontWeight: 950 }}>Azioni rapide</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => {
                    const id = selectedDevice.id;
                    setSelectedDevice(null);
                    setCampaignDeviceIds([id]);
                    setCampaignDialog(true);
                  }}
                  sx={{ textTransform: "none", fontWeight: 900 }}
                >
                  Aggiorna firmware
                </Button>
                <Button variant="outlined" startIcon={<Wifi />} sx={{ textTransform: "none", fontWeight: 900 }}>
                  Analizza WiFi
                </Button>
                <Button variant="outlined" startIcon={<Tune />} sx={{ textTransform: "none", fontWeight: 900 }}>
                  Avanzate
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </Drawer>
    </Box>
  );
}
