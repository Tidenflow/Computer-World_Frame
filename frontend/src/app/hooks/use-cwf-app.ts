import { useMemo, useState } from 'react'

import { allMaps } from '../data'
import { localStorageProgressRepository } from '../repositories/local-storage-progress.repository'
import {
  buildBreadcrumbs,
  buildNodesWithUnlockedStatus,
  computeUnlockedStats,
  filterNodesByQuery,
  searchNodesAcrossMaps,
} from '../services/app-services'
import {
  autoUnlockNodeOnSelect,
  closeSelectedNode,
  createAllDomainSelection,
  toggleDomainSelection,
  toggleNodeLock,
} from '../services/app-state-transitions'
import type { Domain, Node } from '../types'
import { useProgressState } from './use-progress-state'
import { useSearchState } from './use-search-state'

type ViewMode = '2d' | '3d'

export function useCwfApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('2d')
  const [selectedDomains, setSelectedDomains] = useState<Set<Domain>>(() => createAllDomainSelection())
  const [currentMapId, setCurrentMapId] = useState('root')
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const { unlockedNodes, saveUnlockedNodeSet } = useProgressState(localStorageProgressRepository)
  const { searchQuery, setSearchQuery, debouncedSearch, clearSearch } = useSearchState()

  const currentMap = allMaps[currentMapId]

  const filteredNodes = useMemo(() => {
    const nodesWithStatus = buildNodesWithUnlockedStatus(currentMap, unlockedNodes)
    return filterNodesByQuery(nodesWithStatus, debouncedSearch)
  }, [currentMap, debouncedSearch, unlockedNodes])

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

  const handleDomainToggle = (domain: Domain) => {
    setSelectedDomains((previousDomains) => toggleDomainSelection(previousDomains, domain))
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
    selectedDomains,
    currentMapId,
    selectedNode,
    currentMap,
    filteredNodes,
    searchResults,
    totalUnlockedCount,
    breadcrumbs,
    unlockedNodes,
    handleDomainToggle,
    handleNodeClick,
    handleToggleLock,
    handleNodeDoubleClick,
    handleNavigateToMap,
    closeDetailPanel() {
      setSelectedNode(closeSelectedNode())
    },
  }
}
