import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  NODE_CATEGORY_COLORS,
  NODE_CATEGORY_NAMES,
  NODE_CATEGORY_ORDER,
  NodeCategory,
} from '../types';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface SidebarProps {
  selectedCategories: Set<NodeCategory>;
  onCategoryToggle: (category: NodeCategory) => void;
  onSelectAllCategories: () => void;
  onClearCategories: () => void;
  totalNodes: number;
  unlockedCount: number;
  currentMap: string;
  onMapChange: (mapId: string) => void;
}

export const Sidebar = ({
  selectedCategories,
  onCategoryToggle,
  onSelectAllCategories,
  onClearCategories,
  totalNodes,
  unlockedCount,
  currentMap,
  onMapChange,
}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const maps = [
    { id: 'root', name: '总览地图' },
    { id: 'software', name: '软件系统' },
    { id: 'programming', name: '程序开发' },
    { id: 'programming-languages', name: '编程语言' },
    { id: 'ai', name: 'AI 人工智能' },
    { id: 'network', name: '网络通信' },
  ];

  if (collapsed) {
    return (
      <div className="w-12 border-r border-[#E5E7EB] bg-white flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-60 border-r border-[#E5E7EB] bg-white flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <span className="font-medium text-[#111827]">控制面板</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(true)}
          className="w-8 h-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <Separator />

      <div className="p-4 space-y-3">
        <div className="text-sm font-medium text-[#111827]">地图切换</div>
        <div className="space-y-1">
          {maps.map((map) => (
            <button
              key={map.id}
              onClick={() => onMapChange(map.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                currentMap === map.id
                  ? 'bg-[#3B82F6] text-white'
                  : 'hover:bg-[#F9FAFB] text-[#6B7280]'
              }`}
            >
              {map.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="p-4 space-y-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-[#111827]">分类过滤</div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAllCategories}
              className="h-7 px-2 text-xs"
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCategories}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {NODE_CATEGORY_ORDER.map((category) => {
            const isSelected = selectedCategories.has(category);
            return (
              <button
                key={category}
                onClick={() => onCategoryToggle(category)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                  isSelected ? 'bg-[#F9FAFB]' : ''
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full transition-all"
                  style={{
                    backgroundColor: isSelected ? NODE_CATEGORY_COLORS[category] : '#D1D5DB',
                  }}
                />
                <span className="text-sm text-[#111827] flex-1">{NODE_CATEGORY_NAMES[category]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="p-4 space-y-2">
        <div className="text-xs text-[#6B7280]">节点解锁进度</div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-[#111827]">{unlockedCount}</span>
          <span className="text-sm text-[#6B7280]">/ {totalNodes}</span>
        </div>
        <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] transition-all duration-500"
            style={{ width: `${(unlockedCount / totalNodes) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
