import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useIsMaxWidth } from '../../lib/use-media-query';
import { txt } from '../../lib/text';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../../store/useNotificationStore';
import NotificationDropdown from './NotificationDropdown';
import { cn } from '../../lib/utils';

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
  const count = useNotificationStore((s) =>
    s.notifications.filter((n) => !n.read).length
  );

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
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        const dropdown = document.querySelector('[data-notification-dropdown]');
        if (dropdown && dropdown.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const wrapperClass =
    placement === 'top'
      ? 'absolute right-0 bottom-full z-50 mb-2'
      : isMobile
        ? 'fixed left-4 right-4 z-50'
        : 'absolute right-0 top-full z-50 mt-2';

  const wrapperStyle =
    placement === 'default' && isMobile && isOpen
      ? { top: `${dropdownTop}px` }
      : undefined;

  const dropdownContent = isOpen ? (
    <NotificationDropdown
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      anchorRef={buttonRef}
      placement={placement}
    />
  ) : null;

  const usePortal = placement === 'default' && !isMobile && isOpen && portalPosition;

  return (
    <div className="relative" ref={buttonRef}>
      <button
        type="button"
        aria-label={txt('nav.notification')}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 md:h-10 md:w-10',
          'flex items-center justify-center rounded-xl',
          'text-muted-foreground hover:bg-muted hover:text-foreground transition-all relative active:scale-95',
          isOpen && 'bg-muted text-foreground'
        )}
      >
        <Bell size={20} strokeWidth={1.8} className="shrink-0" />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-xs font-semibold text-primary-foreground rounded-full shadow-sm ring-2 ring-card"
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Desktop: render dropdown in portal to avoid being clipped by main overflow */}
      {usePortal &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <div
              data-notification-dropdown
              className="fixed z-[9999] w-[min(calc(100vw-2rem),360px)]"
              style={{
                top: portalPosition.top,
                right: portalPosition.right,
              }}
            >
              {dropdownContent}
            </div>
          </AnimatePresence>,
          document.body
        )}

      {/* Mobile / placement top: render inline (skip inline when desktop waiting for portal position to avoid clipped flash) */}
      {!usePortal && (
        <AnimatePresence>
          {isOpen && (isMobile || placement === 'top' || portalPosition !== null) && (
            <div
              data-notification-dropdown
              className={wrapperClass}
              style={wrapperStyle}
            >
              {dropdownContent}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default NotificationBell;
