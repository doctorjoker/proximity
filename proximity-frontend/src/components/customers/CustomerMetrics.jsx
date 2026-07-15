import React from "react";
import { Grid } from "@mui/material";
import { Groups, Router, Storage, Wifi } from "@mui/icons-material";
import MetricCard from "../ui/MetricCard";

export default function CustomerMetrics({ summary, onFilter }) {
  return (
    <Grid container spacing={1.8} sx={{ mb: 2.5 }}>
      <Grid item xs={12} sm={6} lg={3}>
        <MetricCard icon={<Groups />} label="Clienti" value={summary.total} helper="Anagrafiche caricate" tone="blue" actionLabel="Apri elenco" onClick={() => onFilter("ALL")} />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MetricCard icon={<Wifi />} label="Collegati" value={summary.linked} helper="Matching PPPoE/CPE" tone="green" actionLabel="Filtra collegati" onClick={() => onFilter("LINKED")} />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MetricCard icon={<Router />} label="Router" value={summary.devices} helper="Apparati associati" tone="amber" actionLabel="Vedi apparati" />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MetricCard icon={<Storage />} label="Senza CPE" value={summary.unlinked} helper="Da associare" tone={summary.unlinked ? "red" : "slate"} actionLabel="Filtra criticità" onClick={() => onFilter("UNLINKED")} />
      </Grid>
    </Grid>
  );
}
