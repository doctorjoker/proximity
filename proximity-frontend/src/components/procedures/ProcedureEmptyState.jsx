import { Card, CardContent, Typography } from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";

export default function ProcedureEmptyState() {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
      <CardContent sx={{ p: 5, textAlign: "center" }}>
        <ArticleOutlinedIcon sx={{ fontSize: 48, color: "#94a3b8" }} />
        <Typography sx={{ mt: 1.5, fontSize: 20, fontWeight: 950 }}>
          Nessuna procedura trovata
        </Typography>
        <Typography sx={{ mt: 0.5, color: "#64748b" }}>
          Modifica la ricerca oppure crea una nuova procedura automatica.
        </Typography>
      </CardContent>
    </Card>
  );
}
