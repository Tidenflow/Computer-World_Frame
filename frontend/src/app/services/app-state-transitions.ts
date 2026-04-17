import type { Domain, Node } from '../types'

const ALL_DOMAINS: Domain[] = ['hardware', 'software', 'programming', 'theory', 'ai', 'network']

export function createAllDomainSelection(): Set<Domain> {
  return new Set(ALL_DOMAINS)
}

export function toggleDomainSelection(
  selectedDomains: Set<Domain>,
  domain: Domain,
): Set<Domain> {
  const nextDomains = new Set(selectedDomains)

  if (nextDomains.has(domain)) {
    nextDomains.delete(domain)
  } else {
    nextDomains.add(domain)
  }

  return nextDomains
}

export function autoUnlockNodeOnSelect(unlockedNodes: Set<string>, node: Node): Set<string> {
  if (unlockedNodes.has(node.id)) {
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
