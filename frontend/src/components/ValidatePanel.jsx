import { useState } from 'react';
import useFlowStore from '../store/useFlowStore';
import { validateGraph, buildExecutionGraph } from '../utils/dagValidator';
export default function ValidatePanel() {
 const { nodes, edges, errors, setValidation } = useFlowStore();
 const [json, setJson] = useState('');
 const [checked, setChecked] = useState(false);
 const run = () => {
 const result = validateGraph(nodes, edges);
 setValidation(result.errors, result.errorNodeIds);
 setJson(result.valid ? JSON.stringify(buildExecutionGraph(nodes, edges), null, 2) : '');
 setChecked(true);
 };
 return (
 <div style={{ padding: 12, borderTop: '1px solid #ddd' }}>
 <button onClick={run} style={{ width: '100%', padding: 8 }}>Validate workflow</button>
 {checked && errors.length === 0 && <p style={{ color: 'green' }}>Graph is valid</p>}
 {errors.length > 0 && (
 <ul style={{ color: '#b91c1c', fontSize: 13, paddingLeft: 18 }}>
 {errors.map((e, i) => <li key={i}>{e}</li>)}
 </ul>
 )}
 {json && (
 <pre style={{ fontSize: 11, maxHeight: 200, overflow: 'auto',
 background: '#fff', padding: 6 }}>
 {json}
 </pre>
 )}
 </div>
 );
}
