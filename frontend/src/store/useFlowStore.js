import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
const useFlowStore = create((set, get) => ({
    nodes: [],
 edges: [],
 selectedNodeId: null,
 errors: [], // Member 4 will use this for validation
 errorNodeIds: [], // Member 4 will use this for validation
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
}));
export default useFlowStore;