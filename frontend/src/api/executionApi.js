import { request } from './workflowApi';
// start a run of a saved workflow
export const startExecution = (auth, workflowId, input) =>
 request('/api/executions', { ...auth, method: 'POST', body: { workflowId, input } });
// one run with all its steps
export const getExecution = (auth, id) => request(`/api/executions/${id}`, auth);
// the latest runs (optionally only the runs of one workflow)
export const listExecutions = (auth, workflowId) =>
 request(`/api/executions${workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : ''}`, auth);
// send an event: active workflows that listen for this type start by themselves
export const sendEvent = (auth, type, payload) =>
 request('/api/events', { ...auth, method: 'POST', body: { type, payload } });