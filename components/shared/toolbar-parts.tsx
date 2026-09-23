import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { txt } from '../../lib/text';
import { cn } from '../../lib/utils';
import Tooltip from '../ui/Tooltip';

/**
 * Mảnh dùng chung của `GenericToolbar` và `DashboardToolbar` (desktop ≥ sm).
 *
 * Quy ước responsive — xem `docs/UI-CONVENTIONS.md` mục "Toolbar responsive":
 *   · hàng toolbar LUÔN một dòng (`flex-nowrap`), không bao giờ `flex-wrap`;
 *   · chữ trên nút chỉ hiện khi đủ rộng, dưới đó còn icon + tooltip;
 *   · chip lọc dư tự thu vào "…" (`FilterChipOverflowRow`).
 */

/** Hàng TabGroup riêng phía trên toolbar — mọi breakpoint. */
export const ToolbarTabRow: React.FC<{ children: React.ReactNode; hideOnMobile?: boolean }> = ({
  children,
  hideOnMobile = false,
}) => (
  <div
    className={cn(
      'overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      hideOnMobile && 'max-sm:hidden',
    )}
  >
    {children}
  </div>
);

/** Nút Quay lại desktop: chữ "Quay lại" chỉ từ `lg`, hẹp hơn chỉ còn icon. */
export const ToolbarBackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Tooltip content={txt('common.back')} placement="bottom">
    <button
      type="button"
      onClick={onClick}
      aria-label={txt('common.back')}
      className="shrink-0 h-8 px-2 -ml-1 flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
    >
      <ArrowLeft size={14} strokeWidth={2.25} />
      <span className="hidden lg:inline text-xs font-medium">{txt('common.back')}</span>
    </button>
  </Tooltip>
);

/**
 * "Xoá lọc (n)": từ `xl` hiện đủ chữ; hẹp hơn chỉ còn X + số. Nút này xuất hiện
 * đúng lúc người dùng bật một bộ lọc — chính nó từng đẩy hàng chip rớt dòng.
 */
export const ToolbarClearFiltersButton: React.FC<{ count: number; onClick: () => void }> = ({
  count,
  onClick,
}) => {
  const label = txt('common.clearFilters', { count });
  return (
    <Tooltip content={label} placement="bottom">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="relative shrink-0 h-7 px-2 flex items-center gap-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-all border border-destructive/20 hover:border-destructive/30 active:scale-95"
      >
        <X size={11} className="stroke-[2.5px]" />
        <span className="hidden xl:inline">{label}</span>
        <span className="xl:hidden tabular-nums">{count}</span>
      </button>
    </Tooltip>
  );
};

/** Bề rộng ô tìm desktop co theo màn — `w-64` cố định từng ép cả hàng tràn trên tablet. */
export const TOOLBAR_SEARCH_WIDTH_CLASS = 'w-44 lg:w-56 xl:w-64 shrink-0';
