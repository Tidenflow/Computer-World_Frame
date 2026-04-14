export interface MapDomain {
  id: string;
  title: string;
  order: number;
}

export interface MapNodeDocument {
  id: string;
  title: string;
  domain: string;
  stage: number;
  deps: string[];
  aliases?: string[];
  tags?: string[];
  description?: string;
}

export interface MapDocument {
  mapId: string;
  version: string;
  domains: MapDomain[];
  nodes: MapNodeDocument[];
}

export interface MapProjection {
  nodeById: Record<string, MapNodeDocument>;
  childrenById: Record<string, string[]>;
  roots: string[];
  topologicalOrder: string[];
}

export interface UserProgressDocument {
  userId: number;
  mapId: string;
  mapVersion: string;
  unlocked: Record<string, { unlockedAt: number }>;
}

export function buildMapProjection(doc: MapDocument): MapProjection {
  const nodeById = Object.fromEntries(doc.nodes.map(node => [node.id, node]));
  const childrenById: Record<string, string[]> = {};

  for (const node of doc.nodes) {
    childrenById[node.id] ??= [];
    for (const depId of node.deps) {
      childrenById[depId] ??= [];
      childrenById[depId].push(node.id);
    }
  }

  const roots = doc.nodes.filter(node => node.deps.length === 0).map(node => node.id);
  const topologicalOrder = doc.nodes
    .slice()
    .sort((a, b) => a.stage - b.stage || a.title.localeCompare(b.title))
    .map(node => node.id);

  return {
    nodeById,
    childrenById,
    roots,
    topologicalOrder
  };
}
