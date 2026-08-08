import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, LinearProgress, MenuItem, Paper, Tooltip,
  Select, Stack, Tab, Tabs, TextField, Typography
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { getDeviceDiagnostics } from "./services/device360OperationsApi";
import { listDiagnosticJobs } from "./services/diagnosticsHubApi";
import { listDiagnosticServers, validateDiagnosticServer } from "./services/diagnosticServersApi";
import QualificationDiagnosticsDashboard from "./QualificationDiagnosticsDashboard";
import { getQualificationDashboard } from "./services/qualificationDashboardApi";

const C = {
  navy:"#0B2A4A", blue:"#1677FF", blueSoft:"#EEF5FF", green:"#16A34A",
  greenSoft:"#ECFDF3", purple:"#7C3AED", purpleSoft:"#F5F0FF",
  orange:"#F97316", orangeSoft:"#FFF4EB", text:"#0F172A", muted:"#64748B",
  border:"rgba(15,23,42,.12)"
};
const card = { borderRadius:3, borderColor:C.border, boxShadow:"0 8px 30px rgba(15,23,42,.05)" };
const btn = { minHeight:40, borderRadius:2.25, px:2, fontWeight:850, textTransform:"none", whiteSpace:"nowrap" };
const first = (...v) => v.find(x => x !== null && x !== undefined && x !== "");
const filesOf = s => [s?.files,s?.diagnostic_files,s?.catalog_files,s?.download_files].find(Array.isArray) || [];
const sizeOf = f => {
  const raw=Number(f?.file_size ?? f?.size ?? f?.bytes);
  if(Number.isFinite(raw)&&raw>0){
    if(raw>=1073741824)return `${(raw/1073741824).toFixed(raw%1073741824?1:0)} GB`;
    if(raw>=1048576)return `${(raw/1048576).toFixed(raw%1048576?1:0)} MB`;
  }
  const m=String(f?.filename||f?.name||f?.url||"").match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB)/i);
  return m?`${m[1]} ${m[2].toUpperCase()}`:null;
};
const fileLabel = f => {
  const name=first(f?.display_name,f?.name,f?.filename,f?.code,`File ${f?.id??""}`);
  const size=sizeOf(f); return size?`${size} (${name})`:name;
};
const joinUrlParts = (...parts) => {
  const clean = parts
    .filter((part) => part !== null && part !== undefined && String(part).trim() !== "")
    .map((part, index) => {
      const value = String(part).trim();
      if (index === 0) return value.replace(/\/+$/, "");
      return value.replace(/^\/+|\/+$/g, "");
    });
  return clean.join("/");
};

const fileUrl = (server, file) => {
  const direct = first(file?.url,file?.download_url,file?.public_url,file?.file_url);
  if (direct) return direct;
  const baseUrl = first(server?.base_url,server?.url,server?.endpoint,server?.public_url);
  const downloadPath = first(server?.download_path,"");
  const relativePath = first(file?.relative_path,file?.path,file?.filename,file?.name);
  if (!baseUrl || !relativePath) return "";
  return joinUrlParts(baseUrl,downloadPath,relativePath);
};

