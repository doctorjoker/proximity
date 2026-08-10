import React,{useCallback,useEffect,useMemo,useState} from "react";
import {Alert,Box,Button,Chip,CircularProgress,Dialog,DialogActions,DialogContent,DialogTitle,Divider,LinearProgress,Paper,Stack,Typography} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

const ACTIVE=new Set(["ACTIVE","PUBLISHED"]);
const RUNNING=new Set(["QUEUED","RUNNING","PENDING","REQUESTED","CREATED"]);
const TERMINAL=new Set(["COMPLETED","SUCCESS","DONE","FAILED","ERROR","CANCELLED"]);
const STALE_QUEUE_MS=15*60*1000;
const first=(...v)=>v.find(x=>x!==null&&x!==undefined&&x!=="");
const codeOf=p=>first(p?.code,p?.definition_code,p?.procedure_code,"");
const activeVersion=(v=[])=>v.find(x=>ACTIVE.has(String(x?.status||x?.version_status||"").toUpperCase()));
const rawStatus=x=>String(first(x?.workflow_engine_status,x?.workflow_record?.status,x?.scheduler?.status,x?.status,"UNKNOWN")).toUpperCase();
const statusAt=x=>first(x?.updated_at,x?.started_at,x?.created_at);
const ageMs=x=>{const v=statusAt(x);if(!v)return 0;const t=new Date(v).getTime();return Number.isFinite(t)?Math.max(0,Date.now()-t):0};
const effectiveStatus=x=>{const top=String(x?.status||"").toUpperCase();if(TERMINAL.has(top))return top;const s=rawStatus(x);if(RUNNING.has(s)&&ageMs(x)>STALE_QUEUE_MS)return"STALE";return s};
const statusColor=s=>["COMPLETED","SUCCESS","DONE"].includes(String(s).toUpperCase())?"success":["FAILED","ERROR","CANCELLED"].includes(String(s).toUpperCase())?"error":String(s).toUpperCase()==="STALE"?"default":RUNNING.has(String(s).toUpperCase())?"warning":"default";
const fmt=v=>{if(!v)return"N/D";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("it-IT")};
const names={FIRST_SERVICE_PROVISIONING:"Prima attivazione servizio",ROUTER_REPLACEMENT:"Sostituzione router",DEVICE_REBOOT:"Riavvio router","PROC-ROUTER-REPLACEMENT":"Sostituzione router cliente"};
const desc={FIRST_SERVICE_PROVISIONING:"Provisioning iniziale di un nuovo servizio cliente.",ROUTER_REPLACEMENT:"Sostituzione router e riallineamento configurazione.",DEVICE_REBOOT:"Riavvio remoto controllato del router cliente.","PROC-ROUTER-REPLACEMENT":"Sostituzione router cliente con provisioning ACS e verifica runtime."};
async function request(url,options={}){const r=await fetch(url,{credentials:"same-origin",...options});const b=await r.json().catch(()=>({}));if(!r.ok||b?.success===false)throw new Error(b?.detail||b?.message||`HTTP ${r.status}`);return b}

