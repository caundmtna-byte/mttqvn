import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useIsMaxWidth } from '../../lib/use-media-query';
import { txt } from '../../lib/text';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import NotificationDropdown from './NotificationDropdown';
import { cn } from '../../lib/utils';
import { useThongBao } from '../../features/thong-bao/hooks/use-thong-bao';
import { nhanSoChuaDoc } from '../../features/thong-bao/utils/thong-bao-view';
import type { ThongBao } from '../../features/thong-bao/core/types';

interface NotificationBellProps {
  /** Khi 'top', dropdown mở phía trên (dùng trong bottom nav). */
  placement?: 'default' | 'top';
}

const NotificationBell: React.FC<NotificationBellProps> = ({ placement = 'default' }) => {
  const isMobile = useIsMaxWidth(768);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [portalPosition, setPortalPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Danh sách chỉ được tải khi chuông thực sự mở — huy hiệu chỉ tốn 1 truy vấn đếm.
  const {
    soChuaDoc,
    danhSach,
    dangTaiDanhSach,
    loiDanhSach,
    dangDanhDauTatCa,
    taiLai,
    danhDauMotCaiDaDoc,
    danhDauTatCa,
  } = useThongBao(isOpen);

  const nhan = nhanSoChuaDoc(soChuaDoc);

  useLayoutEffect(() => {
    if (!isOpen || placement !== 'default' || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownTop(rect.bottom + 8);
    if (!isMobile) {
      setPortalPosition({
        top: rect.bottom + 8,
        right: typeof window !== 'undefined' ? window.innerWidth - rect.right : 0,
      });
    } else {
      setPortalPosition(null);
    }
  }, [isOpen, placement, isMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        const dropdown = document.querySelector('[data-notification-dropdown]');
        if (dropdown && dropdown.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMoThongBao = useCallback(
    (item: ThongBao) => {
      setIsOpen(false);
      // `Link` đã điều hướng; đánh dấu đã đọc chạy nền, hỏng cũng không chặn người dùng.
      if (!item.da_doc) {
        void danhDauMotCaiDaDoc(item.id).catch(() => {
          toast.error(txt('notification.markReadFailed'));
        });
      }
    },
    [danhDauMotCaiDaDoc],
  );

  const handleDanhDauTatCa = useCallback(() => {
    void danhDauTatCa()
      .then(() => toast.success(txt('notification.markAllReadDone')))
      .catch(() => toast.error(txt('notification.markReadFailed')));
  }, [danhDauTatCa]);

  const wrapperClass =
    placement === 'top'
      ? 'absolute right-0 bottom-full z-50 mb-2'
      : isMobile
        ? 'fixed left-4 right-4 z-50'
        : 'absolute right-0 top-full z-50 mt-2';

  const wrapperStyle =
    placement === 'default' && isMobile && isOpen ? { top: `${dropdownTop}px` } : undefined;

  const dropdownContent = isOpen ? (
    <NotificationDropdown
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement={placement}
      danhSach={danhSach}
      soChuaDoc={soChuaDoc}
      dangTai={dangTaiDanhSach}
      coLoi={loiDanhSach}
      dangDanhDauTatCa={dangDanhDauTatCa}
      onTaiLai={taiLai}
      onMoThongBao={handleMoThongBao}
      onDanhDauTatCa={handleDanhDauTatCa}
    />
  ) : null;

  const usePortal = placement === 'default' && !isMobile && isOpen && portalPosition;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={txt('nav.notification')}
        title={
          soChuaDoc > 0
            ? txt('notification.tooltipUnread', { count: soChuaDoc })
            : txt('notification.tooltip')
        }
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 md:h-10 md:w-10',
          'flex items-center justify-center rounded-xl',
          'text-muted-foreground hover:bg-muted hover:text-foreground transition-all relative active:scale-95',
          isOpen && 'bg-muted text-foreground',
        )}
      >
        <Bell size={20} strokeWidth={1.8} className="shrink-0" />
        {nhan ? (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[16px] h-[16px] px-[3px]',
              'flex items-center justify-center rounded-full',
              'bg-rose-500 text-white text-[10px] font-bold leading-none',
              'shadow-sm ring-2 ring-card dark:bg-rose-500',
            )}
            aria-label={txt('notification.unreadBadgeLabel', { count: soChuaDoc })}
          >
            {nhan}
          </span>
        ) : null}
      </button>

      {/* Desktop: dựng dropdown trong portal để không bị `overflow` của main cắt mất */}
      {usePortal &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <div
              data-notification-dropdown
              className="fixed z-[9999] w-[min(calc(100vw-2rem),360px)]"
              style={{ top: portalPosition.top, right: portalPosition.right }}
            >
              {dropdownContent}
            </div>
          </AnimatePresence>,
          document.body,
        )}

      {/* Mobile / placement top: dựng tại chỗ */}
      {!usePortal && (
        <AnimatePresence>
          {isOpen && (isMobile || placement === 'top' || portalPosition !== null) && (
            <div data-notification-dropdown className={wrapperClass} style={wrapperStyle}>
              {dropdownContent}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default NotificationBell;
