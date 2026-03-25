<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CWFrameMap, CWFrameProgress } from '@shared/contract';
import { buildStatusMap } from '../core/cwframe.status';
import type { CWFrameNodeStatus } from '../core/cwframe.status';

const PRIMARY_COLOR = 0x4fc3f7;

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

  raycaster = new THREE.Raycaster();
  glowTexture = createGlowTexture();

  createGalaxyBackground();
  initLayout();
  animate();
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

  const nodePositions = new Map<number, THREE.Vector3>();
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    const radius = 100 + Math.random() * 50;
    const x = Math.cos(angle) * radius;
    const y = (Math.random() - 0.5) * 100;
    const z = Math.sin(angle) * radius;
    nodePositions.set(node.id, new THREE.Vector3(x, y, z));
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
    opacity: 0.6,
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
  gradient.addColorStop(0.3, 'rgba(79, 195, 247, 0.5)');
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
      (sphere.material as THREE.MeshBasicMaterial).opacity = 0.8;
      (glow.material as THREE.MeshBasicMaterial).opacity = 0.5;
      (sprite.material as THREE.SpriteMaterial).opacity = 0.8;
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

  // Update and emit screen positions every frame (for real-time tracking during orbit)
  updateScreenPositions();
}

function handleResize() {
  if (!containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
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