function Spark({tone="blue",points=[2,4,3,6,5,8,7]}){
  const colors={blue:C.blue,green:C.green,purple:C.purple,orange:C.orange};
  const max=Math.max(...points),min=Math.min(...points);
  const d=points.map((p,i)=>`${i?"L":"M"} ${(i/(points.length-1))*100} ${30-((p-min)/Math.max(1,max-min))*22}`).join(" ");
  return <Box component="svg" viewBox="0 0 100 34" sx={{width:84,height:34}}><path d={d} fill="none" stroke={colors[tone]} strokeWidth="3" strokeLinecap="round"/></Box>;
}
function Kpi({label,value,helper,tone,points}){
  const soft={blue:C.blueSoft,green:C.greenSoft,purple:C.purpleSoft,orange:C.orangeSoft}[tone]||C.blueSoft;
  return <Paper variant="outlined" sx={{...card,p:1.5,minWidth:0}}>
    <Stack direction="row" justifyContent="space-between" spacing={1}>
      <Box><Typography variant="caption" sx={{fontWeight:850,color:C.muted}}>{label}</Typography>
      <Typography variant="h5" sx={{fontWeight:950,color:C.text,fontSize:{xs:18,md:20},lineHeight:1.15,overflowWrap:"anywhere"}}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{helper}</Typography></Box>
      <Box sx={{bgcolor:soft,p:.6,borderRadius:2,alignSelf:"flex-start"}}><Spark tone={tone} points={points}/></Box>
    </Stack>
  </Paper>;
}
function Stat({label,value,tone="blue"}){
  const map={blue:[C.blue,C.blueSoft],green:[C.green,C.greenSoft],purple:[C.purple,C.purpleSoft],orange:[C.orange,C.orangeSoft]};
  const [main,soft]=map[tone];
  return <Box sx={{p:1.1,borderRadius:2,bgcolor:soft}}><Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6" sx={{fontWeight:950,color:main,fontSize:{xs:16,md:18},lineHeight:1.2,overflowWrap:"anywhere"}}>{value}</Typography></Box>;
}
function Timeline({events=[]}){
  const normalize=(items)=>{
    if(!Array.isArray(items))return [];
    return items.map((item,index)=>{
      const result=item?.result||{};
      const sourceEvents=Array.isArray(result?.events)?result.events:[];
      if(sourceEvents.length){
        return sourceEvents.map((event,subIndex)=>({
          ...event,
          _key:event?.key||`${item?.id||index}-${subIndex}`,
          _job:item
        }));
      }
      return [{
        ...item,
        _key:item?.id||item?.key||index,
        title:item?.title||item?.diagnostic_type||item?.phase||"Evento diagnostico",
        detail:item?.detail||item?.message||result?.message||"",
        at:item?.at||item?.updated_at||item?.completed_at||item?.created_at,
        type:String(item?.status||item?.type||"info").toLowerCase(),
        phase:item?.phase||item?.status||item?.diagnostic_type||"EVENT",
        _job:item
      }];
    }).flat().filter(Boolean);
  };

  const data=normalize(events);
  const ordered=[...data].sort((a,b)=>{
    const ta=new Date(a?.at||0).getTime()||0;
    const tb=new Date(b?.at||0).getTime()||0;
    return ta-tb;
  });

  const stateOf=(event)=>{
    const raw=String(event?.type||event?.status||event?.phase||"").toLowerCase();
    if(raw.includes("fail")||raw.includes("error")||raw.includes("timeout"))return "error";
    if(raw.includes("complete")||raw.includes("success")||raw.includes("result"))return "success";
    if(raw.includes("run")||raw.includes("refresh")||raw.includes("collect")||raw.includes("request"))return "running";
    return "info";
  };

  const palette={
    success:{main:C.green,soft:C.greenSoft,label:"Completato"},
    error:{main:"#DC2626",soft:"#FEF2F2",label:"Errore"},
    running:{main:C.blue,soft:C.blueSoft,label:"In corso"},
    info:{main:C.purple,soft:C.purpleSoft,label:"Evento"}
  };

  const terminal=ordered.filter(e=>["success","error"].includes(stateOf(e))).length;
  const total=ordered.length;
  const current=[...ordered].reverse().find(e=>stateOf(e)==="running")||ordered[ordered.length-1]||null;
  const firstAt=ordered[0]?.at?new Date(ordered[0].at):null;
  const lastAt=ordered[ordered.length-1]?.at?new Date(ordered[ordered.length-1].at):null;
  const durationMs=firstAt&&lastAt?Math.max(0,lastAt-firstAt):null;
  const progress=total?Math.min(100,Math.round((terminal/total)*100)):0;

  const fmtDuration=(ms)=>{
    if(ms==null||!Number.isFinite(ms))return "N/D";
    if(ms<1000)return `${Math.round(ms)} ms`;
    const sec=Math.round(ms/1000);
    if(sec<60)return `${sec} s`;
    return `${Math.floor(sec/60)}m ${sec%60}s`;
  };

  if(!ordered.length){
    return <Paper variant="outlined" sx={{...card,p:1.6,overflow:"hidden"}}>
      <Typography variant="subtitle1" sx={{fontWeight:950}}>TIMELINE DIAGNOSTICA</Typography>
      <Alert severity="info" sx={{mt:1}}>Nessun evento diagnostico disponibile.</Alert>
    </Paper>;
  }

  return <Paper
    variant="outlined"
    sx={{
      ...card,
      p:1.6,
      overflow:"hidden",
      width:"100%",
      maxWidth:"100%",
      minWidth:0
    }}
  >
    <Stack
      direction={{xs:"column",lg:"row"}}
      justifyContent="space-between"
      spacing={1.2}
      alignItems={{lg:"center"}}
    >
      <Box sx={{minWidth:0}}>
        <Typography variant="subtitle1" sx={{fontWeight:950}}>TIMELINE DIAGNOSTICA</Typography>
        <Typography variant="caption" color="text.secondary">
          Sequenza reale degli eventi del Job Engine
        </Typography>
      </Box>
      <Stack direction="row" spacing={.7} flexWrap="wrap" useFlexGap>
        <Chip size="small" variant="outlined" label={`${total} eventi`}/>
        <Chip size="small" variant="outlined" label={`Durata ${fmtDuration(durationMs)}`}/>
        <Chip size="small" color={current&&stateOf(current)==="error"?"error":"primary"} label={current?.title||current?.phase||"In attesa"}/>
      </Stack>
    </Stack>

    <Box sx={{mt:1.3}}>
      <Box sx={{height:8,borderRadius:99,bgcolor:"#E2E8F0",overflow:"hidden"}}>
        <Box sx={{
          width:`${progress}%`,
          height:"100%",
          bgcolor:progress>=100?C.green:C.blue,
          transition:"width .3s ease"
        }}/>
      </Box>
    </Box>

    <Stack spacing={1} sx={{mt:1.5}}>
      {ordered.map((event,index)=>{
        const state=stateOf(event);
        const tone=palette[state];
        const at=event?.at?new Date(event.at):null;
        const timestamp=at&&!Number.isNaN(at.getTime())?at.toLocaleTimeString("it-IT"):"";
        const detail=event?.detail||event?.message||event?._job?.result?.message||"";

        return <Box
          key={event?._key||index}
          sx={{
            display:"grid",
            gridTemplateColumns:{xs:"34px minmax(0,1fr)",md:"42px minmax(0,1fr) auto"},
            gap:1,
            alignItems:"start",
            minWidth:0
          }}
        >
          <Box sx={{
            width:{xs:30,md:36},
            height:{xs:30,md:36},
            borderRadius:"50%",
            display:"grid",
            placeItems:"center",
            bgcolor:tone.soft,
            color:tone.main,
            fontWeight:950,
            border:`1px solid ${tone.main}33`
          }}>
            {state==="success"?"✓":state==="error"?"!":state==="running"?"↻":"•"}
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p:1,
              borderRadius:2,
              borderColor:`${tone.main}33`,
              bgcolor:"background.paper",
              minWidth:0,
              overflow:"hidden"
            }}
          >
            <Stack
              direction={{xs:"column",sm:"row"}}
              justifyContent="space-between"
              spacing={.5}
              alignItems={{sm:"center"}}
            >
              <Box sx={{minWidth:0}}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight:900,
                    overflowWrap:"anywhere"
                  }}
                >
                  {event?.title||event?.phase||"Evento diagnostico"}
                </Typography>
                {detail?<Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display:"block",
                    mt:.25,
                    overflowWrap:"anywhere"
                  }}
                >
                  {detail}
                </Typography>:null}
              </Box>
              <Chip
                size="small"
                label={tone.label}
                sx={{
                  flexShrink:0,
                  bgcolor:tone.soft,
                  color:tone.main,
                  fontWeight:850
                }}
              />
            </Stack>
          </Paper>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display:{xs:"none",md:"block"},
              whiteSpace:"nowrap",
              pt:1
            }}
          >
            {timestamp}
          </Typography>
        </Box>;
      })}
    </Stack>
  </Paper>;
}
function PingCard({result,onRun,history=[]}){
  const [profile,setProfile]=useState("STANDARD"),[host,setHost]=useState("8.8.8.8");
  const presets={FAST:[4,3000,32],STANDARD:[5,5000,56],CARRIER:[10,5000,56],STRESS:[20,8000,256]};
  const [rep,setRep]=useState(5),[timeout,setTimeoutV]=useState(5000),[packet,setPacket]=useState(56),[dscp,setDscp]=useState(0),[weight,setWeight]=useState(15);
  const choose=v=>{setProfile(v);const p=presets[v];setRep(p[0]);setTimeoutV(p[1]);setPacket(p[2]);};
  return <Paper variant="outlined" sx={{...card,p:1.6,borderColor:"success.light"}}>
    <Stack direction="row" justifyContent="space-between"><Box><Typography variant="h6" sx={{fontWeight:950,color:C.green}}>PING</Typography>
    <Typography variant="caption" color="text.secondary">Latenza, packet loss e qualità</Typography></Box><Chip size="small" label={result?.status||"IDLE"} color={result?.status==="COMPLETED"?"success":"default"}/></Stack>
    <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(2,minmax(0,1fr))"},gap:1,mt:1.3}}>
      <FormControl size="small"><InputLabel>Profilo</InputLabel><Select value={profile} label="Profilo" onChange={e=>choose(e.target.value)}>
        {Object.keys(presets).map(p=><MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl>
      <TextField size="small" label="Host" value={host} onChange={e=>setHost(e.target.value)}/>
      <TextField size="small" type="number" label="Ripetizioni" value={rep} onChange={e=>setRep(+e.target.value)}/>
      <TextField size="small" type="number" label="Timeout (ms)" value={timeout} onChange={e=>setTimeoutV(+e.target.value)}/>
      <TextField size="small" type="number" label="Packet size" value={packet} onChange={e=>setPacket(+e.target.value)}/>
      <TextField size="small" type="number" label="DSCP" value={dscp} onChange={e=>setDscp(+e.target.value)}/>
      <TextField size="small" type="number" label="Peso qualification (%)" value={weight} onChange={e=>setWeight(+e.target.value)}/>
      <TextField size="small" label="Interfaccia" value="WAN (ppp0)" disabled/>
    </Box>
    <Box sx={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:1,mt:1.2}}>
      <Stat label="Stato" value={result?.status==="COMPLETED"?"OK":result?.status||"IDLE"} tone="green"/><Stat label="Media" value={result?.average_response_time_ms!=null?`${result.average_response_time_ms} ms`:"N/D"}/>
      <Stat label="Min / Max" value={result?.minimum_response_time_ms!=null?`${result.minimum_response_time_ms} / ${result.maximum_response_time_ms} ms`:"N/D"}/>
      <Stat label="Perdita" value={result?.packet_loss_percent!=null?`${result.packet_loss_percent}%`:"N/D"} tone="green"/>
    </Box>
    {["QUEUED","RUNNING","REQUESTED","COLLECTING"].includes(String(result?.status||"").toUpperCase())?<LinearProgress sx={{mt:1.1,height:7,borderRadius:99}}/>:null}
    <Button fullWidth variant="contained" startIcon={<PlayArrowRoundedIcon/>} sx={{...btn,mt:1.3,bgcolor:C.green,"&:hover":{bgcolor:"#15803D"}}}
      disabled={["QUEUED","RUNNING","REQUESTED","COLLECTING"].includes(String(result?.status||"").toUpperCase())}
      onClick={()=>onRun({host,repetitions:rep,timeout_ms:timeout,data_block_size:packet,dscp,qualification_weight:weight})}>
      {["QUEUED","RUNNING","REQUESTED","COLLECTING"].includes(String(result?.status||"").toUpperCase())?"PING IN ESECUZIONE":"AVVIA PING"}
    </Button>
    <Box sx={{mt:1.5,pt:1.2,borderTop:"1px solid",borderColor:"divider"}}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb:.8}}>
        <Typography variant="caption" sx={{fontWeight:950,color:C.muted,letterSpacing:.35}}>STORICO PING</Typography>
        <Chip size="small" variant="outlined" label={`${history.length} test`}/>
      </Stack>
      <Stack spacing={.7} sx={{maxHeight:220,overflowY:"auto",pr:.25}}>
        {history.length?history.slice(0,8).map(job=>{
          const h=job?.result||{};
          return <Paper key={job.id} variant="outlined" sx={{p:.9,borderRadius:2}}>
            <Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" spacing={.6}>
              <Box sx={{minWidth:0}}>
                <Typography variant="body2" sx={{fontWeight:900}}>
                  {job?.parameters?.host||job?.parameters?.target||"Host N/D"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {job.completed_at?new Date(job.completed_at).toLocaleString("it-IT"):"In corso"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={.5} flexWrap="wrap" useFlexGap alignItems="center">
                <Chip size="small" color={job.status==="COMPLETED"?"success":job.status==="FAILED"?"error":"warning"} label={job.status}/>
                <Chip size="small" variant="outlined" label={`Media ${h.average_response_time_ms!=null?`${h.average_response_time_ms} ms`:"N/D"}`}/>
                <Chip size="small" variant="outlined" label={`Loss ${h.packet_loss_percent!=null?`${h.packet_loss_percent}%`:"N/D"}`}/>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{display:"block",mt:.35}}>
              Min/Max {h.minimum_response_time_ms!=null?`${h.minimum_response_time_ms}/${h.maximum_response_time_ms} ms`:"N/D"}
              {" · "}Pacchetti {job?.parameters?.repetitions??"N/D"}
            </Typography>
          </Paper>;
        }):<Typography variant="caption" color="text.secondary">Nessun test Ping nello storico.</Typography>}
      </Stack>
    </Box>
  </Paper>;
}
function TraceCard({result,onRun,history=[]}){
  const [host,setHost]=useState("8.8.8.8"),[hops,setHops]=useState(30),[tries,setTries]=useState(3),[timeout,setTimeoutV]=useState(5000),[packet,setPacket]=useState(56),[dscp,setDscp]=useState(0),[weight,setWeight]=useState(15);
  return <Paper variant="outlined" sx={{...card,p:1.6,borderColor:"secondary.light"}}>
    <Stack direction="row" justifyContent="space-between"><Box><Typography variant="h6" sx={{fontWeight:950,color:C.purple}}>TRACEROUTE</Typography>
    <Typography variant="caption" color="text.secondary">Percorso IP, hop e RTT</Typography></Box><Chip size="small" label={result?.status||"IDLE"} color={result?.status==="COMPLETED"?"success":"default"}/></Stack>
    <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(2,minmax(0,1fr))"},gap:1,mt:1.3}}>
      <TextField size="small" label="Host" value={host} onChange={e=>setHost(e.target.value)}/><TextField size="small" type="number" label="Max Hop" value={hops} onChange={e=>setHops(+e.target.value)}/>
      <TextField size="small" type="number" label="Tentativi per Hop" value={tries} onChange={e=>setTries(+e.target.value)}/><TextField size="small" type="number" label="Timeout (ms)" value={timeout} onChange={e=>setTimeoutV(+e.target.value)}/>
      <TextField size="small" type="number" label="Packet size" value={packet} onChange={e=>setPacket(+e.target.value)}/><TextField size="small" type="number" label="DSCP" value={dscp} onChange={e=>setDscp(+e.target.value)}/>
      <TextField size="small" label="Interfaccia" value="WAN (ppp0)" disabled/><TextField size="small" type="number" label="Peso qualification (%)" value={weight} onChange={e=>setWeight(+e.target.value)}/>
    </Box>
    <Box sx={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:1,mt:1.2}}>
      <Stat label="Stato" value={result?.status==="COMPLETED"?"OK":result?.status||"IDLE"} tone="purple"/><Stat label="Hop totali" value={result?.hops??"N/D"} tone="purple"/>
      <Stat label="Ultimo hop" value={result?.last_hop??"N/D"} tone="purple"/><Stat label="RTT ultimo" value={result?.rtt_ms!=null?`${result.rtt_ms} ms`:"N/D"} tone="purple"/>
    </Box>
    {["QUEUED","RUNNING","REQUESTED","COLLECTING"].includes(String(result?.status||"").toUpperCase())?<LinearProgress sx={{mt:1.1,height:7,borderRadius:99}}/>:null}
    <Button fullWidth variant="contained" startIcon={<PlayArrowRoundedIcon/>} sx={{...btn,mt:1.3,bgcolor:C.purple,"&:hover":{bgcolor:"#6D28D9"}}}
      disabled={["QUEUED","RUNNING","REQUESTED","COLLECTING"].includes(String(result?.status||"").toUpperCase())}
      onClick={()=>onRun({host,max_hop_count:hops,number_of_tries:tries,timeout_ms:timeout,data_block_size:packet,dscp,qualification_weight:weight})}>
      {["QUEUED","RUNNING","REQUESTED","COLLECTING"].includes(String(result?.status||"").toUpperCase())?"TRACEROUTE IN ESECUZIONE":"AVVIA TRACEROUTE"}
    </Button>
    <Box sx={{mt:1.5,pt:1.2,borderTop:"1px solid",borderColor:"divider"}}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb:.8}}>
        <Typography variant="caption" sx={{fontWeight:950,color:C.muted,letterSpacing:.35}}>STORICO TRACEROUTE</Typography>
        <Chip size="small" variant="outlined" label={`${history.length} test`}/>
      </Stack>
      <Stack spacing={.7} sx={{maxHeight:220,overflowY:"auto",pr:.25}}>
        {history.length?history.slice(0,8).map(job=>{
          const h=job?.result||{};
          const hops=h.hops??h.hop_count??h.route_hops?.length;
          return <Paper key={job.id} variant="outlined" sx={{p:.9,borderRadius:2}}>
            <Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" spacing={.6}>
              <Box sx={{minWidth:0}}>
                <Typography variant="body2" sx={{fontWeight:900}}>
                  {job?.parameters?.host||job?.parameters?.target||"Host N/D"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {job.completed_at?new Date(job.completed_at).toLocaleString("it-IT"):"In corso"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={.5} flexWrap="wrap" useFlexGap alignItems="center">
                <Chip size="small" color={job.status==="COMPLETED"?"success":job.status==="FAILED"?"error":"warning"} label={job.status}/>
                <Chip size="small" variant="outlined" label={`${hops??"N/D"} hop`}/>
                <Chip size="small" variant="outlined" label={`RTT ${h.rtt_ms!=null?`${h.rtt_ms} ms`:"N/D"}`}/>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{display:"block",mt:.35}}>
              Ultimo hop {h.last_hop??h.destination??"N/D"}
              {" · "}Max hop {job?.parameters?.max_hop_count??"N/D"}
            </Typography>
          </Paper>;
        }):<Typography variant="caption" color="text.secondary">Nessun TraceRoute nello storico.</Typography>}
      </Stack>
    </Box>
  </Paper>;
}
function DownloadCard({deviceId,acsDeviceId,latest}){
  const [tab,setTab]=useState("CONFIG");
  const [source,setSource]=useState("SERVER");
  const [servers,setServers]=useState([]);
  const [serverId,setServerId]=useState("");
  const [fileId,setFileId]=useState("");
  const [customUrl,setCustomUrl]=useState("");
  const [validation,setValidation]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [job,setJob]=useState(null);
  const [history,setHistory]=useState([]);
  const [weight,setWeight]=useState(40);
  const [iface,setIface]=useState("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.");
  const [dscp,setDscp]=useState(0);
  const [priority,setPriority]=useState(0);
  const [connections,setConnections]=useState(1);
  const [timeout,setTimeoutV]=useState(360);
  const timer=useRef(null);
  const [elapsedSeconds,setElapsedSeconds]=useState(0);
  const elapsedTimer=useRef(null);

  useEffect(()=>{
    listDiagnosticServers(false)
      .then(items=>{
        setServers(items||[]);
        const preferred=(items||[]).find(item=>item.is_default)||(items||[])[0];
        if(preferred)setServerId(String(preferred.id));
      })
      .catch(exc=>setError(exc?.message||"Catalogo server non disponibile"));
  },[]);

  const server=useMemo(
    ()=>servers.find(item=>String(item.id)===String(serverId))||null,
    [servers,serverId]
  );
  const files=useMemo(()=>filesOf(server).filter(item=>item.enabled!==false),[server]);
  const file=useMemo(
    ()=>files.find(item=>String(item.id)===String(fileId))||null,
    [files,fileId]
  );

  useEffect(()=>{
    if(files.length&&!file)setFileId(String(files[0].id));
  },[files,file]);

  const resolved=source==="CUSTOM"?customUrl.trim():fileUrl(server,file);
  const result=job?.result||latest||{};
  const state=String(job?.status||result?.state||result?.execution_state||"IDLE").toUpperCase();
  const progress=Number(job?.progress??result?.progress??0);
  const active=["QUEUED","REQUESTED","RUNNING","COLLECTING"].includes(state);
  const bytes=Number(result?.total_bytes_received??result?.test_bytes_received??0);
  const testBytes=Number(result?.test_bytes_received??0);
  const expectedBytes=Number(file?.expected_size_bytes??0);
  const receivedMb=bytes>0?(bytes/1048576).toFixed(2):"N/D";
  const testMb=testBytes>0?(testBytes/1048576).toFixed(2):"N/D";
  const expectedMb=expectedBytes>0?(expectedBytes/1048576).toFixed(0):sizeOf(file)||"N/D";

  const stopPolling=()=>{
    if(timer.current){
      window.clearInterval(timer.current);
      timer.current=null;
    }
    if(elapsedTimer.current){
      window.clearInterval(elapsedTimer.current);
      elapsedTimer.current=null;
    }
  };

  useEffect(()=>()=>stopPolling(),[]);

  const loadHistory=async()=>{
    if(!deviceId)return;
    try{
      const response=await fetch(`/api/v1/device-diagnostics/jobs?device_id=${encodeURIComponent(deviceId)}&limit=10`);
      const body=await response.json().catch(()=>({}));
      const items=body?.items||body?.jobs||[];
      setHistory(items.filter(item=>item.diagnostic_type==="TR143_SPEEDTEST"));
    }catch{
      setHistory([]);
    }
  };

  useEffect(()=>{loadHistory();},[deviceId]);

  const pollJob=async jobId=>{
    try{
      const response=await fetch(`/api/v1/device-diagnostics/jobs/${jobId}`);
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body?.detail||body?.message||`HTTP ${response.status}`);
      const next=body?.job||body?.item||body;
      setJob(next);
      const nextState=String(next?.status||"").toUpperCase();
      if(["COMPLETED","FAILED","CANCELLED","TIMED_OUT"].includes(nextState)){
        stopPolling();
        loadHistory();
        window.dispatchEvent(new CustomEvent("proximity:diagnostic-job-updated",{detail:{deviceId,job:next}}));
      }
    }catch(exc){
      stopPolling();
      setError(exc?.message||"Polling job TR-143 fallito");
    }
  };

  const validate=async()=>{
    if(!server||!file)return;
    setBusy(true);
    setError("");
    try{
      setValidation(await validateDiagnosticServer(server.id,file.id));
    }catch(exc){
      setError(exc?.message||"Validazione server/file fallita");
    }finally{
      setBusy(false);
    }
  };

  const start=async()=>{
    if(!deviceId||!resolved||active)return;
    setBusy(true);
    setError("");
    setElapsedSeconds(0);
    if(elapsedTimer.current)window.clearInterval(elapsedTimer.current);
    elapsedTimer.current=window.setInterval(()=>setElapsedSeconds(value=>value+1),1000);
    setJob({
      status:"QUEUED",
      progress:5,
      parameters:{url:resolved},
      result:{events:[]}
    });
    try{
      const response=await fetch("/api/v1/device-diagnostics/jobs",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          device_id:deviceId,
          diagnostic_type:"TR143_SPEEDTEST",
          parameters:{
            url:resolved,
            mode:"DOWNLOAD_ONLY",
            interface:iface||null,
            dscp:Number(dscp),
            ethernet_priority:Number(priority),
            number_of_connections:Number(connections),
            diagnostic_server_id:server?.id||null,
            diagnostic_file_id:file?.id||null,
            qualification_weight:Number(weight)
          },
          timeout_seconds:Number(timeout),
          requested_by:"Device360"
        })
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body?.detail?.message||body?.detail||body?.message||`HTTP ${response.status}`);
      const created=body?.job||body?.item||body;
      setJob(created);
      if(created?.id){
        stopPolling();
        timer.current=window.setInterval(()=>pollJob(created.id),2500);
        window.setTimeout(()=>pollJob(created.id),700);
      }
    }catch(exc){
      setJob(current=>({
        ...(current||{}),
        status:"FAILED",
        progress:100,
        error:{message:exc?.message||"Avvio TR-143 fallito"}
      }));
      setError(exc?.message||"Avvio TR-143 fallito");
    }finally{
      setBusy(false);
    }
  };

  const statusColor=
    state==="COMPLETED"?"success":
    ["FAILED","TIMED_OUT","CANCELLED"].includes(state)?"error":
    active?"warning":"default";

  return <Paper variant="outlined" sx={{...card,borderColor:"warning.light",bgcolor:"#FFFCF8",overflow:"hidden"}}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{p:1.6}}>
      <Box>
        <Typography variant="h6" sx={{fontWeight:950,color:C.orange}}>TR-143 DOWNLOAD</Typography>
        <Typography variant="caption" color="text.secondary">Job Engine stabile · dati raw del CPE · nessun ricalcolo frontend</Typography>
      </Box>
      <Chip size="small" label={state} color={statusColor}/>
    </Stack>

    <Box sx={{px:1.6,pb:1.25}}>
      <Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" spacing={0.4} sx={{mb:.65}}>
        <Typography variant="caption" sx={{fontWeight:900,color:active?C.orange:C.muted}}>
          {state==="QUEUED"?"Job accodato":
           state==="REQUESTED"?"Preparazione CPE":
           state==="RUNNING"?"Download e raccolta risultati":
           state==="COLLECTING"?"Raccolta metriche":
           state==="COMPLETED"?"Risultato ricevuto":
           error||"Pronto per un nuovo test"}
        </Typography>
        <Typography variant="caption" sx={{fontWeight:900,color:C.muted}}>
          {active?`In esecuzione da ${elapsedSeconds}s`:`${progress}%`}
        </Typography>
      </Stack>
      <LinearProgress
        variant={active?"indeterminate":"determinate"}
        value={active?undefined:Math.max(0,Math.min(100,progress))}
        sx={{
          height:9,
          borderRadius:99,
          bgcolor:"rgba(249,115,22,.12)",
          "& .MuiLinearProgress-bar":{
            borderRadius:99,
            bgcolor:state==="COMPLETED"?C.green:C.orange
          }
        }}
      />
      {active?<Typography variant="caption" color="text.secondary" sx={{display:"block",mt:.55}}>
        Il CPE può impiegare alcuni secondi tra un refresh ACS e il successivo. La barra animata indica che il polling è attivo.
      </Typography>:null}
    </Box>

    <Tabs value={tab} onChange={(_,value)=>setTab(value)} variant="scrollable" scrollButtons="auto" sx={{borderTop:"1px solid",borderBottom:"1px solid",borderColor:"divider",bgcolor:"background.paper"}}>
      <Tab value="CONFIG" label="Configurazione"/>
      <Tab value="ADV" label="Avanzate"/>
      <Tab value="RESULTS" label="Risultati"/>
      <Tab value="TIMELINE" label="Timeline"/>
      <Tab value="HISTORY" label="Storico"/>
    </Tabs>

    <Box sx={{p:1.6}}>
      {error?<Alert severity="error" sx={{mb:1.2}}>{error}</Alert>:null}

      {tab==="CONFIG"?<Stack spacing={1.4}>
        <Box>
          <Typography variant="caption" sx={{fontWeight:900,color:C.muted,letterSpacing:.35}}>ORIGINE DEL TEST</Typography>
          <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(2,minmax(0,1fr))"},gap:1,mt:.7}}>
            {[["SERVER","Server certificato","Catalogo diagnostico Proximity"],["CUSTOM","URL personalizzato","Endpoint HTTP/FTP manuale"]].map(([value,label,helper])=>
              <Paper key={value} onClick={()=>setSource(value)} variant="outlined" sx={{p:1.25,borderRadius:2.25,cursor:"pointer",borderColor:source===value?C.blue:C.border,bgcolor:source===value?C.blueSoft:"background.paper","&:hover":{borderColor:C.blue}}}>
                <Typography variant="body2" sx={{fontWeight:950,color:source===value?C.blue:C.text}}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">{helper}</Typography>
              </Paper>
            )}
          </Box>
        </Box>

        {source==="CUSTOM"?<TextField size="small" label="URL personalizzato" value={customUrl} onChange={event=>setCustomUrl(event.target.value)}/>:<>
          <Box>
            <Typography variant="caption" sx={{fontWeight:900,color:C.muted,letterSpacing:.35}}>SERVER DIAGNOSTICO</Typography>
            <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(2,minmax(0,1fr))"},gap:1,mt:.7}}>
              {servers.map(item=>{
                const selected=String(item.id)===String(serverId);
                return <Paper key={item.id} onClick={()=>setServerId(String(item.id))} variant="outlined" sx={{p:1.25,borderRadius:2.25,cursor:"pointer",borderColor:selected?C.orange:C.border,bgcolor:selected?C.orangeSoft:"background.paper","&:hover":{borderColor:C.orange}}}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box sx={{minWidth:0}}>
                      <Typography variant="body2" sx={{fontWeight:950}}>{item.name||item.code}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{display:"block",overflowWrap:"anywhere"}}>{item.base_url}</Typography>
                    </Box>
                    <Chip size="small" color={item.last_validation_status==="VALID"?"success":"default"} label={item.last_validation_status||"NON VALIDATO"}/>
                  </Stack>
                  <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{mt:1}}>
                    <Chip size="small" variant="outlined" label={item.server_type||"TR143_HTTP"}/>
                    {item.is_default?<Chip size="small" color="primary" label="DEFAULT"/>:null}
                  </Stack>
                </Paper>
              })}
            </Box>
          </Box>

          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{fontWeight:900,color:C.muted,letterSpacing:.35}}>FILE DI TEST</Typography>
              <Button size="small" variant="outlined" startIcon={<VerifiedRoundedIcon/>} sx={{...btn,minHeight:32}} onClick={validate} disabled={!server||!file||busy}>VALIDA</Button>
            </Stack>
            <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",sm:"repeat(2,minmax(0,1fr))"},gap:1,mt:.7}}>
              {files.map(item=>{
                const selected=String(item.id)===String(fileId);
                return <Paper key={item.id} onClick={()=>setFileId(String(item.id))} variant="outlined" sx={{p:1.25,borderRadius:2.25,cursor:"pointer",borderColor:selected?C.orange:C.border,bgcolor:selected?C.orangeSoft:"background.paper","&:hover":{borderColor:C.orange}}}>
                  <Typography variant="h6" sx={{fontWeight:950,color:C.orange}}>{item.label||sizeOf(item)||`File ${item.id}`}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.relative_path||"Percorso N/D"}</Typography>
                </Paper>
              })}
            </Box>
          </Box>
        </>}

        <Alert severity={validation?.status==="VALID"?"success":"info"}>
          URL risolto: {resolved||"N/D"} {validation?`· ${validation.status||validation.result||"Validato"}`:""}
        </Alert>

        <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"1fr 1fr"},gap:1}}>
          <TextField size="small" type="number" label="Peso Qualification (%)" value={weight} onChange={event=>setWeight(Number(event.target.value))}/>
          <TextField size="small" label="Interfaccia WAN" value={iface} onChange={event=>setIface(event.target.value)}/>
        </Box>

        <Button fullWidth variant="contained" startIcon={<PlayArrowRoundedIcon/>} sx={{...btn,minHeight:48,bgcolor:C.orange,"&:hover":{bgcolor:"#EA580C"}}} disabled={!resolved||busy||active} onClick={start}>
          {busy?"CREAZIONE JOB...":active?"DOWNLOAD IN ESECUZIONE":"AVVIA DOWNLOAD"}
        </Button>
      </Stack>:null}

      {tab==="ADV"?<Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(2,minmax(0,1fr))"},gap:1}}>
        <TextField size="small" type="number" label="DSCP" value={dscp} onChange={event=>setDscp(Number(event.target.value))}/>
        <TextField size="small" type="number" label="Ethernet Priority" value={priority} onChange={event=>setPriority(Number(event.target.value))}/>
        <TextField size="small" type="number" label="Connessioni TCP" value={connections} onChange={event=>setConnections(Number(event.target.value))}/>
        <TextField size="small" type="number" label="Timeout job (secondi)" value={timeout} onChange={event=>setTimeoutV(Number(event.target.value))}/>
      </Box>:null}

      {tab==="RESULTS"?<Stack spacing={1.2}>
        <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",sm:"repeat(2,minmax(0,1fr))",xl:"repeat(4,minmax(0,1fr))"},gap:1}}>
          <Stat label="Throughput" value={result?.throughput_mbps!=null?`${result.throughput_mbps} Mbps`:"N/D"} tone="orange"/>
          <Stat label="Durata CPE" value={result?.duration_ms!=null?`${result.duration_ms} ms`:"N/D"}/>
          <Stat label="TCP Open" value={result?.tcp_open_ms!=null?`${result.tcp_open_ms} ms`:"N/D"}/>
          <Stat label="Refresh CPE" value={result?.refresh_attempts??"N/D"} tone="purple"/>
          <Stat label="File selezionato" value={`${expectedMb} MB`}/>
          <Stat label="Test bytes" value={testMb==="N/D"?"N/D":`${testMb} MB`} tone="green"/>
          <Stat label="Total bytes" value={receivedMb==="N/D"?"N/D":`${receivedMb} MB`} tone="green"/>
          <Stat label="Stato raw" value={result?.raw_state||state}/>
        </Box>
        {state==="COMPLETED"&&expectedBytes>0&&bytes>0&&bytes<expectedBytes?<Alert severity="info">
          Il CPE ha completato il benchmark dopo aver contabilizzato {receivedMb} MB sul file catalogato da {expectedMb} MB. Il valore mostrato è quello raw restituito da DownloadDiagnostics.
        </Alert>:null}
        <Paper variant="outlined" sx={{p:1.25,borderRadius:2}}>
          <Typography variant="caption" color="text.secondary">Execution ID</Typography>
          <Typography variant="body2" sx={{fontWeight:850,overflowWrap:"anywhere"}}>{result?.execution_id||job?.id||"N/D"}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{display:"block",mt:.7}}>URL</Typography>
          <Typography variant="body2" sx={{fontWeight:850,overflowWrap:"anywhere"}}>{result?.download_url||job?.parameters?.url||resolved||"N/D"}</Typography>
        </Paper>
      </Stack>:null}

      {tab==="TIMELINE"?<Timeline events={result?.events||[]}/>:null}

      {tab==="HISTORY"?<Stack spacing={1}>
        {history.length?history.map(item=><Paper key={item.id} variant="outlined" sx={{p:1.15,borderRadius:2}}>
          <Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="body2" sx={{fontWeight:900}}>{item.parameters?.url||"TR-143"}</Typography>
              <Typography variant="caption" color="text.secondary">{item.completed_at?new Date(item.completed_at).toLocaleString("it-IT"):"In corso"}</Typography>
            </Box>
            <Stack direction="row" spacing={0.7} alignItems="center">
              <Chip size="small" label={item.status} color={item.status==="COMPLETED"?"success":item.status==="FAILED"?"error":"warning"}/>
              <Typography variant="body2" sx={{fontWeight:950,color:C.orange}}>{item.result?.throughput_mbps!=null?`${item.result.throughput_mbps} Mbps`:"N/D"}</Typography>
            </Stack>
          </Stack>
        </Paper>):<Alert severity="info">Nessun job TR-143 disponibile.</Alert>}
      </Stack>:null}
    </Box>
  </Paper>;
}

