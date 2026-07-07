# Computer World Frame (CWF) 🌐

> Turn scattered computer terms into a living knowledge map, a personal learning record, and a community-built open source world.

[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=white)](./frontend)
[![Build](https://img.shields.io/badge/build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](./frontend)
[![Status](https://img.shields.io/badge/status-frontend%20validation-orange?style=for-the-badge)](#-roadmap)
[![Storage](https://img.shields.io/badge/progress-localStorage-0EA5E9?style=for-the-badge)](#-stack)
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

## 🚀 Product Vision

If computer science is a city, beginners should not be handed a spreadsheet full of coordinates. They should be handed a map that lights up as they explore.

1. You type any word you know
2. The system matches it into the right part of the map — and tells you *why*
3. The map reveals structure, neighbors, prerequisites, and learning paths
4. You leave your notes and progress behind, growing your personal knowledge space
5. Over time, the community helps the map get smarter and richer

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

## 🛠️ Stack

`React` · `TypeScript` · `Vite` · `Three.js` · `Transformers.js` · local-first persistence

## 🗺️ Roadmap

- **Phase 1** — sharpen matching rules, deepen dual-workspace experience, add note-taking flows
- **Phase 2** — backend persistence, accounts, multi-device sync
- **Phase 3** — community contribution proposals, open source map co-creation

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

