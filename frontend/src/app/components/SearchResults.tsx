import { getNodeCategoryColor, getNodeCategoryName, Node } from '../types';
import { Badge } from './ui/badge';
import { motion } from 'motion/react';

interface SearchResultsProps {
  results: Node[];
  query: string;
  onSelectNode: (node: Node) => void;
}

export const SearchResults = ({ results, query, onSelectNode }: SearchResultsProps) => {
  if (!query || results.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-16 left-1/2 -translate-x-1/2 w-[480px] bg-white rounded-lg shadow-xl border border-[#E5E7EB] max-h-[400px] overflow-y-auto z-20"
    >
      <div className="p-3 border-b border-[#E5E7EB]">
        <div className="text-sm text-[#6B7280]">
          找到 <span className="font-semibold text-[#111827]">{results.length}</span> 个结果
        </div>
      </div>
      <div className="divide-y divide-[#E5E7EB]">
        {results.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelectNode(node)}
            className="w-full px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors flex items-start gap-3"
          >
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{
                backgroundColor: node.unlocked ? getNodeCategoryColor(node) : '#D1D5DB',
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-[#111827]">{node.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {getNodeCategoryName(node)}
                </Badge>
              </div>
              {node.description && (
                <p className="text-sm text-[#6B7280] line-clamp-2">{node.description}</p>
              )}
              {node.tags && node.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {node.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};
