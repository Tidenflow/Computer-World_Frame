import {
  NODE_CATEGORY_COLORS,
  NODE_CATEGORY_NAMES,
  NODE_CATEGORY_ORDER,
  type NodeCategory,
} from '../types'
import { Button } from './ui/button'

interface GraphFilterBarProps {
  selectedCategories: Set<NodeCategory>
  unlockedCount: number
  totalNodes: number
  onCategoryToggle: (category: NodeCategory) => void
  onSelectAllCategories: () => void
  onClearCategories: () => void
}

export const GraphFilterBar = ({
  selectedCategories,
  unlockedCount,
  totalNodes,
  onCategoryToggle,
  onSelectAllCategories,
  onClearCategories,
}: GraphFilterBarProps) => {
  const progressWidth = totalNodes > 0 ? `${(unlockedCount / totalNodes) * 100}%` : '0%'

  return (
    <div className="absolute left-4 right-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-xl border border-[#E5E7EB] bg-white/92 px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="mr-1 text-sm font-medium text-[#4B5563]">分类过滤</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAllCategories}
          className="h-7 rounded-full px-2 text-xs text-[#4B5563]"
        >
          All
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCategories}
          className="h-7 rounded-full px-2 text-xs text-[#4B5563]"
        >
          Clear
        </Button>

        {NODE_CATEGORY_ORDER.map((category) => {
          const isSelected = selectedCategories.has(category)

          return (
            <button
              key={category}
              onClick={() => onCategoryToggle(category)}
              className={`flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-colors ${
                isSelected
                  ? 'border-[#D7DFEA] bg-[#F8FAFC] text-[#111827]'
                  : 'border-[#EEF2F7] bg-[#FCFCFD] text-[#6B7280]'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: isSelected ? NODE_CATEGORY_COLORS[category] : '#D1D5DB',
                }}
              />
              <span>{NODE_CATEGORY_NAMES[category]}</span>
            </button>
          )
        })}

        <div className="ml-2 flex h-8 shrink-0 items-center gap-3 rounded-full border border-[#E8EDF5] bg-[#FBFCFE] px-3">
          <div className="whitespace-nowrap text-xs text-[#6B7280]">当前进度</div>
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-sm font-semibold text-[#111827]">{unlockedCount}</span>
            <span className="text-xs text-[#6B7280]">/ {totalNodes}</span>
          </div>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E5E7EB]">
            <div
              className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] transition-all duration-500"
              style={{ width: progressWidth }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
