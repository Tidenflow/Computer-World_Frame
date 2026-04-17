import { useEffect, useRef, useState } from 'react';
import { Node, DOMAIN_COLORS, Domain } from '../types';
import { ContextMenu } from './ContextMenu';
import { panViewport, zoomAtPoint } from '../services/graph-viewport';

interface Graph2DProps {
  nodes: Node[];
  selectedNode: Node | null;
  onNodeClick: (node: Node) => void;
  onNodeDoubleClick: (node: Node) => void;
  selectedDomains: Set<Domain>;
  onToggleLock?: (nodeId: string) => void;
}

interface NodePosition extends Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
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
  selectedDomains,
  onToggleLock,
}: Graph2DProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<NodePosition[]>([]);
  const [hoveredNode, setHoveredNode] = useState<NodePosition | null>(null);
  const [draggedNode, setDraggedNode] = useState<NodePosition | null>(null);
  const [panDragStart, setPanDragStart] = useState<PointerPosition | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ node: Node; x: number; y: number } | null>(null);
  const animationRef = useRef<number>();
  const didDragViewportRef = useRef(false);

  // Initialize node positions
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    
    const nodePositions: NodePosition[] = nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 12,
      };
    });
    
    setPositions(nodePositions);
  }, [nodes]);

  // Physics simulation
  useEffect(() => {
    if (positions.length === 0) return;

    const simulate = () => {
      setPositions((prev) => {
        const next = prev.map((node) => ({ ...node }));
        const width = containerRef.current?.clientWidth || 800;
        const height = containerRef.current?.clientHeight || 600;

        // Apply forces
        for (let i = 0; i < next.length; i++) {
          const nodeA = next[i];
          
          // Skip dragged node
          if (draggedNode && nodeA.id === draggedNode.id) continue;

          // Repulsion from other nodes
          for (let j = i + 1; j < next.length; j++) {
            const nodeB = next[j];
            if (draggedNode && nodeB.id === draggedNode.id) continue;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (nodeA.radius + nodeB.radius + 50) / distance;

            if (distance < 200) {
              nodeA.vx -= (dx / distance) * force * 0.1;
              nodeA.vy -= (dy / distance) * force * 0.1;
              nodeB.vx += (dx / distance) * force * 0.1;
              nodeB.vy += (dy / distance) * force * 0.1;
            }
          }

          // Attraction to dependencies
          if (nodeA.deps) {
            for (const depId of nodeA.deps) {
              const dep = next.find((n) => n.id === depId);
              if (dep && !(draggedNode && dep.id === draggedNode.id)) {
                const dx = dep.x - nodeA.x;
                const dy = dep.y - nodeA.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = 0.01;

                nodeA.vx += (dx / distance) * force;
                nodeA.vy += (dy / distance) * force;
              }
            }
          }

          // Center attraction
          const centerX = width / 2;
          const centerY = height / 2;
          const toCenterX = centerX - nodeA.x;
          const toCenterY = centerY - nodeA.y;
          nodeA.vx += toCenterX * 0.0005;
          nodeA.vy += toCenterY * 0.0005;

          // Damping
          nodeA.vx *= 0.9;
          nodeA.vy *= 0.9;

          // Update position
          nodeA.x += nodeA.vx;
          nodeA.y += nodeA.vy;

          // Boundary
          const margin = 50;
          if (nodeA.x < margin) nodeA.x = margin;
          if (nodeA.x > width - margin) nodeA.x = width - margin;
          if (nodeA.y < margin) nodeA.y = margin;
          if (nodeA.y > height - margin) nodeA.y = height - margin;
        }

        return next;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [positions.length, draggedNode]);

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
      (node) => selectedDomains.size === 0 || selectedDomains.has(node.domain)
    );

    // Draw connections
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    for (const node of visibleNodes) {
      if (!node.deps) continue;

      for (const depId of node.deps) {
        const dep = visibleNodes.find((n) => n.id === depId);
        if (!dep) continue;

        const isHighlighted = selectedNode && (selectedNode.id === node.id || selectedNode.id === dep.id);
        const color = DOMAIN_COLORS[node.domain];

        ctx.strokeStyle = isHighlighted ? color : `${color}66`;
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.globalAlpha = 0.4;

        // Bezier curve
        const midX = (node.x + dep.x) / 2;
        const midY = (node.y + dep.y) / 2;
        const dx = dep.x - node.x;
        const dy = dep.y - node.y;
        const offset1 = 30;
        const cpX = midX - dy * offset1 / 100;
        const cpY = midY + dx * offset1 / 100;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.quadraticCurveTo(cpX, cpY, dep.x, dep.y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;

    // Draw nodes
    for (const node of visibleNodes) {
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const isDep = selectedNode?.deps?.includes(node.id);
      const nodeScale = isHovered ? 1.15 : 1;
      const radius = node.radius * nodeScale;

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.shadowColor = DOMAIN_COLORS[node.domain];
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      // Fill
      if (node.unlocked) {
        ctx.fillStyle = isDep && selectedNode
          ? `${DOMAIN_COLORS[node.domain]}66`
          : DOMAIN_COLORS[node.domain];
      } else {
        ctx.fillStyle = '#D1D5DB';
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      if (node.unlocked) {
        ctx.strokeStyle = DOMAIN_COLORS[node.domain];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.stroke();
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
  }, [positions, selectedNode, hoveredNode, offset, scale, selectedDomains]);

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
          node.id === draggedNode.id ? { ...node, x, y, vx: 0, vy: 0 } : node
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

    const hovered = positions.find((node) => {
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
    });

    resizeObserver.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

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
