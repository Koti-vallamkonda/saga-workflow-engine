import { useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useFlowStore from '../store/useFlowStore';
import { TriggerNode, ActionNode, ConditionNode, DelayNode, EndNode } from '../nodes/CustomNodes';
import { wouldCreateCycle } from '../utils/dagValidator';
const nodeTypes = {
 trigger: TriggerNode,
 action: ActionNode,
 condition: ConditionNode,
 delay: DelayNode,
 end: EndNode,
};
export default function Canvas() {
 const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, selectNode } = useFlowStore();
 const { screenToFlowPosition } = useReactFlow();
 const onDragOver = useCallback((e) => {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 }, []);
 const onDrop = useCallback(
 (e) => {
 e.preventDefault();
 const type = e.dataTransfer.getData('application/reactflow');
 if (!type) return;
 const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
 addNode({
 id: `${type}-${Date.now()}`,
 type,
 position,
 data: { label: type.charAt(0).toUpperCase() + type.slice(1) },
 });
 },
 [screenToFlowPosition, addNode]
 );
 return (
 <div style={{ flex: 1, height: '100%' }}>
    <ReactFlow
 nodes={nodes}
 edges={edges}
 nodeTypes={nodeTypes}
 onNodesChange={onNodesChange}
 onEdgesChange={onEdgesChange}
 onConnect={onConnect}
 isValidConnection={(c) => {
 const { nodes, edges } = useFlowStore.getState();
 return !wouldCreateCycle(nodes, edges, c);
}}

 onDrop={onDrop}
 onDragOver={onDragOver}
 onNodeClick={(_, node) => selectNode(node.id)}
 onPaneClick={() => selectNode(null)}
 fitView
 >
 <Background />
 <Controls />
 <MiniMap />
 </ReactFlow>
 </div>
 );
}

 