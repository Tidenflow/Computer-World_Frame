<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CWFrameMap, CWFrameProgress } from '@shared/contract';
import { buildStatusMap } from '../core/cwframe.status';
import type { CWFrameNodeStatus } from '../core/cwframe.status';

const PRIMARY_COLOR = 0x4fc3f7;
const POSITION_EMIT_INTERVAL_MS = 33;

interface Props {
  frameMap: CWFrameMap;
  progress: CWFrameProgress;
}
interface Emits {
  (e: 'nodeClick', nodeId: number): void;
  (e: 'positionsUpdate', positions: Map<number, { screenX: number; screenY: number }>): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let raycaster: THREE.Raycaster;
let animationId: number;
let glowTexture: THREE.CanvasTexture;
let shouldSyncScreenPositions = true;
let lastPositionsEmitAt = 0;

const nodeObjects: Map<number, THREE.Group> = new Map();
const linkLines: THREE.Line[] = [];
const linkEndpointMap = new Map<THREE.Line, { sourceId: number; targetId: number }>();
const nodeScreenPositions = new Map<number, { screenX: number; screenY: number }>();

const statusMap = computed(() => buildStatusMap(props.frameMap, props.progress));

function initThree() {
  if (!containerRef.value || !canvasRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0f, 0.002);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
  camera.position.set(0, 0, 400);

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0a0f, 1);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 100;
  controls.maxDistance = 800;
  controls.autoRotate = false;
  controls.addEventListener('change', markScreenPositionsDirty);

  raycaster = new THREE.Raycaster();
  glowTexture = createGlowTexture();

  createGalaxyBackground();
  initLayout();
  animate();
}

function markScreenPositionsDirty() {
  shouldSyncScreenPositions = true;
}

function stableNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function buildDepthMap() {
  const nodesById = new Map(props.frameMap.nodes.map(node => [node.id, node]));
  const memo = new Map<number, number>();
  const visiting = new Set<number>();

  const resolveDepth = (nodeId: number): number => {
    if (memo.has(nodeId)) return memo.get(nodeId)!;
    if (visiting.has(nodeId)) return 0;

    visiting.add(nodeId);
    const node = nodesById.get(nodeId);
    let depth = 0;

    if (node && node.dependencies.length > 0) {
      depth = 1 + Math.max(...node.dependencies.map(resolveDepth));
    }

    visiting.delete(nodeId);
    memo.set(nodeId, depth);
    return depth;
  };

  props.frameMap.nodes.forEach(node => resolveDepth(node.id));
  return memo;
}

function buildStableNodePositions() {
  const nodes = props.frameMap.nodes;
  const depthMap = buildDepthMap();
  const maxDepth = Math.max(...Array.from(depthMap.values()), 0);
  const categories = Array.from(new Set(nodes.map(node => node.category))).sort();
  const categoryIndex = new Map(categories.map((category, index) => [category, index]));
  const sectorSize = (Math.PI * 2) / Math.max(categories.length, 1);

  const bucketMap = new Map<string, number[]>();
  nodes.forEach(node => {
    const depth = depthMap.get(node.id) ?? 0;
    const key = `${depth}:${node.category}`;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(node.id);
  });
  bucketMap.forEach(bucket => bucket.sort((a, b) => a - b));

  const baseRadius = 130;
  const layerGap = 70;
  const radiusJitter = 10;
  const verticalGap = 28;
  const verticalJitter = 9;
  const positions = new Map<number, THREE.Vector3>();

  nodes.forEach(node => {
    const depth = depthMap.get(node.id) ?? 0;
    const categoryIdx = categoryIndex.get(node.category) ?? 0;
    const bucketKey = `${depth}:${node.category}`;
    const bucket = bucketMap.get(bucketKey) ?? [node.id];
    const bucketIndex = Math.max(0, bucket.indexOf(node.id));
    const ratio = bucket.length <= 1 ? 0.5 : bucketIndex / (bucket.length - 1);

    const sectorStart = categoryIdx * sectorSize;
    const sectorPadding = sectorSize * 0.15;
    const usableSector = sectorSize - sectorPadding * 2;
    const angle = sectorStart + sectorPadding + ratio * usableSector;

    const radius = baseRadius + depth * layerGap + stableNoise(node.id * 1.17) * radiusJitter;
    const centeredDepth = depth - maxDepth / 2;
    const y = centeredDepth * verticalGap + stableNoise(node.id * 3.13) * verticalJitter;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    positions.set(node.id, new THREE.Vector3(x, y, z));
  });

  return positions;
}

