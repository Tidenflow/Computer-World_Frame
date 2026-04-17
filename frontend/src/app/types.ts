export type Domain = 'hardware' | 'software' | 'programming' | 'theory' | 'ai' | 'network';

export interface Node {
  id: string;
  title: string;
  domain: Domain;
  stage?: number; // 1-5, for 3D depth positioning
  deps?: string[]; // dependency node IDs
  tags?: string[];
  aliases?: string[];
  description?: string;
  resources?: { title: string; url: string }[];
  targetMap?: string; // if this node can expand into a subgraph
  unlocked?: boolean; // runtime status, not in JSON
}

export interface GraphData {
  id: string;
  title: string;
  nodes: Node[];
}

export const DOMAIN_COLORS: Record<Domain, string> = {
  hardware: '#D97706',
  software: '#8B5CF6',
  programming: '#3B82F6',
  theory: '#EAB308',
  ai: '#EC4899',
  network: '#10B981',
};

export const DOMAIN_NAMES: Record<Domain, string> = {
  hardware: '硬件',
  software: '软件',
  programming: '程序开发',
  theory: '计算机理论',
  ai: 'AI 人工智能',
  network: '网络通信',
};
