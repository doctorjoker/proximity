import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  IconActivityHeartbeat,
  IconChartBar,
  IconClock,
  IconFileDescription,
  IconGauge,
  IconHistory,
  IconRefresh,
  IconRepeat,
  IconShieldCheck,
} from "@tabler/icons-react";

import {
  getQualificationDashboard,
  getQualificationHistory,
  getQualificationReport,
  getQualificationRun,
  cancelQualificationRun,
  rerunQualification,
} from "./services/qualificationDashboardApi";

function fmt(value, digits = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "N/D";
}

function fmtDate(value) {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("it-IT");
}

function duration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return "N/D";
  const seconds = Math.max(0, (new Date(completedAt) - new Date(startedAt)) / 1000);
  if (!Number.isFinite(seconds)) return "N/D";
  if (seconds < 60) return `${seconds.toFixed(0)} s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

const ACTIVE_RUN_STATES = new Set(["CREATED", "QUEUED", "REQUESTED", "RUNNING", "COLLECTING"]);

function elapsed(startedAt) {
  if (!startedAt) return "N/D";
  const seconds = Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "N/D";
  if (seconds < 60) return `${Math.floor(seconds)} s`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}

function stepLabel(step) {
  if (!step) return "Preparazione qualification";
  if (step.step_type === "PING") return `Ping ${step.target || ""}`.trim();
  if (step.step_type === "TR143_DOWNLOAD") {
    const mb = Number(step.expected_size_bytes || 0) / 1048576;
    return `Download TR-143 ${mb ? `${Math.round(mb)} MB` : ""}`.trim();
  }
  return String(step.step_type || "Step diagnostico").replaceAll("_", " ");
}

function QualificationLiveMonitor({ run, onCancel, cancelling }) {
  if (!run || !ACTIVE_RUN_STATES.has(run.status)) return null;
  const steps = Array.isArray(run.steps) ? run.steps : [];
  const current = steps.find((step) => ACTIVE_RUN_STATES.has(step.status))
    || steps.find((step) => step.status === "PENDING")
    || null;
  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const failed = steps.filter((step) => step.status === "FAILED").length;
  const total = steps.length || 1;
  const progress = Number.isFinite(Number(run.progress))
    ? Number(run.progress)
    : Math.round(((completed + failed) / total) * 100);

  return (
    <Paper variant="outlined" sx={{ mt: 1.5, p: 1.75, borderColor: "primary.main", bgcolor: "rgba(25,118,210,.035)" }}>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} alignItems={{ md: "center" }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <CircularProgress size={18} thickness={5} />
              <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Qualification in esecuzione</Typography>
              <Chip size="small" color="info" label={run.status} />
              <Chip size="small" variant="outlined" label={`Run ${String(run.id || "").slice(0, 8)}`} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
              {current ? stepLabel(current) : "Finalizzazione e calcolo del rating"}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">Tempo trascorso {elapsed(run.started_at || run.created_at)}</Typography>
            <Button size="small" color="error" variant="outlined" disabled={cancelling} onClick={onCancel}>
              {cancelling ? "Annullamento..." : "Annulla"}
            </Button>
          </Stack>
        </Stack>

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: .5 }}>
            <Typography variant="caption" sx={{ fontWeight: 850 }}>Step {Math.min(total, completed + failed + 1)} / {total}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 900 }}>{Math.max(0, Math.min(100, progress))}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, progress))} sx={{ height: 9, borderRadius: 99 }} />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(5,minmax(0,1fr))" }, gap: .75 }}>
          {steps.map((step) => {
            const active = ACTIVE_RUN_STATES.has(step.status);
            const color = step.status === "COMPLETED" ? "success" : step.status === "FAILED" ? "error" : active ? "info" : "default";
            return (
              <Paper key={step.id || step.sequence} variant="outlined" sx={{ p: 1, minWidth: 0, borderColor: active ? "primary.main" : "divider" }}>
                <Stack direction="row" spacing={.75} alignItems="center">
                  {active ? <CircularProgress size={14} /> : null}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, display: "block" }}>#{step.sequence} {stepLabel(step)}</Typography>
                    <Chip size="small" color={color} variant={step.status === "PENDING" ? "outlined" : "filled"} label={step.status || "PENDING"} sx={{ mt: .5, height: 20 }} />
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      </Stack>
    </Paper>
  );
}

function StatCard({ icon: Icon, label, value, helper, accent = "text.primary" }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        minWidth: 0,
        borderRadius: 2.5,
        borderColor: "rgba(15,23,42,.12)",
        boxShadow: "0 6px 20px rgba(15,23,42,.04)",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          bgcolor: "action.hover",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}>
          <Icon size={22} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 850 }}>
            {label}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 950,
              lineHeight: 1.15,
              color: accent,
              fontSize: { xs: 18, md: 22 },
              overflowWrap: "anywhere",
            }}
          >
            {value ?? "N/D"}
          </Typography>
          {helper ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: .25, overflowWrap: "anywhere" }}
            >
              {helper}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}

function ThroughputBars({ downloads = [] }) {
  const max = Math.max(1, ...downloads.map((item) => Number(item.throughput_mbps || 0)));
  if (!downloads.length) return <Typography variant="body2" color="text.secondary">Nessun benchmark disponibile.</Typography>;
  return (
    <Stack spacing={1}>
      {downloads.map((item) => {
        const value = Number(item.throughput_mbps || 0);
        return (
          <Box key={`${item.sequence}-${item.target}`}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <Typography variant="caption" color="text.secondary">Test #{item.sequence} · {Math.round(Number(item.expected_size_bytes || 0) / 1048576)} MB</Typography>
              <Typography variant="caption" sx={{ fontWeight: 900 }}>{fmt(value, 2)} Mbps</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={Math.min(100, (value / max) * 100)} sx={{ height: 8, borderRadius: 99 }} />
          </Box>
        );
      })}
    </Stack>
  );
}

function ReportDialog({ open, report, loading, onClose }) {
  const [tab, setTab] = useState("summary");
  useEffect(() => { if (open) setTab("summary"); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Qualification Report</DialogTitle>
      <DialogContent dividers>
        {loading ? <Box sx={{ py: 5, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : null}
        {!loading && report ? (
          <Stack spacing={2}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
              <Tab value="summary" label="Sintesi" />
              <Tab value="evidence" label="Evidenze" />
              <Tab value="benchmark" label="Benchmark" />
              <Tab value="raw" label="JSON" />
            </Tabs>
            {tab === "summary" ? (
              <Stack spacing={1.5}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4,minmax(0,1fr))" }, gap: 1 }}>
                  <StatCard icon={IconShieldCheck} label="Rating" value={report.rating || "N/D"} />
                  <StatCard icon={IconGauge} label="Score" value={report.score != null ? `${report.score}/100` : "N/D"} />
                  <StatCard icon={IconClock} label="Durata" value={duration(report.started_at, report.completed_at)} />
                  <StatCard icon={IconFileDescription} label="Policy" value={report.policy_code || "N/D"} helper={report.policy_version} />
                </Box>
                {(report.findings || []).map((item) => <Alert key={item} severity="warning">{item}</Alert>)}
              </Stack>
            ) : null}
            {tab === "evidence" ? (
              <Stack spacing={1}>
                {(report.evidence || []).map((item) => (
                  <Paper key={item.code} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>{item.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.reason}</Typography>
                      </Box>
                      <Chip color={item.passed ? "success" : "warning"} label={`${fmt(item.awarded_points, 1)}/${fmt(item.weight, 0)}`} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : null}
            {tab === "benchmark" ? <ThroughputBars downloads={report.downloads || []} /> : null}
            {tab === "raw" ? (
              <Box component="pre" sx={{ m: 0, p: 1.5, bgcolor: "grey.100", borderRadius: 1, overflow: "auto", maxHeight: 520, fontSize: 12 }}>
                {JSON.stringify(report, null, 2)}
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Chiudi</Button></DialogActions>
    </Dialog>
  );
}

function HistoryDialog({ open, items, onClose, onOpenReport }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Qualification History</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          {items.length ? items.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 1.25 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} alignItems={{ md: "center" }}>
                <Box>
                  <Stack direction="row" spacing={.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 950 }}>{fmtDate(item.completed_at || item.created_at)}</Typography>
                    <Chip size="small" color={item.rating === "QUALIFIED" || item.rating === "FULLY_QUALIFIED" ? "success" : "warning"} label={item.rating || item.status} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Score {item.score ?? "N/D"}/100 · {duration(item.started_at, item.completed_at)} · {(item.summary || {}).policy_code || "Policy N/D"}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => onOpenReport(item.id)}>Apri report</Button>
              </Stack>
            </Paper>
          )) : <Typography variant="body2" color="text.secondary">Nessuna qualifica storica.</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Chiudi</Button></DialogActions>
    </Dialog>
  );
}

const qualificationActionSx = {
  minHeight: 42,
  px: 1.75,
  borderRadius: 2.25,
  fontWeight: 900,
  textTransform: "none",
  whiteSpace: "nowrap",
  boxShadow: "none",
};

export default function QualificationDiagnosticsDashboard({ deviceId }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [activeRun, setActiveRun] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError("");
    try {
      const [dashboard, historyItems] = await Promise.all([
        getQualificationDashboard(deviceId),
        getQualificationHistory(deviceId, 20),
      ]);
      setData(dashboard);
      setHistory(historyItems);
      const activeSummary = historyItems.find((item) => ACTIVE_RUN_STATES.has(item.status));
      if (activeSummary?.id) {
        setActiveRun(await getQualificationRun(activeSummary.id));
      } else {
        setActiveRun(null);
      }
    } catch (exc) {
      setError(exc?.message || "Dashboard qualification non disponibile");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!activeRun?.id || !ACTIVE_RUN_STATES.has(activeRun.status)) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const fresh = await getQualificationRun(activeRun.id);
        setActiveRun(fresh);
        if (!fresh || !ACTIVE_RUN_STATES.has(fresh.status)) await load();
      } catch (exc) {
        setError(exc?.message || "Aggiornamento live qualification non riuscito");
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [activeRun?.id, activeRun?.status, load]);

  const latest = data?.latest;
  const cards = data?.cards || {};
  const ping = cards?.ping || {};
  const speed = cards?.speedtest || {};
  const evidence = data?.evidence || [];
  const summary = latest?.summary || {};

  const passed = evidence.filter((item) => item.passed).length;
  const warnings = evidence.filter((item) => !item.passed);

  const openReport = async (runId = latest?.id) => {
    if (!runId) return;
    setReportOpen(true);
    setReportLoading(true);
    try { setReport(await getQualificationReport(runId)); }
    catch (exc) { setError(exc?.message || "Report non disponibile"); }
    finally { setReportLoading(false); }
  };

  const rerun = async () => {
    if (!latest) return;
    setRerunning(true);
    setError("");
    try {
      const response = await rerunQualification(latest);
      const created = response?.run || response?.item || null;
      if (created?.id) setActiveRun(created);
      await load();
    } catch (exc) {
      setError(exc?.message || "Avvio qualification non riuscito");
    } finally {
      setRerunning(false);
    }
  };

  const cancelActiveRun = async () => {
    if (!activeRun?.id) return;
    setCancelling(true);
    setError("");
    try {
      await cancelQualificationRun(activeRun.id);
      await load();
    } catch (exc) {
      setError(exc?.message || "Annullamento qualification non riuscito");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Box
      data-eureka="EUREKA37.0.2-RESPONSIVE-ROOT"
      sx={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
        boxSizing: "border-box",
        "&, & *": {
          boxSizing: "border-box",
        },
        "& > *": {
          minWidth: 0,
          maxWidth: "100%",
        },
        "& .MuiPaper-root": {
          minWidth: 0,
          maxWidth: "100%",
        },
        "& .MuiStack-root": {
          minWidth: 0,
          maxWidth: "100%",
        },
        "& .MuiGrid-root": {
          minWidth: 0,
          maxWidth: "100%",
        },
        "& .MuiChip-root": {
          maxWidth: "100%",
        },
        "& .MuiChip-label": {
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
        "& pre": {
          maxWidth: "100%",
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        },
      }}
    >
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ lg: "center" }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h6" sx={{ fontWeight: 950 }}>TR-143 Qualification</Typography>
            {latest?.rating ? <Chip color={latest.rating.includes("QUALIFIED") ? "success" : "warning"} label={latest.rating} /> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">Valutazione carrier, benchmark, evidenze e storico del CPE.</Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2,minmax(0,1fr))",
              xl: "repeat(4,max-content)",
            },
            gap: 1,
            width: { xs: "100%", lg: "auto" },
            justifyContent: { xl: "end" },
          }}
        >
          <Button
            variant="outlined"
            startIcon={<IconHistory size={18} />}
            onClick={() => setHistoryOpen(true)}
            sx={qualificationActionSx}
          >
            Storico
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconFileDescription size={18} />}
            disabled={!latest}
            onClick={() => openReport()}
            sx={qualificationActionSx}
          >
            Report
          </Button>
          <Button
            variant="contained"
            startIcon={rerunning ? <CircularProgress size={16} color="inherit" /> : <IconRepeat size={18} />}
            disabled={!latest || rerunning || Boolean(activeRun)}
            onClick={rerun}
            sx={{ ...qualificationActionSx, minWidth: { xl: 210 } }}
          >
            {rerunning ? "Avvio in corso..." : "Avvia qualification"}
          </Button>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <IconRefresh size={18} />}
            disabled={loading}
            onClick={load}
            sx={qualificationActionSx}
          >
            Aggiorna dati
          </Button>
        </Box>
      </Stack>

      {error ? <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError("")}>{error}</Alert> : null}

      <QualificationLiveMonitor run={activeRun} onCancel={cancelActiveRun} cancelling={cancelling} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(4,minmax(0,1fr))" }, gap: 1.25, mt: 1.5 }}>
        <StatCard icon={IconShieldCheck} label="Qualification" value={latest?.score != null ? `${latest.score}/100` : "N/D"} helper={latest?.rating || "Nessuna qualifica"} accent="success.main" />
        <StatCard icon={IconActivityHeartbeat} label="Ping" value={ping?.average_response_time_ms != null ? `${ping.average_response_time_ms} ms` : "N/D"} helper={ping?.packet_loss_percent != null ? `Perdita ${ping.packet_loss_percent}%` : null} />
        <StatCard icon={IconGauge} label="Massimo TR-143" value={speed?.throughput_mbps != null ? `${fmt(speed.throughput_mbps, 2)} Mbps` : "N/D"} helper={speed?.duration_ms != null ? `${speed.duration_ms} ms` : null} />
        <StatCard icon={IconChartBar} label="Consistenza" value={summary.throughput_consistency_percent != null ? `${fmt(summary.throughput_consistency_percent, 1)}%` : "N/D"} helper={`Media ${fmt(summary.average_throughput_mbps, 2)} Mbps`} />
      </Box>

      {latest ? (
        <>
          <Divider sx={{ my: 1.75 }} />
          <Box
            sx={{
              display: "grid",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                xl: "minmax(0, 1.1fr) minmax(0, .9fr)",
              },
              gap: 1.5,
              overflow: "hidden",
            }}
          >
            <Box sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1 }}>Evidenze</Typography>
              <Stack spacing={.75}>
                {evidence.map((item) => (
                  <Paper
                    key={item.code}
                    variant="outlined"
                    title={item.reason || ""}
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      borderColor: item.passed ? "success.light" : "warning.light",
                      bgcolor: item.passed ? "rgba(22,163,74,.045)" : "rgba(249,115,22,.05)",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={.75}
                      justifyContent="space-between"
                      alignItems={{ sm: "center" }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 900,
                            lineHeight: 1.25,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.label}
                        </Typography>
                        {item.reason ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              mt: .2,
                            }}
                          >
                            {item.reason}
                          </Typography>
                        ) : null}
                      </Box>
                      <Chip
                        size="small"
                        color={item.passed ? "success" : "warning"}
                        variant={item.passed ? "filled" : "outlined"}
                        label={`${fmt(item.awarded_points, 1)}/${fmt(item.weight, 0)}`}
                        sx={{ flexShrink: 0, fontWeight: 900 }}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {passed}/{evidence.length} evidenze superate · Ultima qualifica {fmtDate(latest.completed_at)}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1 }}>Osservazioni</Typography>
              <Stack
                spacing={.75}
                sx={{
                  minWidth: 0,
                  maxWidth: "100%",
                  "& .MuiAlert-root": {
                    minWidth: 0,
                    maxWidth: "100%",
                  },
                  "& .MuiAlert-message": {
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  },
                }}
              >
                {warnings.length
                  ? warnings.map((item) => (
                      <Alert key={item.code} severity="warning" sx={{ py: .75, borderRadius: 2, alignItems: "center" }}>
                        {item.reason}
                      </Alert>
                    ))
                  : <Alert severity="success" sx={{ borderRadius: 2 }}>Nessuna criticità rilevata.</Alert>}
              </Stack>
            </Box>
          </Box>
        </>
      ) : <Alert severity="info" sx={{ mt: 1.5 }}>Nessuna qualification disponibile per questo dispositivo.</Alert>}

      <ReportDialog open={reportOpen} report={report} loading={reportLoading} onClose={() => setReportOpen(false)} />
      <HistoryDialog open={historyOpen} items={history} onClose={() => setHistoryOpen(false)} onOpenReport={(runId) => { setHistoryOpen(false); openReport(runId); }} />
    </Paper>
    </Box>
  );
}
