# Map Storage Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `JSON -> nodes/dependencies tables -> graph response` pipeline with a document-centered architecture built around `MapDocument`, `MapProjection`, and versioned `UserProgress`.

**Architecture:** The refactor keeps MySQL and Prisma, but changes the source of truth from normalized node tables to JSON documents stored in `map_documents`. The backend validates and projects those documents into a render-friendly `MapProjection`, and the frontend consumes `MapDocument + MapProjection + UserProgress` instead of reconstructing the graph from raw node rows.

**Tech Stack:** TypeScript, Express, Prisma, MySQL, Vue 3, Pinia, Vitest, tsx

---

## File Structure

- `shared/contract.ts`
  Current cross-app API contract; will be slimmed and updated to the new document-centered shape.
- `shared/map-document.ts`
  New shared source for `MapDocument`, `MapProjection`, and `UserProgress` types plus projection helpers.
- `backend/prisma/schema.prisma`
  Replaces `Node` / `NodeDependency` as content-source tables with `MapDocumentRecord`, `MapProjectionRecord`, and document-style `UserProgress`.
- `backend/prisma/migrations/<timestamp>_map_document_refactor/`
  Prisma migration generated from the schema change.
- `backend/src/repositories/map.repo.ts`
  Stops reading node rows; becomes a thin document loader built on document/projection tables.
- `backend/src/repositories/progress.repo.ts`
  Stores and reads versioned progress documents.
- `backend/src/services/map.service.ts`
  Returns the new `MapDocument + MapProjection` response shape.
- `backend/src/services/progress.service.ts`
  Enforces `mapId + mapVersion`-aware progress handling.
- `backend/src/controllers/map.controller.ts`
  Stays thin but returns the new payload.
- `backend/src/controllers/progress.controller.ts`
  Accepts incremental unlock payloads and versioned progress updates.
- `backend/src/scripts/build-map-projection.ts`
  New shared script that validates a `MapDocument` and builds projection JSON.
- `backend/src/scripts/migrate-map-to-document.ts`
  One-time migration script that reads the current node tables and writes a `MapDocumentRecord`.
- `backend/src/data/maps/default.map.json`
  Canonical authoring document checked into the repo.
- `frontend/src/store/map.store.ts`
  Stops scanning raw arrays as the primary graph API; consumes `MapProjection`.
- `frontend/src/store/progress.store.ts`
  Switches to versioned progress and incremental unlock semantics.
- `frontend/src/core/cwframe.status.ts`
  Reads graph structure from `MapProjection`.
- `frontend/src/core/cwframe.loader.ts`
  Loads the richer map payload.
- `test/frontendToBackendTest/*.test.ts`
  Existing front-to-back contract tests that need updates for the new payload shape.
- `test/backend/map-document.test.ts`
  New tests for projection building and document validation.
- `docs/superpowers/specs/2026-04-11-map-storage-refactor-design.md`
  Approved design source; implementation must stay aligned with it.

### Task 1: Define the shared document-centered contract

**Files:**
- Create: `shared/map-document.ts`
- Modify: `shared/contract.ts`
- Test: `test/frontendToBackendTest/map-document.contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from 'vitest';
import { buildMapProjection, type MapDocument } from '../../shared/map-document';

describe('buildMapProjection', () => {
  it('builds projection data from a minimal map document', () => {
    const doc: MapDocument = {
      mapId: 'computer-world',
      version: '2026-04-11',
      domains: [{ id: 'hardware', title: 'Hardware', order: 1 }],
      nodes: [
        { id: 'cpu-basics', title: 'CPU Basics', domain: 'hardware', stage: 1, deps: [] },
        { id: 'binary', title: 'Binary', domain: 'hardware', stage: 2, deps: ['cpu-basics'] }
      ]
    };

    const projection = buildMapProjection(doc);

    expect(projection.roots).toEqual(['cpu-basics']);
    expect(projection.childrenById['cpu-basics']).toEqual(['binary']);
    expect(projection.nodeById['binary'].stage).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- map-document.contract.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: FAIL with `Cannot find module '../../shared/map-document'`

- [ ] **Step 3: Add the new shared types and helper**

```ts
// shared/map-document.ts
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

  return {
    nodeById,
    childrenById,
    roots,
    topologicalOrder: doc.nodes
      .slice()
      .sort((a, b) => a.stage - b.stage || a.title.localeCompare(b.title))
      .map(node => node.id)
  };
}
```

- [ ] **Step 4: Update the existing shared contract to reference the new document model**

```ts
// shared/contract.ts
import type { MapDocument, MapProjection, UserProgressDocument } from './map-document';

