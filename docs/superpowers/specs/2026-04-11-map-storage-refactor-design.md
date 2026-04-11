# Map Storage Refactor Design

## Goal

为 `Computer-World_Frame` 设计一套新的地图内容存储架构，使它同时满足三件事：

1. 开发者和未来开源贡献者可以直接维护一份轻量 JSON，而不是理解数据库拆表逻辑。
2. 后端数据库存储的是地图文档本体，而不是把 `map` 强行拆散成很多松散节点表再回拼。
3. 前端渲染和未来的自动布局计算可以基于清晰、稳定、可派生的数据结构运行。

这份设计文档是架构决策说明，不是实现计划。

## Current Problems

当前系统的核心问题不是 MySQL 本身，而是“内容真相源”和“运行时结构”被混在了一起。

目前的痛点主要有：

- `map` 先以 JSON 书写，再通过脚本转成 MySQL 节点表和关系表，维护链路过长。
- JSON 作者维护的是一套结构，前后端实际运行的是另一套结构，长期会发生漂移。
- `Node` 被提升成数据库中心实体后，原本完整的地图语义被拆散成大量行记录，整体上下文丢失。
- 前端拿到的不是适合渲染的图结构，而是需要再次计算和拼装的原材料。
- 如果未来开源，让贡献者理解“JSON -> 脚本 -> 多张表 -> 再拼回图”的流程，门槛过高。
- 若在 authoring JSON 里写死节点坐标，多人协作时会产生严重冲突，也会把内容层与展示层耦合死。

## Design Principles

这次重构采用以下原则：

1. `MapDocument` 是唯一内容真相源。
2. `Node` 不再是数据库中心实体，而是 `MapDocument` 内部的内容对象。
3. 数据库存储地图文档 JSON 本体，不再把地图内容拆成真相关系表。
4. 前端渲染使用派生结构，不直接依赖原始节点数组做所有计算。
5. 用户进度是私有状态，必须与地图内容严格分层。
6. authoring JSON 只保留知识语义，不写绝对坐标，不混入视觉配置。
7. 布局、索引、渲染优化都属于派生层，而不是作者手写层。

## Useful External Guidance

这次设计借鉴以下资料的思想，但不会完整照搬：

- `JSON-LD 1.1`
  启发：图数据可以保留 JSON 书写体验，同时具备明确图语义。
  来源：https://www.w3.org/TR/json-ld11/
- `JSON-LD 1.1 Framing`
  启发：同一张图可以有不同的序列化结构和消费结构，authoring shape 不必等于 rendering shape。
  来源：https://www.w3.org/TR/json-ld11-framing/
- `SHACL`
  启发：图数据正确性应通过独立约束验证完成，而不是依赖数据库拆表结构兜底。
  来源：https://www.w3.org/TR/shacl/
- `Industry-scale Knowledge Graphs: Lessons and Challenges`
  启发：内容模型、服务投影、演化和 identity 需要分层处理。
  来源：https://queue.acm.org/detail.cfm?id=3332266

这些资料对本项目最重要的价值不是某个算法，而是确认以下方向是合理的：

- 内容层和运行层必须分开。
- 文档真相源和渲染投影不应该是同一种结构。
- 校验和派生比拆表更适合当前项目阶段。

## Proposed Architecture

新的系统分为三层：

### 1. MapDocument

这是作者维护的原始地图文档，也是唯一内容真相源。

职责：

- 描述“这张地图是什么”
- 定义节点、主题分区、层级信号和依赖关系
- 保持轻量、可读、适合多人协作

不负责：

- 绝对布局坐标
- 视觉样式
- 用户状态
- 运行时索引

### 2. MapProjection

这是系统从 `MapDocument` 自动生成的运行态结构。

职责：

- 为前端渲染提供快速索引
- 为布局算法提供中间结果
- 为状态计算和关系遍历提供稳定输入

当前阶段要求 `MapProjection` 至少包含：

- `nodeById`
- `childrenById`
- `roots`
- `topologicalOrder`
- 后续如布局算法需要，可再扩展 `depthById`、`clusterByDomain`、`layoutHints`

### 3. UserProgress

这是用户私有状态，不参与公共地图内容表达。

职责：

- 记录用户已经点亮了哪些节点
- 记录该进度对应的 `mapId` 和 `mapVersion`
- 支撑前端状态渲染和回放

不负责：

- 改写地图结构
- 存储知识节点本体

## Recommended MapDocument Schema

当前阶段建议采用“极简但能支持布局”的 authoring schema。

```json
{
  "mapId": "computer-world",
  "version": "2026-04-11",
  "domains": [
    { "id": "hardware", "title": "Hardware", "order": 1 },
    { "id": "software", "title": "Software", "order": 2 }
  ],
  "nodes": [
    {
      "id": "cpu-basics",
      "title": "CPU Basics",
      "domain": "hardware",
      "stage": 1,
      "deps": []
    },
    {
      "id": "operating-system",
      "title": "Operating System",
      "domain": "software",
      "stage": 2,
      "deps": ["cpu-basics"]
    }
  ]
}
```

### Why These Fields

推荐保留的最小字段如下：

- `mapId`
  地图身份，用于 API、发布和用户进度关联。
- `version`
  地图版本，用于内容演化和进度兼容。
- `domains`
  显式声明大区块，用于全局布局分区，不让规则隐含在节点里。
