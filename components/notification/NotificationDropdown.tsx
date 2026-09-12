import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, RotateCw, WifiOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import NotificationItem from './NotificationItem';
import type { ThongBao } from '../../features/thong-bao/core/types';
import { sapXepThongBao } from '../../features/thong-bao/utils/thong-bao-view';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  /** Khi 'top', panel mở phía trên anchor (dùng trong bottom nav). */
  placement?: 'default' | 'top';
  danhSach: ThongBao[];
  soChuaDoc: number;
  dangTai: boolean;
  coLoi: boolean;
  dangDanhDauTatCa: boolean;
  onTaiLai: () => void;
  onMoThongBao: (item: ThongBao) => void;
  onDanhDauTatCa: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose: _onClose,
  className,
  placement = 'default',
  danhSach,
  soChuaDoc,
  dangTai,
  coLoi,
  dangDanhDauTatCa,
  onTaiLai,
  onMoThongBao,
  onDanhDauTatCa,
}) => {
  // Sắp lại ở client để dòng vừa bấm "đã đọc" tự trôi xuống mà không gọi lại máy chủ.
  const dsSapXep = useMemo(() => sapXepThongBao(danhSach), [danhSach]);

  if (!isOpen) return null;

  const moLen = placement === 'top';

  return (
    <motion.div
      initial={{ opacity: 0, y: moLen ? -8 : 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: moLen ? -8 : 8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        // `w-[min(calc(100vw-2rem),360px)]` — phải có `calc()`, và KHÔNG dùng
        // `max-w-full`: ở thanh dưới mobile, hộp bao ngoài là `absolute` rộng 0px
        // nên `max-w-full` ép panel còn 2px (đúng lỗi đã gặp khi bật cờ lần đầu).
        'absolute right-0 w-[min(calc(100vw-2rem),360px)]',
        moLen ? 'bottom-full mb-2' : 'top-full mt-2',
        'bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50',
        'flex flex-col',
        className,
      )}
    >
      {/* Đầu panel */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <Bell size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground flex-1 min-w-0">
          {txt('notification.title')}
        </h3>
        {soChuaDoc > 0 ? (
          <button
            type="button"
            onClick={onDanhDauTatCa}
            disabled={dangDanhDauTatCa}
            className={cn(
              'shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1',
              'text-xs font-medium text-primary hover:bg-primary/10 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <CheckCheck size={14} />
            {txt('notification.markAllRead')}
          </button>
        ) : null}
      </div>

      {/* Thân panel */}
      <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain">
        {dangTai ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
            <div
              className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden
            />
            <p className="text-xs text-muted-foreground">{txt('notification.loading')}</p>
          </div>
        ) : coLoi ? (
          <div className="flex flex-col items-center justify-center py-9 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3 dark:bg-rose-500/15 dark:text-rose-300">
              <WifiOff size={26} strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {txt('notification.errorTitle')}
            </p>
            <p className="text-xs text-muted-foreground leading-snug mt-1.5 max-w-[260px]">
              {txt('notification.errorDesc')}
            </p>
            <button
              type="button"
              onClick={onTaiLai}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <RotateCw size={14} />
              {txt('notification.retry')}
            </button>
          </div>
        ) : dsSapXep.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
              <BellOff size={26} strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-foreground">{txt('notification.empty')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-1.5 max-w-[260px]">
              {txt('notification.emptyHint')}
            </p>
          </div>
        ) : (
          <ul className="p-2 flex flex-col gap-1">
            {dsSapXep.map((item) => (
              <NotificationItem key={item.id} item={item} onOpen={onMoThongBao} />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationDropdown;
