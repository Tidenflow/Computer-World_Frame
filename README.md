# Computer World Frame (CWF) 🌐

> Turn scattered computer terms into a living knowledge map, a personal learning record, and a community-built open source world.

[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=white)](./frontend)
[![Build](https://img.shields.io/badge/build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](./frontend)
[![Status](https://img.shields.io/badge/status-frontend%20validation-orange?style=for-the-badge)](#-current-stage)
[![Storage](https://img.shields.io/badge/progress-localStorage-0EA5E9?style=for-the-badge)](#-current-frontend-capabilities)
[![Roadmap](https://img.shields.io/badge/roadmap-matching%20%E2%86%92%20notes%20%E2%86%92%20community-22C55E?style=for-the-badge)](#-roadmap)
[![License](https://img.shields.io/badge/license-MIT-black?style=for-the-badge)](./LICENSE)

`Computer World Frame` is an exploration-first learning project for beginners.

The core idea is simple: most people do not fail at computer science because they are not smart enough. They get blocked because they only see isolated words like `Linux`, `I/O`, `Docker`, `Transformer`, `CPU`, `React`, without a map that explains how those things connect.

CWF wants to be that map.

Not a static glossary.

Not just a graph demo.

A system that helps users:

- match vague or messy terms into a structured computer-world model
- build their own learning record around each node
- navigate from any starting point through prerequisites and next-step suggestions
- eventually co-create an open source contribution map with others

## ✨ Why This Project Is Interesting

### 🧠 1. Semantic Matching Engine

This is the most distinctive part of CWF.

Users do not always search with standard terminology. They might type:

- "苹果系统"
- "做网页的那个语言"
- "AI 画图"
- "后端运行环境"

The matching engine maps these inputs into standard nodes such as:

- `macOS`
- `HTML / CSS / JavaScript`
- `Midjourney / Stable Diffusion`
- `Node.js`

**Every search result now carries an explainable match reason** — the system tells you *why* a result appeared: whether it matched by `标题匹配` (title), `别名匹配` (alias), `标签匹配` (tag), or `相关概念` (semantic relevance). This transparency turns the search box from a black box into a learning tool: you see not just *what* matched, but *how* the system understood your input.

This is where CWF becomes more than a search box. It becomes a matching layer between human language and a structured computer knowledge world.

Current matching stack:

- string matching (title, tags, aliases)
- explainable match labeling per result
- debounced input with preserved search context
- client-side `transformers.js` semantic fallback (in progress)
- future LLM-assisted routing when needed

### 📝 2. Dual Workspace: Map Explorer + My Knowledge Space

The app now operates across two workspaces, reflecting a deeper product insight: **exploration and accumulation are two sides of the same learning coin**.

**🗺️ Map Explorer** — the original knowledge graph view:
- 2D / 3D interactive graph switching
- category filtering, cursor-centered zoom, drag-to-pan
- node selection with rich detail panel
- cross-map navigation with breadcrumb trails

**✅ My Knowledge Space (已点亮节点)** — a dedicated personal learning workspace:
- aggregates every node you've unlocked across *all* maps into one unified view
- filter by source map, search within your unlocked collection
- progress visualization showing how much of the total knowledge world you've illuminated
- one-click navigation back to any unlocked node's position in its original map

This dual-workspace design makes a clear semantic distinction: the map is for discovery, the knowledge space is for ownership. You explore in one, you grow in the other.

### 🧭 3. Learning Path Navigation

Around each node, the detail panel now surfaces a **learning context** — it answers "what should I know before this?" and "where should I go next?":

- **Prerequisites** — the dependencies (`deps`) that a node builds upon, resolved into human-readable labels
- **Next Steps** — children (sub-topics) and siblings (peer topics) suggested from the graph structure

This transforms the detail panel from a static info card into a **navigation hub for learning**. You can walk the knowledge graph by tapping from node to node, following prerequisites upstream or exploring siblings and children downstream.

### 🎯 4. Guided Onboarding

First-time visitors are welcomed with an **ExplorerIntro** overlay that frames the product's mental model:

- a one-line value proposition: "从一个听过的词开始，定位它在计算机世界里的位置"
- curated example queries covering Web, AI, backend, and hardware domains
- pre-built learning path previews (Web 开发, AI 入门, 后端基础)
- current unlock progress at a glance

The intro is dismissible but can be re-triggered, serving as both onboarding and a persistent reference for how the product works.

### 🗺️ 5. Open Source Contribution Map

The final form of CWF is not "one person maintains a map forever."

It should grow into a community-built world where contributors can improve:

- nodes
- aliases and synonyms
- relationships
- recommended resources
- learning paths
- explanations and annotations

That turns the map itself into a living open source artifact.

## 🚀 Product Vision

If computer science is a city, beginners should not be handed a spreadsheet full of coordinates.

They should be handed a map that lights up as they explore.

CWF is trying to become that map.

The vision is:

1. You type any word you know
2. The system matches it into the right part of the map — and tells you *why*
3. The map reveals structure, neighbors, prerequisites, and learning paths
4. You leave your own notes and progress behind, growing your personal knowledge space
5. Over time, the community helps the map get smarter and richer

## 🎯 Current Stage

Right now, **it is completely reasonable to prioritize the frontend first**.

That is not a compromise. It is the right order for this project.

At this stage, the important questions are:

- Is the matching layer actually useful — and does explainable matching help users trust it?
- Does the dual-workspace model (exploration + accumulation) create real retention?
- Do learning-context suggestions (prerequisites → node → next steps) guide meaningful exploration?
- Does the contribution-map concept feel worth growing?

All of these can be validated before investing heavily in backend complexity.

So the current strategy is:

- make the frontend feel like a real product first
- let the backend come later as the system-strengthening layer

Backend is still important, just not the first thing that determines whether CWF is meaningful.

## 🔍 Semantic Search Pipeline

The matching layer is a **two-stage pipeline**: fast rule-based matching first, then embedding-based semantic search as a fallback. The entire pipeline runs client-side — no server, no API keys, no network requests after initial page load.

### Stage 1: Rule-Based Matching (synchronous, instant)

Before any AI model runs, the system tries to match the query using deterministic rules:

1. **Synonym expansion** — a curated dictionary of ~400 Chinese↔English mappings ([synonyms.ts](frontend/src/app/data/synonyms.ts)) expands informal queries into standard search tokens. For example, `"AI画图"` expands to `["Midjourney", "Stable Diffusion", "DALL-E", "Flux", "diffusion model"]`.

2. **Pinyin initials matching** — if the query looks like pinyin abbreviations (e.g. `"wltx"`), the system extracts pinyin initials from every Chinese node title and matches against them. `"wltx"` matches `"网络通信"`.

3. **Substring matching** — each expanded variant is matched against node `title`, `tags`, and `aliases` with case-insensitive `includes()`.

Every result from Stage 1 carries a **match label** that explains *why* it was returned:

| Match Type | Label | Meaning |
|---|---|---|
| Title contains query | `标题匹配` | Direct name match — highest confidence |
| Alias contains query | `别名匹配` | Query matched a synonym or alternative name |
| Tag contains query | `标签匹配` | Query matched a category or domain tag |
| Semantic / other | `相关概念` | Embedding-based concept-level match |

### Stage 2: Embedding-Based Semantic Search (async, ~0–50ms)

When rule-based results are sparse (fewer than 3), the pipeline falls back to **vector similarity search** powered by [Transformers.js](https://github.com/xenova/transformers.js). Here's how it works:

#### Build-Time: Embedding Precomputation

```
Map JSON data (8 files, ~200 nodes)
        │
        ▼
precompute-embeddings.ts    ←  npx tsx scripts/precompute-embeddings.ts
        │
        ├── 1. Reads all map JSON files (root, fundamentals, hardware,
        │       software, programming, ai, network, etc.)
        │
        ├── 2. For each node, constructs a text snippet:
        │       "{title}. {description} {tags}"
        │       e.g. "Docker. 容器化平台，打包和运行应用 container virtualization devops"
        │
        ├── 3. Loads Xenova/multilingual-e5-small model (~120 MB)
        │       via Transformers.js in Node.js
        │
        ├── 4. Runs feature-extraction pipeline over all nodes in batches of 32
        │       → each node becomes a 384-dimensional normalized vector
        │
        └── 5. Writes embeddings.json (~470 KB) to public/:
                {
                  "hash": "a3f8c1d2",   ← FNV-1a hash of all node data
                  "embeddings": [[...], ...],   ← 384-dim vectors
                  "nodeIds": ["docker", ...]     ← parallel index
                }
```

The `embeddings.json` file is **committed to git** and bundled with every frontend build. This means the embedding vectors are pre-shipped — users don't compute them at runtime.

#### Runtime: Hot-Loading Chain

When the app starts, `preloadModel()` kicks off a **hot-loading chain**:

```
app startup
    │
    ├── 1. Fetch /embeddings.json → compare data hash with current map data
    │       └── hash match → embeddings are fresh, 0ms ready
    │       └── hash mismatch → fall through to IndexedDB cache or recompute
    │
    ├── 2. Load the Transformers.js model pipeline in the background
    │       └── Xenova/multilingual-e5-small loaded from /models/ (local bundle)
    │       └── WASM backends loaded from /wasm/
    │       └── ~120 MB model, cached by browser Cache API
    │
    └── 3. Model ready → semantic search is live
            └── Subsequent searches: embed query → cosine similarity → top-K
```

#### Runtime: Query Execution

When a user searches and the model is ready:

```
user query: "AI 画图"
    │
    ├── Stage 1: rule-based matching
    │   └── synonym expansion → "Midjourney", "Stable Diffusion", "DALL-E"...
    │   └── matches found via title/tag/alias → results returned instantly
    │
    ├── Stage 2: semantic fallback (runs in parallel when model is ready)
    │   ├── Embed query → 384-dim normalized vector (single pipeline call)
    │   ├── Cosine similarity against all precomputed node embeddings
    │   ├── Sort descending → take top-K (default 10)
    │   └── Merge into results, deduplicating against Stage 1
    │
    └── Results capped at 5, with match labels explaining each hit
```

#### Embedding Cache Strategy (3-Tier Fallback)

Node embeddings are resolved in priority order:

| Priority | Source | Latency | When |
|---|---|---|---|
| 1 | `public/embeddings.json` (precomputed) | 0ms | Always on first load — bundled with build |
| 2 | IndexedDB (`cwf-embeddings` store) | ~1ms | Runtime cache from a previous session |
| 3 | Runtime computation via Transformers.js | ~15s | Data changed and no cache hit (rare) |

The cache key is an **FNV-1a 32-bit hash** of all node `(id, title, description, tags)` tuples across all maps. When any node data changes, the hash changes, and embeddings are transparently regenerated.

#### Model: Xenova/multilingual-e5-small

- **384-dimensional** embeddings — small enough for fast in-browser cosine similarity
- **Multilingual** — supports both Chinese and English queries natively
- **Quantized** ONNX model (~120 MB) — runs in the browser via ONNX Runtime Web
- **Locally bundled** — model files served from `public/models/`, no external CDN dependency at runtime
- **WASM backends** — ONNX runtime WASM files served from `public/wasm/`, avoiding jsDelivr CDN

### Why This Pipeline Design?

The two-stage design reflects a deliberate trade-off:

- **Stage 1 handles ~80% of queries** — beginners type informal Chinese terms, and the synonym dictionary catches most of them. Rule-based matching is instant, deterministic, and explainable.
- **Stage 2 catches the long tail** — when someone types a genuinely novel or vague query ("那个让电脑变快的东西"), embedding similarity finds conceptually related nodes that substring matching would miss.
- **Precomputed embeddings ship with the app** — every user gets instant semantic search on first use. No waiting for a model to download and compute vectors.

## 🧩 Current Frontend Capabilities

The frontend already supports a meaningful interaction loop:

### Map Explorer Workspace
- 2D / 3D knowledge map switching with refined rendering
- node selection, unlock state, and rich detail panel with learning context
- category filtering with `All` and `Clear`
- cursor-centered zoom and drag-to-pan in 2D
- cross-map navigation with breadcrumb trails
- static-data search with explainable match labels

### My Knowledge Space
- unified view of all unlocked nodes across every map
- per-map filtering and in-collection search
- progress bar with count and percentage visualization
- one-click navigation back to any unlocked node's map location

### Detail Panel
- node description with category, map origin, and unlock status
- prerequisite dependency labels ("you should know these first")
- next-step suggestions from children and sibling nodes
- external link support and lock/unlock toggle

### Persistence
- local progress tracked via `localStorage`
- explorer intro dismissal preference
- unlocked node set saved across sessions

At the moment, user progress is stored locally in the browser. That is perfect for the current validation phase.

## 🛠️ Tech Direction

Current stack:

- `React`
- `TypeScript`
- `Vite`
- local-first state and persistence
- graph-style interaction design (2D canvas + 3D Three.js)

Technical areas this project is meant to explore:

- frontend architecture with multi-workspace routing
- interactive knowledge maps (2D and 3D)
- rule-based and semantic matching with explainable results
- local-first product validation
- learning-context computation from graph topology
- future AI-assisted knowledge navigation

## 🗺️ Roadmap

### Phase 1: Frontend Validation

- sharpen matching rules with richer explainability
- improve graph interactions and 3D rendering
- deepen the dual-workspace experience (exploration + accumulation)
- add stronger note-taking and learning-record flows
- validate whether users actually want to learn through this model

### Phase 2: Sync and Persistence

- add backend persistence
- support accounts and multi-device sync
- manage learning records, progress, and versioned map data

### Phase 3: Community Contribution

- introduce contribution proposals
- review and merge aliases, nodes, and learning-path updates
- grow CWF into an open source contribution map

## 💡 Why Build This

Many "computer introduction" learning experiences fail because they assume the learner already has a mental structure.

CWF is built on the opposite assumption:

- the learner may start anywhere
- the learner may use messy or non-standard language
- the system should explain *how* it understood the input, not just return results
- the system should connect first, then deepen understanding
- exploration and accumulation should feel like two parts of the same loop

Whether someone starts from `CPU`, `Python`, `Linux`, `WiFi`, or `ChatGPT`, they should still be able to find their place in the same world — and walk away with a growing, personal map of what they've learned.

## 📦 Local Development

Frontend lives in [`frontend/`](./frontend).

Install and run:

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
cd frontend
npm run build
```

Tests:

```bash
cd frontend
npm test -- --run
```

## 📍 One-Line Summary

**CWF is not trying to be just a knowledge graph. It is trying to connect term matching, personal learning records, learning-path navigation, and community-built map contributions into one computer learning system.**
