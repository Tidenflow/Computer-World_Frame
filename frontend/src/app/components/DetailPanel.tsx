import { type FormEvent, useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  GitPullRequestArrow,
  Layers3,
  Lightbulb,
  Link,
  MapPinned,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'

import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Separator } from './ui/separator'
import { Textarea } from './ui/textarea'
import {
  getNodeCategoryColor,
  getNodeCategoryName,
  isRootNode,
  type Node,
  type ResourceLink,
  type SavedResourceLink,
  ROOT_NODE_COLOR,
} from '../types'

const RESOURCE_TYPE_NAMES: Record<string, string> = {
  docs: '文档',
  tutorial: '教程',
  video: '视频',
  article: '文章',
  course: '课程',
}

const RESOURCE_LANGUAGE_NAMES: Record<string, string> = {
  zh: '中文',
  en: '英文',
}

function getResourceMetaLabels(resource: ResourceLink) {
  return [
    resource.source,
    resource.type ? RESOURCE_TYPE_NAMES[resource.type] : undefined,
    resource.language ? RESOURCE_LANGUAGE_NAMES[resource.language] : undefined,
  ].filter((label): label is string => Boolean(label))
}

interface DetailPanelProps {
  node: Node | null
  mapTitle: string
  learningContext: {
    prerequisiteLabels: string[]
    nextNodes: Node[]
  }
  onClose: () => void
  onToggleLock?: (nodeId: string) => void
  onNavigateToMap?: (mapId: string) => void
  onSelectNode?: (node: Node) => void
  savedResources?: SavedResourceLink[]
  onAddSavedResource?: (
    nodeId: string,
    resource: Pick<SavedResourceLink, 'title' | 'url'> & Partial<Pick<SavedResourceLink, 'note'>>,
  ) => boolean
  onRemoveSavedResource?: (nodeId: string, resourceId: string) => void
}

