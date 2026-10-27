import { useEffect, useState } from 'react';
import useFlowStore from '../store/useFlowStore';
import { startExecution, getExecution, listExecutions, sendEvent } from '../api/executionApi';
const FINAL = ['completed', 'failed', 'compensated', 'compensation_failed'];
const COLORS = {
 pending: '#6b7280',
 running: '#2563eb',
 completed: '#16a34a',
 failed: '#dc2626',
 compensating: '#d97706',
 compensated: '#d97706',
 compensation_failed: '#7f1d1d',
};
function Badge({ status }) {
 return (
 <span
 style={{
 background: COLORS[status] || '#6b7280',
 color: '#fff',
 borderRadius: 10,
 padding: '1px 8px',
 fontSize: 11,
 whiteSpace: 'nowrap',
 }}
 >
 {String(status).replace(/_/g, ' ')}
 </span>
 );
}
export default function ExecutionPanel() {
 const { tenant, apiKey, workflowId, execution, setExecution } = useFlowStore();
 const [inputText, setInputText] = useState('{\n "orderId": "A-1001"\n}');
 const [eventType, setEventType] = useState('order.created'
     const [eventText, setEventText] = useState('{\n "orderId": "E-1"\n}');
 const [runs, setRuns] = useState([]);
 const [message, setMessage] = useState('');
 const auth = { tenant, apiKey };
 const executionId = execution ? execution._id : null;
 const status = execution ? execution.status : null;
 // keep asking the server until the run is finished
 useEffect(() => {
 if (!executionId || FINAL.includes(status)) return undefined;
 const timer = setInterval(async () => {
 try {
 setExecution(await getExecution({ tenant, apiKey }, executionId));
 } catch (err) {
 setMessage(err.message);
 clearInterval(timer);
 }
 }, 1200);
 return () => clearInterval(timer);
 }, [executionId, status, tenant, apiKey, setExecution]);
 const parseJson = (text, name) => {
 try {
 return { value: text.trim() ? JSON.parse(text) : {} };
 } catch {
 return { error: `${name} is not valid JSON` };
 }
 };
 const run = async () => {
 setMessage('');
 const input = parseJson(inputText, 'The input');
 if (input.error) {
 setMessage(input.error);
 return;
 }
 try {
 const started = await startExecution(auth, workflowId, input.value);
 setExecution(await getExecution(auth, started.executionId));
 } catch (err) {
 setMessage(err.message);
 }
 };
 const refreshRuns = async () => {
 try {
 setRuns(await listExecutions(auth, workflowId));
 } catch (err) {
 setMessage(err.message);
 }
 };
 const openRun = async (id) => {
 try {
 setExecution(await getExecution(auth, id));
 } catch (err) {
 setMessage(err.message);
 }
 };
 const send = async () => {
 setMessage('');
 const payload = parseJson(eventText, 'The payload');
 if (payload.error) {
 setMessage(payload.error);
 return;
 }
 try {
 const res = await sendEvent(auth, eventType, payload.value);
 setMessage(`Event received (${res.id}). Matching active workflows start by themselves.`);
 setTimeout(refreshRuns, 2500);
 } catch (err) {
 setMessage(err.message);
 }
 };
 const field = { width: '100%', boxSizing: 'border-box', padding: 6, fontFamily: 'monospace', fontSize: 12 };
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
 <strong>Run</strong>
 <small>Input for the run (JSON)</small>
 <textarea style={field} rows={3} value={inputText} onChange={(e) => setInputText(e.target.value)} />
 <button
 onClick={run}
 disabled={!workflowId || !apiKey}
 style={{ padding: 8, cursor: workflowId && apiKey ? 'pointer' : 'not-allowed' }}
 >
 Run workflow
 </button>
 {(!workflowId || !apiKey) && <small>Save the workflow and enter the API key first.</small>}
 {execution && (
 <div style={{ borderTop: '1px solid #eee', paddingTop: 6 }}>
 <div>
 <Badge status={execution.status} /> <small>{execution.workflowName}</small>
 </div>
 {execution.error && (
 <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>{execution.error}</div>
 )}
 <ol style={{ paddingLeft: 18, fontSize: 12 }}>
 {execution.steps.map((s) => (
 <li key={s.nodeId} style={{ marginBottom: 4 }}>
 {s.label} <Badge status={s.status} />
 {s.error && <div style={{ color: '#b91c1c' }}>{s.error}</div>}
 {s.compensation && s.compensation.status !== 'pending' && (
 <div>
 undo: {s.compensation.status} (attempts: {s.compensation.attempts})
 {s.compensation.error ? ` - ${s.compensation.error}` : ''}
 </div>
 )}
 </li>
 ))}
 </ol>
 </div>
 )}
<button onClick={refreshRuns} style={{ padding: 6, cursor: 'pointer' }}>
 Recent runs
 </button>
 <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12 }}>
 {runs.map((r) => (
 <li key={r._id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '2px 0' }}>
 <Badge status={r.status} />
 <span
 style={{ cursor: 'pointer', flex: 1 }}
 onClick={() => openRun(r._id)}
 title="Click to show on the canvas"
 >
 {r.workflowName} {r.trigger && r.trigger.type === 'event' ? '(event)' : ''}
 </span>
 </li>
 ))}
 </ul>
 <strong style={{ marginTop: 8 }}>Send a test event</strong>
 <input
 style={field}
 value={eventType}
 onChange={(e) => setEventType(e.target.value)}
 placeholder="order.created"
 />
 <textarea style={field} rows={3} value={eventText} onChange={(e) => setEventText(e.target.value)} />
 <button
 onClick={send}
 disabled={!apiKey}
 style={{ padding: 6, cursor: apiKey ? 'pointer' : 'not-allowed' }}
 >
 Send event
 </button>
 {message && <small>{message}</small>}
 </div>
 );
}