import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { SearchMatch } from '../types'
import { Button } from './ui/button'
import { Separator } from './ui/separator'

interface SidebarProps {
  totalNodes: number
  unlockedCount: number
  currentMap: string
  recentSearchMatches: SearchMatch[]
  onMapChange: (mapId: string) => void
  onSelectRecentMatch: (match: SearchMatch) => void
}

export const Sidebar = ({
  totalNodes,
  unlockedCount,
  currentMap,
  recentSearchMatches,
  onMapChange,
  onSelectRecentMatch,
}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false)

  const maps = [
    { id: 'root', name: '计算机世界框架' },
    { id: 'fundamentals', name: '计算机基础' },
    { id: 'hardware', name: '硬件' },
    { id: 'software', name: '软件系统' },
    { id: 'programming-languages', name: '编程语言' },
    { id: 'programming', name: '程序开发' },
    { id: 'network', name: '网络通信' },
    { id: 'ai', name: 'AI 人工智能' },
  ]

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-r border-[#E5E7EB] bg-white py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <aside className="flex w-72 flex-col border-r border-[#E5E7EB] bg-white">
      <div className="flex items-center justify-between p-4">
        <span className="font-medium text-[#111827]">地图导航</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(true)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <div className="space-y-3 p-4">
        <div className="text-sm font-medium text-[#111827]">地图切换</div>
        <div className="space-y-1">
          {maps.map((map) => (
            <button
              key={map.id}
              onClick={() => onMapChange(map.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                currentMap === map.id
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
              }`}
            >
              {map.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-[#111827]">最近一次搜索解锁</div>
          <span className="text-xs text-[#6B7280]">{recentSearchMatches.length} 个</span>
        </div>
        {recentSearchMatches.length > 0 ? (
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {recentSearchMatches.map((match) => (
              <button
                key={`${match.mapId}:${match.id}`}
                onClick={() => onSelectRecentMatch(match)}
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-left transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
              >
                <div className="text-sm font-medium text-[#111827]">{match.title}</div>
                <div className="mt-1 text-xs text-[#6B7280]">{match.mapTitle}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[#E5E7EB] px-3 py-4 text-sm text-[#9CA3AF]">
            输入关键词并按回车后，命中的节点会在这里展示。
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-2 p-4">
        <div className="text-xs text-[#6B7280]">当前地图解锁进度</div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-[#111827]">{unlockedCount}</span>
          <span className="text-sm text-[#6B7280]">/ {totalNodes}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] transition-all duration-500"
            style={{ width: totalNodes > 0 ? `${(unlockedCount / totalNodes) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </aside>
  )
}
