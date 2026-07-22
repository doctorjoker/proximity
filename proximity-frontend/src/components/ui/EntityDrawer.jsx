import PropTypes from "prop-types";
import { Box, Divider, Drawer, IconButton, Stack, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export default function EntityDrawer({ open, onClose, title, subtitle, width = 560, headerActions, children, footer }) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: width }, maxWidth: "100vw" } }}
    >
      <Stack sx={{ height: "100%" }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: 2, pr: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" noWrap>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary" noWrap>{subtitle}</Typography>}
          </Box>
          {headerActions}
          <IconButton aria-label="Chiudi" onClick={onClose}><CloseRoundedIcon /></IconButton>
        </Stack>
        <Divider />
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2 }}>{children}</Box>
        {footer && <><Divider /><Box sx={{ p: 2 }}>{footer}</Box></>}
      </Stack>
    </Drawer>
  );
}

EntityDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  headerActions: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
};
