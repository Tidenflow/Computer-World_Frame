import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, MapPinned, Search } from 'lucide-react'

import type { UnlockedNodeRecord } from '../services/app-services'
import { getNodeCategoryName } from '../types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface UnlockedNodesViewProps {
  records: UnlockedNodeRecord[]
  totalNodes: number
  selectedNodeId: string | null
  onSelectRecord: (record: UnlockedNodeRecord) => void
  onLocateRecord: (record: UnlockedNodeRecord) => void
}

export const UnlockedNodesView = ({
  records,
  totalNodes,
  selectedNodeId,
  onSelectRecord,
  onLocateRecord,
}: UnlockedNodesViewProps) => {
  const [query, setQuery] = useState('')
  const [activeMapTitle, setActiveMapTitle] = useState('all')
  const normalizedQuery = query.trim().toLowerCase()
  const progressPercent = totalNodes === 0 ? 0 : Math.round((records.length / totalNodes) * 100)

  const mapSummaries = useMemo(() => {
    const counts = new Map<string, number>()

    for (const record of records) {
      counts.set(record.mapTitle, (counts.get(record.mapTitle) ?? 0) + 1)
    }

    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])
  }, [records])

  const filteredRecords = useMemo(() => {
    const mapFilteredRecords =
      activeMapTitle === 'all'
        ? records
        : records.filter((record) => record.mapTitle === activeMapTitle)

    if (!normalizedQuery) {
      return mapFilteredRecords
    }

    return mapFilteredRecords.filter(({ node, mapTitle }) => {
      return (
        node.title.toLowerCase().includes(normalizedQuery) ||
        mapTitle.toLowerCase().includes(normalizedQuery) ||
        node.description?.toLowerCase().includes(normalizedQuery) ||
        node.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
        node.aliases?.some((alias) => alias.toLowerCase().includes(normalizedQuery))
      )
    })
  }, [activeMapTitle, normalizedQuery, records])

  const selectedMapCount =
    activeMapTitle === 'all'
      ? records.length
      : mapSummaries.find(([mapTitle]) => mapTitle === activeMapTitle)?.[1] ?? 0

  return (
    <section className="h-full overflow-hidden bg-[#F8FAFC]">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#D8DEE8] bg-white px-4 py-4">
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                <CheckCircle2 className="h-4 w-4 text-[#0F766E]" />
                My Knowledge Space
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-2xl font-semibold text-[#111827]">已点亮节点</h1>
                <span className="text-sm text-[#64748B]">
                  {records.length} / {totalNodes} 个概念已进入你的地图
                </span>
              </div>
            </div>

            <div className="flex min-w-[280px] items-center gap-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-xs text-[#64748B]">
                  <span>点亮进度</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E5E7EB]">
                  <div
                    className="h-2 rounded-full bg-[#0F766E] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-right">
                <div className="text-lg font-semibold text-[#111827]">{selectedMapCount}</div>
                <div className="text-xs text-[#64748B]">
                  {activeMapTitle === 'all' ? '当前全部' : activeMapTitle}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 w-full flex-1 grid-cols-[240px_minmax(0,1fr)] gap-4 px-4 py-4">
          <aside className="min-h-0 rounded-lg border border-[#D8DEE8] bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
              Maps
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveMapTitle('all')}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeMapTitle === 'all'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#111827]'
                }`}
              >
                <span>全部节点</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeMapTitle === 'all' ? 'bg-white/15 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {records.length}
                </span>
              </button>

              {mapSummaries.map(([mapTitle, count]) => (
                <button
                  key={mapTitle}
                  type="button"
                  onClick={() => setActiveMapTitle(mapTitle)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    activeMapTitle === mapTitle
                      ? 'bg-[#0F172A] text-white'
                      : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#111827]'
                  }`}
                >
                  <span className="truncate">{mapTitle}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      activeMapTitle === mapTitle ? 'bg-white/15 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col rounded-lg border border-[#D8DEE8] bg-white shadow-sm">
            <div className="border-b border-[#E5E7EB] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-4 w-4 text-[#2563EB]" />
                    <h2 className="font-semibold text-[#111827]">
                      {activeMapTitle === 'all' ? '全部已点亮节点' : activeMapTitle}
                    </h2>
                  </div>
                  <div className="mt-1 text-sm text-[#64748B]">
                    当前显示 {filteredRecords.length} 个节点
                  </div>
                </div>

                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索节点、标签或描述..."
                    className="h-10 border-[#D8DEE8] bg-[#F8FAFC] pl-10 text-sm shadow-none focus-visible:ring-[#0F766E]"
                  />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {records.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
                  <div>
                    <MapPinned className="mx-auto h-8 w-8 text-[#94A3B8]" />
                    <h2 className="mt-3 text-lg font-semibold text-[#111827]">还没有点亮节点</h2>
                    <p className="mt-1 text-sm text-[#64748B]">
                      回到地图探索，点击或搜索概念后，它们会出现在这里。
                    </p>
                  </div>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-sm text-[#64748B]">
                  没有匹配的已点亮节点。
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredRecords.map((record) => {
                    const selected = selectedNodeId === record.node.id

                    return (
                      <article
                        key={`${record.mapId}:${record.node.id}`}
                        className={`rounded-lg border p-4 transition-colors ${
                          selected ? 'border-[#99F6E4] bg-[#F0FDFA]' : 'border-[#E5E7EB] bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-[#111827]">
                              {record.node.title}
                            </h3>
                            <div className="mt-1 text-xs text-[#64748B]">
                              {record.mapTitle} · {getNodeCategoryName(record.node)}
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-[#ECFDF5] text-[#0F766E]">
                            已点亮
                          </Badge>
                        </div>

                        {record.node.description && (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#64748B]">
                            {record.node.description}
                          </p>
                        )}

                        {record.node.tags && record.node.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {record.node.tags.slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[#64748B]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onSelectRecord(record)}
                            className="h-8 flex-1 border-[#D8DEE8]"
                          >
                            查看详情
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onLocateRecord(record)}
                            className="h-8 flex-1 bg-[#0F172A] text-white hover:bg-[#1E293B]"
                          >
                            定位地图
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
