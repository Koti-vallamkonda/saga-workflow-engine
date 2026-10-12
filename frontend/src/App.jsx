import { ReactFlowProvider } from '@xyflow/react';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import ConfigPanel from './components/ConfigPanel';
export default function App() {
 return (
 <ReactFlowProvider>
 <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
 <Sidebar />
 <Canvas />
 <div style={{ width: 260, borderLeft: '1px solid #ddd', background: '#fafafa' }}>
 <ConfigPanel />
 </div>
 </div>
 </ReactFlowProvider>
 );
}
