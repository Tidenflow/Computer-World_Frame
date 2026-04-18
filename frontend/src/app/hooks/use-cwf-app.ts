import { useMemo, useState } from 'react'

import { allMaps } from '../data'
import { localStorageProgressRepository } from '../repositories/local-storage-progress.repository'
import {
  buildBreadcrumbs,
  buildNodesWithUnlockedStatus,
  buildVisibleGraphNodes,
  computeUnlockedStats,
  filterNodesByQuery,
  searchNodesAcrossMaps,
} from '../services/app-services'
import {
  autoUnlockNodeOnSelect,
  closeSelectedNode,
  createAllCategorySelection,
  createEmptyCategorySelection,
  toggleCategorySelection,
  toggleNodeLock,
} from '../services/app-state-transitions'
import type { Node, NodeCategory } from '../types'
import { useProgressState } from './use-progress-state'
import { useSearchState } from './use-search-state'

type ViewMode = '2d' | '3d'

export function useCwfApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('2d')
  const [selectedCategories, setSelectedCategories] = useState<Set<NodeCategory>>(
    () => createAllCategorySelection(),
  )
  const [currentMapId, setCurrentMapId] = useState('root')
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const { unlockedNodes, saveUnlockedNodeSet } = useProgressState(localStorageProgressRepository)
  const { searchQuery, setSearchQuery, debouncedSearch, clearSearch } = useSearchState()

  const currentMap = allMaps[currentMapId]

  const filteredNodes = useMemo(() => {
    const nodesWithStatus = buildNodesWithUnlockedStatus(currentMap, unlockedNodes)
    if (debouncedSearch) {
      return filterNodesByQuery(nodesWithStatus, debouncedSearch)
    }

    return buildVisibleGraphNodes(nodesWithStatus, selectedNode?.id ?? null)
  }, [currentMap, debouncedSearch, selectedNode?.id, unlockedNodes])

  const searchResults = useMemo(
    () => searchNodesAcrossMaps(allMaps, debouncedSearch, unlockedNodes),
    [debouncedSearch, unlockedNodes],
  )

  const totalUnlockedCount = useMemo(
    () => computeUnlockedStats(allMaps, unlockedNodes),
    [unlockedNodes],
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

  return {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    selectedCategories,
    currentMapId,
    selectedNode,
    currentMap,
    filteredNodes,
    searchResults,
    totalUnlockedCount,
    breadcrumbs,
    unlockedNodes,
    handleCategoryToggle,
    handleNodeClick,
    handleToggleLock,
    handleNodeDoubleClick,
    handleNavigateToMap,
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
