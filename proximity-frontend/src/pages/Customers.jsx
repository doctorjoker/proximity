import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
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
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Close,
  Home,
  Launch,
  Person,
  Refresh,
  Router,
  Search,
  SignalWifi4Bar,
  Storage,
  Wifi,
} from "@mui/icons-material";

const API_BASE = window.location.hostname
  ? `http://${window.location.hostname}:8010`
  : "http://10.40.0.22:8010";

const navy = "#0f172a";
const muted = "#64748b";
const accent = "#2563eb";
const border = "rgba(148, 163, 184, 0.28)";
const softShadow = "0 18px 50px rgba(15, 23, 42, 0.06)";

const safe = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
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

function CustomerCard({ customer, onOpen }) {
  const hasRouter = (customer.devices || []).length > 0;
  const firstDevice = hasRouter ? customer.devices[0] : null;

  return (
    <SoftCard
      sx={{
        height: "100%",
        transition: "all .18s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 22px 60px rgba(15,23,42,.1)",
        },
      }}
    >
      <CardContent sx={{ p: 2.4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={1.4} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              sx={{
                bgcolor: "#dbeafe",
                color: accent,
                fontWeight: 950,
                width: 46,
                height: 46,
              }}
            >
              {safe(customer.customer_name, "?").slice(0, 1)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 950, fontSize: 16, color: navy }} noWrap>
                {safe(customer.customer_name)}
              </Typography>
              <Typography sx={{ color: muted, fontSize: 13 }} noWrap>
                {safe(customer.contract_number)}
              </Typography>
            </Box>
          </Stack>

          <Chip
            size="small"
            label={hasRouter ? "LINKED" : "NO CPE"}
            color={hasRouter ? "success" : "default"}
            sx={{ fontWeight: 900 }}
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.1}>
          <InfoMini icon={<Storage />} label="Profilo" value={safe(customer.profile)} />
          <InfoMini icon={<Wifi />} label="PPPoE" value={safe(customer.radius_login)} />
          <InfoMini icon={<Home />} label="Indirizzo" value={`${safe(customer.address, "")} ${safe(customer.civic_number, "")} ${safe(customer.city, "")}`} />
          <InfoMini
            icon={<Router />}
            label="Router"
            value={firstDevice ? `${safe(firstDevice.manufacturer)} ${safe(firstDevice.model)}` : "Non associato"}
          />
        </Stack>

        <Button
          fullWidth
          variant="contained"
          onClick={() => onOpen(customer)}
          sx={{
            mt: 2.2,
            borderRadius: 2.4,
            py: 1.05,
            textTransform: "none",
            fontWeight: 950,
            background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
          }}
        >
          Apri Customer 360
        </Button>
      </CardContent>
    </SoftCard>
  );
}

