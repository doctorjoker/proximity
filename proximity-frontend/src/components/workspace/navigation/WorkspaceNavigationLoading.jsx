import { Box, Skeleton, Stack } from '@mui/material'
export default function WorkspaceNavigationLoading() { return <Stack spacing={1} sx={{ p: 1.5 }}>{[1,2,3,4,5].map((item) => <Box key={item}><Skeleton variant="rounded" height={42} /></Box>)}</Stack> }
