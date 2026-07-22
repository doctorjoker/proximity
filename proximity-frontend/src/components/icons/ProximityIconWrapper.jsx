import { Box } from '@mui/material';
export default function ProximityIconWrapper({children,color='primary.main'}){
 return <Box sx={{width:42,height:42,borderRadius:2.5,bgcolor:'rgba(37,99,235,.08)',border:'1px solid',borderColor:'divider',display:'grid',placeItems:'center',color}}>{children}</Box>;
}
