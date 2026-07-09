import { useState } from 'react'

import { DetailPanel } from './components/DetailPanel'
import { ExplorerIntro } from './components/ExplorerIntro'
import { GraphFilterBar } from './components/GraphFilterBar'
import { Graph2D } from './components/Graph2D'
import { Graph3D } from './components/Graph3D'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { UnlockedNodesView } from './components/UnlockedNodesView'
import { WelcomeTooltip } from './components/WelcomeTooltip'
import { useCwfApp } from './hooks/use-cwf-app'

const EXPLORER_INTRO_DISMISSED_KEY = 'cwf-explorer-intro-dismissed'

function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<'map' | 'unlocked'>('map')
  const [showExplorerIntro, setShowExplorerIntro] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    return window.localStorage.getItem(EXPLORER_INTRO_DISMISSED_KEY) !== 'true'
  })
  const {
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
    selectedNodeSavedResources,
    unlockedNodeCollection,
    breadcrumbs,
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
    addSavedResource,
    removeSavedResource,
    selectAllCategories,
    clearCategories,
    closeDetailPanel,
  } = useCwfApp()

  const dismissExplorerIntro = () => {
    setShowExplorerIntro(false)

    try {
      window.localStorage.setItem(EXPLORER_INTRO_DISMISSED_KEY, 'true')
    } catch {
      // Optional preference; the app keeps working if storage is unavailable.
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <WelcomeTooltip />

      <Header
        activeWorkspace={activeWorkspace}
        onWorkspaceChange={setActiveWorkspace}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        breadcrumbs={breadcrumbs}
        searchResults={recentSearchMatches}
        searchResultQuery={recentSearchQuery}
        isSearching={isSearching}
        isModelReady={isModelReady}
        onSelectSearchResult={(match) => {
          setActiveWorkspace('map')
          handleSelectRecentMatch(match)
        }}
      />

      <div className="flex-1 flex overflow-hidden relative bg-[#F6F8FB]">
        <Sidebar
          currentMap={currentMapId}
          selectedNodeId={selectedNode?.id ?? null}
          recentSearchMatches={recentSearchMatches}
          recentSearchQuery={recentSearchQuery}
          onMapChange={(mapId) => {
            setActiveWorkspace('map')
            handleNavigateToMap(mapId)
          }}
          onSelectRecentMatch={(match) => {
            setActiveWorkspace('map')
            handleSelectRecentMatch(match)
          }}
        />

        <main className="flex-1 relative">
          {activeWorkspace === 'unlocked' ? (
            <UnlockedNodesView
              records={unlockedNodeCollection}
              totalNodes={totalUnlockedCount.total}
              selectedNodeId={selectedNode?.id ?? null}
              onSelectRecord={handleSelectUnlockedRecord}
              onLocateRecord={(record) => {
                handleSelectUnlockedRecord(record)
                setActiveWorkspace('map')
              }}
            />
          ) : (
            <>
              <GraphFilterBar
                selectedCategories={selectedCategories}
                unlockedCount={currentMapUnlockedCount.unlocked}
                totalNodes={currentMapUnlockedCount.total}
                onCategoryToggle={handleCategoryToggle}
                onSelectAllCategories={selectAllCategories}
                onClearCategories={clearCategories}
              />

              {viewMode === '2d' ? (
                <Graph2D
                  nodes={filteredNodes}
                  selectedNode={selectedNode}
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleNodeDoubleClick}
                  selectedCategories={selectedCategories}
                  onToggleLock={handleToggleLock}
                />
              ) : (
                <Graph3D
                  nodes={filteredNodes}
                  selectedNode={selectedNode}
                  onNodeClick={handleNodeClick}
                  selectedCategories={selectedCategories}
                  unlockedCount={totalUnlockedCount.unlocked}
                  totalNodes={totalUnlockedCount.total}
                />
              )}

              {showExplorerIntro && !selectedNode && recentSearchMatches.length === 0 && !isSearching && (
                <ExplorerIntro
                  totalUnlocked={totalUnlockedCount.unlocked}
                  totalNodes={totalUnlockedCount.total}
                  isModelReady={isModelReady}
                  onExplore={(query) => {
                    dismissExplorerIntro()
                    handleExploreExample(query)
                  }}
                  onClose={dismissExplorerIntro}
                />
              )}
            </>
          )}

        </main>

        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            mapTitle={currentMap.title}
            learningContext={selectedNodeLearningContext}
            onClose={closeDetailPanel}
            onToggleLock={handleToggleLock}
            onNavigateToMap={handleNavigateToMap}
            onSelectNode={handleSelectRelatedNode}
            savedResources={selectedNodeSavedResources}
            onAddSavedResource={addSavedResource}
            onRemoveSavedResource={removeSavedResource}
          />
        )}
      </div>
    </div>
  )
}

export default App
