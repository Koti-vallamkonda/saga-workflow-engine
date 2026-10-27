import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
// nodeId -> status of that node in the run that is shown
const statusesFromSteps = (steps = []) => Object.fromEntries(steps.map((s) => [s.nodeId, s.status]));
const useFlowStore = create((set, get) => ({
 nodes: [],
 edges: [],
 selectedNodeId: null,
 errors: [], // validation messages
 errorNodeIds: [], // nodes that are drawn in red after validation
 onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
 onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
 onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),
 addNode: (node) => set({ nodes: [...get().nodes, node] }),
 selectNode: (id) => set({ selectedNodeId: id }),
 updateNodeData: (id, data) =>
 set({
 nodes: get().nodes.map((n) =>
 n.id === id ? { ...n, data: { ...n.data, ...data } } : n
 ),
 }),
 setValidation: (errors, errorNodeIds) => set({ errors, errorNodeIds }),
 // --- Week 1 integration: connection to the backend ---
 tenant: 'company-a',
 apiKey: '',
 workflowId: null,
 workflowName: 'My workflow',
 workflowStatus: 'draft', // draft or active
 setAuth: (tenant, apiKey) => set({ tenant, apiKey }),
 setWorkflowMeta: (workflowId, workflowName) => set({ workflowId, workflowName }),
 setWorkflowStatus: (workflowStatus) => set({ workflowStatus }),
 loadGraph: (nodes, edges) =>
 set({
 nodes,
 edges,
 selectedNodeId: null,
 errors: [],
 errorNodeIds: [],
 execution: null,
 nodeStatuses: {},
 }),
resetCanvas: () =>
 set({
 nodes: [],
 edges: [],
 selectedNodeId: null,
 errors: [],
 errorNodeIds: [],
 workflowId: null,
 workflowName: 'My workflow',
 workflowStatus: 'draft',
 execution: null,
 nodeStatuses: {},
 }),
 // --- Week 2: runs ---
 execution: null, // the run that is shown (with its steps)
 nodeStatuses: {}, // nodeId -> step status, used to colour the nodes on the canvas
 setExecution: (execution) =>
 set({ execution, nodeStatuses: execution ? statusesFromSteps(execution.steps) : {} }),
 clearExecution: () => set({ execution: null, nodeStatuses: {} }),
}));
export default useFlowStore;