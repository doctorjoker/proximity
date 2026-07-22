import PropTypes from "prop-types";
import { Box, Container, Stack } from "@mui/material";
import { proximityTokens } from "../../theme/proximityTheme";

export default function WorkspacePage({ children, maxWidth, disableGutters = false, sx }) {
  return (
    <Box
      component="main"
      sx={{
        minWidth: 0,
        minHeight: "100%",
        bgcolor: "background.default",
        py: proximityTokens.layout.pagePadding,
        ...sx,
      }}
    >
      <Container
        maxWidth={false}
        disableGutters={disableGutters}
        sx={{
          width: "100%",
          maxWidth: maxWidth || proximityTokens.layout.contentMaxWidth,
          px: disableGutters ? 0 : proximityTokens.layout.pagePadding,
          mx: "auto",
        }}
      >
        <Stack spacing={proximityTokens.layout.sectionGap}>{children}</Stack>
      </Container>
    </Box>
  );
}

WorkspacePage.propTypes = {
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  disableGutters: PropTypes.bool,
  sx: PropTypes.object,
};
