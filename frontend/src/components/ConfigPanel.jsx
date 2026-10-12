import useFlowStore from '../store/useFlowStore';
export default function ConfigPanel() {
 const { nodes, selectedNodeId, updateNodeData } = useFlowStore();
 const node = nodes.find((n) => n.id === selectedNodeId);
 if (!node) return <div style={{ padding: 12 }}>Select a node</div>;
 const d = node.data || {};
 const set = (key) => (e) => updateNodeData(node.id, { [key]: e.target.value });
 return (
 <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
 <h4 style={{ textTransform: 'capitalize' }}>{node.type} node</h4>
 <label>
 Label
 <input value={d.label || ''} onChange={set('label')} />
 </label>
 {node.type === 'action' && (
 <>
 <label>
 URL
 <input value={d.url || ''} onChange={set('url')} placeholder="https://api.example.com" />
 </label>
 <label>
 Method
 <select value={d.method || 'GET'} onChange={set('method')}>
 <option>GET</option>
 <option>POST</option>
 </select>
 </label>
 </>
 )}
 {node.type === 'condition' && (
 <label>
 Expression
 <input value={d.expression || ''} onChange={set('expression')} placeholder="status === 200" />
 </label>
 )}
 {node.type === 'delay' && (
 <label>
 Seconds
 <input type="number" value={d.seconds || ''} onChange={set('seconds')} />
 </label>
 )}
 </div>
 );
}
