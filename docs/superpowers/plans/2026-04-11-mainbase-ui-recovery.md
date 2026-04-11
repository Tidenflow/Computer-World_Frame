# Mainbase UI Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the missing home-page sidebar, profile brief, and graph pan/zoom/focus interactions on the main-based document-first branch.

**Architecture:** Keep the current document-first map payload and progress flow intact, and selectively reintroduce interaction logic from the stronger pre-conflict frontend commits. The home view owns layout and sidebar state, while the graph component owns viewport state and focus behavior.

**Tech Stack:** Vue 3, Pinia, TypeScript, SVG graph rendering, Vitest

---

### Task 1: Restore Home Layout Controls

**Files:**
- Modify: `frontend/src/views/HomeView.vue`

- [ ] Add sidebar collapse state and toggle button using the branch’s graph-first layout.
- [ ] Restore the home profile brief card with current user and unlocked ratio.
- [ ] Ensure progress total uses the current document-first shape, not legacy fields.
- [ ] Keep loading and error handling unchanged except where document-first compatibility requires small fixes.
- [ ] Commit with a layout-focused message after verification.

### Task 2: Restore Graph Interaction Layer

**Files:**
- Modify: `frontend/src/components/CWFrameGraph.vue`

- [ ] Reintroduce pan and wheel-zoom viewport state.
- [ ] Reintroduce focus-to-node behavior for search/unlock driven navigation.
- [ ] Preserve current document-first node and projection access.
- [ ] Keep density-aware labels and recent node emphasis where compatible.
- [ ] Commit with a graph-interaction-focused message after verification.

### Task 3: Verify Recovery

**Files:**
- Verify: `frontend/src/views/HomeView.vue`
- Verify: `frontend/src/components/CWFrameGraph.vue`
- Verify: `frontend/src/store/progress.store.ts`

- [ ] Run `npm run build` in `frontend`.
- [ ] Run `npm test -- cwframe.api.test.ts cwframe.progress-document.test.ts progress-validation.test.ts` in `test`.
- [ ] Confirm the page supports sidebar collapse, graph drag, graph zoom, profile brief visibility, and search-driven graph focus.
- [ ] Prepare the next atomic commit suggestion for the user.
