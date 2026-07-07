import { Search, Layers, Box, Loader2 } from 'lucide-react'

import { Input } from './ui/input'
import { Button } from './ui/button'
import { getNodeCategoryName, type SearchMatch } from '../types'

interface HeaderProps {
  viewMode: '2d' | '3d'
  onViewModeChange: (mode: '2d' | '3d') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearchSubmit: () => void
  breadcrumbs: string[]
  searchResults: SearchMatch[]
  searchResultQuery: string
  isSearching?: boolean
  isModelReady?: boolean
  onSelectSearchResult: (match: SearchMatch) => void
}

export const Header = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  breadcrumbs,
  searchResults,
  searchResultQuery,
  isSearching = false,
  isModelReady = false,
  onSelectSearchResult,
}: HeaderProps) => {
  const showResults = searchResults.length > 0 && searchQuery.trim() === searchResultQuery

  const getMatchLabel = (match: SearchMatch) => {
    const query = searchResultQuery.trim().toLowerCase()

    if (!query) return '搜索结果'
    if (match.title.toLowerCase().includes(query)) return '标题匹配'
    if (match.aliases?.some((alias) => alias.toLowerCase().includes(query))) return '别名匹配'
    if (match.tags?.some((tag) => tag.toLowerCase().includes(query))) return '标签匹配'

    return '相关概念'
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#D8DEE8] bg-white px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0F172A]">
            <Box className="h-4 w-4 text-[#D9FF3F]" />
          </div>
          <div>
            <div className="font-semibold leading-tight text-[#111827]">计算机世界框架</div>
            <div className="text-xs leading-tight text-[#64748B]">Computer World Frame</div>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-sm text-[#64748B] lg:flex">
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {index > 0 && <span className="mx-2">/</span>}
              {crumb}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative z-30">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#3B82F6]" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          )}
          <Input
            type="text"
            placeholder="搜索 Docker、网页三件套、AI 画图..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSearchSubmit()
              }
            }}
            className="h-10 w-[420px] border-[#D8DEE8] bg-[#F8FAFC] pl-10 pr-24 text-sm shadow-none focus-visible:ring-[#0F766E]"
            disabled={isSearching}
          />
          <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[11px] text-[#94A3B8] sm:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${isModelReady ? 'bg-[#0F766E]' : 'bg-[#CBD5E1]'}`} />
            {isModelReady ? 'Semantic' : 'Rules'}
          </div>

          {showResults && (
            <div className="absolute right-0 top-12 w-[520px] overflow-hidden rounded-lg border border-[#D8DEE8] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                    Search Results
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-[#111827]">
                    “{searchResultQuery}” 命中 {searchResults.length} 个概念
                  </div>
                </div>
                <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#64748B]">
                  Enter 搜索
                </span>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-2">
                {searchResults.map((match, index) => (
                  <button
                    key={`${match.mapId}:${match.id}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelectSearchResult(match)}
                    className="w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-[#F8FAFC]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-semibold text-[#64748B]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[#111827]">
                            {match.title}
                          </span>
                          <span className="shrink-0 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] text-[#0F766E]">
                            {getMatchLabel(match)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[#64748B]">
                          {match.mapTitle} · {getNodeCategoryName(match)}
                        </div>
                        {match.description && (
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">
                            {match.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 rounded-md border border-[#D8DEE8] bg-[#F8FAFC] p-1">
          <Button
            variant={viewMode === '2d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('2d')}
            className="h-7 px-3"
          >
            <Layers className="mr-1 h-4 w-4" />
            2D
          </Button>
          <Button
            variant={viewMode === '3d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('3d')}
            className="h-7 px-3"
          >
            <Box className="mr-1 h-4 w-4" />
            3D
          </Button>
        </div>
      </div>
    </header>
  )
}
