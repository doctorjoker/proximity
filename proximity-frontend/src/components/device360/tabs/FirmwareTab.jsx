import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";

const first=(...v)=>v.find(x=>x!==null&&x!==undefined&&x!=="");
const norm=v=>String(v||"").trim().toLowerCase().replace(/[-_\\s]/g,"");
const fmtDate=v=>{if(!v)return "N/D";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("it-IT");};
const statusColor=s=>{const v=String(s||"").toUpperCase();if(["COMPLETED","SUCCESS","DONE"].includes(v))return "success";if(["FAILED","ERROR","CANCELLED"].includes(v))return "error";if(["RUNNING","QUEUED","REQUESTED","PENDING"].includes(v))return "warning";return "default";};

export default function FirmwareTab({ selected, overview }) {
  const device=selected||overview||{};
  const deviceId=first(device?.id,device?.device_id,overview?.id,overview?.device_id);
  const currentFirmware=first(overview?.software_version,overview?.firmware_version,device?.software_version,device?.firmware_version,"N/D");
  const vendor=first(overview?.manufacturer,overview?.vendor,device?.manufacturer,device?.vendor,"N/D");
  const model=first(overview?.model,overview?.product_class,device?.model,device?.product_class,device?.hardware_version,"N/D");
  const [catalog,setCatalog]=useState([]),[jobs,setJobs]=useState([]),[loading,setLoading]=useState(false),[upgradeLoading,setUpgradeLoading]=useState(false),[error,setError]=useState(""),[selectedFirmwareId,setSelectedFirmwareId]=useState(""),[historyOpen,setHistoryOpen]=useState(false),[lastUpgrade,setLastUpgrade]=useState(null);

  const load=async()=>{setLoading(true);setError("");try{const [cr,jr]=await Promise.all([fetch("/api/v1/firmware/catalog"),fetch("/api/v1/firmware/jobs")]);const [c,j]=await Promise.all([cr.json().catch(()=>({})),jr.json().catch(()=>({}))]);if(!cr.ok)throw new Error(c?.detail||"Catalogo firmware non disponibile");if(!jr.ok)throw new Error(j?.detail||"Storico firmware non disponibile");setCatalog(c?.items||[]);setJobs(j?.items||[]);}catch(e){setError(e?.message||"Errore caricamento firmware");}finally{setLoading(false);}};
  useEffect(()=>{load();},[deviceId]);

  const compatible=useMemo(()=>{const vk=norm(vendor),mk=norm(model);return catalog.filter(item=>{const sameVendor=!vk||vk==="nd"||norm(item?.vendor)===vk;const im=norm(item?.model);const sameModel=!mk||mk==="nd"||im===mk||im.includes(mk)||mk.includes(im);return sameVendor&&sameModel;});},[catalog,vendor,model]);
  useEffect(()=>{if(!selectedFirmwareId&&compatible.length){const preferred=compatible.find(x=>x?.stable&&!x?.mandatory)||compatible.find(x=>x?.stable)||compatible[0];if(preferred?.id!=null)setSelectedFirmwareId(String(preferred.id));}},[compatible,selectedFirmwareId]);

  const deviceJobs=useMemo(()=>jobs.filter(job=>{const ids=[job?.device_id,job?.device?.id,job?.target_device_id,job?.proximity_device_id].filter(Boolean);return !deviceId||ids.length===0||ids.some(v=>String(v)===String(deviceId));}),[jobs,deviceId]);
  const selectedFirmware=useMemo(()=>compatible.find(x=>String(x?.id)===String(selectedFirmwareId))||null,[compatible,selectedFirmwareId]);
  const activeJob=deviceJobs.find(job=>["RUNNING","QUEUED","REQUESTED","PENDING"].includes(String(job?.status||"").toUpperCase()));
  const latestJob=deviceJobs[0]||null;
  const available=compatible.filter(x=>String(x?.version||"").trim()!==String(currentFirmware||"").trim());

  const runUpgrade=async()=>{if(!deviceId||!selectedFirmware?.id)return;setUpgradeLoading(true);setError("");try{const r=await fetch(`/api/v1/firmware/devices/${encodeURIComponent(deviceId)}/upgrade`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({firmware_id:selectedFirmware.id})});const body=await r.json().catch(()=>({}));if(!r.ok||body?.success===false)throw new Error(body?.detail||body?.message||`HTTP ${r.status}`);setLastUpgrade(body);await load();}catch(e){setError(e?.message||"Upgrade firmware non riuscito");}finally{setUpgradeLoading(false);}};

  return <Box sx={{width:"100%",maxWidth:"100%",minWidth:0,overflowX:"hidden"}}>
    {error?<Alert severity="error" sx={{mb:1.5}}>{error}</Alert>:null}
    <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"minmax(0,2fr) repeat(2,minmax(180px,.6fr))"},gap:1.5}}>
      <Paper variant="outlined" sx={{p:1.75,borderRadius:3}}><Typography variant="caption" color="text.secondary" sx={{fontWeight:850}}>Firmware corrente</Typography><Typography variant="h6" sx={{fontWeight:950,mt:.4,overflowWrap:"anywhere"}}>{currentFirmware}</Typography><Typography variant="caption" color="text.secondary">Versione runtime letta dal Device360</Typography></Paper>
      <Paper variant="outlined" sx={{p:1.75,borderRadius:3}}><Typography variant="caption" color="text.secondary" sx={{fontWeight:850}}>Vendor</Typography><Typography variant="h6" sx={{fontWeight:950,mt:.4}}>{vendor}</Typography></Paper>
      <Paper variant="outlined" sx={{p:1.75,borderRadius:3}}><Typography variant="caption" color="text.secondary" sx={{fontWeight:850}}>Modello</Typography><Typography variant="h6" sx={{fontWeight:950,mt:.4}}>{model}</Typography></Paper>
    </Box>
    <Alert severity="info" sx={{mt:1.5}}>Firmware Operations usa il catalogo Proximity e il workflow di upgrade GenieACS gia esistente.</Alert>
    <Stack direction={{xs:"column",md:"row"}} spacing={1} sx={{mt:1.5}} alignItems={{md:"center"}}>
      <Button variant="outlined" onClick={load} disabled={loading} sx={{fontWeight:850,borderRadius:2}}>{loading?"VERIFICA IN CORSO...":"VERIFICA AGGIORNAMENTI"}</Button>
      <Button variant="contained" onClick={runUpgrade} disabled={!selectedFirmware||!deviceId||upgradeLoading||Boolean(activeJob)} sx={{fontWeight:850,borderRadius:2}}>{upgradeLoading?"AVVIO UPGRADE...":activeJob?"UPGRADE IN CORSO":"AVVIA UPGRADE"}</Button>
      <Button variant="outlined" onClick={()=>setHistoryOpen(true)} disabled={!deviceJobs.length} sx={{fontWeight:850,borderRadius:2}}>STORICO FIRMWARE</Button>
    </Stack>
    {(loading||upgradeLoading||activeJob)?<LinearProgress sx={{mt:1.25,height:7,borderRadius:99}}/>:null}
    <Divider sx={{my:2}}/>
    <Stack spacing={1.5}>
      <Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" spacing={1}><Box><Typography variant="h6" sx={{fontWeight:950}}>Firmware compatibili</Typography><Typography variant="body2" color="text.secondary">{compatible.length} release compatibili con {vendor} {model}.</Typography></Box>{available.length?<Chip color="success" label={`${available.length} release disponibili`}/>:<Chip label="Nessun aggiornamento rilevato"/>}</Stack>
      {compatible.length?<><FormControl fullWidth size="small"><InputLabel>Release da installare</InputLabel><Select value={selectedFirmwareId} label="Release da installare" onChange={e=>setSelectedFirmwareId(e.target.value)}>{compatible.map(item=><MenuItem key={item.id} value={String(item.id)}>{item.version||`Firmware ${item.id}`}{item.stable?" · STABLE":""}{item.mandatory?" · OBBLIGATORIO":""}</MenuItem>)}</Select></FormControl>{selectedFirmware?<Paper variant="outlined" sx={{p:1.5,borderRadius:3}}><Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" spacing={1}><Box sx={{minWidth:0}}><Typography variant="subtitle1" sx={{fontWeight:950}}>{selectedFirmware.version||"Release selezionata"}</Typography><Typography variant="body2" color="text.secondary" sx={{overflowWrap:"anywhere"}}>{first(selectedFirmware.filename,selectedFirmware.url,"File firmware N/D")}</Typography>{selectedFirmware.notes?<Typography variant="caption" color="text.secondary" sx={{display:"block",mt:.5}}>{selectedFirmware.notes}</Typography>:null}</Box><Stack direction="row" spacing={.7} flexWrap="wrap" useFlexGap>{selectedFirmware.stable?<Chip size="small" color="success" label="STABLE"/>:null}{selectedFirmware.mandatory?<Chip size="small" color="warning" label="OBBLIGATORIO"/>:null}<Chip size="small" variant="outlined" label={selectedFirmware.model||model}/></Stack></Stack></Paper>:null}</>:<Alert severity="warning">Nessun firmware compatibile trovato nel catalogo per {vendor} {model}.</Alert>}
      <Paper variant="outlined" sx={{p:1.5,borderRadius:3}}><Typography variant="subtitle1" sx={{fontWeight:950}}>Ultima operazione</Typography>{latestJob?<Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" spacing={1} sx={{mt:.8}}><Box><Typography variant="body2" sx={{fontWeight:850}}>{first(latestJob?.firmware_version,latestJob?.version,latestJob?.target_version,"Firmware job")}</Typography><Typography variant="caption" color="text.secondary">{fmtDate(first(latestJob?.updated_at,latestJob?.completed_at,latestJob?.created_at))}</Typography></Box><Chip size="small" color={statusColor(latestJob?.status)} label={latestJob?.status||"N/D"}/></Stack>:<Typography variant="body2" color="text.secondary" sx={{mt:.8}}>Nessun job firmware associato al dispositivo.</Typography>}</Paper>
      {lastUpgrade?<Alert severity="success">Upgrade inviato correttamente. Task ID: {first(lastUpgrade?.result?._id,lastUpgrade?.task_id,lastUpgrade?.id,"N/D")}</Alert>:null}
    </Stack>
    <Dialog open={historyOpen} onClose={()=>setHistoryOpen(false)} fullWidth maxWidth="md"><DialogTitle>Storico firmware</DialogTitle><DialogContent dividers><Stack spacing={1}>{deviceJobs.length?deviceJobs.map(job=><Paper key={job.id||job._id||`${job.created_at}-${job.status}`} variant="outlined" sx={{p:1.25}}><Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" spacing={1}><Box><Typography variant="body2" sx={{fontWeight:950}}>{first(job?.firmware_version,job?.version,job?.target_version,`Job ${job?.id||"firmware"}`)}</Typography><Typography variant="caption" color="text.secondary">{fmtDate(first(job?.updated_at,job?.completed_at,job?.created_at))}</Typography></Box><Chip size="small" color={statusColor(job?.status)} label={job?.status||"N/D"}/></Stack></Paper>):<Typography variant="body2" color="text.secondary">Nessuna operazione firmware registrata.</Typography>}</Stack></DialogContent><DialogActions><Button onClick={()=>setHistoryOpen(false)}>Chiudi</Button></DialogActions></Dialog>
  </Box>;
}