export default function ProceduresTab({selected,overview}){
 const d=selected||overview||{};
 const deviceId=first(d?.id,d?.device_id,overview?.id,overview?.device_id);
 const acsDeviceId=first(d?.acs_device_id,d?.acsDeviceId,d?._id,overview?.acs_device_id,overview?.acsDeviceId,overview?._id);
 const vendor=first(d?.manufacturer,d?.vendor,overview?.manufacturer,overview?.vendor,"");
 const model=first(d?.model,d?.product_class,overview?.model,overview?.product_class,"");
 const serial=first(d?.serial_number,d?.serial,overview?.serial_number,overview?.serial,"");
 const serviceCode=first(d?.service_code,overview?.service_code,"");
 const [procedures,setProcedures]=useState([]),[versions,setVersions]=useState({}),[executions,setExecutions]=useState([]);
 const [loading,setLoading]=useState(true),[launching,setLaunching]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[historyOpen,setHistoryOpen]=useState(false);

 const belongs=useCallback(item=>{const c=item?.context_json||item?.context||item?.input_payload||{};const ids=[c?.device_id,c?.DEVICE_ID,c?.acs_device_id,c?.ACS_DEVICE_ID,c?.new_acs_device_id,item?.device_id,item?.acs_device_id].filter(Boolean).map(String);const targets=[deviceId,acsDeviceId].filter(Boolean).map(String);return targets.length>0&&ids.some(id=>targets.includes(id))},[deviceId,acsDeviceId]);
 const load=useCallback(async({silent=false}={})=>{if(!silent)setLoading(true);setError("");try{const [cat,ex]=await Promise.all([request("/api/v1/procedures"),request("/api/v1/procedure-executions?limit=200")]);const items=cat?.items||[],map={};await Promise.all(items.map(async p=>{const c=codeOf(p);if(!c)return;try{const x=await request(`/api/v1/procedures/${encodeURIComponent(c)}/versions`);map[c]=x?.items||[]}catch{map[c]=[]}}));setProcedures(items);setVersions(map);setExecutions((ex?.items||[]).filter(belongs))}catch(e){setError(e?.message||"Errore caricamento Procedure")}finally{if(!silent)setLoading(false)}},[belongs]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{const t=window.setInterval(()=>load({silent:true}),10000);return()=>window.clearInterval(t)},[load]);
 const available=useMemo(()=>procedures.map(procedure=>({procedure,version:activeVersion(versions[codeOf(procedure)]||[])})).filter(x=>x.version),[procedures,versions]);
 const running=useMemo(()=>executions.filter(x=>RUNNING.has(effectiveStatus(x))),[executions]);
 const stale=useMemo(()=>executions.filter(x=>effectiveStatus(x)==="STALE"),[executions]);
 const latest=executions[0]||null;

 const launch=async(procedure,version)=>{const code=codeOf(procedure),ver=first(version?.version,version?.version_label,version?.label);if(!code||!ver)return;setLaunching(code);setError("");setNotice("");try{const context={device_id:deviceId||"",DEVICE_ID:deviceId||"",acs_device_id:acsDeviceId||"",ACS_DEVICE_ID:acsDeviceId||"",vendor,manufacturer:vendor,model,product_class:model,serial_number:serial,service_code:serviceCode,SERVICE_CODE:serviceCode,source:"DEVICE360"};const r=await request(`/api/v1/procedures/${encodeURIComponent(code)}/versions/${encodeURIComponent(ver)}/execute`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requested_by:"Device360",context,mode:"REAL"})});setNotice(`Procedura accodata: ${first(r?.execution?.execution_code,r?.execution_code,"N/D")}`);await load({silent:true})}catch(e){setError(e?.message||"Avvio procedura non riuscito")}finally{setLaunching("")}};

 return <Box sx={{width:"100%",maxWidth:"100%",minWidth:0,overflowX:"hidden"}}>
  <Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" spacing={1.2} alignItems={{md:"center"}}>
   <Box><Typography variant="h6" sx={{fontWeight:950}}>Procedure Device360</Typography><Typography variant="body2" color="text.secondary">Procedure attive pubblicate nel Workflow Engine e avviabili sul dispositivo corrente.</Typography></Box>
   <Stack direction="row" spacing={1}><Button startIcon={<RefreshRoundedIcon/>} variant="outlined" onClick={()=>load()} disabled={loading}>Aggiorna</Button><Button startIcon={<HistoryRoundedIcon/>} variant="outlined" onClick={()=>setHistoryOpen(true)} disabled={!executions.length}>Storico</Button></Stack>
  </Stack>
  {error?<Alert severity="error" sx={{mt:1.5}}>{error}</Alert>:null}{notice?<Alert severity="success" sx={{mt:1.5}}>{notice}</Alert>:null}{loading?<LinearProgress sx={{mt:1.5,borderRadius:99}}/>:null}
  <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(3,minmax(0,1fr))"},gap:1.2,mt:1.5}}>
   {[["PROCEDURE DISPONIBILI",available.length],["IN ESECUZIONE",running.length],["ULTIMA ESECUZIONE",latest?.execution_code||"N/D"]].map(([l,v])=><Paper key={l} variant="outlined" sx={{p:1.5,borderRadius:3}}><Typography variant="caption" color="text.secondary" sx={{fontWeight:850}}>{l}</Typography><Typography variant={l==="ULTIMA ESECUZIONE"?"body1":"h5"} sx={{fontWeight:950,mt:.4,overflowWrap:"anywhere"}}>{v}</Typography>{l==="ULTIMA ESECUZIONE"&&latest?<Chip size="small" color={statusColor(effectiveStatus(latest))} label={effectiveStatus(latest)} sx={{mt:.6}}/>:null}</Paper>)}
  </Box>
  {stale.length?<Alert severity="warning" sx={{mt:1.5}}>Rilevate {stale.length} esecuzioni storiche rimaste in stato di coda oltre 15 minuti. Non vengono considerate attive e non bloccano nuove procedure. Apri Storico per identificarle.</Alert>:null}
  {running.length?<Paper variant="outlined" sx={{p:1.5,borderRadius:3,mt:1.5}}><Typography variant="subtitle1" sx={{fontWeight:950}}>In esecuzione</Typography><Stack spacing={1} sx={{mt:1}}>{running.map(x=><Box key={x.execution_code||x.id}><Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between"><Box><Typography variant="body2" sx={{fontWeight:900}}>{x.procedure_code||x.workflow_type}</Typography><Typography variant="caption" color="text.secondary">{x.execution_code} · {x.current_step||"Workflow Engine"}</Typography></Box><Chip size="small" color={statusColor(effectiveStatus(x))} label={effectiveStatus(x)}/></Stack><LinearProgress sx={{mt:.8,height:6,borderRadius:99}}/></Box>)}</Stack></Paper>:null}
  <Divider sx={{my:2}}/><Typography variant="subtitle1" sx={{fontWeight:950,mb:1}}>Procedure disponibili</Typography>
  {available.length?<Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",lg:"repeat(2,minmax(0,1fr))"},gap:1.3}}>{available.map(({procedure,version})=>{const code=codeOf(procedure),ver=first(version?.version,version?.version_label,version?.label,"N/D"),busy=launching===code;return <Paper key={code} variant="outlined" sx={{p:1.6,borderRadius:3,minWidth:0}}><Stack direction="row" justifyContent="space-between" spacing={1}><Box sx={{minWidth:0}}><Typography variant="subtitle1" sx={{fontWeight:950}}>{names[code]||procedure?.name||code}</Typography><Typography variant="body2" color="text.secondary" sx={{mt:.35}}>{desc[code]||procedure?.description||"Procedura automatica pubblicata nel Workflow Engine."}</Typography></Box><Chip size="small" color="success" label={ver}/></Stack><Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" spacing={1} alignItems={{sm:"center"}} sx={{mt:1.5}}><Typography variant="caption" color="text.secondary">{code}</Typography><Button variant="contained" startIcon={busy?<CircularProgress size={16} color="inherit"/>:<PlayArrowRoundedIcon/>} disabled={busy||!deviceId||running.some(x=>x.procedure_code===code)} onClick={()=>launch(procedure,version)} sx={{fontWeight:900,borderRadius:2}}>{busy?"AVVIO...":"AVVIA PROCEDURA"}</Button></Stack></Paper>})}</Box>:<Alert severity="info">Nessuna procedura ACTIVE/PUBLISHED disponibile nel catalogo.</Alert>}
  <Dialog open={historyOpen} onClose={()=>setHistoryOpen(false)} fullWidth maxWidth="md"><DialogTitle>Storico procedure dispositivo</DialogTitle><DialogContent dividers><Stack spacing={1}>{executions.length?executions.map(x=><Paper key={x.execution_code||x.id} variant="outlined" sx={{p:1.2,borderRadius:2}}><Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between"><Box><Typography variant="body2" sx={{fontWeight:950}}>{x.procedure_code||x.workflow_type||"Procedura"}</Typography><Typography variant="caption" color="text.secondary">{x.execution_code||"N/D"} · {x.procedure_version||"N/D"} · {fmt(first(x.updated_at,x.completed_at,x.created_at))}</Typography></Box><Chip size="small" color={statusColor(effectiveStatus(x))} label={effectiveStatus(x)}/></Stack></Paper>):<Typography variant="body2" color="text.secondary">Nessuna esecuzione associata al dispositivo.</Typography>}</Stack></DialogContent><DialogActions><Button onClick={()=>setHistoryOpen(false)}>Chiudi</Button></DialogActions></Dialog>
 </Box>
}
