import { motion } from 'motion/react';

export const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <motion.div
        className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#3B82F6] rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
};
