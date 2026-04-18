import { useEffect, useRef, useState } from 'react';
import {
  getNodeCategory,
  getNodeCategoryColor,
  isRootNode,
  Node,
  NodeCategory,
  ROOT_NODE_COLOR,
} from '../types';
import { ContextMenu } from './ContextMenu';
import {
  createStableNodePositions,
  createTreeEdgeCurve,
  type StableNodePosition,
} from '../services/graph-layout';
import { panViewport, zoomAtPoint } from '../services/graph-viewport';

interface Graph2DProps {
  nodes: Node[];
  selectedNode: Node | null;
  onNodeClick: (node: Node) => void;
  onNodeDoubleClick: (node: Node) => void;
  selectedCategories: Set<NodeCategory>;
  onToggleLock?: (nodeId: string) => void;
}

interface PointerPosition {
  x: number;
  y: number;
}

export const Graph2D = ({
  nodes,
  selectedNode,
  onNodeClick,
  onNodeDoubleClick,
  selectedCategories,
  onToggleLock,
}: Graph2DProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<StableNodePosition[]>([]);
  const [hoveredNode, setHoveredNode] = useState<StableNodePosition | null>(null);
  const [draggedNode, setDraggedNode] = useState<StableNodePosition | null>(null);
  const [panDragStart, setPanDragStart] = useState<PointerPosition | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ node: Node; x: number; y: number } | null>(null);
  const didDragViewportRef = useRef(false);
  const nodesRef = useRef(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    if (!selectedNode || positions.length === 0 || !containerRef.current) {
      return;
    }

    const targetNode = positions.find((node) => node.id === selectedNode.id);
    if (!targetNode) {
      return;
    }

    setOffset({
      x: containerRef.current.clientWidth / 2 - targetNode.x * scale,
      y: containerRef.current.clientHeight / 2 - targetNode.y * scale,
    });
  }, [positions, selectedNode]);

  const syncStableLayout = (nextNodes: Node[] = nodesRef.current) => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    setPositions(createStableNodePositions({ nodes: nextNodes, width, height }));
  };

  useEffect(() => {
    syncStableLayout(nodes);
  }, [nodes]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Filter nodes by selected domains
    const visibleNodes = positions.filter(
      (node) =>
        isRootNode(node) ||
        selectedNode?.id === node.id ||
        selectedCategories.has(getNodeCategory(node)),
    );

    // Draw connections
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    for (const node of visibleNodes) {
      if (!node.parentId) continue;

      const parent = visibleNodes.find((candidate) => candidate.id === node.parentId);
      if (!parent) continue;

      const isHighlighted =
        selectedNode && (selectedNode.id === node.id || selectedNode.id === parent.id);
      const color = isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node);

      ctx.strokeStyle = isHighlighted ? color : `${color}66`;
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.globalAlpha = 0.4;

      const curve = createTreeEdgeCurve({ child: node, parent });

      ctx.beginPath();
      ctx.moveTo(curve.start.x, curve.start.y);
      ctx.bezierCurveTo(
        curve.control1.x,
        curve.control1.y,
        curve.control2.x,
        curve.control2.y,
        curve.end.x,
        curve.end.y,
      );
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw nodes
    for (const node of visibleNodes) {
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const nodeScale = isHovered ? 1.15 : 1;
      const radius = node.radius * nodeScale;

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.shadowColor = isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node);
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      // Fill
      const fillColor = isRootNode(node)
        ? ROOT_NODE_COLOR
        : node.unlocked
          ? getNodeCategoryColor(node)
          : '#D1D5DB';

      ctx.fillStyle = fillColor;

      if (isRootNode(node)) {
        ctx.fillRect(node.x - radius, node.y - radius, radius * 2, radius * 2);
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Border
      if (node.unlocked || isRootNode(node)) {
        ctx.strokeStyle = isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node);
        ctx.lineWidth = 2;
        if (isRootNode(node)) {
          ctx.strokeRect(node.x - radius, node.y - radius, radius * 2, radius * 2);
        } else {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#111827';
      ctx.font = '500 12px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.title, node.x, node.y + radius + 4);
    }

    ctx.restore();
  }, [positions, selectedNode, hoveredNode, offset, scale, selectedCategories]);

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;

    if (draggedNode) {
      setPositions((prev) =>
        prev.map((node) =>
          node.id === draggedNode.id ? { ...node, x, y } : node
        )
      );
      setDraggedNode((prev) => (prev ? { ...prev, x, y } : null));
      return;
    }

    if (panDragStart) {
      const delta = {
        x: pointer.x - panDragStart.x,
        y: pointer.y - panDragStart.y,
      };

      if (delta.x !== 0 || delta.y !== 0) {
        didDragViewportRef.current = true;
        setOffset((previousOffset) => panViewport({ offset: previousOffset, delta }));
        setPanDragStart(pointer);
      }
      return;
    }

    const hovered = positions
      .filter(
        (node) =>
          isRootNode(node) ||
          selectedNode?.id === node.id ||
          selectedCategories.has(getNodeCategory(node)),
      )
      .find((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < node.radius;
    });

    setHoveredNode(hovered || null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (hoveredNode) {
      setDraggedNode(hoveredNode);
      return;
    }

    didDragViewportRef.current = false;
    setPanDragStart(pointer);
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setPanDragStart(null);
  };

  const handleClick = () => {
    if (didDragViewportRef.current) {
      didDragViewportRef.current = false;
      setContextMenu(null);
      return;
    }

    if (hoveredNode && !draggedNode) {
      onNodeClick(hoveredNode);
    }
    setContextMenu(null);
  };

  const handleDoubleClick = () => {
    if (hoveredNode) {
      onNodeDoubleClick(hoveredNode);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (hoveredNode) {
      setContextMenu({
        node: hoveredNode,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const nextViewport = zoomAtPoint({
      offset,
      scale,
      cursor: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
      zoomFactor,
      minScale: 0.5,
      maxScale: 2,
    });

    setOffset(nextViewport.offset);
    setScale(nextViewport.scale);
  };

  const handleMouseLeave = () => {
    setDraggedNode(null);
    setPanDragStart(null);
    setHoveredNode(null);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      setOffset({ x: 0, y: 0 });
      setScale(1);
      syncStableLayout();
    });

    resizeObserver.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    syncStableLayout();

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-white">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        className={`w-full h-full ${draggedNode || panDragStart ? 'cursor-grabbing' : hoveredNode ? 'cursor-pointer' : 'cursor-grab'}`}
      />
      {contextMenu && onToggleLock && (
        <ContextMenu
          node={contextMenu.node}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onToggleLock={onToggleLock}
          onShowInfo={onNodeClick}
        />
      )}
    </div>
  );
};
