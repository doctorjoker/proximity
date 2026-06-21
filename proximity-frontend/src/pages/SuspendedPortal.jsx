import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import TelegramIcon from "@mui/icons-material/Telegram";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";

export default function SuspendedPortal() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #1e88e5 0, #0b1727 38%, #050914 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 6,
      }}
    >
      <Card
        sx={{
          maxWidth: 720,
          width: "100%",
          borderRadius: 5,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <Box
          sx={{
            p: 4,
            color: "white",
            background: "linear-gradient(135deg, #1976d2, #00acc1)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <WifiOffRoundedIcon sx={{ fontSize: 36 }} />
            </Box>

            <Box>
              <Typography variant="h4" fontWeight={900}>
                Benvenuto in Speednet
              </Typography>
              <Typography sx={{ opacity: 0.9 }}>
                Assistenza clienti e gestione servizio
              </Typography>
            </Box>
          </Stack>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Chip
            label="Servizio momentaneamente sospeso"
            color="warning"
            sx={{ fontWeight: 800, mb: 2 }}
          />

          <Typography variant="h5" fontWeight={800} gutterBottom>
            La tua connessione è temporaneamente limitata
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
            Il servizio associato alla tua linea risulta momentaneamente
            sospeso. Per ricevere informazioni, verificare lo stato del
            contratto o richiedere assistenza, puoi contattare Speednet tramite
            i canali disponibili.
          </Typography>

          <Box
            sx={{
              my: 3,
              p: 3,
              borderRadius: 4,
              bgcolor: "#eef6ff",
              border: "1px solid #c9def7",
            }}
          >
            <Typography variant="h6" fontWeight={900} gutterBottom>
              Hai bisogno di assistenza?
            </Typography>

            <Typography sx={{ mb: 0.8 }}>
              📞 Telefono: <strong>+39 0864 577798</strong>
            </Typography>

            <Typography sx={{ mb: 0.8 }}>
              🤖 Telegram: <strong>Speednet Assistenza</strong>
            </Typography>

            <Typography>
              ✉️ Email: <strong>assistenza@speednetwifi.it</strong>
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Button
              size="large"
              variant="contained"
              startIcon={<PhoneRoundedIcon />}
              href="tel:+390864577798"
              sx={{ borderRadius: 3, py: 1.3, fontWeight: 900 }}
            >
              Chiama Speednet — 0864 577798
            </Button>

            <Button
              size="large"
              variant="outlined"
              startIcon={<TelegramIcon />}
              href="https://t.me/novaspace_support_bot"
              target="_blank"
              sx={{ borderRadius: 3, py: 1.3, fontWeight: 900 }}
            >
              Apri Speednet Assistenza
            </Button>
            
            <Typography variant="caption" color="text.secondary">
            Se la chat Telegram è già aperta, premi Avvia oppure scrivi /start per visualizzare il menu assistenza.
            </Typography>

            <Button
              size="large"
              variant="outlined"
              startIcon={<EmailRoundedIcon />}
              href="mailto:assistenza@speednetwifi.it"
              sx={{ borderRadius: 3, py: 1.3, fontWeight: 900 }}
            >
              Scrivi a assistenza@speednetwifi.it
            </Button>
          </Stack>

          <Box
            sx={{
              mt: 4,
              p: 2,
              borderRadius: 3,
              bgcolor: "#f5f7fb",
              border: "1px solid #e3e8ef",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Questa pagina è raggiungibile anche con servizio sospeso per
              permetterti di contattare Speednet e risolvere rapidamente la
              situazione.
            </Typography>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 3 }}
          >
            Speednet WiFi · powered by Proximity by NOVASpace
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
