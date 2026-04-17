/**
 * 3D 可视化与领域过滤相关类型定义
 */

/** 3D 布局类型 */
export type GraphLayoutType = 'original' | 'sphere' | 'galaxy' | 'wave' | 'helix' | 'torus';

/** 3D 空间中的点 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** 3D 图形中的节点 */
export interface Graph3DNode {
  id: string;
  title: string;
  domain: string;
  stage: number;
  x: number;
  y: number;
  z: number;
  visibility: 'Dimmed' | 'Unlocked';
}

/** 领域（domain）信息 */
export interface DomainInfo {
  id: string;
  name: string;
  color: string;
  count: number;
  visible: boolean;
}

/** 领域配置：id -> { name, color } */
export const DOMAIN_CONFIG: Record<string, { name: string; color: string }> = {
  hardware: { name: 'Hardware', color: '#3B82F6' },
  programming: { name: 'Programming', color: '#22C55E' },
  network: { name: 'Network', color: '#F97316' },
  fundamentals: { name: 'Fundamentals', color: '#8B5CF6' },
  os: { name: 'OS', color: '#EC4899' },
  data: { name: 'Data', color: '#EAB308' },
  application: { name: 'Application', color: '#EF4444' },
  frontend: { name: 'Frontend', color: '#06B6D4' },
  devops: { name: 'DevOps', color: '#14B8A6' },
  default: { name: 'Other', color: '#94A3B8' }
};

/** 相机状态 */
export interface CameraState {
  eye: Point3D;
  center: Point3D;
  up: Point3D;
}

/** 获取领域的显示名称 */
export function getDomainName(domainId: string): string {
  return DOMAIN_CONFIG[domainId]?.name ?? DOMAIN_CONFIG.default.name;
}

/** 获取领域的颜色 */
export function getDomainColor(domainId: string): string {
  return DOMAIN_CONFIG[domainId]?.color ?? DOMAIN_CONFIG.default.color;
}

/** 黯淡状态的颜色（灰白色） */
export const DIMMED_COLOR = '#94A3B8';

/** 根据节点可见性获取实际颜色 */
export function getNodeColor(domain: string, visibility: Graph3DNode['visibility']): string {
  if (visibility === 'Dimmed') {
    return DIMMED_COLOR;
  }
  return getDomainColor(domain);
}
