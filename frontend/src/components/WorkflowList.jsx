import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import useFlowStore from '../store/useFlowStore';
import { listWorkflows, deleteWorkflow } from '../api/workflowApi';
export default function WorkflowList() {
 const {
 tenant, apiKey, workflowId, loadGraph, setWorkflowMeta, setWorkflowStatus, resetCanvas,
 } = useFlowStore();
 const { fitView } = useReactFlow();
 const [items, setItems] = useState([]);
 const [message, setMessage] = useState('');
 const refresh = async () => {
 setMessage('');
 try {
 const data = await listWorkflows({ tenant, apiKey });
 setItems(data);
 if (data.length === 0) setMessage('No saved workflows yet');
 } catch (err) {
 setMessage(err.message);
 }
 };
 const open = (workflow) => {
 loadGraph(workflow.nodes, workflow.edges);
 setWorkflowMeta(workflow._id, workflow.name);
 setWorkflowStatus(workflow.status || 'draft');
 setTimeout(() => fitView({ padding: 0.2 }), 50);
 };
 const remove = async (workflow) => {
 if (!window.confirm(`Delete "${workflow.name}"?`)) return;
 try {
 await deleteWorkflow({ tenant, apiKey }, workflow._id);
 setItems((list) => list.filter((w) => w._id !== workflow._id));
 if (workflow._id === workflowId) resetCanvas();
 } catch (err) {
 setMessage(err.message);
 }
 };
 return (
 <div style={{ padding: 12, borderTop: '1px solid #ddd' }}>
 <strong>Saved workflows</strong>
 <button onClick={refresh} style={{ width: '100%', padding: 6, margin: '6px 0', cursor: 'pointer' }}>
 Load saved workflows
 </button>
 {message && <small>{message}</small>}
 <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
 {items.map((w) => (
 <li
 key={w._id}
 style={{
 display: 'flex',
 justifyContent: 'space-between',
 gap: 6,
 padding: '4px 0',
 fontWeight: w._id === workflowId ? 'bold' : 'normal',
 }}
 >
 <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => open(w)} title="Click to open">
 {w.name} {w.status === 'active' ? '(active)' : ''}
 </span>
 <button onClick={() => remove(w)} title="Delete">x</button>
 </li>
 ))}
 </ul>
 </div>
 );
}
