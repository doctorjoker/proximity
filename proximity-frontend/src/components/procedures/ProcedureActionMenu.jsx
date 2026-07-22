import { useState } from "react";
import { IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

export default function ProcedureActionMenu({ onPreview, onOpen, onVersions, onVerify }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const run = (handler) => {
    setAnchorEl(null);
    handler?.();
  };

  return (
    <>
      <Tooltip title="Altre azioni">
        <IconButton size="small" onClick={(event) => { event.stopPropagation(); setAnchorEl(event.currentTarget); }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MenuItem onClick={() => run(onPreview)}>Consulta nel Drawer360</MenuItem>
        <MenuItem onClick={() => run(onOpen)}>Apri dettaglio completo</MenuItem>
        <MenuItem onClick={() => run(onVersions)}>Gestisci versioni</MenuItem>
        <MenuItem disabled={!onVerify} onClick={() => run(onVerify)}>Verifica procedura</MenuItem>
      </Menu>
    </>
  );
}
