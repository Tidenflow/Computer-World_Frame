import { X, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { motion } from 'motion/react';
import {
  getNodeCategoryColor,
  getNodeCategoryName,
  isRootNode,
  Node,
  ROOT_NODE_COLOR,
} from '../types';

interface DetailPanelProps {
  node: Node | null;
  onClose: () => void;
  onNavigateToMap?: (mapId: string) => void;
}

export const DetailPanel = ({ node, onClose, onNavigateToMap }: DetailPanelProps) => {
  if (!node) return null;

  return (
    <motion.aside
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="w-80 border-l border-[#E5E7EB] bg-white flex flex-col absolute right-0 top-0 bottom-0 z-10 shadow-lg"
    >
      <div className="p-4 flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={isRootNode(node) ? 'w-4 h-4' : 'w-4 h-4 rounded-full'}
              style={{
                backgroundColor: isRootNode(node)
                  ? ROOT_NODE_COLOR
                  : node.unlocked
                    ? getNodeCategoryColor(node)
                    : '#D1D5DB',
                boxShadow:
                  isRootNode(node) || node.unlocked
                    ? `0 0 8px ${isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node)}40`
                    : 'none',
              }}
            />
            <Badge variant="secondary" className="text-xs">
              {isRootNode(node) ? 'Root' : getNodeCategoryName(node)}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold text-[#111827]">{node.title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="w-8 h-8 p-0 -mr-2">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {node.description && (
          <div>
            <div className="text-sm font-medium text-[#111827] mb-2">描述</div>
            <p className="text-sm text-[#6B7280] leading-relaxed">{node.description}</p>
          </div>
        )}

        {node.tags && node.tags.length > 0 && (
          <div>
            <div className="text-sm font-medium text-[#111827] mb-2">标签</div>
            <div className="flex flex-wrap gap-2">
              {node.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {node.stage && (
          <div>
            <div className="text-sm font-medium text-[#111827] mb-2">难度等级</div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-full"
                  style={{
                    backgroundColor:
                      i < node.stage!
                        ? isRootNode(node)
                          ? ROOT_NODE_COLOR
                          : getNodeCategoryColor(node)
                        : '#E5E7EB',
                  }}
                />
              ))}
            </div>
            <div className="text-xs text-[#6B7280] mt-1">Level {node.stage} / 5</div>
          </div>
        )}

        {node.deps && node.deps.length > 0 && (
          <div>
            <div className="text-sm font-medium text-[#111827] mb-2">前置依赖</div>
            <div className="space-y-1">
              {node.deps.map((dep, index) => (
                <div
                  key={index}
                  className="text-sm text-[#6B7280] bg-[#F9FAFB] px-3 py-1.5 rounded-md"
                >
                  {dep}
                </div>
              ))}
            </div>
          </div>
        )}

        {node.resources && node.resources.length > 0 && (
          <div>
            <div className="text-sm font-medium text-[#111827] mb-2">相关资源</div>
            <div className="space-y-2">
              {node.resources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#3B82F6] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {resource.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {node.targetMap && onNavigateToMap && (
          <div>
            <Separator className="mb-4" />
            <Button
              onClick={() => onNavigateToMap(node.targetMap!)}
              className="w-full"
              style={{ backgroundColor: isRootNode(node) ? ROOT_NODE_COLOR : getNodeCategoryColor(node) }}
            >
              进入 {node.title} 地图
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </motion.aside>
  );
};
