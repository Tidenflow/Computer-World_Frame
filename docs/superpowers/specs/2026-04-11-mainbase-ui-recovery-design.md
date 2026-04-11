# Mainbase UI Recovery Design

## Goal

Recover the key frontend interaction quality that existed before the branch migration while keeping the current document-first data model unchanged.

This recovery focuses on visible regressions introduced during conflict resolution and branch stabilization, not on redesigning the UI system from scratch.

## Scope

The recovery includes:

1. Home sidebar collapse / expand interaction
2. Graph pan / zoom / focus behavior
3. Home profile brief and layout details that were present in the stronger pre-conflict UI
4. Mature graph interaction polish already proven in prior frontend iterations

The recovery does not include:

1. Reintroducing legacy node-first contracts
2. Restoring old `cwframe.layout.ts` / `cwframe.visibility.ts` unchanged
3. Redesigning graph positioning algorithms beyond what is needed for parity
4. New visual concepts unrelated to the regression

## Product Intention

The home page should again feel like an explorable knowledge surface rather than a static page with a graph embedded inside it.

The graph should support direct manipulation:

1. Users can collapse the sidebar to maximize graph space
2. Users can drag the graph viewport
3. Users can zoom with the mouse wheel
4. Search / latest unlock actions can focus the graph on relevant nodes

The left side should again carry useful context without overwhelming the graph:

1. Profile summary
2. Recent unlock history
3. Legend
4. Small usage hints

## Recovery Strategy

Use the current document-first frontend as the base and selectively port back the stronger UI behaviors from earlier commits.

The implementation should prefer adapting proven UI ideas into the current data access model:

1. `frameMap.document.nodes`
2. `frameMap.projection.nodeById`
3. `progress.unlocked`

Instead of restoring old files that depended on legacy contracts, the recovery should preserve the current data flow and only reintroduce the interaction layer and layout structure.

## Components Affected

### Home View

`frontend/src/views/HomeView.vue`

Responsibilities after recovery:

1. Restore sidebar collapse / expand control
2. Restore profile brief card in the left column
3. Preserve graph-first screen composition
4. Keep existing loading and error flow

### Graph

`frontend/src/components/CWFrameGraph.vue`

Responsibilities after recovery:

1. Restore viewport state for pan / zoom
2. Restore pointer drag interaction
3. Restore wheel zoom interaction
4. Restore graph focus behavior for search-driven navigation
5. Keep current document-first node/projection inputs
6. Preserve current visible-node filtering and graph styling where compatible

### Header / Supporting Panels

Reuse the current main-based header and panels where already stable.

Only adjust them if needed to support restored layout cohesion.

## Data Model Constraints

The restored UI must remain compatible with the current document-first architecture:

1. `MapDocument` remains the source of truth
2. `MapProjection` remains derived render structure
3. `UserProgressDocument` remains the progress format

No UI recovery step may depend on old `CWFrameNode`, `CWFrameMap`, or numeric node-id assumptions from the legacy branch.

## Visual / Interaction Rules

### Sidebar

1. Default to the compact graph-first layout already proven on the branch
2. Sidebar toggle must be obvious and reversible
3. Collapsing the sidebar must expand the graph area without layout breakage

### Graph

1. Dragging should feel smooth and direct
2. Zoom should anchor around the pointer position
3. Focus operations should center the relevant node cluster in a readable scale
4. Labels should remain density-aware to avoid clutter
5. Recent nodes should still receive visible emphasis

### Profile

1. Profile brief should be visible from home again
2. It should show current user identity and unlocked ratio
3. It should keep a direct path to the profile page

## Testing Plan

Verification should cover:

1. Frontend build passes
2. Existing API / progress tests still pass
3. Manual home-page regression check confirms:
   - sidebar can collapse and expand
   - graph can drag
   - graph can zoom
   - profile brief appears
   - search-to-focus still works

## Commit Plan

Prefer atomic commits:

1. Restore layout and sidebar behavior
2. Restore graph interaction behavior
3. Follow-up polish if needed

This keeps rollback and review straightforward if any piece regresses.
