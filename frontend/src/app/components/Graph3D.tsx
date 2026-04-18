import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getNodeCategory, getNodeCategoryColor, Node, NodeCategory } from '../types';

interface Graph3DProps {
  nodes: Node[];
  selectedNode: Node | null;
  onNodeClick: (node: Node) => void;
  selectedCategories: Set<NodeCategory>;
  unlockedCount: number;
  totalNodes: number;
}

export const Graph3D = ({
  nodes,
  selectedNode,
  onNodeClick,
  selectedCategories,
  unlockedCount,
  totalNodes,
}: Graph3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const nodeObjectsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    camera.position.z = 500;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(200, 200, 200);
    scene.add(pointLight);

    // Create sphere wireframe
    const sphereGeometry = new THREE.SphereGeometry(200, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xe5e7eb,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Create nodes
    const nodeObjects = new Map<string, THREE.Mesh>();

    nodes.forEach((node) => {
      const stage = node.stage || 3;
      // Map stage to radius: 1 -> 0-30%, 2-3 -> 30-70%, 4-5 -> 70-100%
      const radiusPercent = stage === 1 ? 0.15 : stage === 2 ? 0.4 : stage === 3 ? 0.5 : stage === 4 ? 0.8 : 0.95;
      const radius = 200 * radiusPercent;

      // Random position on sphere surface at given radius
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const size = node.unlocked ? 5 : 4;
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const color = new THREE.Color(node.unlocked ? getNodeCategoryColor(node) : '#D1D5DB');
      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: node.unlocked ? color : new THREE.Color(0x000000),
        emissiveIntensity: node.unlocked ? 0.3 : 0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData = { node };
      scene.add(mesh);
      nodeObjects.set(node.id, mesh);
    });

    nodeObjectsRef.current = nodeObjects;

    // Animation loop
    let autoRotate = true;
    const animate = () => {
      requestAnimationFrame(animate);

      if (autoRotate) {
        scene.rotation.y += 0.001;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(Array.from(nodeObjects.values()));

      // Reset all nodes
      nodeObjects.forEach((mesh) => {
        const node = mesh.userData.node as Node;
        (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = node.unlocked ? 0.3 : 0;
      });

      // Highlight hovered
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.6;
        renderer.domElement.style.cursor = 'pointer';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(Array.from(nodeObjects.values()));

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const node = mesh.userData.node as Node;
        onNodeClick(node);
      }
    };

    // Mouse drag for rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      autoRotate = false;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseDrag = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;

      scene.rotation.y += deltaX * 0.005;
      scene.rotation.x += deltaY * 0.005;

      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUpOrLeave = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseDrag);
    renderer.domElement.addEventListener('mouseup', handleMouseUpOrLeave);
    renderer.domElement.addEventListener('mouseleave', handleMouseUpOrLeave);

    // Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseDrag);
      renderer.domElement.removeEventListener('mouseup', handleMouseUpOrLeave);
      renderer.domElement.removeEventListener('mouseleave', handleMouseUpOrLeave);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [nodes]);

  // Update node visibility based on selected categories
  useEffect(() => {
    nodeObjectsRef.current.forEach((mesh, nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const isVisible = selectedCategories.has(getNodeCategory(node));
      mesh.visible = isVisible;
    });
  }, [selectedCategories, nodes]);

  // Highlight selected node
  useEffect(() => {
    nodeObjectsRef.current.forEach((mesh, nodeId) => {
      const node = mesh.userData.node as Node;
      const isSelected = selectedNode?.id === nodeId;

      if (isSelected) {
        (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.8;
      } else {
        (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = node.unlocked ? 0.3 : 0;
      }
    });
  }, [selectedNode]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-white">
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-[#E5E7EB]">
        <div className="text-xs text-[#6B7280]">已解锁</div>
        <div className="text-lg font-semibold text-[#111827]">
          {unlockedCount} <span className="text-sm text-[#6B7280]">/ {totalNodes}</span>
        </div>
      </div>
    </div>
  );
};
