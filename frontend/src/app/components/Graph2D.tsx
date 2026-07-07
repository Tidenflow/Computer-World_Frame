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

const LABEL_FONT = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const ROOT_LABEL_FONT = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

function getCanvasScale() {
  return typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
}

function shouldShowNodeLabel({
  node,
  selectedNode,
  hoveredNode,
}: {
  node: StableNodePosition;
  selectedNode: Node | null;
  hoveredNode: StableNodePosition | null;
}) {
  return (
    isRootNode(node) ||
    node.parentId === selectedNode?.id ||
    selectedNode?.parentId === node.parentId ||
    selectedNode?.id === node.id ||
    hoveredNode?.id === node.id
  );
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawNodeLabel(ctx: CanvasRenderingContext2D, node: StableNodePosition, radius: number) {
  const text = node.title;
  const font = isRootNode(node) ? ROOT_LABEL_FONT : LABEL_FONT;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const paddingX = 7;
  const labelWidth = Math.ceil(metrics.width + paddingX * 2);
  const labelHeight = 22;
  const labelX = node.x - labelWidth / 2;
  const labelY = node.y + radius + 7;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 6);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, node.x, labelY + labelHeight / 2 + 0.5);
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

    const scaleFactor = getCanvasScale();
    const width = canvas.width / scaleFactor;
    const height = canvas.height / scaleFactor;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Filter nodes by selected domains
    const visibleNodes = positions.filter(
      (node) =>
        isRootNode(node) ||
        selectedNode?.id === node.id ||
        selectedCategories.has(getNodeCategory(node)),
    );

    // Draw connections
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    for (const node of visibleNodes) {
      if (!node.parentId) continue;

      const parent = visibleNodes.find((candidate) => candidate.id === node.parentId);
      if (!parent) continue;

      const isHighlighted =
        selectedNode &&
        (selectedNode.id === node.id ||
          selectedNode.id === parent.id ||
          selectedNode.parentId === node.id ||
          selectedNode.parentId === parent.id);
      const color = isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node);

      ctx.strokeStyle = isHighlighted ? color : `${color}66`;
      ctx.lineWidth = isHighlighted ? 2.2 : 1;
      ctx.globalAlpha = selectedNode ? (isHighlighted ? 0.8 : 0.18) : 0.34;

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
      const isNeighbor =
        selectedNode &&
        (selectedNode.parentId === node.id ||
          node.parentId === selectedNode.id ||
          (selectedNode.parentId && selectedNode.parentId === node.parentId));
      const isDimmed = Boolean(selectedNode && !isSelected && !isHovered && !isNeighbor && !isRootNode(node));
      const nodeScale = isHovered ? 1.15 : 1;
      const radius = node.radius * nodeScale;

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.shadowColor = isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node);
        ctx.shadowBlur = isSelected ? 18 : 12;
      } else {
        ctx.shadowBlur = 0;
      }

      // Fill
      const fillColor = isRootNode(node)
        ? ROOT_NODE_COLOR
        : node.unlocked
          ? getNodeCategoryColor(node)
          : '#D1D5DB';

      ctx.globalAlpha = isDimmed ? 0.34 : 1;
      ctx.fillStyle = fillColor;

      if (isRootNode(node)) {
        drawRoundedRect(ctx, node.x - radius, node.y - radius, radius * 2, radius * 2, 3);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Border
      if (node.unlocked || isRootNode(node)) {
        ctx.strokeStyle = isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node);
        ctx.lineWidth = isSelected ? 3 : 2;
        if (isRootNode(node)) {
          drawRoundedRect(ctx, node.x - radius, node.y - radius, radius * 2, radius * 2, 3);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;

      if (shouldShowNodeLabel({ node, selectedNode, hoveredNode })) {
        ctx.globalAlpha = isDimmed ? 0.5 : 1;
        drawNodeLabel(ctx, node, radius);
      }

      ctx.globalAlpha = 1;
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
      return Math.sqrt(dx * dx + dy * dy) < node.radius + 7;
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
      const scaleFactor = getCanvasScale();
      canvas.width = Math.floor(container.clientWidth * scaleFactor);
      canvas.height = Math.floor(container.clientHeight * scaleFactor);
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      setOffset({ x: 0, y: 0 });
      setScale(1);
      syncStableLayout();
    });

    resizeObserver.observe(container);
    const scaleFactor = getCanvasScale();
    canvas.width = Math.floor(container.clientWidth * scaleFactor);
    canvas.height = Math.floor(container.clientHeight * scaleFactor);
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
    syncStableLayout();

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-[#F8FAFC]"
      style={{
        backgroundImage:
          'linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
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
      {hoveredNode && (
        <div
          className="pointer-events-none absolute z-20 max-w-64 rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-xs leading-5 text-[#475569] shadow-lg"
          style={{
            left: `${hoveredNode.x * scale + offset.x + 14}px`,
            top: `${hoveredNode.y * scale + offset.y + 14}px`,
          }}
        >
          <div className="font-semibold text-[#111827]">{hoveredNode.title}</div>
          {hoveredNode.description && (
            <div className="mt-1 line-clamp-2">{hoveredNode.description}</div>
          )}
        </div>
      )}
    </div>
  );
};
