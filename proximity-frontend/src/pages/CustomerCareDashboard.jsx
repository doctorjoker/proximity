import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Close,
  Refresh,
  SupportAgent,
  WarningAmber,
  ErrorOutlineOutlined,
  CheckCircle,
  Insights,
  Person,
  Router,
  Wifi,
  Public,
  Phone,
  DevicesOther,
} from "@mui/icons-material";

const API_BASE = "";

const navy = "#0f172a";
const muted = "#64748b";
const border = "rgba(148,163,184,.24)";

function safe(value, fallback = "N/D") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function severityColor(severity) {
  if (severity === "CRITICAL") return "error";
  if (severity === "HIGH") return "error";
  if (severity === "MEDIUM") return "warning";
  if (severity === "LOW") return "info";
  return "default";
}

function statusColor(status) {
  if (status === "EXCELLENT" || status === "OK" || status === "LOW") return "success";
  if (status === "GOOD" || status === "MEDIUM") return "warning";
  if (status === "FAIR") return "warning";
  if (status === "POOR" || status === "HIGH" || status === "CRITICAL") return "error";
  return "default";
}

function dateText(value) {
  if (!value) return "N/D";
  try {
    return new Date(value).toLocaleString("it-IT");
  } catch {
    return value;
  }
}

function SoftCard({ children, sx }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${border}`,
        borderRadius: 4,
        background: "rgba(255,255,255,.86)",
        boxShadow: "0 18px 50px rgba(15,23,42,.07)",
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}

function KpiCard({ icon, title, value, subtitle, tone = "blue" }) {
  const gradients = {
    blue: "linear-gradient(135deg,#e0f2fe,#ffffff)",
    red: "linear-gradient(135deg,#fee2e2,#ffffff)",
    amber: "linear-gradient(135deg,#fef3c7,#ffffff)",
    green: "linear-gradient(135deg,#dcfce7,#ffffff)",
    purple: "linear-gradient(135deg,#f3e8ff,#ffffff)",
  };

  return (
    <SoftCard sx={{ height: "100%", background: gradients[tone] || gradients.blue }}>
      <CardContent sx={{ p: 2.4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ color: muted, fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: 34, fontWeight: 950, color: navy, lineHeight: 1.1, mt: 0.5 }}>
              {value}
            </Typography>
            {subtitle && <Typography sx={{ color: muted, fontSize: 13, mt: 0.6 }}>{subtitle}</Typography>}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              color: navy,
              background: "rgba(255,255,255,.72)",
              border: `1px solid ${border}`,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </SoftCard>
  );
}

function InfoLine({ label, value }) {
  return (
    <Box sx={{ p: 1.2, border: `1px solid ${border}`, borderRadius: 2.4, background: "#fff" }}>
      <Typography sx={{ color: muted, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ color: navy, fontWeight: 900, mt: 0.2, wordBreak: "break-word" }}>
        {safe(value)}
      </Typography>
    </Box>
  );
}

export default function CustomerCareDashboard() {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [error, setError] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/proactive-care/summary`),
        fetch(`${API_BASE}/api/v1/proactive-care/events`),
      ]);

      const [summaryData, eventsData] = await Promise.all([
        summaryRes.json(),
        eventsRes.json(),
      ]);

      setSummary(summaryData?.success ? summaryData : null);
      setEvents(eventsData?.items || []);
    } catch (err) {
      setError(err?.message || "Errore caricamento Customer Care");
    } finally {
      setLoading(false);
    }
  }

  async function openCustomer360(deviceId) {
    if (!deviceId) return;

    setSelectedCustomer({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/api/v1/customer360/customers/${deviceId}`);
      const data = await res.json();
      setSelectedCustomer(data?.item || null);
    } catch (err) {
      setSelectedCustomer({ error: err?.message || "Errore caricamento Customer360" });
    }
  }

  async function resolveEvent(eventCode) {
    if (!eventCode) return;

    setResolving(eventCode);
    try {
      await fetch(`${API_BASE}/api/v1/proactive-care/events/${eventCode}/resolve`, {
        method: "POST",
      });
      await loadAll();
      if (selectedEvent?.event_code === eventCode) setSelectedEvent(null);
    } finally {
      setResolving(null);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const sortedEvents = useMemo(() => {
    const weight = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
    return [...events].sort((a, b) => {
      const severity = (weight[b.severity] || 0) - (weight[a.severity] || 0);
      if (severity !== 0) return severity;
      return new Date(b.updated_at || b.last_detected || 0) - new Date(a.updated_at || a.last_detected || 0);
    });
  }, [events]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography sx={{ color: muted, fontWeight: 800 }}>Caricamento Customer Care...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 2, md: 3 },
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,.13), transparent 28%), linear-gradient(180deg,#f8fafc,#eef2ff)",
      }}
    >
      <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} spacing={2.2} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <SupportAgent sx={{ color: "#2563eb", fontSize: 36 }} />
            <Typography sx={{ fontSize: { xs: 34, lg: 42 }, fontWeight: 950, letterSpacing: -1.3, color: navy }}>
              Customer Care
            </Typography>
          </Stack>
          <Typography sx={{ color: muted, mt: 0.6, lineHeight: 1.6 }}>
            Cockpit operativo Proactive Care: eventi aperti, priorità, raccomandazioni e Customer360.
          </Typography>
          {error && <Typography sx={{ color: "error.main", mt: 1 }}>{error}</Typography>}
        </Box>

        <Button
          onClick={loadAll}
          startIcon={<Refresh />}
          variant="contained"
          sx={{ borderRadius: 3, textTransform: "none", fontWeight: 950, px: 2.2 }}
        >
          Aggiorna
        </Button>
      </Stack>

      <Grid container spacing={2.2} sx={{ mb: 2.4 }}>
        <Grid item xs={12} md={2.4}>
          <KpiCard icon={<Insights />} title="Open Events" value={summary?.open_events ?? 0} subtitle="eventi aperti" tone="blue" />
        </Grid>
        <Grid item xs={12} md={2.4}>
          <KpiCard icon={<ErrorOutlineOutlined />} title="Critical" value={summary?.critical ?? 0} subtitle="priorità massima" tone="red" />
        </Grid>
        <Grid item xs={12} md={2.4}>
          <KpiCard icon={<WarningAmber />} title="High" value={summary?.high ?? 0} subtitle="intervento rapido" tone="red" />
        </Grid>
        <Grid item xs={12} md={2.4}>
          <KpiCard icon={<WarningAmber />} title="Medium" value={summary?.medium ?? 0} subtitle="da monitorare" tone="amber" />
        </Grid>
        <Grid item xs={12} md={2.4}>
          <KpiCard icon={<CheckCircle />} title="Low" value={summary?.low ?? 0} subtitle="bassa priorità" tone="green" />
        </Grid>
      </Grid>

      <SoftCard>
        <CardContent sx={{ p: 2.6 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.4} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 22, fontWeight: 950, color: navy }}>
                Proactive Care Events
              </Typography>
              <Typography sx={{ color: muted, fontSize: 13 }}>
                Eventi aperti generati automaticamente dal motore Proactive Care.
              </Typography>
            </Box>
            <Chip
              label={`Highest severity: ${safe(summary?.highest_severity, "N/D")}`}
              color={severityColor(summary?.highest_severity)}
              sx={{ fontWeight: 950, alignSelf: { xs: "flex-start", md: "center" } }}
            />
          </Stack>

          <Stack spacing={1.2}>
            {sortedEvents.map((event) => (
              <Box
                key={event.event_code}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: ".65fr .7fr 1.1fr 1.25fr 1.7fr .95fr auto",
                  },
                  gap: 1.2,
                  alignItems: "center",
                  p: 1.45,
                  border: `1px solid ${border}`,
                  borderRadius: 2.8,
                  background: "#fff",
                  transition: "all .16s ease",
                  "&:hover": {
                    boxShadow: "0 14px 28px rgba(15,23,42,.08)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Chip label={event.severity} color={severityColor(event.severity)} sx={{ fontWeight: 950 }} />
                <Chip label={event.category} variant="outlined" sx={{ fontWeight: 900 }} />
                <Box>
                  <Typography sx={{ fontWeight: 950 }}>{safe(event.customer_name, "Cliente non associato")}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12 }}>{safe(event.contract_number)}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 950 }}>{event.title}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12 }}>{safe(event.model)} · {safe(event.serial_number)}</Typography>
                </Box>
                <Typography sx={{ color: "#334155", fontSize: 13, lineHeight: 1.45 }}>
                  {event.recommendation}
                </Typography>
                <Typography sx={{ color: muted, fontSize: 12 }}>
                  {dateText(event.last_detected || event.updated_at)}
                </Typography>
                <Stack direction="row" spacing={0.8}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setSelectedEvent(event);
                      openCustomer360(event.device_id);
                    }}
                    sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2 }}
                  >
                    Customer360
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={resolving === event.event_code}
                    onClick={() => resolveEvent(event.event_code)}
                    sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2 }}
                  >
                    Resolve
                  </Button>
                </Stack>
              </Box>
            ))}

            {sortedEvents.length === 0 && (
              <Box sx={{ p: 4, textAlign: "center", border: `1px dashed ${border}`, borderRadius: 3 }}>
                <CheckCircle sx={{ fontSize: 52, color: "success.main", mb: 1 }} />
                <Typography sx={{ fontWeight: 950, color: navy }}>Nessun evento aperto</Typography>
                <Typography sx={{ color: muted }}>La rete clienti non presenta eventi Proactive Care aperti.</Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </SoftCard>

      <Drawer
        anchor="right"
        open={Boolean(selectedCustomer)}
        onClose={() => {
          setSelectedCustomer(null);
          setSelectedEvent(null);
        }}
        PaperProps={{ sx: { width: { xs: "100%", sm: 620 }, p: 3, background: "#f8fafc" } }}
      >
        {selectedCustomer?.loading ? (
          <Box sx={{ minHeight: 300, display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : selectedCustomer?.error ? (
          <Typography sx={{ color: "error.main", fontWeight: 900 }}>{selectedCustomer.error}</Typography>
        ) : selectedCustomer ? (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 26, fontWeight: 950, color: navy }}>
                  {safe(selectedCustomer.customer_name, "Cliente non associato")}
                </Typography>
                <Typography sx={{ color: muted }}>
                  {safe(selectedCustomer.contract_number)} · {safe(selectedCustomer.model)}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedCustomer(null)}>
                <Close />
              </IconButton>
            </Stack>

            {selectedEvent && (
              <Box sx={{ p: 1.6, border: `1px solid ${border}`, borderRadius: 3, background: "#fff7ed", mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                  <Chip label={selectedEvent.severity} color={severityColor(selectedEvent.severity)} size="small" sx={{ fontWeight: 950 }} />
                  <Typography sx={{ fontWeight: 950 }}>{selectedEvent.title}</Typography>
                </Stack>
                <Typography sx={{ color: "#334155", fontSize: 13 }}>{selectedEvent.description}</Typography>
              </Box>
            )}

            <Grid container spacing={1.4} sx={{ mb: 2 }}>
              <Grid item xs={6}><InfoLine label="CX Score" value={`${safe(selectedCustomer.cx_score)}/100`} /></Grid>
              <Grid item xs={6}><InfoLine label="Risk" value={selectedCustomer.risk_level} /></Grid>
              <Grid item xs={6}><InfoLine label="Internet" value={`${safe(selectedCustomer.internet_score)}/100`} /></Grid>
              <Grid item xs={6}><InfoLine label="WiFi" value={`${safe(selectedCustomer.wifi_score)}/100`} /></Grid>
              <Grid item xs={6}><InfoLine label="Device" value={`${safe(selectedCustomer.device_score)}/100`} /></Grid>
              <Grid item xs={6}><InfoLine label="VoIP" value={selectedCustomer.has_voice ? `${safe(selectedCustomer.voip_score)}/100` : "Non supportato"} /></Grid>
              <Grid item xs={6}><InfoLine label="Care Events" value={selectedCustomer.open_care_events} /></Grid>
              <Grid item xs={6}><InfoLine label="Highest Care Severity" value={selectedCustomer.highest_care_severity} /></Grid>
              <Grid item xs={6}><InfoLine label="Identified Devices" value={`${safe(selectedCustomer.identified_devices, 0)}/${safe(selectedCustomer.total_devices, 0)}`} /></Grid>
              <Grid item xs={6}><InfoLine label="Identity Confidence" value={`${safe(selectedCustomer.identity_confidence_avg, "N/D")}%`} /></Grid>
            </Grid>

            <SoftCard sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 950, mb: 1.4 }}>Technology Profile</Typography>
                <Grid container spacing={1.1}>
                  <Grid item xs={6}><InfoLine label="Android" value={selectedCustomer.technology_profile?.android_devices} /></Grid>
                  <Grid item xs={6}><InfoLine label="Apple" value={selectedCustomer.technology_profile?.apple_devices} /></Grid>
                  <Grid item xs={6}><InfoLine label="Smart TV" value={selectedCustomer.technology_profile?.smart_tvs} /></Grid>
                  <Grid item xs={6}><InfoLine label="Mobile" value={selectedCustomer.technology_profile?.mobile_devices} /></Grid>
                </Grid>
              </CardContent>
            </SoftCard>

            <SoftCard sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 950, mb: 1.4 }}>Connected Devices</Typography>
                <Stack spacing={1}>
                  {(selectedCustomer.devices || []).slice(0, 8).map((device, index) => (
                    <Box key={`${device.mac_address}-${index}`} sx={{ p: 1.2, border: `1px solid ${border}`, borderRadius: 2.4, background: "#fff" }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box>
                          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.2 }}>
                            <Chip
                              size="small"
                              label={safe(device.device_type || device.device_category, "UNKNOWN")}
                              variant="outlined"
                              sx={{ height: 22, fontSize: 10, fontWeight: 950 }}
                            />
                            <Typography sx={{ fontWeight: 950 }}>
                              {safe(device.display_name || device.hostname, "Dispositivo sconosciuto")}
                            </Typography>
                          </Stack>
                          <Typography sx={{ color: muted, fontSize: 12 }}>
                            {safe(device.mac_address)} · {safe(device.ssid)} · {safe(device.band)}
                          </Typography>
                          <Typography sx={{ color: muted, fontSize: 11, mt: 0.2 }}>
                            {safe(device.behavior_profile, "UNKNOWN")} · confidenza {safe(device.behavioral_confidence || device.identity_confidence, "N/D")}%
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${safe(device.signal_quality)} ${device.rssi ? `${device.rssi} dBm` : ""}`}
                          color={device.signal_quality === "POOR" ? "error" : statusColor(device.signal_quality)}
                          sx={{ fontWeight: 900 }}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </SoftCard>

            <SoftCard>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 950, mb: 1.4 }}>Recommendations</Typography>
                <Stack spacing={0.8}>
                  {(selectedCustomer.recommendations || []).map((rec, index) => (
                    <Typography key={`rec-${index}`} sx={{ color: "#334155", fontSize: 14 }}>
                      • {rec}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </SoftCard>
          </>
        ) : null}
      </Drawer>
    </Box>
  );
}
