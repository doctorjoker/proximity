import { Card, CardContent, Stack, Typography } from "@mui/material";

export default function KpiCard({
  title,
  value,
  icon,
  color = "#2563eb",
  subtitle,
}) {
  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 3,
        height: "100%",
        minHeight: 108,
        transition: "0.2s",
        borderTop: `4px solid ${color}`,
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 6,
        },
      }}
    >
      <CardContent
        sx={{
          py: 2,
          px: 2.5,
          "&:last-child": {
            pb: 2,
          },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Stack spacing={0.4}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {title}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color,
                lineHeight: 1,
              }}
            >
              {value}
            </Typography>

            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {subtitle}
              </Typography>
            )}
          </Stack>

          {icon}
        </Stack>
      </CardContent>
    </Card>
  );
}
