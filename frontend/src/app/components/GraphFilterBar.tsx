import {
  NODE_CATEGORY_COLORS,
  NODE_CATEGORY_NAMES,
  NODE_CATEGORY_ORDER,
  type NodeCategory,
} from '../types'
import { Button } from './ui/button'

interface GraphFilterBarProps {
  selectedCategories: Set<NodeCategory>
  onCategoryToggle: (category: NodeCategory) => void
  onSelectAllCategories: () => void
  onClearCategories: () => void
}

export const GraphFilterBar = ({
  selectedCategories,
  onCategoryToggle,
  onSelectAllCategories,
  onClearCategories,
}: GraphFilterBarProps) => {
  return (
    <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-[#E5E7EB] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-[#111827]">分类过滤</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAllCategories}
          className="h-7 rounded-full px-2 text-xs"
        >
          All
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCategories}
          className="h-7 rounded-full px-2 text-xs"
        >
          Clear
        </Button>

        {NODE_CATEGORY_ORDER.map((category) => {
          const isSelected = selectedCategories.has(category)

          return (
            <button
              key={category}
              onClick={() => onCategoryToggle(category)}
              className={`flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-all ${
                isSelected
                  ? 'border-[#E5E7EB] bg-[#F8FAFC] text-[#111827]'
                  : 'border-[#F1F5F9] bg-white text-[#6B7280]'
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
      </div>
    </div>
  )
}