function createGalaxyBackground() {
  const particleCount = 2000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = Math.random() * 600 + 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.3;
    positions[i3] = radius * Math.cos(theta) * Math.cos(phi);
    positions[i3 + 1] = radius * Math.sin(phi) * 0.5;
    positions[i3 + 2] = radius * Math.sin(theta) * Math.cos(phi);
    const color = new THREE.Color();
    color.setHSL(0.55 + Math.random() * 0.1, 0.8, 0.6);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 2, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true });
  scene.add(new THREE.Points(geometry, material));
}

function initLayout() {
  // Dispose and clear old scene objects
  nodeObjects.forEach((group) => {
    const { sphere, glow, sprite } = group.userData;
    sphere.geometry.dispose();
    (sphere.material as THREE.MeshBasicMaterial).dispose();
    glow.geometry.dispose();
    (glow.material as THREE.MeshBasicMaterial).dispose();
    (sprite.material as THREE.SpriteMaterial).dispose();
    scene.remove(group);
  });
  nodeObjects.clear();

  linkLines.forEach((line) => {
    line.geometry.dispose();
    (line.material as THREE.LineBasicMaterial).dispose();
    scene.remove(line);
  });
  linkLines.length = 0;
  linkEndpointMap.clear();

  const nodes = props.frameMap.nodes;
  const links: { source: number; target: number }[] = [];
  nodes.forEach(node => {
    node.dependencies.forEach(depId => {
      links.push({ source: depId, target: node.id });
    });
  });

  const nodePositions = buildStableNodePositions();
  nodes.forEach((node) => {
    const position = nodePositions.get(node.id);
    if (!position) return;

    const { x, y, z } = position;
    const group = createNode(node.id, x, y, z);
    nodeObjects.set(node.id, group);
    scene.add(group);
  });

  links.forEach(link => {
    const sourcePos = nodePositions.get(link.source);
    const targetPos = nodePositions.get(link.target);
    if (sourcePos && targetPos) {
      const line = createLink(sourcePos, targetPos);
      linkLines.push(line);
      linkEndpointMap.set(line, { sourceId: link.source, targetId: link.target });
      scene.add(line);
    }
  });

  updateNodeVisibility();
  updateScreenPositions();
  shouldSyncScreenPositions = false;
  lastPositionsEmitAt = performance.now();
}

/**
 * Create a 3D node group (sphere + glow + glow-sprite).
 * Label rendering is handled by CWFrameNode Vue overlay, not Three.js sprites.
 */
function createNode(nodeId: number, x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Core sphere
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(8, 32, 32),
    new THREE.MeshBasicMaterial({ color: PRIMARY_COLOR, transparent: true, opacity: 0.1 })
  );
  group.add(sphere);

  // Outer glow sphere
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(12, 32, 32),
    new THREE.MeshBasicMaterial({ color: PRIMARY_COLOR, transparent: true, opacity: 0.3 })
  );
  group.add(glow);

  // Additive glow sprite
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  }));
  sprite.scale.set(40, 40, 1);
  group.add(sprite);

  group.userData = { nodeId, sphere, glow, sprite };
  return group;
}

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(79, 195, 247, 1)');
  gradient.addColorStop(0.3, 'rgba(79, 195, 247, 0.38)');
  gradient.addColorStop(1, 'rgba(79, 195, 247, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function createLink(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, end]),
    new THREE.LineBasicMaterial({ color: PRIMARY_COLOR, transparent: true, opacity: 0.2 })
  );
}

