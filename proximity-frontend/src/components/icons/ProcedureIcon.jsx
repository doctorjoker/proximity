import ProximityIconWrapper from './ProximityIconWrapper';
import { procedureIconRegistry } from './procedureIconRegistry';
export default function ProcedureIcon({category}){
 const Icon=procedureIconRegistry[category]||procedureIconRegistry.OTHER;
 return <ProximityIconWrapper><Icon size={20} stroke={1.8}/></ProximityIconWrapper>;
}
