import { isRootNode, type Node, type NodeCategory } from '../types'

const ALL_CATEGORIES: NodeCategory[] = [
  'fundamentals',
  'language',
  'technology',
  'tooling',
  'product',
  'architecture',
  'platform',
]

export function createAllCategorySelection(): Set<NodeCategory> {
  return new Set(ALL_CATEGORIES)
}

export function createEmptyCategorySelection(): Set<NodeCategory> {
  return new Set()
}

export function toggleCategorySelection(
  selectedCategories: Set<NodeCategory>,
  category: NodeCategory,
): Set<NodeCategory> {
  const nextCategories = new Set(selectedCategories)

  if (nextCategories.has(category)) {
    nextCategories.delete(category)
  } else {
    nextCategories.add(category)
  }

  return nextCategories
}

export function autoUnlockNodeOnSelect(unlockedNodes: Set<string>, node: Node): Set<string> {
  if (isRootNode(node) || unlockedNodes.has(node.id)) {
    return unlockedNodes
  }

  const nextUnlockedNodes = new Set(unlockedNodes)
  nextUnlockedNodes.add(node.id)
  return nextUnlockedNodes
}

export function toggleNodeLock(unlockedNodes: Set<string>, nodeId: string): Set<string> {
  const nextUnlockedNodes = new Set(unlockedNodes)

  if (nextUnlockedNodes.has(nodeId)) {
    nextUnlockedNodes.delete(nodeId)
  } else {
    nextUnlockedNodes.add(nodeId)
  }

  return nextUnlockedNodes
}

export function closeSelectedNode() {
  return null
}