- `nodes[].id`
  稳定标识，建议使用字符串语义 ID，而不是数字自增 ID。
- `nodes[].title`
  展示文本。
- `nodes[].domain`
  节点所属主题分区。
- `nodes[].stage`
  节点层级信号，用于主干推进和自动布局。
- `nodes[].deps`
  节点依赖，用于边关系、状态计算和局部排序。

### Why Coordinates Are Excluded

authoring JSON 中明确不允许写死绝对坐标，原因如下：

- 多人协作时非常容易产生冲突。
- 位置本质上是布局结果，不是知识内容本体。
- 一旦坐标进入内容层，后续布局算法、渲染器切换和视图模式切换都会受限。
- 对于上千节点大图，手工维护坐标不可持续。

### Optional Fields Later

以下字段允许未来补充，但不是当前阶段核心：

- `aliases`
- `tags`
- `summary`
- `difficulty`
- `importance`

这些字段的前提是：它们必须服务于明确需求，而不是为了“更像知识图谱”而提前堆字段。

## Recommended UserProgress Schema

用户进度建议也采用文档式结构，但必须显式绑定地图版本。

```json
{
  "userId": 1,
  "mapId": "computer-world",
  "mapVersion": "2026-04-11",
  "unlocked": {
    "cpu-basics": {
      "unlockedAt": 1712800000000
    },
    "operating-system": {
      "unlockedAt": 1712800500000
    }
  }
}
```

这比“只存 `userId -> unlockedNodes`”更稳，因为：

- 地图内容未来一定会演化。
- 节点结构和分区在后续版本中会继续演化。
- 进度不绑定版本，会导致旧状态和新地图难以对应。

## Database Strategy

当前阶段不需要为 JSON 存储切换到 PostgreSQL，MySQL 可以继续使用。

理由如下：

- 当前核心场景是存整份地图文档、读整份地图文档、前端渲染整张图。
- 现阶段并不依赖数据库内的复杂 JSON 深层查询。
- 真正需要修改的是数据模型和分层，不是数据库品牌。

### Recommended Tables

#### `map_documents`

存储地图内容本体。

建议字段：

- `id`
- `map_id`
- `version`
- `status`
- `document_json`
- `created_at`
- `published_at`

#### `map_projections`

存储从地图文档派生出的运行态结构。

建议字段：

- `id`
- `map_document_id`
- `projection_json`
- `generated_at`

#### `user_progress`

存储用户进度文档。

建议字段：

- `id`
- `user_id`
- `map_id`
- `map_version`
- `progress_json`
- `updated_at`

## Frontend Consumption Model

前端不应该直接拿 `nodes[]` 做所有计算，而应消费如下数据流：

1. 拉取最新发布的 `MapDocument`
2. 拉取对应的 `MapProjection`
3. 拉取当前用户的 `UserProgress`
4. 在前端将三者合并成渲染态 view model

这样可以让前端逻辑更清晰：

- `MapDocument` 决定地图语义
- `MapProjection` 决定图结构索引和布局输入
- `UserProgress` 决定节点点亮状态

## Layout Direction

当前项目的图谱视觉目标不适合纯课程树，也不适合完全自由网络。

推荐方向是混合型布局：

- 全局上按 `domain` 做分区
- 区内按 `stage` 做主干层级
- 局部根据 `deps` 做关系连接
- 允许跨分区依赖，但视为次级连接

因此，当前 authoring schema 的任务不是表达“完美知识语义”，而是提供足够稳定的布局信号：

- `domain`
- `stage`
- `deps`

这三类信号比手写坐标更适合长期演化。

## Search And Disambiguation Scope

当前阶段不把“复杂词义消歧”作为核心设计目标。

原因如下：

- 当前主要问题是图结构、渲染计算和内容存储架构不稳定。
- 如果现在过早围绕词义做设计，会把数据结构带向过度复杂。

本阶段的最低策略是：

- 允许一个输入词命中多个节点
- 不在当前 schema 中引入重型语义消歧结构
- 后续再设计匹配层和消歧层

## Migration Direction

这次重构建议遵循以下顺序：

1. 先定义新的 `MapDocument` schema。
2. 再定义 `MapProjection` 的生成规则。
3. 然后调整 `UserProgress`，让它绑定 `mapId + mapVersion`。
4. 最后替换现有“JSON -> 多张节点表 -> 再拼回图”的后端链路。

这里最重要的是先统一内容真相源，再谈实现细节。

## Explicit Non-Goals

当前阶段明确不做以下事情：

- 不切换 PostgreSQL
- 不引入 RDF、三元组存储或图数据库
- 不在 authoring JSON 里维护绝对坐标
- 不为节点补充大量展示字段
- 不优先解决复杂词义消歧
- 不以关系表为地图内容真相源

## Decision Summary

本设计的核心决策如下：

1. `MapDocument` 成为唯一内容真相源。
2. `Node` 降级为文档内部对象，而不是数据库中心实体。
3. 数据库以 JSON 文档存储地图内容和用户状态。
4. 前端依赖 `MapProjection` 做渲染和计算。
5. authoring JSON 保持极简，不写绝对坐标。
6. 现阶段继续使用 MySQL，不为了 JSON 存储迁移数据库。

这套结构的目标不是一步到位做成完整知识图谱平台，而是先把“内容可维护、存储直观、渲染可计算”这三件核心事情做稳。
