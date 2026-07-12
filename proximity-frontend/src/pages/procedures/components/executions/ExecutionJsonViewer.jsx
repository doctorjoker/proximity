import { useState } from "react";
import { Alert, Box, Button, Collapse, Paper, Stack, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

function stringify(value) {
  if (value === null || value === undefined) return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ExecutionJsonViewer({ title, value, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const content = stringify(value);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.4 }}>
        <Typography fontWeight={900}>{title}</Typography>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopy}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            Copia
          </Button>
          <Button
            size="small"
            startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setExpanded((value) => !value)}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {expanded ? "Comprimi" : "Espandi"}
          </Button>
        </Stack>
      </Stack>

      {copied && <Alert severity="success" sx={{ borderRadius: 0 }}>JSON copiato negli appunti.</Alert>}

      <Collapse in={expanded}>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "rgba(8,18,35,0.04)",
            maxHeight: 440,
            overflow: "auto",
            fontSize: 12.5,
            lineHeight: 1.55,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content}
        </Box>
      </Collapse>
    </Paper>
  );
}