export interface CWFrameMapPayload {
  document: MapDocument;
  projection: MapProjection;
}

export type GetMapResponse = ApiResponse<CWFrameMapPayload>;
export type GetProgressResponse = ApiResponse<UserProgressDocument>;
```

- [ ] **Step 5: Run the contract test again**

Run: `npm test -- map-document.contract.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add shared/map-document.ts shared/contract.ts test/frontendToBackendTest/map-document.contract.test.ts
git commit -m "feat: define document-centered map contracts"
```

### Task 2: Refactor Prisma schema to document tables and versioned progress

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_map_document_refactor/migration.sql`
- Test: `test/backend/prisma-document-schema.test.ts`

- [ ] **Step 1: Write the failing schema expectation test**

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('schema.prisma', () => {
  it('defines document-based map tables', () => {
    const schema = fs.readFileSync(
      path.resolve(__dirname, '../../backend/prisma/schema.prisma'),
      'utf8'
    );

    expect(schema).toContain('model MapDocumentRecord');
    expect(schema).toContain('documentJson Json');
    expect(schema).toContain('model MapProjectionRecord');
    expect(schema).toContain('mapVersion String');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prisma-document-schema.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: FAIL because the current schema still defines `Node` and `NodeDependency`

- [ ] **Step 3: Replace content-source tables in Prisma**

```prisma
model MapDocumentRecord {
  id           Int                   @id @default(autoincrement())
  mapId        String                @map("map_id") @db.VarChar(100)
  version      String                @db.VarChar(100)
  status       String                @default("draft") @db.VarChar(20)
  documentJson Json                  @map("document_json")
  createdAt    DateTime              @default(now()) @map("created_at")
  publishedAt  DateTime?             @map("published_at")
  projection   MapProjectionRecord?

  @@unique([mapId, version], name: "uk_map_version")
  @@index([mapId, status])
  @@map("map_documents")
}

model MapProjectionRecord {
  id            Int               @id @default(autoincrement())
  mapDocumentId Int               @unique @map("map_document_id")
  projectionJson Json             @map("projection_json")
  generatedAt   DateTime          @default(now()) @map("generated_at")
  mapDocument   MapDocumentRecord @relation(fields: [mapDocumentId], references: [id], onDelete: Cascade)

  @@map("map_projections")
}

model UserProgress {
  id           Int      @id @default(autoincrement())
  userId       Int      @map("user_id")
  mapId        String   @map("map_id") @db.VarChar(100)
  mapVersion   String   @map("map_version") @db.VarChar(100)
  progressJson Json     @map("progress_json")
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at")
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, mapId, mapVersion], name: "uk_user_map_version")
  @@index([userId, mapId])
  @@map("user_progress")
}
```

- [ ] **Step 4: Generate and check in the migration**

Run: `npx prisma migrate dev --name map_document_refactor`
Workdir: `e:\Github\Computer-World_Frame\backend`
Expected: Prisma creates a migration replacing node-source tables with document tables

- [ ] **Step 5: Run the schema test again**

Run: `npm test -- prisma-document-schema.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations test/backend/prisma-document-schema.test.ts
git commit -m "refactor: move prisma schema to map documents and versioned progress"
```

### Task 3: Add document validation, projection building, and data migration scripts

**Files:**
- Create: `backend/src/scripts/build-map-projection.ts`
- Create: `backend/src/scripts/migrate-map-to-document.ts`
- Create: `backend/src/data/maps/default.map.json`
- Test: `test/backend/map-projection.script.test.ts`

- [ ] **Step 1: Write the failing projection test**

```ts
import { describe, expect, it } from 'vitest';
import { validateMapDocument } from '../../backend/src/scripts/build-map-projection';

describe('validateMapDocument', () => {
  it('rejects nodes that reference missing dependencies', () => {
    expect(() =>
      validateMapDocument({
        mapId: 'computer-world',
        version: '2026-04-11',
        domains: [{ id: 'software', title: 'Software', order: 1 }],
        nodes: [{ id: 'api', title: 'API', domain: 'software', stage: 1, deps: ['missing-node'] }]
      })
    ).toThrow(/missing dependency/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- map-projection.script.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: FAIL with `Cannot find module '../../backend/src/scripts/build-map-projection'`

- [ ] **Step 3: Implement validation and projection builder**

```ts
// backend/src/scripts/build-map-projection.ts
import { buildMapProjection, type MapDocument } from '../../../shared/map-document';

export function validateMapDocument(doc: MapDocument): void {
  const domainIds = new Set(doc.domains.map(domain => domain.id));
  const nodeIds = new Set(doc.nodes.map(node => node.id));

  for (const node of doc.nodes) {
    if (!domainIds.has(node.domain)) throw new Error(`unknown domain: ${node.domain}`);
    for (const depId of node.deps) {
      if (!nodeIds.has(depId)) throw new Error(`missing dependency: ${depId}`);
    }
  }
}

export function buildValidatedProjection(doc: MapDocument) {
  validateMapDocument(doc);
  return buildMapProjection(doc);
}
```

- [ ] **Step 4: Add the canonical authoring file and migration script**

```json
// backend/src/data/maps/default.map.json
{
  "mapId": "computer-world",
  "version": "2026-04-11",
  "domains": [
    { "id": "hardware", "title": "Hardware", "order": 1 },
    { "id": "software", "title": "Software", "order": 2 }
  ],
  "nodes": []
}
```

```ts
// backend/src/scripts/migrate-map-to-document.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma';
import { buildValidatedProjection } from './build-map-projection';
import type { MapDocument } from '../../../shared/map-document';

async function main() {
  const filePath = path.resolve(process.cwd(), 'src/data/maps/default.map.json');
  const raw = await fs.readFile(filePath, 'utf8');
  const document = JSON.parse(raw) as MapDocument;
  const projection = buildValidatedProjection(document);

  const saved = await prisma.mapDocumentRecord.create({
    data: {
      mapId: document.mapId,
      version: document.version,
      status: 'published',
      documentJson: document,
      publishedAt: new Date()
    }
  });

  await prisma.mapProjectionRecord.create({
    data: {
      mapDocumentId: saved.id,
      projectionJson: projection
    }
  });
}

void main();
```

- [ ] **Step 5: Run the test again**

Run: `npm test -- map-projection.script.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/scripts/build-map-projection.ts backend/src/scripts/migrate-map-to-document.ts backend/src/data/maps/default.map.json test/backend/map-projection.script.test.ts
git commit -m "feat: add map document validation and projection scripts"
```

### Task 4: Refactor backend repositories and services to serve document payloads

**Files:**
- Modify: `backend/src/repositories/map.repo.ts`
- Modify: `backend/src/repositories/progress.repo.ts`
- Modify: `backend/src/services/map.service.ts`
- Modify: `backend/src/services/progress.service.ts`
- Modify: `backend/src/controllers/progress.controller.ts`
- Modify: `backend/src/controllers/map.controller.ts`
- Test: `test/frontendToBackendTest/cwframe.api.test.ts`

- [ ] **Step 1: Write the failing API-shape test**

```ts
import { describe, expect, it } from 'vitest';
import { mapService } from '../../backend/src/services/map.service';

describe('mapService.getDefaultMap', () => {
  it('returns document and projection instead of raw nodes', async () => {
    const result = await mapService.getDefaultMap();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.document.mapId).toBe('computer-world');
      expect(result.data.projection.nodeById).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cwframe.api.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: FAIL because the current service still returns `{ version, nodes }`

- [ ] **Step 3: Change map repository/service to load document records**

```ts
// backend/src/repositories/map.repo.ts
import type { CWFrameMapPayload } from '@shared/contract';
import { prisma } from '../lib/prisma';

export class MapRepo {
  async getDefaultMap(): Promise<CWFrameMapPayload | null> {
    const record = await prisma.mapDocumentRecord.findFirst({
      where: { mapId: 'computer-world', status: 'published' },
      include: { projection: true },
      orderBy: { publishedAt: 'desc' }
    });

    if (!record || !record.projection) return null;

    return {
      document: record.documentJson as CWFrameMapPayload['document'],
      projection: record.projection.projectionJson as CWFrameMapPayload['projection']
    };
  }
}
```

- [ ] **Step 4: Change progress repository/service to versioned JSON documents**

```ts
// backend/src/repositories/progress.repo.ts
import type { UserProgressDocument } from '@shared/map-document';

export class ProgressRepo {
  async findByUserMapVersion(userId: number, mapId: string, mapVersion: string) {
    const record = await prisma.userProgress.findUnique({
      where: {
        uk_user_map_version: { userId, mapId, mapVersion }
      }
    });

    return (record?.progressJson as UserProgressDocument | null) ?? null;
  }

  async upsertProgress(progress: UserProgressDocument): Promise<UserProgressDocument> {
    await prisma.userProgress.upsert({
      where: {
        uk_user_map_version: {
          userId: progress.userId,
          mapId: progress.mapId,
          mapVersion: progress.mapVersion
        }
      },
      update: { progressJson: progress },
      create: {
        userId: progress.userId,
        mapId: progress.mapId,
        mapVersion: progress.mapVersion,
        progressJson: progress
      }
    });

    return progress;
  }
}
```

- [ ] **Step 5: Update controller API for incremental unlocks**

```ts
// backend/src/controllers/progress.controller.ts
const { mapId, mapVersion, nodeId } = req.body as {
  mapId?: unknown;
  mapVersion?: unknown;
  nodeId?: unknown;
};

const result = await progressService.unlockNode({
  userId,
  mapId: String(mapId),
  mapVersion: String(mapVersion),
  nodeId: String(nodeId)
});
```

- [ ] **Step 6: Run the API test again**

Run: `npm test -- cwframe.api.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: PASS

- [ ] **Step 7: Run backend build**

Run: `npm run build`
Workdir: `e:\Github\Computer-World_Frame\backend`
Expected: PASS with updated TypeScript contracts

- [ ] **Step 8: Commit**

```bash
git add backend/src/repositories/map.repo.ts backend/src/repositories/progress.repo.ts backend/src/services/map.service.ts backend/src/services/progress.service.ts backend/src/controllers/map.controller.ts backend/src/controllers/progress.controller.ts test/frontendToBackendTest/cwframe.api.test.ts
git commit -m "refactor: serve map documents and versioned progress"
```

### Task 5: Refactor frontend stores and loaders to consume projection data

**Files:**
- Modify: `frontend/src/core/cwframe.loader.ts`
- Modify: `frontend/src/core/cwframe.status.ts`
- Modify: `frontend/src/store/map.store.ts`
- Modify: `frontend/src/store/progress.store.ts`
- Test: `test/frontendToBackendTest/cwframe.loader.test.ts`
- Test: `test/frontendToBackendTest/cwframe.progress-document.test.ts`

- [ ] **Step 1: Write the failing loader test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { loadFrameMap } from '../../frontend/src/core/cwframe.loader';

describe('loadFrameMap', () => {
  it('returns document and projection payload from the backend response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          document: { mapId: 'computer-world', version: '2026-04-11', domains: [], nodes: [] },
          projection: { nodeById: {}, childrenById: {}, roots: [], topologicalOrder: [] }
        }
      })
    }));

    const result = await loadFrameMap();

    expect(result.document.mapId).toBe('computer-world');
    expect(result.projection.topologicalOrder).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cwframe.loader.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: FAIL because the loader still expects `{ version, nodes }`

- [ ] **Step 3: Update the frontend loader and status builder**

```ts
// frontend/src/core/cwframe.status.ts
import type { MapNodeDocument, UserProgressDocument } from '@shared/map-document';
import type { CWFrameMapPayload } from '@shared/contract';

function getNodeStatus(node: MapNodeDocument, progress: UserProgressDocument) {
  if (progress.unlocked[node.id]) return 'Unlocked';
  return node.deps.every(depId => progress.unlocked[depId]) ? 'Discoverable' : 'Locked';
}

export function buildStatusMap(map: CWFrameMapPayload, progress: UserProgressDocument) {
  return Object.fromEntries(
    map.projection.topologicalOrder.map(nodeId => {
      const node = map.projection.nodeById[nodeId];
      return [nodeId, getNodeStatus(node, progress)];
    })
  );
}
```

- [ ] **Step 4: Update the Pinia stores to use document/projection/progress separation**

```ts
// frontend/src/store/map.store.ts
const frameMap = ref<CWFrameMapPayload | null>(null);

const selectedNode = computed(() => {
  if (!frameMap.value || selectedNodeId.value === null) return null;
  return frameMap.value.projection.nodeById[selectedNodeId.value] ?? null;
});
```

```ts
// frontend/src/store/progress.store.ts
const progress = reactive<UserProgressDocument>({
  userId: userStore.userId,
  mapId: 'computer-world',
  mapVersion: '',
  unlocked: {}
});
```

- [ ] **Step 5: Add the new progress-shape test**

```ts
import { describe, expect, it } from 'vitest';
import { buildStatusMap } from '../../frontend/src/core/cwframe.status';

describe('buildStatusMap', () => {
  it('uses projection order with versioned progress documents', () => {
    const map = {
      document: { mapId: 'computer-world', version: '2026-04-11', domains: [], nodes: [] },
      projection: {
        nodeById: {
          cpu: { id: 'cpu', title: 'CPU', domain: 'hardware', stage: 1, deps: [] }
        },
        childrenById: { cpu: [] },
        roots: ['cpu'],
        topologicalOrder: ['cpu']
      }
    };

    const progress = {
      userId: 1,
      mapId: 'computer-world',
      mapVersion: '2026-04-11',
      unlocked: {}
    };

    expect(buildStatusMap(map as any, progress as any).cpu).toBe('Discoverable');
  });
});
```

- [ ] **Step 6: Run frontend tests again**

Run: `npm test -- cwframe.loader.test.ts cwframe.progress-document.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: PASS

- [ ] **Step 7: Run frontend build**

Run: `npm run build`
Workdir: `e:\Github\Computer-World_Frame\frontend`
Expected: PASS with updated shared types

- [ ] **Step 8: Commit**

```bash
git add frontend/src/core/cwframe.loader.ts frontend/src/core/cwframe.status.ts frontend/src/store/map.store.ts frontend/src/store/progress.store.ts test/frontendToBackendTest/cwframe.loader.test.ts test/frontendToBackendTest/cwframe.progress-document.test.ts
git commit -m "refactor: consume projected map documents in frontend"
```

### Task 6: Final verification, docs sync, and old-path cleanup

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-04-11-map-storage-refactor-design.md`
- Delete: `backend/src/repositories/node.repo.ts` (if still unused)
- Delete: `backend/src/services/node.service.ts` (if still unused)
- Delete: `backend/src/controllers/node.controller.ts` (if still unused)
- Test: `test/frontendToBackendTest/cwframe.api.test.ts`
- Test: `test/frontendToBackendTest/cwframe.loader.test.ts`

- [ ] **Step 1: Write the cleanup checklist into docs**

```md
## Map Authoring Workflow

1. Edit `backend/src/data/maps/default.map.json`
2. Run `npx tsx src/scripts/migrate-map-to-document.ts`
3. Verify the generated `MapProjection`
4. Start backend and frontend normally
```

- [ ] **Step 2: Remove dead node-first code paths if they are no longer referenced**

```ts
// Use ripgrep before deleting:
// rg -n "nodeService|nodeController|NodeDependency|prisma.node" backend frontend shared
```

- [ ] **Step 3: Run the focused regression suite**

Run: `npm test -- cwframe.api.test.ts cwframe.loader.test.ts`
Workdir: `e:\Github\Computer-World_Frame\test`
Expected: PASS

- [ ] **Step 4: Run backend build one last time**

Run: `npm run build`
Workdir: `e:\Github\Computer-World_Frame\backend`
Expected: PASS

- [ ] **Step 5: Run frontend build one last time**

Run: `npm run build`
Workdir: `e:\Github\Computer-World_Frame\frontend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add README.md docs/superpowers/specs/2026-04-11-map-storage-refactor-design.md backend frontend shared test
git commit -m "chore: finalize map storage document refactor"
```

---

## Self-Review

**1. Spec coverage:** This plan covers the approved architecture in the spec: document-first content storage, projection generation, versioned progress, continued MySQL usage, and frontend consumption through projection instead of raw node arrays.

**2. Placeholder scan:** No `TODO`, `TBD`, or “similar to above” placeholders remain. Each task includes exact files, code snippets, commands, and expected outcomes.

**3. Type consistency:** The plan consistently uses `MapDocument`, `MapProjection`, `UserProgressDocument`, `mapId`, `mapVersion`, and string-based node IDs from Task 1 onward.

Plan complete and saved to `docs/superpowers/plans/2026-04-11-map-storage-refactor-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
