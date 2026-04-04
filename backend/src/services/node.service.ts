import type { ApiResponse, CWFrameNode } from '@shared/contract';
import { prisma } from '../lib/prisma';
import { readDefaultMapMeta } from '../data/default-map-meta';

export class NodeService {
  async getAllNodes(): Promise<ApiResponse<CWFrameNode[]>> {
    const defaultMapMeta = readDefaultMapMeta();
    const nodes = await prisma.node.findMany({
      where: {
        mapSlug: defaultMapMeta.slug,
      },
      include: { dependencies: true }
    });

    const cwfNodes: CWFrameNode[] = nodes.map(node => ({
      id: node.id,
      label: node.label,
      description: node.description || '',
      category: node.category || '',
      dependencies: node.dependencies.map(dep => dep.dependsOnNodeId),
      weight: node.weight ?? 5,
      tier: node.tier
    }));

    return { success: true, data: cwfNodes, message: 'ok' };
  }

  async getNodeById(nodeId: number): Promise<ApiResponse<CWFrameNode>> {
    const defaultMapMeta = readDefaultMapMeta();
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid node ID' }
      };
    }

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: { dependencies: true }
    });

    if (!node || node.mapSlug !== defaultMapMeta.slug) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Node not found' }
      };
    }

    const cwfNode: CWFrameNode = {
      id: node.id,
      label: node.label,
      description: node.description || '',
      category: node.category || '',
      dependencies: node.dependencies.map(dep => dep.dependsOnNodeId),
      weight: node.weight ?? 5,
      tier: node.tier
    };

    return { success: true, data: cwfNode, message: 'ok' };
  }
}

export const nodeService = new NodeService();
