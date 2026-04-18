import { Search, Layers, Box } from 'lucide-react'

import { Input } from './ui/input'
import { Button } from './ui/button'

interface HeaderProps {
  viewMode: '2d' | '3d'
  onViewModeChange: (mode: '2d' | '3d') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearchSubmit: () => void
  breadcrumbs: string[]
}

export const Header = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  breadcrumbs,
}: HeaderProps) => {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5 text-[#3B82F6]" />
          <span className="font-semibold text-[#111827]">计算机世界框架</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            type="text"
            placeholder="搜索节点或标签，按回车解锁..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSearchSubmit()
              }
            }}
            className="h-9 w-[360px] border-[#E5E7EB] bg-[#F9FAFB] pl-10"
          />
        </div>

        <div className="flex gap-1 rounded-md bg-[#F9FAFB] p-1">
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
