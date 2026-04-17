import type { GraphData, Node } from '../types'

export function buildNodesWithUnlockedStatus(
  currentMap: GraphData,
  unlockedNodes: Set<string>,
): Node[] {
  return currentMap.nodes.map((node) => ({
    ...node,
    unlocked: unlockedNodes.has(node.id),
  }))
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
    total += map.nodes.length
    unlocked += map.nodes.filter((node) => unlockedNodes.has(node.id)).length
  })

  return { total, unlocked }
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
