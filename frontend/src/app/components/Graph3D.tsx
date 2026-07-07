import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import {
  getNodeCategory,
  getNodeCategoryColor,
  isRootNode,
  Node,
  NodeCategory,
  ROOT_NODE_COLOR,
} from '../types'

interface Graph3DProps {
  nodes: Node[]
  selectedNode: Node | null
  onNodeClick: (node: Node) => void
  selectedCategories: Set<NodeCategory>
  unlockedCount: number
  totalNodes: number
}

interface LayoutPoint {
  position: THREE.Vector3
  depth: number
}

interface NodeMesh extends THREE.Mesh {
  material: THREE.MeshPhongMaterial
}

const ROOT_SIZE = 13
const PRIMARY_SIZE = 8
const NODE_SIZE = 5

function stableHash(input: string) {
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }

  return hash
}

function getTreeDepths(nodes: Node[]) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const depths = new Map<string, number>()

  const resolveDepth = (node: Node): number => {
    const cached = depths.get(node.id)
    if (cached !== undefined) {
      return cached
    }

    if (!node.parentId) {
      depths.set(node.id, 0)
      return 0
    }

    const parent = nodesById.get(node.parentId)
    const depth = parent ? resolveDepth(parent) + 1 : 1
    depths.set(node.id, depth)
    return depth
  }

  for (const node of nodes) {
    resolveDepth(node)
  }

  return depths
}

function createOverviewLayout(nodes: Node[]) {
  const depths = getTreeDepths(nodes)
  const childrenByParent = new Map<string, Node[]>()
  const layout = new Map<string, LayoutPoint>()

  for (const node of nodes) {
    if (!node.parentId) {
      continue
    }

    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node)
    childrenByParent.set(node.parentId, siblings)
  }

  const orderedNodes = [...nodes].sort((left, right) => {
    const leftDepth = depths.get(left.id) ?? 0
    const rightDepth = depths.get(right.id) ?? 0

    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth
    }

    return left.id.localeCompare(right.id)
  })

  const rootNodes = orderedNodes.filter((node) => !node.parentId)
  rootNodes.forEach((node, index) => {
    layout.set(node.id, {
      depth: 0,
      position:
        rootNodes.length === 1
          ? new THREE.Vector3(0, 0, 0)
          : new THREE.Vector3((index - (rootNodes.length - 1) / 2) * 70, 0, 0),
    })
  })

  for (const node of orderedNodes) {
    const depth = depths.get(node.id) ?? 0
    if (depth === 0 || layout.has(node.id)) {
      continue
    }

    const parent = node.parentId ? layout.get(node.parentId) : null
    const siblings = node.parentId ? childrenByParent.get(node.parentId) ?? [] : []
    const siblingIndex = siblings.findIndex((candidate) => candidate.id === node.id)
    const siblingCount = Math.max(siblings.length, 1)
    const parentPosition = parent?.position ?? new THREE.Vector3(0, 0, 0)
    const baseAngle = node.parentId ? (stableHash(node.parentId) % 360) * (Math.PI / 180) : 0
    const angle = baseAngle + (Math.PI * 2 * siblingIndex) / siblingCount
    const spread = depth === 1 ? 155 : 56 + depth * 18 + Math.min(siblingCount, 8) * 3
    const height = depth === 1 ? 18 : (2 - depth) * 18

    layout.set(node.id, {
      depth,
      position:
        depth === 1
          ? new THREE.Vector3(Math.cos(angle) * spread, height, Math.sin(angle) * spread)
          : new THREE.Vector3(
              parentPosition.x + Math.cos(angle) * spread,
              parentPosition.y + height,
              parentPosition.z + Math.sin(angle) * spread,
            ),
    })
  }

  return { layout, depths }
}

function createLabelSprite(text: string, color = '#0f172a') {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  const fontSize = 24
  context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  const textWidth = Math.ceil(context.measureText(text).width)
  canvas.width = textWidth + 28
  canvas.height = 44

  context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  context.fillStyle = 'rgba(255, 255, 255, 0.92)'
  context.strokeStyle = 'rgba(203, 213, 225, 0.95)'
  context.lineWidth = 2
  roundRect(context, 1, 1, canvas.width - 2, canvas.height - 2, 10)
  context.fill()
  context.stroke()
  context.fillStyle = color
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(canvas.width * 0.24, canvas.height * 0.24, 1)

  return sprite
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function createRing(radius: number, color: number, opacity: number) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2)
  const points = curve.getPoints(120).map((point) => new THREE.Vector3(point.x, 0, point.y))
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  })

  return new THREE.LineLoop(geometry, material)
}

