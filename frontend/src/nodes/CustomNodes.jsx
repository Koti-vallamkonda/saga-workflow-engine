import { Handle, Position } from '@xyflow/react';
import useFlowStore from '../store/useFlowStore';
const colors = {
 trigger: '#16a34a',
 action: '#2563eb',
 condition: '#d97706',
 delay: '#7c3aed',
 end: '#dc2626',
};
function Box({ id, type, data, children }) {
 const hasError = useFlowStore((s) => s.errorNodeIds.includes(id));
 return (
 <div
 style={{
 padding: 10,
 borderRadius: 8,
 minWidth: 140,
 textAlign: 'center',
 background: '#fff',
 color: '#111',
 border: `2px solid ${hasError ? '#ef4444' : colors[type]}`,
 boxShadow: hasError ? '0 0 0 3px #fecaca' : 'none',
 }}
 >
 <strong>{data.label || type}</strong>
 {children}
 </div>
 );
}
export const TriggerNode = ({ id, data }) => (
 <Box id={id} type="trigger" data={data}>
 <Handle type="source" position={Position.Bottom} />
 </Box>
);
export const ActionNode = ({ id, data }) => (
 <Box id={id} type="action" data={data}>
 <Handle type="target" position={Position.Top} />
 <Handle type="source" position={Position.Bottom} />
 </Box>
);
export const DelayNode = ({ id, data }) => (
 <Box id={id} type="delay" data={data}>
 <Handle type="target" position={Position.Top} />
 <Handle type="source" position={Position.Bottom} />
 </Box>
);
export const EndNode = ({ id, data }) => (
 <Box id={id} type="end" data={data}>
 <Handle type="target" position={Position.Top} />
 </Box>
);
export const ConditionNode = ({ id, data }) => (
 <Box id={id} type="condition" data={data}>
 <Handle type="target" position={Position.Top} />
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6 }}>
 <span style={{ color: 'green' }}>true</span>
 <span style={{ color: 'red' }}>false</span>
 </div>
 <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} />
 <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} />
 </Box>
);
