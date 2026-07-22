import PropTypes from "prop-types";
import { Button } from "@mui/material";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

export default function QuickActionGrid({ actions = [] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
      {actions.map((action) => {
        const Icon = action.icon || GridViewRoundedIcon;
        return (
          <Button
            key={action.label}
            variant="outlined"
            startIcon={<Icon />}
            onClick={action.onClick}
            sx={{ justifyContent: "flex-start", minHeight: 46, px: 1.5, textTransform: "none", fontWeight: 750 }}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

QuickActionGrid.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired, icon: PropTypes.elementType, onClick: PropTypes.func })),
};
