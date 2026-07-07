import { ArrowRight, Brain, Compass, MapPinned, Sparkles, X } from 'lucide-react'

import { Button } from './ui/button'

interface ExplorerIntroProps {
  totalUnlocked: number
  totalNodes: number
  isModelReady: boolean
  onExplore: (query: string) => void
  onClose: () => void
}

const EXAMPLE_QUERIES = ['Docker', '网页三件套', 'AI 画图', '显卡', '后端', '为什么电脑会卡']

const LEARNING_PATHS = [
  {
    title: 'Web 开发',
    path: 'HTML → CSS → JavaScript → React',
  },
  {
    title: 'AI 入门',
    path: '模型 → 向量 → RAG → Agent',
  },
  {
    title: '后端基础',
    path: 'Linux → API → 数据库 → Docker',
  },
]

export const ExplorerIntro = ({
  totalUnlocked,
  totalNodes,
  isModelReady,
  onExplore,
  onClose,
}: ExplorerIntroProps) => {
  const progressPercent = totalNodes === 0 ? 0 : Math.round((totalUnlocked / totalNodes) * 100)

  return (
    <div className="pointer-events-none absolute inset-x-6 top-20 z-20 flex justify-center">
      <section className="pointer-events-auto relative w-full max-w-4xl rounded-lg border border-[#D8DEE8] bg-white/95 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#CBD5E1] bg-white text-[#475569] shadow-sm transition-colors hover:border-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#111827]"
          aria-label="关闭探索引导"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-0 md:grid-cols-[1.35fr_0.9fr]">
          <div className="border-b border-[#E5E7EB] p-5 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
              <Compass className="h-4 w-4 text-[#0F766E]" />
              Computer World Frame
            </div>
            <h1 className="max-w-2xl text-2xl font-semibold leading-tight text-[#111827]">
              从一个听过的词开始，定位它在计算机世界里的位置。
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
              输入模糊词、中文描述或英文术语，地图会把它连接到对应领域、相邻概念和下一步探索方向。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((query) => (
                <Button
                  key={query}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onExplore(query)}
                  className="h-8 border-[#D8DEE8] bg-white px-3 text-sm text-[#334155] hover:border-[#0F766E] hover:bg-[#F0FDFA] hover:text-[#0F766E]"
                >
                  {query}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-[#111827]">
                  <MapPinned className="h-4 w-4 text-[#2563EB]" />
                  地图点亮
                </span>
                <span className="text-[#64748B]">{progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#E5E7EB]">
                <div
                  className="h-2 rounded-full bg-[#0F766E]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-[#64748B]">
                {totalUnlocked} / {totalNodes} 个概念已进入你的地图
              </div>
            </div>

            <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#111827]">
                <Brain className="h-4 w-4 text-[#7C3AED]" />
                推荐路径
              </div>
              <div className="space-y-2">
                {LEARNING_PATHS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => onExplore(item.title)}
                    className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white"
                  >
                    <div className="text-sm font-medium text-[#111827]">{item.title}</div>
                    <div className="mt-0.5 text-xs text-[#64748B]">{item.path}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Sparkles className="h-3.5 w-3.5 text-[#0F766E]" />
              {isModelReady ? '本地语义搜索已就绪' : '规则搜索已就绪，语义搜索准备中'}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
