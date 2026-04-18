import { Search, Layers, Box } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface HeaderProps {
  viewMode: '2d' | '3d';
  onViewModeChange: (mode: '2d' | '3d') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  breadcrumbs: string[];
}

export const Header = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  breadcrumbs,
}: HeaderProps) => {
  return (
    <header className="h-14 border-b border-[#E5E7EB] bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-[#3B82F6]" />
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <Input
            type="text"
            placeholder="搜索节点、标签..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[360px] pl-10 h-9 bg-[#F9FAFB] border-[#E5E7EB]"
          />
        </div>

        <div className="flex gap-1 bg-[#F9FAFB] rounded-md p-1">
          <Button
            variant={viewMode === '2d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('2d')}
            className="h-7 px-3"
          >
            <Layers className="w-4 h-4 mr-1" />
            2D
          </Button>
          <Button
            variant={viewMode === '3d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('3d')}
            className="h-7 px-3"
          >
            <Box className="w-4 h-4 mr-1" />
            3D
          </Button>
        </div>
      </div>
    </header>
  );
};