export const DetailPanel = ({
  node,
  mapTitle,
  learningContext,
  onClose,
  onToggleLock,
  onNavigateToMap,
  onSelectNode,
  savedResources = [],
  onAddSavedResource,
  onRemoveSavedResource,
}: DetailPanelProps) => {
  const [isAddingResource, setIsAddingResource] = useState(false)
  const [resourceTitle, setResourceTitle] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [resourceNote, setResourceNote] = useState('')
  const [resourceError, setResourceError] = useState('')

  useEffect(() => {
    setIsAddingResource(false)
    setResourceTitle('')
    setResourceUrl('')
    setResourceNote('')
    setResourceError('')
  }, [node?.id])

  if (!node) return null

  const lockable = !isRootNode(node)
  const categoryColor = isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node)
  const hasRecommendedResources = Boolean(node.resources?.length)
  const hasSavedResources = savedResources.length > 0
  const canManageSavedResources = Boolean(onAddSavedResource)

  const resetResourceForm = () => {
    setResourceTitle('')
    setResourceUrl('')
    setResourceNote('')
    setResourceError('')
    setIsAddingResource(false)
  }

  const handleResourceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const saved = onAddSavedResource?.(node.id, {
      title: resourceTitle,
      url: resourceUrl,
      note: resourceNote,
    })

    if (!saved) {
      setResourceError('请输入标题和 http(s) 链接')
      return
    }

    resetResourceForm()
  }

  return (
    <motion.aside
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="absolute bottom-0 right-0 top-0 z-10 flex w-[380px] flex-col border-l border-[#D8DEE8] bg-white shadow-lg"
    >
      <div className="flex items-start justify-between p-5">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div
              className={isRootNode(node) ? 'h-4 w-4' : 'h-4 w-4 rounded-full'}
              style={{
                backgroundColor: node.unlocked || isRootNode(node) ? categoryColor : '#CBD5E1',
                boxShadow:
                  isRootNode(node) || node.unlocked
                    ? `0 0 8px ${categoryColor}40`
                    : 'none',
              }}
            />
            <Badge variant="secondary" className="text-xs font-medium">
              {isRootNode(node) ? 'Root' : getNodeCategoryName(node)}
            </Badge>
            <Badge variant="outline" className="text-xs font-medium text-[#64748B]">
              {mapTitle}
            </Badge>
          </div>
          <h2 className="text-2xl font-semibold leading-tight text-[#111827]">{node.title}</h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-[#64748B]">
            <CheckCircle2 className={`h-4 w-4 ${node.unlocked ? 'text-[#0F766E]' : 'text-[#CBD5E1]'}`} />
            {node.unlocked ? '已进入你的地图' : '尚未点亮'}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="-mr-2 h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {node.description && (
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#111827]">
              <Lightbulb className="h-4 w-4 text-[#C0841A]" />
              一句话位置
            </div>
            <p className="text-sm leading-6 text-[#475569]">{node.description}</p>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#111827]">
            <MapPinned className="h-4 w-4 text-[#2563EB]" />
            属于哪里
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-[#E5E7EB] p-3">
              <div className="text-xs text-[#64748B]">地图</div>
              <div className="mt-1 text-sm font-medium text-[#111827]">{mapTitle}</div>
            </div>
            <div className="rounded-md border border-[#E5E7EB] p-3">
              <div className="text-xs text-[#64748B]">类型</div>
              <div className="mt-1 text-sm font-medium text-[#111827]">
                {isRootNode(node) ? '根节点' : getNodeCategoryName(node)}
              </div>
            </div>
          </div>
        </div>

        {node.tags && node.tags.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#111827]">
              <Layers3 className="h-4 w-4 text-[#0F766E]" />
              相关标签
            </div>
            <div className="flex flex-wrap gap-2">
              {node.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs text-[#475569]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {node.stage && (
          <div>
            <div className="mb-2 text-sm font-medium text-[#111827]">理解坡度</div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-full"
                  style={{
                    backgroundColor:
                      i < node.stage
                        ? categoryColor
                        : '#E5E7EB',
                  }}
                />
              ))}
            </div>
            <div className="mt-1 text-xs text-[#6B7280]">Level {node.stage} / 5</div>
          </div>
        )}

        {learningContext.prerequisiteLabels.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#111827]">
              <BookOpen className="h-4 w-4 text-[#7C3AED]" />
              先知道这些
            </div>
            <div className="space-y-1">
              {learningContext.prerequisiteLabels.map((dep, index) => (
                <div
                  key={index}
                  className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#475569]"
                >
                  {dep}
                </div>
              ))}
            </div>
          </div>
        )}

        {learningContext.nextNodes.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#111827]">
              <ArrowRight className="h-4 w-4 text-[#0F766E]" />
              接下来可以看
            </div>
            <div className="space-y-1">
              {learningContext.nextNodes.map((nextNode) => (
                <button
                  key={nextNode.id}
                  type="button"
                  onClick={() => onSelectNode?.(nextNode)}
                  className="flex w-full items-center justify-between rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-left transition-colors hover:border-[#99F6E4] hover:bg-[#F8FAFC]"
                >
                  <span className="text-sm text-[#475569]">{nextNode.title}</span>
                  <span className="flex items-center gap-1 text-xs text-[#94A3B8]">
                    {getNodeCategoryName(nextNode)}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(hasRecommendedResources || hasSavedResources || canManageSavedResources) && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#111827]">
                <Bookmark className="h-4 w-4 text-[#DB2777]" />
                学习链接
              </div>
              {canManageSavedResources && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingResource((isAdding) => !isAdding)
                    setResourceError('')
                  }}
                  className="h-8 gap-1.5 px-2.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {hasRecommendedResources && (
                <div>
                  <div className="mb-2 text-xs font-medium text-[#64748B]">推荐链接</div>
                  <div className="space-y-2">
                    {node.resources!.map((resource, index) => {
                      const metaLabels = getResourceMetaLabels(resource)

                      return (
                        <a
                          key={`${resource.url}-${index}`}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border border-[#E5E7EB] bg-white px-3 py-2 transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-medium leading-5 text-[#2563EB]">
                              {resource.title}
                            </span>
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                          </div>
                          {metaLabels.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {metaLabels.map((label) => (
                                <Badge
                                  key={label}
                                  variant="outline"
                                  className="h-5 rounded px-1.5 text-[11px] font-normal text-[#64748B]"
                                >
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-medium text-[#64748B]">我的收藏</div>
                {hasSavedResources ? (
                  <div className="space-y-2">
                    {savedResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 items-start gap-2 text-sm font-medium leading-5 text-[#2563EB] hover:underline"
                          >
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="break-words">{resource.title}</span>
                          </a>
                          {onRemoveSavedResource && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveSavedResource(node.id, resource.id)}
                              className="h-7 w-7 shrink-0 p-0 text-[#94A3B8] hover:text-[#DC2626]"
                              aria-label={`删除 ${resource.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        {resource.note && (
                          <p className="mt-1 text-xs leading-5 text-[#64748B]">{resource.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-[#D8DEE8] px-3 py-2 text-xs text-[#94A3B8]">
                    暂无收藏
                  </div>
                )}
              </div>

              {isAddingResource && (
                <form
                  onSubmit={handleResourceSubmit}
                  className="space-y-2 rounded-md border border-[#E5E7EB] bg-white p-3"
                >
                  <Input
                    value={resourceTitle}
                    onChange={(event) => {
                      setResourceTitle(event.target.value)
                      setResourceError('')
                    }}
                    placeholder="标题"
                    aria-label="收藏链接标题"
                  />
                  <div className="relative">
                    <Link className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                    <Input
                      value={resourceUrl}
                      onChange={(event) => {
                        setResourceUrl(event.target.value)
                        setResourceError('')
                      }}
                      placeholder="https://"
                      aria-label="收藏链接 URL"
                      className="pl-9"
                    />
                  </div>
                  <Textarea
                    value={resourceNote}
                    onChange={(event) => setResourceNote(event.target.value)}
                    placeholder="备注，可选"
                    aria-label="收藏链接备注"
                    className="min-h-16"
                  />
                  {resourceError && <div className="text-xs text-[#DC2626]">{resourceError}</div>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="h-8 flex-1 gap-1.5 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      保存
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetResourceForm}
                      className="h-8 flex-1 text-xs"
                    >
                      取消
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {lockable && onToggleLock && (
          <div className="rounded-lg border border-dashed border-[#D8DEE8] bg-[#F8FAFC] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#111827]">
              <GitPullRequestArrow className="h-4 w-4 text-[#64748B]" />
              我的学习状态
            </div>
            <p className="mb-3 text-sm leading-6 text-[#64748B]">
              {node.unlocked
                ? '这个概念已经被点亮，可以作为你的学习痕迹继续保留。'
                : '点亮后，它会进入你的个人地图。'}
            </p>
            <Button
              variant={node.unlocked ? 'outline' : 'default'}
              onClick={() => {
                onToggleLock(node.id)
                if (node.unlocked) {
                  onClose()
                }
              }}
              className="w-full"
            >
              {node.unlocked ? '移出学习痕迹' : '点亮这个概念'}
            </Button>
          </div>
        )}

        {node.targetMap && onNavigateToMap && (
          <div>
            <Separator className="mb-4" />
            <Button
              onClick={() => onNavigateToMap(node.targetMap!)}
              className="w-full"
              style={{
                backgroundColor: categoryColor,
              }}
            >
              进入 {node.title} 地图
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
