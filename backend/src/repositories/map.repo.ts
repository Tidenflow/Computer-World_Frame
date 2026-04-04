import { prisma } from '../lib/prisma';
import type { CWFrameMap, CWFrameNode } from '@shared/contract';

export class MapRepo {
  async getDefaultMap(): Promise<CWFrameMap | null> {
    const nodes = await prisma.node.findMany({
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
      version: '0.2',
      nodes: cwfNodes
    };
  }
}

export const mapRepo = new MapRepo();
