export type Domain = 'hardware' | 'software' | 'programming' | 'theory' | 'ai' | 'network'

export type NodeCategory =
  | 'fundamentals'
  | 'language'
  | 'technology'
  | 'tooling'
  | 'product'
  | 'architecture'
  | 'platform'

export interface ResourceLink {
  title: string
  url: string
}

export interface NodeDefinition {
  id: string
  title: string
  domain: Domain
  category?: NodeCategory
  stage?: number
  parentId?: string
  deps?: string[]
  tags?: string[]
  aliases?: string[]
  description?: string
  resources?: ResourceLink[]
  targetMap?: string
}

export interface NodeViewState {
  unlocked?: boolean
}

export type Node = NodeDefinition & NodeViewState

export interface GraphData<TNode = NodeDefinition> {
  id: string
  title: string
  nodes: TNode[]
}

export const DOMAIN_COLORS: Record<Domain, string> = {
  hardware: '#D97706',
  software: '#8B5CF6',
  programming: '#3B82F6',
  theory: '#EAB308',
  ai: '#EC4899',
  network: '#10B981',
}

export const DOMAIN_NAMES: Record<Domain, string> = {
  hardware: '硬件',
  software: '软件',
  programming: '程序开发',
  theory: '基础理论',
  ai: 'AI',
  network: '网络',
}

export const NODE_CATEGORY_ORDER: NodeCategory[] = [
  'fundamentals',
  'language',
  'technology',
  'tooling',
  'product',
  'architecture',
  'platform',
]

export const NODE_CATEGORY_COLORS: Record<NodeCategory, string> = {
  fundamentals: '#C0841A',
  language: '#2563EB',
  technology: '#0F766E',
  tooling: '#7C3AED',
  product: '#DB2777',
  architecture: '#DC2626',
  platform: '#0891B2',
}

export const NODE_CATEGORY_NAMES: Record<NodeCategory, string> = {
  fundamentals: '基础',
  language: '语言',
  technology: '技术',
  tooling: '框架/工具',
  product: '产品/应用',
  architecture: '架构/方法',
  platform: '服务/平台',
}

const DOMAIN_CATEGORY_FALLBACK: Record<Domain, NodeCategory> = {
  hardware: 'fundamentals',
  software: 'product',
  programming: 'technology',
  theory: 'fundamentals',
  ai: 'technology',
  network: 'platform',
}

export function getNodeCategory(node: Pick<NodeDefinition, 'category' | 'domain'>): NodeCategory {
  return node.category ?? DOMAIN_CATEGORY_FALLBACK[node.domain]
}

export function getNodeCategoryColor(node: Pick<NodeDefinition, 'category' | 'domain'>): string {
  return NODE_CATEGORY_COLORS[getNodeCategory(node)]
}

export function getNodeCategoryName(node: Pick<NodeDefinition, 'category' | 'domain'>): string {
  return NODE_CATEGORY_NAMES[getNodeCategory(node)]
}
