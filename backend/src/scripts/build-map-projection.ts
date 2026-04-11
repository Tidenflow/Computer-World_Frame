import { buildMapProjection, type MapDocument } from '../../../shared/map-document';

export function validateMapDocument(doc: MapDocument): void {
  const domainIds = new Set(doc.domains.map(domain => domain.id));
  const nodeIds = new Set(doc.nodes.map(node => node.id));

  for (const node of doc.nodes) {
    if (!domainIds.has(node.domain)) {
      throw new Error(`unknown domain: ${node.domain}`);
    }

    for (const depId of node.deps) {
      if (!nodeIds.has(depId)) {
        throw new Error(`missing dependency: ${depId}`);
      }
    }
  }
}

export function buildValidatedProjection(doc: MapDocument) {
  validateMapDocument(doc);
  return buildMapProjection(doc);
}
