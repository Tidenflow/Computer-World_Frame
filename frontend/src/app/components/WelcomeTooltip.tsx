import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';

const TOOLTIP_STORAGE_KEY = 'computer-world-welcome-shown';

export const WelcomeTooltip = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasShown = localStorage.getItem(TOOLTIP_STORAGE_KEY);
    if (!hasShown) {
      setShow(true);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md mx-4 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-[#111827]">欢迎来到计算机世界！</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose} className="w-8 h-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 text-[#6B7280]">
              <p>这是一个互动式的计算机知识图谱，帮助你探索计算机世界的奥秘。</p>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-[#3B82F6]/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-[#3B82F6]">1</span>
                  </div>
                  <div className="text-sm">
                    <strong className="text-[#111827]">点击节点</strong> 查看详情并解锁知识点
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-[#8B5CF6]/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-[#8B5CF6]">2</span>
                  </div>
                  <div className="text-sm">
                    <strong className="text-[#111827]">切换视图</strong> 在2D/3D之间自由切换
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-[#EC4899]/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-[#EC4899]">3</span>
                  </div>
                  <div className="text-sm">
                    <strong className="text-[#111827]">探索子地图</strong> 深入了解每个领域
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleClose}
              className="w-full mt-6 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]"
            >
              开始探索
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
