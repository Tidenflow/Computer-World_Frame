import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DetailPanel } from './components/DetailPanel';
import { SearchResults } from './components/SearchResults';
import { WelcomeTooltip } from './components/WelcomeTooltip';
import { Graph2D } from './components/Graph2D';
import { Graph3D } from './components/Graph3D';
import { Node, Domain } from './types';
import { allMaps } from './data';
import { loadUnlockedNodes, saveUnlockedNodes } from './storage';

function App() {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<Set<Domain>>(new Set());
  const [currentMapId, setCurrentMapId] = useState('root');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [unlockedNodes, setUnlockedNodes] = useState<Set<string>>(new Set());

  // Load unlocked nodes from localStorage
  useEffect(() => {
    setUnlockedNodes(loadUnlockedNodes());
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get current map data
  const currentMap = allMaps[currentMapId];

  // Add unlocked status to nodes
  const nodesWithStatus = useMemo(() => {
    return currentMap.nodes.map((node) => ({
      ...node,
      unlocked: unlockedNodes.has(node.id),
    }));
  }, [currentMap, unlockedNodes]);

  // Filter nodes by search
  const filteredNodes = useMemo(() => {
    if (!debouncedSearch) return nodesWithStatus;

    const query = debouncedSearch.toLowerCase();
    return nodesWithStatus.filter(
      (node) =>
        node.title.toLowerCase().includes(query) ||
        node.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
        node.aliases?.some((alias) => alias.toLowerCase().includes(query))
    );
  }, [nodesWithStatus, debouncedSearch]);

  // Search across all maps when searching
  const searchResults = useMemo(() => {
    if (!debouncedSearch) return [];

    const query = debouncedSearch.toLowerCase();
    const results: Node[] = [];

    Object.values(allMaps).forEach((map) => {
      map.nodes.forEach((node) => {
        const withStatus = { ...node, unlocked: unlockedNodes.has(node.id) };
        if (
          node.title.toLowerCase().includes(query) ||
          node.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          node.aliases?.some((alias) => alias.toLowerCase().includes(query))
        ) {
          results.push(withStatus);
        }
      });
    });

    return results;
  }, [debouncedSearch, unlockedNodes]);

  // Count unlocked nodes across all maps
  const totalUnlockedCount = useMemo(() => {
    let total = 0;
    let unlocked = 0;
    Object.values(allMaps).forEach((map) => {
      total += map.nodes.length;
      unlocked += map.nodes.filter((node) => unlockedNodes.has(node.id)).length;
    });
    return { total, unlocked };
  }, [unlockedNodes]);

  const handleDomainToggle = (domain: Domain) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setSearchQuery(''); // Clear search when clicking a node

    // Auto-unlock node on click (only if not already unlocked)
    if (!unlockedNodes.has(node.id)) {
      const newUnlocked = new Set(unlockedNodes);
      newUnlocked.add(node.id);
      setUnlockedNodes(newUnlocked);
      saveUnlockedNodes(newUnlocked);
    }
  };

  const handleToggleLock = (nodeId: string) => {
    const newUnlocked = new Set(unlockedNodes);
    if (newUnlocked.has(nodeId)) {
      newUnlocked.delete(nodeId);
    } else {
      newUnlocked.add(nodeId);
    }
    setUnlockedNodes(newUnlocked);
    saveUnlockedNodes(newUnlocked);
  };

  const handleNodeDoubleClick = (node: Node) => {
    // Center/focus on node (implementation depends on graph type)
    console.log('Double clicked:', node.title);
  };

  const handleNavigateToMap = (mapId: string) => {
    setCurrentMapId(mapId);
    setSelectedNode(null);
  };

  const breadcrumbs = useMemo(() => {
    const crumbs = ['计算机世界'];
    if (currentMapId !== 'root') {
      crumbs.push(currentMap.title);
    }
    return crumbs;
  }, [currentMapId, currentMap]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <WelcomeTooltip />
      
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        breadcrumbs={breadcrumbs}
      />

      {debouncedSearch && (
        <SearchResults
          results={searchResults}
          query={debouncedSearch}
          onSelectNode={handleNodeClick}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          selectedDomains={selectedDomains}
          onDomainToggle={handleDomainToggle}
          totalNodes={currentMap.nodes.length}
          unlockedCount={currentMap.nodes.filter((n) => unlockedNodes.has(n.id)).length}
          currentMap={currentMapId}
          onMapChange={handleNavigateToMap}
        />

        <main className="flex-1 relative">
          {viewMode === '2d' ? (
            <Graph2D
              nodes={filteredNodes}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              selectedDomains={selectedDomains}
              onToggleLock={handleToggleLock}
            />
          ) : (
            <Graph3D
              nodes={filteredNodes}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              selectedDomains={selectedDomains}
              unlockedCount={totalUnlockedCount.unlocked}
              totalNodes={totalUnlockedCount.total}
            />
          )}
        </main>

        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onNavigateToMap={handleNavigateToMap}
          />
        )}
      </div>
    </div>
  );
}

export default App;