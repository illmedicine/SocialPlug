import { useState, useRef, useCallback, useEffect } from 'react';
import WorkflowNode from './WorkflowNode';
import { getBlockDefinition } from './WorkflowBlocks';

/**
 * SVG-based connection renderer between nodes.
 */
function ConnectionLines({ connections, nodes, platformKey }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" fill="#94a3b8">
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
        <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" fill="#22c55e">
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
        <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" fill="#ef4444">
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
      </defs>
      {connections.map((conn, i) => {
        const fromNode = nodes.find((n) => n.id === conn.from);
        const toNode = nodes.find((n) => n.id === conn.to);
        if (!fromNode || !toNode) return null;

        const fromDef = getBlockDefinition(platformKey, fromNode.type);
        const isBranch = fromDef?.hasBranches;

        // Calculate approximate node width/height for center positioning
        const fromCenterX = fromNode.x + 130;
        const fromBottomY = fromNode.y + 70;
        const toCenterX = toNode.x + 130;
        const toTopY = toNode.y;

        let startX = fromCenterX;
        let strokeColor = '#94a3b8';
        let markerEnd = 'url(#arrowhead)';
        let label = null;

        if (isBranch && conn.branch === 'true') {
          startX = fromNode.x + 78;
          strokeColor = '#22c55e';
          markerEnd = 'url(#arrowhead-green)';
          label = 'True';
        } else if (isBranch && conn.branch === 'false') {
          startX = fromNode.x + 182;
          strokeColor = '#ef4444';
          markerEnd = 'url(#arrowhead-red)';
          label = 'False';
        }

        const midY = (fromBottomY + toTopY) / 2;

        return (
          <g key={i}>
            <path
              d={`M ${startX} ${fromBottomY} C ${startX} ${midY}, ${toCenterX} ${midY}, ${toCenterX} ${toTopY}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeDasharray={conn.branch ? '0' : '0'}
              markerEnd={markerEnd}
            />
            {label && (
              <text
                x={(startX + toCenterX) / 2}
                y={midY - 8}
                textAnchor="middle"
                className="text-[10px] font-bold"
                fill={strokeColor}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The main interactive canvas where workflow nodes are placed and connected.
 */
export default function WorkflowCanvas({
  nodes,
  connections,
  platformKey,
  onNodesChange,
  onConnectionsChange,
  onSelectNode,
  selectedNodeId,
}) {
  const canvasRef = useRef(null);
  const [dragState, setDragState] = useState(null); // { nodeId, offsetX, offsetY }
  const [connectFrom, setConnectFrom] = useState(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleDragStart = useCallback((e, nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDragState({
      nodeId,
      offsetX: e.clientX - node.x + canvasOffset.x,
      offsetY: e.clientY - node.y + canvasOffset.y,
    });
  }, [nodes, canvasOffset]);

  const handleMouseMove = useCallback((e) => {
    if (dragState) {
      const newX = e.clientX - dragState.offsetX + canvasOffset.x;
      const newY = e.clientY - dragState.offsetY + canvasOffset.y;
      const updated = nodes.map((n) =>
        n.id === dragState.nodeId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
      );
      onNodesChange(updated);
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setCanvasOffset({ x: canvasOffset.x - dx, y: canvasOffset.y - dy });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [dragState, nodes, onNodesChange, isPanning, panStart, canvasOffset]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setIsPanning(false);
  }, []);

  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.closest('[data-canvas-bg]')) {
      onSelectNode(null);
      setConnectFrom(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleStartConnect = (nodeId) => {
    setConnectFrom(nodeId);
  };

  const handleCompleteConnect = (toNodeId) => {
    if (connectFrom && connectFrom !== toNodeId) {
      const exists = connections.some((c) => c.from === connectFrom && c.to === toNodeId);
      if (!exists) {
        const fromNode = nodes.find((n) => n.id === connectFrom);
        const fromDef = getBlockDefinition(platformKey, fromNode?.type);
        if (fromDef?.hasBranches) {
          const hasTrueBranch = connections.some((c) => c.from === connectFrom && c.branch === 'true');
          const branch = hasTrueBranch ? 'false' : 'true';
          onConnectionsChange([...connections, { from: connectFrom, to: toNodeId, branch }]);
        } else {
          onConnectionsChange([...connections, { from: connectFrom, to: toNodeId }]);
        }
      }
    }
    setConnectFrom(null);
  };

  const handleDeleteNode = (nodeId) => {
    onNodesChange(nodes.filter((n) => n.id !== nodeId));
    onConnectionsChange(connections.filter((c) => c.from !== nodeId && c.to !== nodeId));
    if (selectedNodeId === nodeId) onSelectNode(null);
  };

  const handleUpdateNode = (nodeId, updatedNode) => {
    onNodesChange(nodes.map((n) => (n.id === nodeId ? updatedNode : n)));
  };

  // Handle drop from palette
  const handleDrop = (e) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('blockType');
    if (!blockType) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + canvasOffset.x;
    const y = e.clientY - rect.top + canvasOffset.y;

    const blockDef = getBlockDefinition(platformKey, blockType);
    if (!blockDef) return;

    // Enforce single authenticate node
    if (blockDef.isRoot && nodes.some((n) => n.type === 'authenticate')) {
      return;
    }

    const newNode = {
      id: `node-${Date.now()}`,
      type: blockType,
      label: blockDef.label,
      x: Math.max(0, x - 90),
      y: Math.max(0, y - 30),
      config: {},
    };

    onNodesChange([...nodes, newNode]);
    onSelectNode(newNode.id);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={canvasRef}
      className={`relative flex-1 overflow-hidden bg-gray-50 ${connectFrom ? 'cursor-crosshair' : ''}`}
      onMouseDown={handleCanvasMouseDown}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}
    >
      {/* Connection lines */}
      <div className="absolute inset-0" style={{ transform: `translate(${-canvasOffset.x}px, ${-canvasOffset.y}px)` }}>
        <ConnectionLines connections={connections} nodes={nodes} platformKey={platformKey} />

        {/* Nodes */}
        {nodes.map((node) => (
          <WorkflowNode
            key={node.id}
            node={node}
            platformKey={platformKey}
            isSelected={selectedNodeId === node.id}
            onSelect={onSelectNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onDragStart={handleDragStart}
            connectMode={!!connectFrom}
            onStartConnect={handleStartConnect}
            onCompleteConnect={handleCompleteConnect}
          />
        ))}
      </div>

      {/* Connect mode indicator */}
      {connectFrom && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-4 py-1.5 rounded-full shadow-lg z-50 animate-pulse">
          Click a target node to connect — or click canvas to cancel
        </div>
      )}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-10">⚡</div>
            <p className="text-gray-400 text-sm">Drag blocks from the palette to start building your workflow</p>
          </div>
        </div>
      )}
    </div>
  );
}
