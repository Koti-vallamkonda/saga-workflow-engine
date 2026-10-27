import { useState } from 'react';
import useFlowStore from '../store/useFlowStore';
import { validateGraph } from '../utils/dagValidator';
import { createWorkflow, updateWorkflow, toPayload } from '../api/workflowApi';
export default function SavePanel() {
 const {
 nodes, edges, tenant, apiKey, workflowId, workflowName, workflowStatus,
 setAuth, setWorkflowMeta, setWorkflowStatus, setValidation, resetCanvas,
 } = useFlowStore();
 const [message, setMessage] = useState('');
 const [details, setDetails] = useState([]);
 const [busy, setBusy] = useState(false);
 const save = async () => {
 setMessage('');
 setDetails([]);
 if (!tenant || !apiKey) {
 setMessage('Enter the tenant slug and the API key first');
 return;
 }
 // check in the browser first, so the user gets instant feedback
 const result = validateGraph(nodes, edges);
 setValidation(result.errors, result.errorNodeIds);
 if (!result.valid) {
 setMessage('Fix the validation errors before saving');
 return;
 }
 setBusy(true);
 try {
 const auth = { tenant, apiKey };
 const payload = toPayload(workflowName, nodes, edges);
 const saved = workflowId
 ? await updateWorkflow(auth, workflowId, payload)
 : await createWorkflow(auth, payload);
 setWorkflowMeta(saved._id, saved.name);
 setWorkflowStatus(saved.status);
 setMessage(workflowId ? 'Workflow updated' : 'Workflow saved');
 } catch (err) {
 setMessage(err.message);
 setDetails(err.details || []);
 } finally {
 setBusy(false);
 }
 };
 // an active workflow reacts to events. A draft does not.
 const toggleActive = async () => {
 setMessage('');
 setDetails([]);
 const next = workflowStatus === 'active' ? 'draft' : 'active';
 try {
 const saved = await updateWorkflow({ tenant, apiKey }, workflowId, { status: next });
 setWorkflowStatus(saved.status);
 setMessage(
 next === 'active'
 ? 'Workflow is active: it now reacts to events'
 : 'Workflow is a draft again'
 );
 } catch (err) {
 setMessage(err.message);
 setDetails(err.details || []);
 }
 };
 const field = { width: '100%', boxSizing: 'border-box', padding: 6 };
 return (
 <div
 style={{
 padding: 12,
 borderTop: '1px solid #ddd',
 display: 'flex',
 flexDirection: 'column',
 gap: 6,
 }}
 >
 <strong>Save to server</strong>
 <input
 style={field}
 value={tenant}
 onChange={(e) => setAuth(e.target.value, apiKey)}
 placeholder="tenant slug (company-a)"
 />
 <input
 style={field}
 type="password"
 value={apiKey}
 onChange={(e) => setAuth(tenant, e.target.value)}
 placeholder="API key (wfk_...)"
 />
 <input
 style={field}
 value={workflowName}
 onChange={(e) => setWorkflowMeta(workflowId, e.target.value)}
 placeholder="workflow name"
 />
 <button onClick={save} disabled={busy} style={{ padding: 8, cursor: 'pointer' }}>
 {busy ? 'Saving...' : workflowId ? 'Update workflow' : 'Save workflow'}
 </button>
 {workflowId && (
 <button onClick={toggleActive} style={{ padding: 6, cursor: 'pointer' }}>
 {workflowStatus === 'active' ? 'Deactivate (back to draft)' : 'Activate (react to events)'}
 </button>
 )}
 <button onClick={resetCanvas} style={{ padding: 6, cursor: 'pointer' }}>
 New workflow
 </button>
 {workflowId && <small>Status: {workflowStatus}</small>}
 {message && <small>{message}</small>}
 {details.length > 0 && (
 <ul style={{ color: '#b91c1c', fontSize: 12, paddingLeft: 16, margin: 0 }}>
 {details.map((d, i) => (
 <li key={i}>{d}</li>
 ))}
 </ul>
 )}
 </div>
 );
}