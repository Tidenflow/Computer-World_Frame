import { useEffect, useMemo, useState } from 'react'

import { allMaps } from '../data'
import { localStorageProgressRepository } from '../repositories/local-storage-progress.repository'
import {
  buildBreadcrumbs,
  buildNodeLearningContext,
  buildUnlockedNodeCollection,
  buildNodesWithUnlockedStatus,
  buildVisibleGraphNodes,
  computeMapUnlockedStats,
  computeUnlockedStats,
  type UnlockedNodeRecord,
} from '../services/app-services'
import {
  autoUnlockNodeOnSelect,
  closeSelectedNode,
  createAllCategorySelection,
  createEmptyCategorySelection,
  reconcileSelectedNodeWithCategories,
  toggleCategorySelection,
  toggleNodeLock,
  unlockNodes,
} from '../services/app-state-transitions'
import { searchWithSemanticFallback } from '../services/search-pipeline'
import { preloadModel } from '../services/semantic-search'
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
  const [recentSearchQuery, setRecentSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isModelReady, setIsModelReady] = useState(false)

  // Background preload: download and warm the embedding model on app startup.
  // Does NOT block the UI — rule-based search works immediately.
  // When done, semantic search becomes available without the 15s first-use wait.
  useEffect(() => {
    preloadModel(allMaps)
      .then(() => setIsModelReady(true))
      .catch(() => setIsModelReady(false)) // network error, etc. — semantic unavailable
  }, [])

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

  const selectedNodeLearningContext = useMemo(
    () =>
      buildNodeLearningContext(
        { ...currentMap, nodes: buildNodesWithUnlockedStatus(currentMap, unlockedNodes) },
        selectedNode,
      ),
    [currentMap, selectedNode, unlockedNodes],
  )

  const unlockedNodeCollection = useMemo(
    () => buildUnlockedNodeCollection(allMaps, unlockedNodes),
    [unlockedNodes],
  )

  const handleCategoryToggle = (category: NodeCategory) => {
    setSelectedCategories((previousCategories) => {
      const nextCategories = toggleCategorySelection(previousCategories, category)
      setSelectedNode((previousSelectedNode) =>
        reconcileSelectedNodeWithCategories(previousSelectedNode, nextCategories),
      )
      return nextCategories
    })
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
    if (unlockedNodes.has(nodeId)) {
      setRecentSearchMatches((previousMatches) =>
        previousMatches.filter((match) => match.id !== nodeId),
      )
    }

    saveUnlockedNodeSet(toggleNodeLock(unlockedNodes, nodeId))
  }

  const handleNodeDoubleClick = (node: Node) => {
    console.log('Double clicked:', node.title)
  }

  const handleNavigateToMap = (mapId: string) => {
    setCurrentMapId(mapId)
    setSelectedNode(null)
  }

  const runSearch = async (rawQuery: string) => {
    const normalizedQuery = rawQuery.trim()

    if (!normalizedQuery) {
      setRecentSearchMatches([])
      setRecentSearchQuery('')
      return
    }

    setSearchQuery(normalizedQuery)
    setIsSearching(true)

    try {
      console.log('[CWF] Searching for:', normalizedQuery, 'modelReady:', isModelReady)
      const { matches } = await searchWithSemanticFallback(normalizedQuery, allMaps, unlockedNodes, {
        isModelReady,
      })
      console.log('[CWF] Total matches:', matches.length, matches.slice(0, 5).map(m => m.title))

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
      setRecentSearchQuery(normalizedQuery)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = () => runSearch(searchQuery)

  const handleExploreExample = (query: string) => runSearch(query)

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

  const handleSelectRelatedNode = (node: Node) => {
    const nextNode = withUnlockedState(node, unlockedNodes)
    setSelectedNode(nextNode)
    clearSearch()

    const nextUnlockedNodes = autoUnlockNodeOnSelect(unlockedNodes, nextNode)
    if (nextUnlockedNodes !== unlockedNodes) {
      saveUnlockedNodeSet(nextUnlockedNodes)
    }
  }

  const handleSelectUnlockedRecord = (record: UnlockedNodeRecord) => {
    const targetMap = allMaps[record.mapId]
    const targetNode = targetMap.nodes.find((node) => node.id === record.node.id)

    if (!targetNode) {
      return
    }

    setCurrentMapId(record.mapId)
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
    recentSearchQuery,
    isSearching,
    isModelReady,
    selectedNodeLearningContext,
    unlockedNodeCollection,
    breadcrumbs,
    unlockedNodes,
    handleCategoryToggle,
    handleNodeClick,
    handleToggleLock,
    handleNodeDoubleClick,
    handleNavigateToMap,
    handleSearchSubmit,
    handleExploreExample,
    handleSelectRecentMatch,
    handleSelectRelatedNode,
    handleSelectUnlockedRecord,
    selectAllCategories() {
      setSelectedCategories(createAllCategorySelection())
    },
    clearCategories() {
      const nextCategories = createEmptyCategorySelection()
      setSelectedCategories(nextCategories)
      setSelectedNode((previousSelectedNode) =>
        reconcileSelectedNodeWithCategories(previousSelectedNode, nextCategories),
      )
    },
    closeDetailPanel() {
      setSelectedNode(closeSelectedNode())
    },
  }
}