function InfoMini({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ color: muted, display: "grid", placeItems: "center" }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: muted, fontSize: 11, fontWeight: 850 }}>{label}</Typography>
        <Typography sx={{ color: navy, fontSize: 13, fontWeight: 850 }} noWrap>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function DetailLine({ label, value }) {
  return (
    <Box>
      <Typography sx={{ color: muted, fontSize: 12, fontWeight: 850 }}>{label}</Typography>
      <Typography sx={{ color: navy, fontWeight: 850, overflowWrap: "anywhere" }}>{value}</Typography>
    </Box>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const url = query.trim()
        ? `${API_BASE}/api/v1/customers?limit=60&q=${encodeURIComponent(query.trim())}`
        : `${API_BASE}/api/v1/customers?limit=60`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Errore caricamento clienti");
      }

      setCustomers(data.items || []);
    } catch (err) {
      console.error(err);
      alert(`Errore clienti: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openCustomer = async (customer) => {
    setSelected(customer);
    setSelectedDetail(null);
    setDetailLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/customers/${customer.id}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Errore dettaglio cliente");
      }

      setSelectedDetail(data);
    } catch (err) {
      console.error(err);
      alert(`Errore Customer 360: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRouterAccess = async (deviceId) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/access-url`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.access_url) {
        throw new Error(data.reason || data.detail || "Access URL non disponibile");
      }

      window.open(data.access_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      alert(`Errore apertura router: ${err.message}`);
    }
  };


  const linkedCount = useMemo(
    () => customers.filter((c) => (c.devices || []).length > 0).length,
    [customers]
  );

  return (
    <Box sx={{ color: navy }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "flex-end" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography sx={{ fontSize: { xs: 32, md: 40 }, fontWeight: 950, letterSpacing: -1.2 }}>
            Customer 360
          </Typography>
          <Typography sx={{ color: muted, mt: 0.6 }}>
            Clienti Webilly collegati a PPPoE, router ACS e servizi Proximity.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.2} sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadCustomers}
            sx={{ borderRadius: 2.4, textTransform: "none", fontWeight: 900 }}
          >
            Aggiorna
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2.2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <SoftCard>
            <CardContent sx={{ p: 2.2 }}>
              <Typography sx={{ color: muted, fontWeight: 850, fontSize: 13 }}>Clienti importati</Typography>
              <Typography sx={{ color: navy, fontWeight: 950, fontSize: 32 }}>{customers.length}</Typography>
            </CardContent>
          </SoftCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <SoftCard>
            <CardContent sx={{ p: 2.2 }}>
              <Typography sx={{ color: muted, fontWeight: 850, fontSize: 13 }}>Clienti collegati in questa vista</Typography>
              <Typography sx={{ color: navy, fontWeight: 950, fontSize: 32 }}>{linkedCount}</Typography>
            </CardContent>
          </SoftCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <SoftCard>
            <CardContent sx={{ p: 2.2 }}>
              <Typography sx={{ color: muted, fontWeight: 850, fontSize: 13 }}>Chiave matching</Typography>
              <Typography sx={{ color: navy, fontWeight: 950, fontSize: 24 }}>PPPoE</Typography>
            </CardContent>
          </SoftCard>
        </Grid>
      </Grid>

      <SoftCard sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 2.2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Cerca nome, contratto, PPPoE, comune..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadCustomers();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={loadCustomers}
              sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 950, px: 3 }}
            >
              Cerca
            </Button>
          </Stack>
        </CardContent>
      </SoftCard>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      <Grid container spacing={2.2}>
        {customers.map((customer) => (
          <Grid item xs={12} sm={6} lg={4} xl={3} key={customer.id}>
            <CustomerCard customer={customer} onOpen={openCustomer} />
          </Grid>
        ))}

        {!loading && customers.length === 0 && (
          <Grid item xs={12}>
            <SoftCard>
              <CardContent sx={{ p: 5, textAlign: "center", color: muted }}>
                Nessun cliente trovato.
              </CardContent>
            </SoftCard>
          </Grid>
        )}
      </Grid>

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setSelectedDetail(null);
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 580 },
            p: 3,
            background: "#f8fafc",
          },
        }}
      >
        {selected && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography sx={{ fontSize: 26, fontWeight: 950 }}>
                  {safe(selected.customer_name)}
                </Typography>
                <Typography sx={{ color: muted }}>
                  {safe(selected.contract_number)} · {safe(selected.profile)}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelected(null)}>
                <Close />
              </IconButton>
            </Stack>

            <Divider sx={{ my: 2.4 }} />

            {detailLoading && (
              <Stack alignItems="center" sx={{ py: 4 }}>
                <CircularProgress />
              </Stack>
            )}

            {!detailLoading && selectedDetail && (
              <Stack spacing={2.2}>
                <SoftCard>
                  <CardContent sx={{ p: 2.3 }}>
                    <Typography sx={{ fontWeight: 950, mb: 2 }}>Overview Cliente</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <DetailLine label="Codice cliente" value={safe(selectedDetail.customer.customer_code)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <DetailLine label="Contratto" value={safe(selectedDetail.customer.contract_number)} />
                      </Grid>
                      <Grid item xs={12}>
                        <DetailLine label="PPPoE" value={safe(selectedDetail.customer.radius_login)} />
                      </Grid>
                      <Grid item xs={12}>
                        <DetailLine
                          label="Indirizzo"
                          value={`${safe(selectedDetail.customer.address, "")} ${safe(selectedDetail.customer.civic_number, "")} ${safe(selectedDetail.customer.city, "")} ${safe(selectedDetail.customer.province, "")}`}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <DetailLine label="Email" value={safe(selectedDetail.customer.email)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <DetailLine label="Mobile" value={safe(selectedDetail.customer.mobile)} />
                      </Grid>
                    </Grid>
                  </CardContent>
                </SoftCard>

                <SoftCard>
                  <CardContent sx={{ p: 2.3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography sx={{ fontWeight: 950 }}>Router ACS</Typography>
                      <Chip
                        size="small"
                        label={`${selectedDetail.devices.length} device`}
                        color={selectedDetail.devices.length ? "success" : "default"}
                        sx={{ fontWeight: 900 }}
                      />
                    </Stack>

                    {selectedDetail.devices.map((device) => (
                      <Box
                        key={device.id}
                        sx={{
                          p: 1.6,
                          border: `1px solid ${border}`,
                          borderRadius: 3,
                          background: "#fff",
                          mb: 1.2,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography sx={{ fontWeight: 950 }}>
                              {safe(device.manufacturer)} {safe(device.model)}
                            </Typography>
                            <Typography sx={{ color: muted, fontSize: 13 }}>
                              {safe(device.acs_device_id)}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={device.online ? "ONLINE" : "OFFLINE"}
                            color={device.online ? "success" : "default"}
                            sx={{ fontWeight: 900 }}
                          />
                        </Stack>

                        <Grid container spacing={1.4} sx={{ mt: 1 }}>
                          <Grid item xs={12} sm={6}>
                            <DetailLine label="PPPoE" value={safe(device.pppoe_username)} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DetailLine label="WAN IP" value={safe(device.wan_ip)} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DetailLine label="Seriale" value={safe(device.serial_number)} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DetailLine label="Firmware" value={safe(device.software_version)} />
                          </Grid>
                          <Grid item xs={12}>
                            <DetailLine label="Last seen" value={dateText(device.last_seen)} />
                          </Grid>
                        </Grid>

                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<Launch />}
                          onClick={() => openRouterAccess(device.id)}
                          sx={{
                            mt: 1.8,
                            borderRadius: 2.2,
                            py: 1,
                            textTransform: "none",
                            fontWeight: 950,
                            background: "linear-gradient(135deg,#16a34a,#059669)",
                          }}
                        >
                          Apri Router
                        </Button>
                      </Box>
                    ))}

                    {selectedDetail.devices.length === 0 && (
                      <Box sx={{ p: 3, textAlign: "center", color: muted }}>
                        Nessun router ACS collegato a questo cliente.
                      </Box>
                    )}
                  </CardContent>
                </SoftCard>

                <SoftCard>
                  <CardContent sx={{ p: 2.3 }}>
                    <Typography sx={{ fontWeight: 950, mb: 1 }}>Prossimi moduli</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip icon={<Wifi />} label="WiFi" />
                      <Chip icon={<SignalWifi4Bar />} label="Internet" />
                      <Chip icon={<CloudQueueIconFallback />} label="Firmware" />
                    </Stack>
                  </CardContent>
                </SoftCard>
              </Stack>
            )}
          </>
        )}
      </Drawer>
    </Box>
  );
}

function CloudQueueIconFallback() {
  return <Router fontSize="small" />;
}
