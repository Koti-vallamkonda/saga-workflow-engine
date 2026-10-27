import { ReactFlowProvider } from '@xyflow/react';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import ConfigPanel from './components/ConfigPanel';
import ValidatePanel from './components/ValidatePanel';
import SavePanel from './components/SavePanel';
import WorkflowList from './components/WorkflowList';
import ExecutionPanel from './components/ExecutionPanel';
export default function App() {
 return (
 <ReactFlowProvider>
 <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
 <Sidebar />
 <Canvas />
 <div style={{ width: 340, borderLeft: '1px solid #ddd', background: '#fafafa', overflowY: 'auto' }}>
 <ConfigPanel />
 <ValidatePanel />
 <SavePanel />
 <WorkflowList />
 <ExecutionPanel />
 </div>
 </div>
 </ReactFlowProvider>
 );
}
