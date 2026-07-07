import { Search, Layers, Box, Loader2 } from 'lucide-react'

import { Input } from './ui/input'
import { Button } from './ui/button'

interface HeaderProps {
  viewMode: '2d' | '3d'
  onViewModeChange: (mode: '2d' | '3d') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearchSubmit: () => void
  breadcrumbs: string[]
  isSearching?: boolean
  isModelReady?: boolean
}

export const Header = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  breadcrumbs,
  isSearching = false,
  isModelReady = false,
}: HeaderProps) => {
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
        <div className="relative">
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
