const items = ['trigger', 'action', 'condition', 'delay', 'end'];
export default function Sidebar() {
 const onDragStart = (e, type) => {
 e.dataTransfer.setData('application/reactflow', type);
 e.dataTransfer.effectAllowed = 'move';
 };
 return (
 <div style={{ width: 180, padding: 12, borderRight: '1px solid #ddd', background: '#fafafa' }}>
 <h4>Nodes</h4>
 <p style={{ fontSize: 12 }}>Drag onto the canvas</p>
 {items.map((type) => (
 <div
 key={type}
 draggable
 onDragStart={(e) => onDragStart(e, type)}
 style={{
 padding: 8,
 margin: '8px 0',
 border: '1px solid #aaa',
 borderRadius: 6,
 cursor: 'grab',
 background: '#fff',
 textTransform: 'capitalize',
 }}
 >
 {type}
 </div>
 ))}
 </div>
 );
}