export const Graph3D = ({
  nodes,
  selectedNode,
  onNodeClick,
  selectedCategories,
  unlockedCount,
  totalNodes,
}: Graph3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const overviewGroupRef = useRef<THREE.Group>()
  const nodeObjectsRef = useRef<Map<string, NodeMesh>>(new Map())
  const lineObjectsRef = useRef<Map<string, THREE.Line>>(new Map())
  const labelObjectsRef = useRef<Map<string, THREE.Sprite>>(new Map())
  const selectedNodeRef = useRef<Node | null>(selectedNode)
  const selectedCategoriesRef = useRef(selectedCategories)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())

  useEffect(() => {
    selectedNodeRef.current = selectedNode
  }, [selectedNode])

  useEffect(() => {
    selectedCategoriesRef.current = selectedCategories
  }, [selectedCategories])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000)
    camera.position.set(0, 210, 430)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.78)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7)
    directionalLight.position.set(120, 220, 180)
    scene.add(directionalLight)

    const group = new THREE.Group()
    overviewGroupRef.current = group
    scene.add(group)

    const innerRing = createRing(155, 0xcbd5e1, 0.38)
    const outerRing = createRing(245, 0xcbd5e1, 0.22)
    group.add(innerRing, outerRing)

    const { layout, depths } = createOverviewLayout(nodes)
    const nodeObjects = new Map<string, NodeMesh>()
    const lineObjects = new Map<string, THREE.Line>()
    const labelObjects = new Map<string, THREE.Sprite>()

    for (const node of nodes) {
      const point = layout.get(node.id)
      if (!point) continue

      const depth = depths.get(node.id) ?? 0
      const size = isRootNode(node) ? ROOT_SIZE : depth === 1 ? PRIMARY_SIZE : NODE_SIZE
      const geometry = isRootNode(node)
        ? new THREE.BoxGeometry(size * 1.45, size * 1.45, size * 1.45)
        : new THREE.SphereGeometry(size, 24, 16)
      const color = new THREE.Color(
        isRootNode(node)
          ? ROOT_NODE_COLOR
          : node.unlocked
            ? getNodeCategoryColor(node)
            : '#CBD5E1',
      )
      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: node.unlocked || isRootNode(node) ? 0.18 : 0.02,
        transparent: true,
        opacity: node.unlocked || isRootNode(node) ? 0.94 : 0.46,
      })
      const mesh = new THREE.Mesh(geometry, material) as NodeMesh
      mesh.position.copy(point.position)
      mesh.userData = { node, depth }
      group.add(mesh)
      nodeObjects.set(node.id, mesh)

      const label = createLabelSprite(node.title)
      if (label) {
        label.position.copy(point.position).add(new THREE.Vector3(0, size + 16, 0))
        label.userData = { nodeId: node.id, depth }
        label.visible = depth <= 1
        group.add(label)
        labelObjects.set(node.id, label)
      }
    }

    for (const node of nodes) {
      if (!node.parentId) continue

      const child = layout.get(node.id)
      const parent = layout.get(node.parentId)
      if (!child || !parent) continue

      const geometry = new THREE.BufferGeometry().setFromPoints([parent.position, child.position])
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(getNodeCategoryColor(node)),
        transparent: true,
        opacity: 0.16,
      })
      const line = new THREE.Line(geometry, material)
      line.userData = { childId: node.id, parentId: node.parentId }
      group.add(line)
      lineObjects.set(node.id, line)
    }

    nodeObjectsRef.current = nodeObjects
    lineObjectsRef.current = lineObjects
    labelObjectsRef.current = labelObjects

    let autoRotate = true
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    let animationFrame = 0

    const applyVisualState = () => {
      const selected = selectedNodeRef.current
      const selectedId = selected?.id ?? null
      const relatedIds = new Set<string>()

      if (selected) {
        relatedIds.add(selected.id)
        if (selected.parentId) relatedIds.add(selected.parentId)
        for (const node of nodes) {
          if (node.parentId === selected.id || node.parentId === selected.parentId) {
            relatedIds.add(node.id)
          }
        }
      }

      nodeObjects.forEach((mesh, nodeId) => {
        const node = mesh.userData.node as Node
        const depth = mesh.userData.depth as number
        const categoryVisible = isRootNode(node) || selectedCategoriesRef.current.has(getNodeCategory(node))
        const selectedOrRelated = !selectedId || relatedIds.has(nodeId) || isRootNode(node)
        const isSelected = selectedId === nodeId
        const visible = categoryVisible

        mesh.visible = visible
        mesh.material.opacity = visible
          ? selectedOrRelated
            ? node.unlocked || isRootNode(node)
              ? 0.96
              : 0.5
            : 0.18
          : 0
        mesh.material.emissiveIntensity = isSelected
          ? 0.58
          : selectedOrRelated && (node.unlocked || depth <= 1)
            ? 0.22
            : 0.02
        const scale = isSelected ? 1.45 : selectedOrRelated ? 1 : 0.82
        mesh.scale.setScalar(scale)
      })

      lineObjects.forEach((line, childId) => {
        const material = line.material as THREE.LineBasicMaterial
        const child = nodeObjects.get(childId)
        const parent = nodeObjects.get(line.userData.parentId)
        const selectedOrRelated = !selectedId || relatedIds.has(childId) || relatedIds.has(line.userData.parentId)

        line.visible = Boolean(child?.visible && parent?.visible)
        material.opacity = selectedOrRelated ? 0.42 : 0.08
      })

      labelObjects.forEach((label, nodeId) => {
        const depth = label.userData.depth as number
        const nodeMesh = nodeObjects.get(nodeId)
        label.visible = Boolean(
          nodeMesh?.visible && (depth <= 1 || selectedId === nodeId || relatedIds.has(nodeId)),
        )
      })
    }

    const animate = () => {
      animationFrame = requestAnimationFrame(animate)

      if (autoRotate && !selectedNodeRef.current) {
        group.rotation.y += 0.0008
      }

      applyVisualState()
      renderer.render(scene, camera)
    }

    animate()

    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x
        const deltaY = event.clientY - previousMousePosition.y

        group.rotation.y += deltaX * 0.004
        group.rotation.x += deltaY * 0.0025
        group.rotation.x = Math.max(-0.55, Math.min(0.55, group.rotation.x))
        previousMousePosition = { x: event.clientX, y: event.clientY }
        return
      }

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const intersects = raycasterRef.current.intersectObjects(Array.from(nodeObjects.values()))
      renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab'
    }

    const handleClick = () => {
      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const intersects = raycasterRef.current.intersectObjects(Array.from(nodeObjects.values()))

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh
        onNodeClick(mesh.userData.node as Node)
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true
      autoRotate = false
      previousMousePosition = { x: event.clientX, y: event.clientY }
      renderer.domElement.style.cursor = 'grabbing'
    }

    const handleMouseUpOrLeave = () => {
      isDragging = false
      renderer.domElement.style.cursor = 'grab'
    }

    const handleResize = () => {
      const nextWidth = container.clientWidth
      const nextHeight = container.clientHeight
      camera.aspect = nextWidth / nextHeight
      camera.updateProjectionMatrix()
      renderer.setSize(nextWidth, nextHeight)
    }

    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('click', handleClick)
    renderer.domElement.addEventListener('mousedown', handleMouseDown)
    renderer.domElement.addEventListener('mouseup', handleMouseUpOrLeave)
    renderer.domElement.addEventListener('mouseleave', handleMouseUpOrLeave)
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.domElement.removeEventListener('click', handleClick)
      renderer.domElement.removeEventListener('mousedown', handleMouseDown)
      renderer.domElement.removeEventListener('mouseup', handleMouseUpOrLeave)
      renderer.domElement.removeEventListener('mouseleave', handleMouseUpOrLeave)
      container.removeChild(renderer.domElement)

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          object.geometry?.dispose()
          const material = object.material
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose())
          } else {
            material?.dispose()
          }
        }
      })
      renderer.dispose()
    }
  }, [nodes, onNodeClick])

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#F8FAFC]">
      <div className="absolute left-4 top-20 max-w-xs rounded-lg border border-[#D8DEE8] bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
          3D Overview
        </div>
        <div className="mt-1 text-sm leading-6 text-[#475569]">
          中心是当前地图，内环是主方向，外层显示更细的概念范围。
        </div>
      </div>

      <div className="absolute right-4 top-4 rounded-lg border border-[#D8DEE8] bg-white/90 px-4 py-2 shadow-sm backdrop-blur-sm">
        <div className="text-xs text-[#64748B]">地图点亮</div>
        <div className="text-lg font-semibold text-[#111827]">
          {unlockedCount} <span className="text-sm text-[#64748B]">/ {totalNodes}</span>
        </div>
      </div>
    </div>
  )
}
