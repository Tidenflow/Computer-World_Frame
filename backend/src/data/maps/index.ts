/**
 * 地图注册表 — 所有可用地图的索引
 *
 * key: mapId（路由参数中使用）
 * file: 对应 JSON 文件名（位于 src/data/maps/ 目录）
 * title: 展示名称
 * parent: 父地图 mapId（无 parent 表示顶层地图）
 */
export const MAP_REGISTRY: Record<string, {
  file: string;
  title: string;
  parent?: string;
}> = {
  'computer-world': {
    file: 'default.map.json',
    title: '计算机世界总图',
  },
  'frontend': {
    file: 'frontend.map.json',
    title: '前端生态图',
    parent: 'computer-world',
  },
  'backend': {
    file: 'backend.map.json',
    title: '后端生态图',
    parent: 'computer-world',
  },
  'devops': {
    file: 'devops.map.json',
    title: 'DevOps 图',
    parent: 'computer-world',
  },
  'ai': {
    file: 'ai.map.json',
    title: 'AI/ML 图',
    parent: 'computer-world',
  },
};

export type MapId = keyof typeof MAP_REGISTRY;
