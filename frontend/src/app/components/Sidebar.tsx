import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react'

import { getNodeCategoryName, type SearchMatch } from '../types'
import { Button } from './ui/button'
import { Separator } from './ui/separator'

interface SidebarProps {
  currentMap: string
  selectedNodeId: string | null
  recentSearchMatches: SearchMatch[]
  recentSearchQuery: string
  onMapChange: (mapId: string) => void
  onSelectRecentMatch: (match: SearchMatch) => void
}

export const Sidebar = ({
  currentMap,
  selectedNodeId,
  recentSearchMatches,
  recentSearchQuery,
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

  const getMatchLabel = (match: SearchMatch) => {
    const query = recentSearchQuery.trim().toLowerCase()

    if (!query) {
      return '搜索结果'
    }

    if (match.title.toLowerCase().includes(query)) {
      return '标题匹配'
    }

    if (match.aliases?.some((alias) => alias.toLowerCase().includes(query))) {
      return '别名匹配'
    }

    if (match.tags?.some((tag) => tag.toLowerCase().includes(query))) {
      return '标签匹配'
    }

    return '相关概念'
  }

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
    <aside className="flex w-72 flex-col border-r border-[#D8DEE8] bg-white">
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
        <div className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">World Maps</div>
        <div className="space-y-1">
          {maps.map((map) => (
            <button
              key={map.id}
              onClick={() => onMapChange(map.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                currentMap === map.id
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#111827]'
              }`}
            >
              {map.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
              Search Trail
            </div>
            <div className="mt-1 max-w-[190px] truncate text-sm font-medium text-[#111827]">
              {recentSearchQuery ? `“${recentSearchQuery}”` : '还没有搜索'}
            </div>
          </div>
          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#64748B]">
            {recentSearchMatches.length}
          </span>
        </div>
        {recentSearchMatches.length > 0 ? (
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {recentSearchMatches.map((match) => (
              (() => {
                const isSelected = currentMap === match.mapId && selectedNodeId === match.id

                return (
              <button
                key={`${match.mapId}:${match.id}`}
                onClick={() => onSelectRecentMatch(match)}
                className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? 'border-[#99F6E4] bg-[#F0FDFA]'
                    : 'border-[#E5E7EB] hover:border-[#99F6E4] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`text-sm font-medium ${isSelected ? 'text-[#0F766E]' : 'text-[#111827]'}`}>
                    {match.title}
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] text-[#64748B]">
                    {getMatchLabel(match)}
                  </span>
                </div>
                <div className={`mt-1 text-xs ${isSelected ? 'text-[#0F766E]' : 'text-[#64748B]'}`}>
                  {match.mapTitle} · {getNodeCategoryName(match)}
                </div>
                {match.description && (
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">
                    {match.description}
                  </div>
                )}
              </button>
                )
              })()
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-start justify-between rounded-md border border-dashed border-[#D8DEE8] bg-[#F8FAFC] px-3 py-4 text-sm text-[#64748B]">
            <div>
              <div className="mb-2 flex items-center gap-2 font-medium text-[#111827]">
                <Search className="h-4 w-4 text-[#0F766E]" />
                从任意词开始
              </div>
              <div className="leading-6">搜索命中的概念会沉淀在这里，方便你沿着结果继续探索。</div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs text-[#94A3B8]">
              <Sparkles className="h-3.5 w-3.5" />
              支持别名、标签、拼音和本地语义
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
