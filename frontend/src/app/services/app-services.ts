import type { GraphData, Node } from '../types'

function isProgressTrackableNode(node: Node): boolean {
  return Boolean(node.parentId)
}

export function buildNodesWithUnlockedStatus(
  currentMap: GraphData,
  unlockedNodes: Set<string>,
): Node[] {
  return currentMap.nodes.map((node) => ({
    ...node,
    unlocked: unlockedNodes.has(node.id),
  }))
}

export function buildVisibleGraphNodes(nodes: Node[], selectedNodeId: string | null): Node[] {
  if (!nodes.some((node) => node.parentId)) {
    return nodes
  }

  const childrenByParentId = new Map<string, Node[]>()

  for (const node of nodes) {
    if (!node.parentId) {
      continue
    }

    const siblings = childrenByParentId.get(node.parentId) ?? []
    siblings.push(node)
    childrenByParentId.set(node.parentId, siblings)
  }

  const rootNodes = nodes.filter((node) => !node.parentId)
  const visibleIds = new Set(rootNodes.map((node) => node.id))

  for (const rootNode of rootNodes) {
    for (const childNode of childrenByParentId.get(rootNode.id) ?? []) {
      visibleIds.add(childNode.id)
    }
  }

  if (!selectedNodeId) {
    return nodes.filter((node) => visibleIds.has(node.id))
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const lineage: Node[] = []
  let cursor = nodesById.get(selectedNodeId) ?? null

  while (cursor) {
    lineage.unshift(cursor)
    cursor = cursor.parentId ? nodesById.get(cursor.parentId) ?? null : null
  }

  for (const lineageNode of lineage) {
    for (const childNode of childrenByParentId.get(lineageNode.id) ?? []) {
      visibleIds.add(childNode.id)
    }
  }

  return nodes.filter((node) => visibleIds.has(node.id))
}

export function filterNodesByQuery(nodes: Node[], query: string): Node[] {
  if (!query) {
    return nodes
  }

  const normalizedQuery = query.toLowerCase()

  return nodes.filter(
    (node) =>
      node.title.toLowerCase().includes(normalizedQuery) ||
      node.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
      node.aliases?.some((alias) => alias.toLowerCase().includes(normalizedQuery)),
  )
}

export function searchNodesAcrossMaps(
  maps: Record<string, GraphData>,
  query: string,
  unlockedNodes: Set<string>,
): Node[] {
  if (!query) {
    return []
  }

  const normalizedQuery = query.toLowerCase()
  const results: Node[] = []

  Object.values(maps).forEach((map) => {
    map.nodes.forEach((node) => {
      if (
        node.title.toLowerCase().includes(normalizedQuery) ||
        node.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
        node.aliases?.some((alias) => alias.toLowerCase().includes(normalizedQuery))
      ) {
        results.push({
          ...node,
          unlocked: unlockedNodes.has(node.id),
        })
      }
    })
  })

  return results
}

export function computeUnlockedStats(
  maps: Record<string, GraphData>,
  unlockedNodes: Set<string>,
): { total: number; unlocked: number } {
  let total = 0
  let unlocked = 0

  Object.values(maps).forEach((map) => {
    total += map.nodes.filter(isProgressTrackableNode).length
    unlocked += map.nodes.filter((node) => isProgressTrackableNode(node) && unlockedNodes.has(node.id)).length
  })

  return { total, unlocked }
}

export function computeMapUnlockedStats(
  map: GraphData,
  unlockedNodes: Set<string>,
): { total: number; unlocked: number } {
  const trackableNodes = map.nodes.filter(isProgressTrackableNode)

  return {
    total: trackableNodes.length,
    unlocked: trackableNodes.filter((node) => unlockedNodes.has(node.id)).length,
  }
}

export function buildBreadcrumbs(
  currentMapId: string,
  currentMap: GraphData,
  rootLabel = currentMap.title,
): string[] {
  const breadcrumbs = [rootLabel]

  if (currentMapId !== 'root') {
    breadcrumbs.push(currentMap.title)
  }

  return breadcrumbs
}
