import { prisma } from '../lib/prisma';
import type { CWFrameMap, CWFrameNode } from '@shared/contract';
import { readDefaultMapMeta } from '../data/default-map-meta';

export class MapRepo {
  async getDefaultMap(): Promise<CWFrameMap | null> {
    const defaultMapMeta = readDefaultMapMeta();
    const nodes = await prisma.node.findMany({
      where: {
        mapSlug: defaultMapMeta.slug,
      },
      include: {
        dependencies: true
      }
    });

    if (nodes.length === 0) return null;

    const cwfNodes: CWFrameNode[] = nodes.map(node => ({
      id: node.id,
      label: node.label,
      description: node.description || '',
      category: node.category || '',
      dependencies: node.dependencies.map(dep => dep.dependsOnNodeId),
      weight: node.weight ?? 5,
      tier: node.tier
    }));

    return {
      name: defaultMapMeta.name,
      slug: defaultMapMeta.slug,
      version: defaultMapMeta.version,
      nodes: cwfNodes
    };
  }
}

export const mapRepo = new MapRepo();
