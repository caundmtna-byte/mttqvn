import React from 'react';
import { useIsMaxWidth } from '../../lib/use-media-query';
import { txt } from '../../lib/text';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Home, Wrench } from 'lucide-react';
import { getParentPath } from '../shared/Breadcrumbs';
import { NOTIFICATIONS_SURFACE_ENABLED } from '@/lib/feature-flags';
import { cn } from '../../lib/utils';

/** Bottom nav mobile: Trái Back | Giữa Trang chủ | Phải Notification. Chỉ hiện khi isMobile. */
const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMaxWidth(768);

  const parentPath = React.useMemo(
    () => getParentPath(location.pathname, txt),
    [location.pathname]
  );
  const showBack = parentPath !== undefined;

  if (!isMobile) return null;

  return (
    <nav
      aria-label={txt('nav.mainNav')}
      className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-center h-16 px-2">
        {/* Trái: Back – icon căn giữa ô */}
        <div className="flex-1 flex justify-center items-center min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={() => {
                navigate(parentPath!);
              }}
              aria-label={txt('nav.back')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
            >
              <ChevronLeft size={24} strokeWidth={2} className="shrink-0" />
            </button>
          ) : (
            <div className="min-w-[44px] min-h-[44px]" aria-hidden />
          )}
        </div>

        {/* Giữa: Trang chủ – nút tròn nhô lên, icon only */}
        <div className="flex-1 flex justify-center items-center min-w-0 -mt-5">
          <Link
            to="/"
            aria-label={txt('nav.home')}
            aria-current={location.pathname === '/' ? 'page' : undefined}
            className={cn(
              'min-h-[56px] min-w-[56px] flex items-center justify-center rounded-full shadow-lg transition-all active:scale-95',
              location.pathname === '/'
                ? 'bg-primary text-primary-foreground shadow-primary/30'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground shadow-border/50'
            )}
          >
            <Home size={26} strokeWidth={2} className="shrink-0" />
          </Link>
        </div>

        {/* Phải: Notification (ẩn khi module chưa sẵn sàng) */}
        <div className="flex-1 flex justify-center items-center min-w-0">
          {NOTIFICATIONS_SURFACE_ENABLED ? (
          <Link
            to="/thong-bao"
            aria-label={txt('nav.notification')}
            title={txt('notification.demoTooltip')}
            aria-current={location.pathname === '/thong-bao' ? 'page' : undefined}
            className={cn(
              'relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all',
              location.pathname === '/thong-bao' && 'bg-primary/10 text-primary'
            )}
          >
            <Bell size={24} strokeWidth={1.8} className="shrink-0" />
            <span
              className="absolute -top-0.5 -right-0.5 w-[16px] h-[16px] flex items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ring-2 ring-card dark:bg-amber-400 dark:text-amber-950"
              aria-hidden
            >
              <Wrench size={9} strokeWidth={2.5} className="shrink-0" />
            </span>
          </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
