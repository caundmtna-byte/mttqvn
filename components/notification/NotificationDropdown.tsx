import React from 'react';
import { txt } from '../../lib/text';
import { motion } from 'framer-motion';
import { Bell, Wrench } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  className?: string;
  /** Khi 'top', panel mở phía trên anchor (dùng trong bottom nav). */
  placement?: 'default' | 'top';
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose: _onClose,
  anchorRef: _anchorRef,
  className,
  placement = 'default',
}) => {
  if (!isOpen) return null;

  const isOpenUp = placement === 'top';

  return (
    <motion.div
      initial={{ opacity: 0, y: isOpenUp ? -8 : 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isOpenUp ? -8 : 8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'absolute right-0 w-[min(100vw-2rem,360px)] max-w-full',
        isOpenUp ? 'bottom-full mb-2' : 'top-full mt-2',
        'bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50',
        'flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <Bell size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {txt('notification.title')}
        </h3>
      </div>

      {/* Nội dung: chỉ hiển thị thông báo tính năng đang phát triển */}
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 dark:bg-amber-500/15 dark:text-amber-300">
          <Wrench size={26} strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {txt('notification.demoBannerTitle')}
        </p>
        <p className="text-xs text-muted-foreground leading-snug mt-1.5 max-w-[260px]">
          {txt('notification.demoBannerDesc')}
        </p>
      </div>
    </motion.div>
  );
};

export default NotificationDropdown;