export default function CarrierDiagnosticsHub({device,deviceId,overview}){
  const [qualificationKpi,setQualificationKpi]=useState(null);
  const [tab,setTab]=useState("OPERATIONS"),[diag,setDiag]=useState({}),[jobs,setJobs]=useState([]),[error,setError]=useState("");
  const id=first(deviceId,device?.id,device?.device_id,overview?.id,overview?.device_id),acs=first(diag?.acs_device_id,device?.acs_device_id,device?.acs_id,overview?.acs_device_id,overview?.acs_id);
  // EUREKA39.1.0-QUALIFICATION-KPI-BRIDGE
  const loadQualificationKpi=async()=>{
    if(!id)return;
    try{
      const dashboard=await getQualificationDashboard(id);
      const latest=dashboard?.latest||{};
      const score=[
        latest?.score,
        latest?.qualification_score,
        dashboard?.score,
        dashboard?.qualification_score
      ].find(value=>value!==null&&value!==undefined&&value!=="");
      const numeric=Number(score);
      setQualificationKpi({
        score:Number.isFinite(numeric)?numeric:null,
        rating:latest?.rating||dashboard?.rating||null,
        status:latest?.status||dashboard?.status||null,
        runId:latest?.id||null
      });
    }catch(exc){
      console.warn("[EUREKA39.1.0] Qualification KPI unavailable",exc);
    }
  };
  useEffect(()=>{
    loadQualificationKpi();
    const timer=window.setInterval(loadQualificationKpi,15000);
    const handler=()=>loadQualificationKpi();
    window.addEventListener("proximity:diagnostic-job-updated",handler);
    window.addEventListener("proximity:qualification-updated",handler);
    return ()=>{
      window.clearInterval(timer);
      window.removeEventListener("proximity:diagnostic-job-updated",handler);
      window.removeEventListener("proximity:qualification-updated",handler);
    };
  },[id]);

  const load=async()=>{if(!id)return;try{const [d,j]=await Promise.all([getDeviceDiagnostics(id),listDiagnosticJobs(id,{limit:30})]);setDiag(d||{});setJobs(j?.items||j?.jobs||[]);}catch(e){setError(e?.message||"Errore Diagnostics Hub");}};
  useEffect(()=>{load();},[id]);
  useEffect(()=>{
    const handler=event=>{
      if(!event?.detail?.deviceId||String(event.detail.deviceId)===String(id))load();
    };
    window.addEventListener("proximity:diagnostic-job-updated",handler);
    return ()=>window.removeEventListener("proximity:diagnostic-job-updated",handler);
  },[id]);
  const ping=jobs.find(j=>["PING","IPPing"].includes(j.diagnostic_type))||{},trace=jobs.find(j=>String(j.diagnostic_type||"").includes("TRACE"))||{},tr=jobs.find(j=>j.diagnostic_type==="TR143_SPEEDTEST")||{};
  const pingHistory=jobs.filter(j=>["PING","IPPING","IP_PING","PING_DIAGNOSTIC"].includes(String(j?.diagnostic_type||"").toUpperCase()));
  const traceHistory=jobs.filter(j=>["TRACEROUTE","TRACE_ROUTE"].includes(String(j?.diagnostic_type||"").toUpperCase()));
  const pr=ping.result||{},rr=trace.result||{},dr=tr.result||{};
  const kpis=[{label:"PING",value:pr.average_response_time_ms!=null?`${pr.average_response_time_ms} ms`:"N/D",helper:"Latenza media",tone:"green",points:[6,8,7,10,8,9,8]},
    {label:"PACKET LOSS",value:pr.packet_loss_percent!=null?`${pr.packet_loss_percent}%`:"N/D",helper:"Perdita pacchetti",tone:"green",points:[0,0,1,0,0,0,0]},
    {label:"TRACEROUTE",value:rr.hops!=null?`${rr.hops} hop`:"N/D",helper:"Hop intermedi",tone:"purple",points:[2,4,3,6,5,8,7]},
    {label:"TR-143 DOWNLOAD",value:dr.throughput_mbps!=null?`${dr.throughput_mbps} Mbps`:"N/D",helper:"Throughput massimo",tone:"orange",points:[220,410,360,610,520,780,690]},
    {label:"QUALIFICATION",value:qualificationKpi?.score!=null?`${qualificationKpi.score}/100`:(diag?.qualification_score!=null?`${diag.qualification_score}/100`:"N/D"),helper:qualificationKpi?.rating||"Punteggio qualità",tone:"blue",points:[72,75,78,80,82,84,86]}];
  const runOperationalJob=async(diagnosticType,parameters)=>{
    if(!id){
      setError("Device ID non disponibile.");
      return;
    }
    setError("");
    try{
      const createResponse=await fetch("/api/v1/device-diagnostics/jobs",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          device_id:id,
          diagnostic_type:diagnosticType,
          parameters:{
            ...parameters,
            source:"EUREKA38.4.0_DEVICE360"
          },
          timeout_seconds:diagnosticType==="TRACEROUTE"?120:60,
          requested_by:"Device360"
        })
      });
      const createBody=await createResponse.json().catch(()=>({}));
      if(!createResponse.ok){
        const detail=createBody?.detail;
        throw new Error(
          (typeof detail==="string"?detail:detail?.message)
          ||createBody?.message
          ||`HTTP ${createResponse.status}`
        );
      }

      const created=createBody?.job||createBody?.item||createBody;
      const jobId=created?.id;
      await load();

      if(!jobId)return;

      const startedAt=Date.now();
      const poll=async()=>{
        try{
          const response=await fetch(`/api/v1/device-diagnostics/jobs/${jobId}`);
          const body=await response.json().catch(()=>({}));
          if(!response.ok){
            throw new Error(body?.detail||body?.message||`HTTP ${response.status}`);
          }
          const job=body?.job||body?.item||body;
          await load();

          const state=String(job?.status||"").toUpperCase();
          if(["COMPLETED","FAILED","CANCELLED","TIMED_OUT"].includes(state)){
            window.dispatchEvent(new CustomEvent("proximity:diagnostic-job-updated",{
              detail:{deviceId:id,job}
            }));
            return;
          }

          if(Date.now()-startedAt>130000){
            setError(`${diagnosticType}: polling scaduto; il job continua nel backend.`);
            return;
          }

          window.setTimeout(poll,1800);
        }catch(exc){
          setError(exc?.message||`${diagnosticType}: aggiornamento job non riuscito.`);
        }
      };

      window.setTimeout(poll,700);
    }catch(exc){
      setError(exc?.message||`${diagnosticType}: avvio diagnostica non riuscito.`);
      await load();
    }
  };

  const runPing=async p=>runOperationalJob("PING",{
    host:p.host,
    target:p.host,
    repetitions:Number(p.repetitions||4),
    timeout_ms:Number(p.timeout_ms||5000),
    data_block_size:Number(p.data_block_size||56),
    dscp:Number(p.dscp||0),
    qualification_weight:Number(p.qualification_weight||15)
  });

  const runTrace=async p=>runOperationalJob("TRACEROUTE",{
    host:p.host,
    target:p.host,
    max_hop_count:Number(p.max_hop_count||30),
    number_of_tries:Number(p.number_of_tries||3),
    timeout_ms:Number(p.timeout_ms||5000),
    data_block_size:Number(p.data_block_size||56),
    dscp:Number(p.dscp||0),
    qualification_weight:Number(p.qualification_weight||15)
  });
  return <Box sx={{width:"100%",maxWidth:"100%",minWidth:0,overflowX:"hidden",bgcolor:"#F8FAFC",p:{xs:1,md:1.5},borderRadius:3}}>
    <Paper variant="outlined" sx={{...card,mb:1.2}}><Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" alignItems={{md:"center"}} spacing={1} sx={{p:1.4}}>
      <Box><Typography variant="h6" sx={{fontWeight:950}}>Carrier Diagnostics Hub</Typography><Typography variant="caption" color="text.secondary">Test, qualification, timeline e storico carrier-grade</Typography></Box>
      <Button variant="contained" startIcon={<PlayArrowRoundedIcon/>} sx={{...btn,bgcolor:C.blue}}>AVVIA TUTTI I TEST</Button></Stack>
      <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable" scrollButtons="auto" sx={{borderTop:"1px solid",borderColor:"divider"}}><Tab value="OVERVIEW" label="Overview"/><Tab value="OPERATIONS" label="Test operativi"/><Tab value="QUALIFICATION" label="Qualification"/><Tab value="TIMELINE" label="Timeline"/><Tab value="TR143" label="TR-143"/></Tabs>
    </Paper>
    {error?<Alert severity="warning" sx={{mb:1}} onClose={()=>setError("")}>{error}</Alert>:null}
    <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",sm:"repeat(2,minmax(0,1fr))",xl:"repeat(5,minmax(0,1fr))"},gap:1.2}}>{kpis.map(k=><Kpi key={k.label} {...k}/>)}</Box>
    {tab==="OPERATIONS"?<Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",xl:"minmax(0,1.15fr) minmax(430px,.85fr)"},gap:1.2,mt:1.2}}><Stack spacing={1.2}><Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",lg:"repeat(2,minmax(0,1fr))"},gap:1.2}}><PingCard result={{...pr,status:ping.status}} history={pingHistory} onRun={runPing}/><TraceCard result={{...rr,status:trace.status}} history={traceHistory} onRun={runTrace}/></Box></Stack><DownloadCard deviceId={id} acsDeviceId={acs} latest={dr}/></Box>:null}
    {tab==="OVERVIEW"?<Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(2,minmax(0,1fr))"},gap:1.2,mt:1.2}}><Paper variant="outlined" sx={{...card,p:1.5}}><Typography variant="subtitle1" sx={{fontWeight:950}}>WAN / PPPoE</Typography><Typography variant="body2" sx={{mt:1}}>Stato: {first(diag?.ppp_status,diag?.ppp?.status,"N/D")}</Typography><Typography variant="body2">WAN IP: {first(diag?.wan_ip,diag?.ppp?.wan_ip,"N/D")}</Typography><Typography variant="body2">Username: {first(diag?.ppp_username,diag?.ppp?.username,"N/D")}</Typography><Typography variant="body2">Gateway: {first(diag?.ppp_remote_ip,diag?.ppp?.remote_ip,"N/D")}</Typography></Paper><Paper variant="outlined" sx={{...card,p:1.5}}><Typography variant="subtitle1" sx={{fontWeight:950}}>Stato dispositivo</Typography><Typography variant="body2" sx={{mt:1}}>Health: {diag?.health_score!=null?`${diag.health_score}/100`:"N/D"}</Typography><Typography variant="body2">Risk: {diag?.risk_level||"N/D"}</Typography><Typography variant="body2">Uptime: {diag?.uptime_seconds||"N/D"}</Typography><Typography variant="body2">ACS ID: {acs||"N/D"}</Typography></Paper></Box>:null}
    {tab==="QUALIFICATION"?<Box sx={{mt:1.2}}><QualificationDiagnosticsDashboard deviceId={id}/></Box>:null}
    {tab==="TIMELINE"?<Box sx={{mt:1.2}}><Timeline events={jobs}/></Box>:null}
    {tab==="TR143"?<Box sx={{mt:1.2}}><DownloadCard deviceId={id} acsDeviceId={acs} latest={dr}/></Box>:null}
  </Box>;
}
