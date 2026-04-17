export interface MapDomain {
  id: string;
  title: string;
  order: number;
}

/**
 * 节点类型枚举 — 用于渲染区分、搜索增强、视觉分类
 *
 * concept:   抽象概念层 (Boolean Logic, Virtual Memory, Abstraction)
 * primitive: 基础构成元素 (Binary, HTML, SQL, CSS)
 * language:  编程语言 (JavaScript, Python, Rust, Go)
 * runtime:   运行时/引擎 (Node.js Runtime, JVM, V8)
 * framework: 框架 (React, Vue, Angular, Next.js)
 * tool:      工具/软件 (Docker, Git, Webpack, Vite)
 * protocol:  网络协议 (HTTP, TCP, DNS, WebSocket)
 * hardware:  硬件 (CPU, GPU, Memory, Storage)
 * spec:      规范/标准 (REST API, GraphQL, OAuth)
 * service:   云服务/平台 (Vercel, AWS, Cloudflare, Firebase)
 */
export type NodeType =
  | 'concept'
  | 'primitive'
  | 'language'
  | 'runtime'
  | 'framework'
  | 'tool'
  | 'protocol'
  | 'hardware'
  | 'spec'
  | 'service';

export interface MapNodeDocument {
  id: string;
  title: string;
  domain: string;
  stage: number;
  deps: string[];
  type?: NodeType;
  aliases?: string[];
  tags?: string[];
  description?: string;

  /** 指向子图 JSON 的 mapId，为 null 表示已是叶子节点 */
  targetMap?: string | null;

  /** 子图内预设渲染坐标（可选）；有值时优先使用，无值时走算法布局 */
  position?: { x: number; y: number };

  /** 学习难度 1-5 */
  difficulty?: 1 | 2 | 3 | 4 | 5;

  /** 预估学习时长（小时） */
  estimatedHours?: number;

  /** 官方资源链接 */
  resources?: Array<{ label: string; url: string }>;

  /** 社区热度 */
  popularity?: 'niche' | 'standard' | 'popular' | 'dominant';

  /** 显式搜索文本（用于 Transformer.js 编码，可覆盖自动构建） */
  searchText?: string;
}

export interface MapDocument {
  mapId: string;
  version: string;
  domains: MapDomain[];
  nodes: MapNodeDocument[];
  /** 父地图 mapId；顶层地图无此字段 */
  parentMapId?: string;
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
  const topologicalOrder = doc.nodes
    .slice()
    .sort((a, b) => a.stage - b.stage || a.title.localeCompare(b.title))
    .map(node => node.id);

  return {
    nodeById,
    childrenById,
    roots,
    topologicalOrder
  };
}
