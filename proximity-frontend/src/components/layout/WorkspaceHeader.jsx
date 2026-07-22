import PropTypes from "prop-types";
import { Box, Breadcrumbs, Button, Paper, Stack, Typography } from "@mui/material";

function HeaderAction({ action }) {
  const Icon = action.icon;
  return (
    <Button
      variant={action.variant || "outlined"}
      color={action.color || "primary"}
      startIcon={Icon ? <Icon /> : undefined}
      onClick={action.onClick}
      disabled={action.disabled}
      sx={{ whiteSpace: "nowrap" }}
    >
      {action.label}
    </Button>
  );
}

HeaderAction.propTypes = {
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    variant: PropTypes.oneOf(["text", "outlined", "contained"]),
    color: PropTypes.string,
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
  }).isRequired,
};

export default function WorkspaceHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  breadcrumbs = [],
  actions = [],
  meta,
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, boxShadow: "none" }}>
      <Stack spacing={1.5}>
        {breadcrumbs.length > 0 && (
          <Breadcrumbs aria-label="breadcrumb" sx={{ color: "text.secondary", fontSize: 13 }}>
            {breadcrumbs.map((item, index) => (
              <Typography
                key={`${item.label}-${index}`}
                component={item.onClick ? "button" : "span"}
                onClick={item.onClick}
                color={index === breadcrumbs.length - 1 ? "text.primary" : "inherit"}
                sx={{
                  border: 0,
                  p: 0,
                  bgcolor: "transparent",
                  cursor: item.onClick ? "pointer" : "default",
                  font: "inherit",
                  fontWeight: index === breadcrumbs.length - 1 ? 700 : 500,
                }}
              >
                {item.label}
              </Typography>
            ))}
          </Breadcrumbs>
        )}

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
            {Icon && (
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 1.5,
                  color: "primary.main",
                  bgcolor: "primary.50",
                  border: "1px solid",
                  borderColor: "divider",
                  flex: "0 0 auto",
                }}
              >
                <Icon />
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              {eyebrow && (
                <Typography
                  variant="overline"
                  color="primary.main"
                  sx={{ display: "block", fontWeight: 800, letterSpacing: ".09em", lineHeight: 1.4 }}
                >
                  {eyebrow}
                </Typography>
              )}
              <Typography variant="h4" component="h1">{title}</Typography>
              {description && (
                <Typography color="text.secondary" sx={{ mt: 0.6, maxWidth: 880 }}>
                  {description}
                </Typography>
              )}
              {meta && <Box sx={{ mt: 1 }}>{meta}</Box>}
            </Box>
          </Stack>

          {actions.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignSelf={{ xs: "stretch", md: "flex-start" }}>
              {actions.map((action) => <HeaderAction key={action.key || action.label} action={action} />)}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

WorkspaceHeader.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  icon: PropTypes.elementType,
  breadcrumbs: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired, onClick: PropTypes.func })),
  actions: PropTypes.array,
  meta: PropTypes.node,
};
