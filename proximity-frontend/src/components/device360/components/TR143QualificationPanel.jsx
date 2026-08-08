import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Chip, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { IconFlask, IconRefresh } from "@tabler/icons-react";
import { getTr143QualificationRun, listTr143QualificationRuns, startTr143Qualification } from "../services/tr143QualificationApi";

const terminal = new Set(["COMPLETED", "FAILED"]);

export default function TR143QualificationPanel({ deviceId, diagnosticServers = [] }) {
  const enabled = useMemo(() => diagnosticServers.filter((s) => s.enabled !== false && s.server_type === "TR143_HTTP"), [diagnosticServers]);
  const [serverIds, setServerIds] = useState([]);
  const [fileIds, setFileIds] = useState([]);
  const [repetitions, setRepetitions] = useState(3);
  const [runs, setRuns] = useState([]);
  const [active, setActive] = useState(null);
  const [error, setError] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    const defaults = enabled.filter((s) => s.is_default);
    const selected = defaults.length ? defaults : enabled.slice(0, 1);
    setServerIds(selected.map((s) => s.id));
    setFileIds(selected.flatMap((s) => (s.files || []).filter((f) => f.expected_size_bytes <= 104857600).map((f) => f.id)));
  }, [enabled]);

  const load = async () => {
    if (!deviceId) return;
    try { setRuns(await listTr143QualificationRuns(deviceId)); } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); return () => clearTimeout(timer.current); }, [deviceId]);

  const poll = async (id) => {
    try {
      const run = await getTr143QualificationRun(id); setActive(run);
      if (!terminal.has(run.status)) timer.current = setTimeout(() => poll(id), 2500);
      else { setActive(null); await load(); }
    } catch (e) { setError(e.message); }
  };

  const start = async () => {
    setError("");
    try {
      const run = await startTr143Qualification({ device_id: deviceId, server_ids: serverIds, file_ids: fileIds, repetitions, include_ping: true, ping_target: "8.8.8.8" });
      setActive(run); timer.current = setTimeout(() => poll(run.id), 1500);
    } catch (e) { setError(e.message); }
  };

  return <Paper variant="outlined" sx={{ p: 2 }}>
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
        <Box><Typography variant="subtitle1" sx={{ fontWeight: 950 }}>TR-143 Qualification Suite</Typography><Typography variant="body2" color="text.secondary">Benchmark ripetibile, acquisizione raw, consistency score e rating del CPE.</Typography></Box>
        <Button startIcon={<IconRefresh size={16}/>} onClick={load}>Aggiorna</Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
        <TextField select fullWidth SelectProps={{ multiple: true }} label="Server" value={serverIds} onChange={(e)=>setServerIds(e.target.value)}>{enabled.map((s)=><MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>
        <TextField select fullWidth SelectProps={{ multiple: true }} label="File" value={fileIds} onChange={(e)=>setFileIds(e.target.value)}>{enabled.filter((s)=>serverIds.includes(s.id)).flatMap((s)=>s.files||[]).map((f)=><MenuItem key={f.id} value={f.id}>{f.label} ({Math.round(f.expected_size_bytes/1048576)} MB)</MenuItem>)}</TextField>
        <TextField type="number" label="Ripetizioni" value={repetitions} inputProps={{ min:1,max:10 }} onChange={(e)=>setRepetitions(Number(e.target.value))}/>
        <Button variant="contained" startIcon={<IconFlask size={17}/>} disabled={!serverIds.length || !fileIds.length || Boolean(active)} onClick={start}>Avvia qualifica</Button>
      </Stack>
      {active ? <Box><Stack direction="row" justifyContent="space-between"><Typography sx={{fontWeight:900}}>Qualifica in corso</Typography><Typography>{active.progress || 0}%</Typography></Stack><LinearProgress variant="determinate" value={active.progress || 0}/></Box> : null}
      <Stack spacing={1}>{runs.slice(0,5).map((run)=><Paper key={run.id} variant="outlined" sx={{p:1.25}}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="body2" sx={{fontWeight:900}}>{new Date(run.created_at).toLocaleString("it-IT")}</Typography><Typography variant="caption" color="text.secondary">{run.status}</Typography></Box><Stack direction="row" spacing={1}><Chip size="small" label={`${run.score ?? "N/D"}/100`}/><Chip size="small" color={run.rating === "QUALIFIED" || run.rating === "FULLY_QUALIFIED" ? "success" : "warning"} label={run.rating || "IN CORSO"}/></Stack></Stack>{run.summary?.maximum_throughput_mbps != null ? <Typography variant="body2" sx={{mt:.75}}>Max {run.summary.maximum_throughput_mbps} Mbps · Media {run.summary.average_throughput_mbps ?? "N/D"} Mbps · Successo {run.summary.success_ratio_percent ?? "N/D"}%</Typography> : null}</Paper>)}</Stack>
    </Stack>
  </Paper>;
}
