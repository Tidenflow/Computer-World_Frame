# Contributing to Computer World Frame

Thanks for being interested in `Computer World Frame`.

This project is still in an early but very promising stage. It is not just a frontend demo. It is slowly becoming a framework for:

- community-built knowledge maps
- graph rendering and node computation
- semantic matching between user input and map nodes

If you want to contribute, you are very welcome here.

---

## Project Vision

`Computer World Frame` tries to help users light up their own computer science worldview.

The long-term goal is not only to draw a graph, but to build a system that can:

- accept fragmented user input
- map it onto a structured knowledge world
- render that world in a readable and explorable way
- help different contributors publish their own maps

So when you contribute, you are not just fixing UI details.
You may also be helping define the future architecture of the project.

---

## The Three Hard Problems We Most Need Help With

If you only read one section in this file, read this one.

At this stage, the project has three especially important long-term challenges.
These are the places where community contributions can have the most impact.

### 1. Map Ecosystem

We want this project to become a place where different people can provide their own maps.

Examples:

- a beginner computer science map
- a frontend engineering map
- a backend/system design map
- an AI/LLM map
- a database map
- even a completely non-CS knowledge map in the future

What we need help with:

- designing better map authoring conventions
- improving JSON map structure without making it too hard to write
- building import / validation / conversion tools
- making maps easier to maintain over time
- documenting how to create a high-quality map

Good contribution examples:

- map schema improvements
- map validation scripts
- map examples
- better map documentation
- map import/export tools

### 2. Node Computation and Graph Rendering Logic

This is already one of the hardest parts of the project.

We are no longer dealing with a simple static graph.
We now have to think about:

- visibility rules
- unlocked vs outlined nodes
- recent-highlight behavior
- focus and zoom behavior
- tree projection rendering
- repeated node instances
- preventing duplicated subtree explosions
- keeping the graph readable as it grows

What we need help with:

- better graph layout strategies
- repeated-node rendering rules
- focus / camera heuristics
- visual simplification for large maps
- performance for larger visible subgraphs
- reducing visual clutter while preserving meaning

Good contribution examples:

- layout algorithm improvements
- cleaner edge routing
- better rendering rules for repeated nodes
- clearer focus behavior
- large-map stress tests
- performance improvements

### 3. Matching and Understanding User Input

Right now, this area is still early compared to where we want it to go.

In the future, this project should become much better at understanding what the user means.

Examples:

- user types a casual or ambiguous phrase
- system understands the likely intended node
- system chooses the right branch or multiple candidates
- system avoids wrong unlocks

This can eventually include:

- better keyword matching
- synonym systems
- fuzzy matching
- weighted scoring
- embedding-based matching
- edge-side LLM inference
- browser-side / local AI assistance

What we need help with:

- designing matching strategies
- evaluation datasets
- ranking logic
- ambiguity handling
- lightweight local inference ideas
- LLM-assisted matching experiments

Good contribution examples:

- matching algorithm prototypes
- benchmark datasets
- node alias systems
- confidence scoring
- offline / on-device matching experiments

---

## Contribution Types

All contributions are welcome, but the following are especially valuable:

- code contributions
- test improvements
- map content contributions
- algorithm experiments
- bug reports with clear reproduction steps
- visual polish with strong reasoning
- architecture discussions grounded in actual project needs
- documentation improvements

---

## Before You Start

Please keep these principles in mind:

### 1. Do Not Over-Engineer

This project values clarity and iteration.

If your solution is powerful but introduces heavy complexity, please explain why the tradeoff is worth it.
We prefer simple, understandable solutions first.

### 2. Respect the Product Direction

This project is not trying to become a purely academic graph visualizer.

The product direction currently emphasizes:

- readability
- exploration
- progressive reveal
- cognitive mapping
- graph data underneath, but readable projection on the screen

So a contribution that is mathematically elegant but visually confusing may not be accepted.

### 3. Keep User Experience in Mind

A lot of important logic here is not only about correctness.
It is also about whether the user can understand what is happening.

Please think about:

- does this make the graph easier to read?
- does this reduce confusion?
- does this preserve the “explore from darkness” feeling?
- does this make recent unlocks easier to understand?

---

## Local Setup

This repository currently contains:

- `frontend/`
- `backend/`
- `shared/`
- `test/`
- `plans/`

Basic workflow:

1. install dependencies in the relevant workspace
2. configure local database and backend env if needed
3. run frontend and backend locally
4. run tests before opening a PR

Because the project is still evolving, setup may continue to improve over time.
If you find setup pain points, improving setup documentation is itself a helpful contribution.

---

## Where to Contribute

### If you want to work on map content

Focus on:

- map JSON design
- node naming quality
- dependency quality
- category consistency
- weight/tier consistency

### If you want to work on graph logic

Focus on:

- `frontend/src/core/cwframe.layout.ts`
- `frontend/src/components/CWFrameGraph.vue`
- related tests in `test/frontendToBackendTest/`

### If you want to work on matching logic

Focus on:

- shared node naming / aliases
- frontend/backend matching pipeline
- future local inference or LLM integration experiments

---

## Pull Request Guidelines

Please try to keep PRs focused.

Good PR shape:

- one clear problem
- one clear solution
- tests if behavior changed
- concise explanation of why the change helps

Please avoid:

- bundling unrelated refactors
- changing product direction without explanation
- mixing algorithm changes and random UI cleanup in the same PR
- large rewrites with no tests or no design reasoning

For algorithmic or architectural PRs, please include:

- what problem you observed
- why the current behavior is not good enough
- what rule or heuristic you changed
- what tradeoff your approach introduces

---

## Issues and Discussions

If you are not sure whether to implement something directly, opening an issue or discussion first is very helpful.

Especially for:

- map schema changes
- graph rendering logic changes
- matching system design
- major UI behavior changes

That helps keep the project direction coherent.

---

## What Makes a Great Contribution Here

A great contribution to this project usually does at least one of these:

- makes the graph easier to understand
- makes maps easier to create and maintain
- improves how user input maps onto knowledge nodes
- reduces product confusion without adding heavy complexity
- gives the project a cleaner long-term path

---

## Current High-Impact Ideas

If you want a concrete starting point, these are especially welcome:

- improve tree-projection graph rendering for repeated nodes
- reduce edge clutter in medium and large visible subgraphs
- build tools for validating and importing map JSON
- add node alias / synonym support
- experiment with local semantic matching
- create better contributor-facing map documentation
- improve testing around graph layout and matching behavior

---

## Final Note

This project is still young, which means contributions now can shape its core identity.

If you care about:

- knowledge systems
- graph interaction
- educational tools
- semantic matching
- local AI-assisted interfaces

then your help here can matter a lot.

Thanks for building `Computer World Frame` with us.
