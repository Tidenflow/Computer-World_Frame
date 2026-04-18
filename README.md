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
- eventually co-create an open source contribution map with others

## ✨ Why This Project Is Interesting

### 🧠 1. Matching Rules Engine

This is the most distinctive part of CWF.

Users do not always search with standard terminology. They might type:

- "苹果系统"
- "做网页的那个语言"
- "AI 画图"
- "后端运行环境"

The long-term goal is to map these inputs into standard nodes such as:

- `macOS`
- `HTML / CSS / JavaScript`
- `Midjourney / Stable Diffusion`
- `Node.js`

This is where CWF becomes more than a search box. It becomes a matching layer between human language and a structured computer knowledge world.

Planned matching stack:

- string matching
- aliases / tags / synonym dictionaries
- curated rule sets
- client-side `transformers.js` semantic fallback
- future LLM-assisted routing when needed

### 📝 2. Personal Notes and Learning Record

The map is only the surface. Retention comes from personal accumulation.

Around each node, the user should eventually be able to record:

- what they already understand
- what still feels unclear
- personal notes
- resource collections
- progress and milestones

That makes CWF a personal computer-learning map, not just a visualization.

### 🗺️ 3. Open Source Contribution Map

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
2. The system matches it into the right part of the map
3. The map reveals structure, neighbors, and learning paths
4. You leave your own notes and progress behind
5. Over time, the community helps the map get smarter and richer

## 🎯 Current Stage

Right now, **it is completely reasonable to prioritize the frontend first**.

That is not a compromise. It is the right order for this project.

At this stage, the important questions are:

- Is the matching layer actually useful?
- Does the learning-record flow create real retention?
- Does the contribution-map concept feel worth growing?

All three can be validated before investing heavily in backend complexity.

So the current strategy is:

- make the frontend feel like a real product first
- let the backend come later as the system-strengthening layer

Backend is still important, just not the first thing that determines whether CWF is meaningful.

## 🔍 Current Matching Rules

Today, the matching logic is still lightweight and rule-based.

Current search matches against:

- `title`
- `tags`
- `aliases`

Current behavior:

- case-insensitive
- substring matching via `includes(...)`
- shared base logic for current-map filtering and cross-map search
- debounced input on the frontend

In other words, the current version is closer to **rule search** than **semantic understanding**.

Recommended evolution path:

1. string rules first
2. alias / synonym expansion
3. `transformers.js` as semantic fallback
4. later, stronger server-side retrieval or LLM routing if needed

## 🧩 Current Frontend Capabilities

The frontend already supports a meaningful interaction loop:

- 2D / 3D knowledge map switching
- node selection, unlock state, and detail panels
- category filtering with `All` and `Clear`
- cursor-centered zoom
- drag-to-pan in the 2D graph
- static-data search and matching
- local progress persistence via `localStorage`

At the moment, user progress is stored locally in the browser. That is perfect for the current validation phase.

## 🛠️ Tech Direction

Current stack:

- `React`
- `TypeScript`
- `Vite`
- local-first state and persistence
- graph-style interaction design

Technical areas this project is meant to explore:

- frontend architecture
- interactive knowledge maps
- rule-based and semantic matching
- local-first product validation
- future AI-assisted knowledge navigation

## 🗺️ Roadmap

### Phase 1: Frontend Validation

- sharpen the matching rules
- improve graph interactions
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
- the system should connect first, then deepen understanding

Whether someone starts from `CPU`, `Python`, `Linux`, `WiFi`, or `ChatGPT`, they should still be able to find their place in the same world.

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

**CWF is not trying to be just a knowledge graph. It is trying to connect term matching, personal learning records, and community-built map contributions into one computer learning system.**
