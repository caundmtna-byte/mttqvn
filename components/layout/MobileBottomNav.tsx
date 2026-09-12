import React from 'react';
import { useIsMaxWidth } from '../../lib/use-media-query';
import { txt } from '../../lib/text';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { getParentPath } from '../shared/Breadcrumbs';
import { NotificationBell } from '../notification';
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

        {/*
          Phải: chuông thông báo.

          Trước đây đây là `<Link to="/thong-bao">` — mà `/thong-bao` KHÔNG có
          trong bảng định tuyến (`App.tsx`), nên bật cờ lên là bấm vào ra trang
          trắng. Nay dùng đúng component chuông như trên thanh tiêu đề, mở panel
          ngay tại chỗ (`placement="top"` để panel bung lên trên thanh dưới).
        */}
        <div className="flex-1 flex justify-center items-center min-w-0">
          {NOTIFICATIONS_SURFACE_ENABLED ? <NotificationBell placement="top" /> : null}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
