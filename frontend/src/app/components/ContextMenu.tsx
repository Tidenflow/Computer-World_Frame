import { useEffect, useRef } from 'react';
import { Lock, Unlock, Info } from 'lucide-react';
import { Node } from '../types';

interface ContextMenuProps {
  node: Node;
  position: { x: number; y: number };
  onClose: () => void;
  onToggleLock: (nodeId: string) => void;
  onShowInfo: (node: Node) => void;
}

export const ContextMenu = ({
  node,
  position,
  onClose,
  onToggleLock,
  onShowInfo,
}: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const items = [
    {
      icon: Info,
      label: '查看详情',
      onClick: () => {
        onShowInfo(node);
        onClose();
      },
    },
    {
      icon: node.unlocked ? Lock : Unlock,
      label: node.unlocked ? '锁定节点' : '解锁节点',
      onClick: () => {
        onToggleLock(node.id);
        onClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1 z-50 min-w-[160px]"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#111827] hover:bg-[#F9FAFB] transition-colors"
        >
          <item.icon className="w-4 h-4 text-[#6B7280]" />
          {item.label}
        </button>
      ))}
    </div>
  );
};
