import type { ApiResponse, CWFrameNodeDocument } from '@shared/contract';
import { mapRepo } from '../repositories/map.repo';

export class NodeService {
  async getAllNodes(): Promise<ApiResponse<CWFrameNodeDocument[]>> {
    const map = await mapRepo.getDefaultMap();
    if (!map) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'default map not found' }
      };
    }

    return { success: true, data: map.document.nodes, message: 'ok' };
  }

  async getNodeById(nodeId: string): Promise<ApiResponse<CWFrameNodeDocument>> {
    if (!nodeId.trim()) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid node ID' }
      };
    }

    const map = await mapRepo.getDefaultMap();
    if (!map) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'default map not found' }
      };
    }

    const node = map.projection.nodeById[nodeId];
    if (!node) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Node not found' }
      };
    }

    return { success: true, data: node, message: 'ok' };
  }
}

export const nodeService = new NodeService();
