import { useMemo, useState } from 'react'

import { allMaps } from '../data'
import { localStorageProgressRepository } from '../repositories/local-storage-progress.repository'
import {
  buildBreadcrumbs,
  buildNodesWithUnlockedStatus,
  buildVisibleGraphNodes,
  computeMapUnlockedStats,
  computeUnlockedStats,
  searchNodesAcrossMaps,
} from '../services/app-services'
import {
  autoUnlockNodeOnSelect,
  closeSelectedNode,
  createAllCategorySelection,
  createEmptyCategorySelection,
  toggleCategorySelection,
  toggleNodeLock,
  unlockNodes,
} from '../services/app-state-transitions'
import type { Node, NodeCategory, SearchMatch } from '../types'
import { useProgressState } from './use-progress-state'
import { useSearchState } from './use-search-state'

type ViewMode = '2d' | '3d'

function withUnlockedState(node: Node, unlockedNodes: Set<string>): Node {
  return {
    ...node,
    unlocked: unlockedNodes.has(node.id),
  }
}

export function useCwfApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('2d')
  const [selectedCategories, setSelectedCategories] = useState<Set<NodeCategory>>(
    () => createAllCategorySelection(),
  )
  const [currentMapId, setCurrentMapId] = useState('root')
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [recentSearchMatches, setRecentSearchMatches] = useState<SearchMatch[]>([])

  const { unlockedNodes, saveUnlockedNodeSet } = useProgressState(localStorageProgressRepository)
  const { searchQuery, setSearchQuery, clearSearch } = useSearchState()

  const currentMap = allMaps[currentMapId]

  const filteredNodes = useMemo(() => {
    const nodesWithStatus = buildNodesWithUnlockedStatus(currentMap, unlockedNodes)
    return buildVisibleGraphNodes(nodesWithStatus, selectedNode?.id ?? null)
  }, [currentMap, selectedNode?.id, unlockedNodes])

  const totalUnlockedCount = useMemo(
    () => computeUnlockedStats(allMaps, unlockedNodes),
    [unlockedNodes],
  )

  const currentMapUnlockedCount = useMemo(
    () => computeMapUnlockedStats(currentMap, unlockedNodes),
    [currentMap, unlockedNodes],
  )

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentMapId, currentMap, allMaps.root.title),
    [currentMap, currentMapId],
  )

  const handleCategoryToggle = (category: NodeCategory) => {
    setSelectedCategories((previousCategories) =>
      toggleCategorySelection(previousCategories, category),
    )
  }

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node)
    clearSearch()

    const nextUnlockedNodes = autoUnlockNodeOnSelect(unlockedNodes, node)
    if (nextUnlockedNodes !== unlockedNodes) {
      saveUnlockedNodeSet(nextUnlockedNodes)
    }
  }

  const handleToggleLock = (nodeId: string) => {
    saveUnlockedNodeSet(toggleNodeLock(unlockedNodes, nodeId))
  }

  const handleNodeDoubleClick = (node: Node) => {
    console.log('Double clicked:', node.title)
  }

  const handleNavigateToMap = (mapId: string) => {
    setCurrentMapId(mapId)
    setSelectedNode(null)
  }

  const handleSearchSubmit = () => {
    const normalizedQuery = searchQuery.trim()

    if (!normalizedQuery) {
      setRecentSearchMatches([])
      return
    }

    const matches = searchNodesAcrossMaps(allMaps, normalizedQuery, unlockedNodes)
    const nextUnlockedNodes = unlockNodes(unlockedNodes, matches)

    if (nextUnlockedNodes !== unlockedNodes) {
      saveUnlockedNodeSet(nextUnlockedNodes)
    }

    setRecentSearchMatches(
      matches.map((match) => ({
        ...match,
        unlocked: nextUnlockedNodes.has(match.id),
      })),
    )
  }

  const handleSelectRecentMatch = (match: SearchMatch) => {
    const targetMap = allMaps[match.mapId]
    const targetNode = targetMap.nodes.find((node) => node.id === match.id)

    if (!targetNode) {
      return
    }

    setCurrentMapId(match.mapId)
    setSelectedNode(withUnlockedState(targetNode, unlockedNodes))
    clearSearch()
  }

  return {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedCategories,
    currentMapId,
    selectedNode,
    currentMap,
    filteredNodes,
    totalUnlockedCount,
    currentMapUnlockedCount,
    recentSearchMatches,
    breadcrumbs,
    unlockedNodes,
    handleCategoryToggle,
    handleNodeClick,
    handleToggleLock,
    handleNodeDoubleClick,
    handleNavigateToMap,
    handleSearchSubmit,
    handleSelectRecentMatch,
    selectAllCategories() {
      setSelectedCategories(createAllCategorySelection())
    },
    clearCategories() {
      setSelectedCategories(createEmptyCategorySelection())
    },
    closeDetailPanel() {
      setSelectedNode(closeSelectedNode())
    },
  }
}