/**
 * Project all 3D node positions to 2D screen coordinates and emit.
 */
function updateScreenPositions() {
  if (!containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  nodeObjects.forEach((group, nodeId) => {
    const vec = new THREE.Vector3();
    vec.setFromMatrixPosition(group.matrixWorld);
    vec.project(camera);
    const screenX = (vec.x * 0.5 + 0.5) * width;
    const screenY = (-vec.y * 0.5 + 0.5) * height;
    nodeScreenPositions.set(nodeId, { screenX, screenY });
  });

  emit('positionsUpdate', new Map(nodeScreenPositions));
}

function updateNodeVisibility() {
  const currentStatus = statusMap.value;

  nodeObjects.forEach((group, nodeId) => {
    const { sphere, glow, sprite } = group.userData;
    const status = currentStatus[nodeId] as CWFrameNodeStatus;
    const visible = status !== 'Locked';
    sphere.visible = visible;
    glow.visible = visible;
    sprite.visible = visible;

    if (status === 'Unlocked') {
      (sphere.material as THREE.MeshBasicMaterial).opacity = 0.7;
      (glow.material as THREE.MeshBasicMaterial).opacity = 0.38;
      (sprite.material as THREE.SpriteMaterial).opacity = 0.62;
    } else if (status === 'Discoverable') {
      (sphere.material as THREE.MeshBasicMaterial).opacity = 0.1;
      (glow.material as THREE.MeshBasicMaterial).opacity = 0.1;
      (sprite.material as THREE.SpriteMaterial).opacity = 0.2;
    }
  });

  linkLines.forEach((line) => {
    const { sourceId, targetId } = linkEndpointMap.get(line)!;
    const startStatus = currentStatus[sourceId];
    const endStatus = currentStatus[targetId];
    if (startStatus === 'Unlocked' && endStatus === 'Unlocked') {
      (line.material as THREE.LineBasicMaterial).opacity = 0.6;
      line.visible = true;
    } else if (startStatus === 'Unlocked' || endStatus === 'Unlocked') {
      (line.material as THREE.LineBasicMaterial).opacity = 0.15;
      line.visible = true;
    } else {
      line.visible = false;
    }
  });
}

function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);

  const now = performance.now();
  if (shouldSyncScreenPositions && now - lastPositionsEmitAt >= POSITION_EMIT_INTERVAL_MS) {
    updateScreenPositions();
    shouldSyncScreenPositions = false;
    lastPositionsEmitAt = now;
  }
}

function handleResize() {
  if (!containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  markScreenPositionsDirty();
}

function onMouseClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    ),
    camera
  );
  const intersects = raycaster.intersectObjects(Array.from(nodeObjects.values()), true);
  for (const intersect of intersects) {
    let obj = intersect.object;
    while (obj.parent && !obj.userData.nodeId) { obj = obj.parent; }
    if (obj.userData.nodeId && statusMap.value[obj.userData.nodeId] === 'Unlocked') {
      emit('nodeClick', obj.userData.nodeId);
      break;
    }
  }
}

onMounted(() => {
  initThree();
  window.addEventListener('resize', handleResize);
  renderer?.domElement.addEventListener('click', onMouseClick);
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  renderer?.domElement.removeEventListener('click', onMouseClick);
  controls?.removeEventListener('change', markScreenPositionsDirty);
  controls?.dispose();
  glowTexture?.dispose();
  renderer?.dispose();
});

watch(() => props.progress, updateNodeVisibility, { deep: true });
watch(() => props.frameMap, initLayout, { deep: true });
</script>

<template>
  <div class="graph-container" ref="containerRef">
    <canvas ref="canvasRef" class="graph-canvas"></canvas>
  </div>
</template>

<style scoped>
.graph-container {
  width: 100%;
  height: 100vh;
  background: #0a0a0f;
  overflow: hidden;
  position: relative;
}

.graph-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
