import { DetailPanel } from './components/DetailPanel'
import { GraphFilterBar } from './components/GraphFilterBar'
import { Graph2D } from './components/Graph2D'
import { Graph3D } from './components/Graph3D'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { WelcomeTooltip } from './components/WelcomeTooltip'
import { useCwfApp } from './hooks/use-cwf-app'

function App() {
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
    breadcrumbs,
    handleCategoryToggle,
    handleNodeClick,
    handleToggleLock,
    handleNodeDoubleClick,
    handleNavigateToMap,
    handleSearchSubmit,
    handleSelectRecentMatch,
    selectAllCategories,
    clearCategories,
    closeDetailPanel,
  } = useCwfApp()

  return (
    <div className="h-screen flex flex-col bg-white">
      <WelcomeTooltip />

      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        breadcrumbs={breadcrumbs}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          currentMap={currentMapId}
          recentSearchMatches={recentSearchMatches}
          onMapChange={handleNavigateToMap}
          onSelectRecentMatch={handleSelectRecentMatch}
        />

        <main className="flex-1 relative">
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
        </main>

        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            onClose={closeDetailPanel}
            onNavigateToMap={handleNavigateToMap}
          />
        )}
      </div>
    </div>
  )
}

export default App
