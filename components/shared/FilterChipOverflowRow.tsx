import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { txt } from '../../lib/text';
import { cn } from '../../lib/utils';
import Tooltip from '../ui/Tooltip';
import {
  collectFilterChipChildren,
  computeVisibleChipCount,
  isFilterChipActive,
  orderChipsByPriority,
} from '../../lib/collect-filter-chip-children';

/**
 * @deprecated Chip giờ tự thu theo BỀ RỘNG thật; hằng số này chỉ còn để các
 * chỗ import cũ không gãy. Truyền `maxVisible` khi thật sự muốn đặt trần.
 */
export const DEFAULT_MAX_VISIBLE_FILTER_CHIPS = 2;

/** Khớp `gap-2` của hàng chip. */
const CHIP_GAP_PX = 8;
/** Khớp `w-8` của nút "…". */
const OVERFLOW_BUTTON_PX = 32;
/** Bù sai số làm tròn subpixel — thiếu nó hàng có thể tràn đúng 1px rồi rớt dòng. */
const ROUNDING_SLACK_PX = 1;

export interface FilterChipOverflowRowProps {
  children: React.ReactNode;
  /** TRẦN số chip hiện (tuỳ chọn). Không truyền ⇒ hiện nhiều nhất bề rộng cho phép. */
  maxVisible?: number;
  className?: string;
}

/**
 * Hàng chip lọc LUÔN MỘT DÒNG: đo bề rộng thật của hàng và từng chip, chip nào
 * không vừa thì thu vào nút "…". Chip đang có giá trị lọc được ưu tiên hiện.
 *
 * Trước đây cắt theo số cố định (2 chip) nên màn lớn phí chỗ còn tablet vẫn
 * tràn xuống dòng 2 — nhất là lúc nút "Xoá lọc" xuất hiện cạnh hàng chip.
 *
 * Bề rộng từng chip đo trên một bản sao ẩn (`invisible`, `inert`) để biết chip
 * đang bị thu rộng bao nhiêu mà không phải hiện nó ra.
 */
const FilterChipOverflowRow: React.FC<FilterChipOverflowRowProps> = ({
  children,
  maxVisible,
  className,
}) => {
  const { prefixNodes, chips } = collectFilterChipChildren(children);
  const ordered = useMemo(() => orderChipsByPriority(chips, isFilterChipActive), [chips]);

  const rootRef = useRef<HTMLDivElement>(null);
  const prefixRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(chips.length, maxVisible ?? chips.length),
  );

  const recompute = useCallback(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;
    const chipWidths = Array.from(measure.children).map((el) => (el as HTMLElement).offsetWidth);
    const prefixWidth = prefixRef.current?.offsetWidth ?? 0;
    const available =
      root.clientWidth - (prefixWidth > 0 ? prefixWidth + CHIP_GAP_PX : 0) - ROUNDING_SLACK_PX;
    const next = computeVisibleChipCount({
      chipWidths,
      available,
      gap: CHIP_GAP_PX,
      overflowWidth: OVERFLOW_BUTTON_PX,
      cap: maxVisible,
    });
    setVisibleCount((cur) => (cur === next ? cur : next));
  }, [maxVisible]);

  // Đo trước khi vẽ để không nháy "tràn rồi mới thu". Chạy mỗi lần render:
  // nhãn chip đổi theo giá trị đang chọn nên bề rộng chip đổi theo.
  useLayoutEffect(() => {
    recompute();
  });

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => recompute());
    if (rootRef.current) ro.observe(rootRef.current);
    if (measureRef.current) ro.observe(measureRef.current);
    if (prefixRef.current) ro.observe(prefixRef.current);
    return () => ro.disconnect();
  }, [recompute]);

  // Chọn chip hiện theo thứ tự ưu tiên, nhưng VẼ theo thứ tự gốc — bật một bộ
  // lọc không được làm các chip nhảy chỗ.
  const shown = new Set(ordered.slice(0, visibleCount));
  const visible = chips.filter((c) => shown.has(c));
  const overflow = chips.filter((c) => !shown.has(c));
  const overflowActiveCount = overflow.filter(isFilterChipActive).length;

  return (
    <div
      ref={rootRef}
      className={cn('relative flex min-w-0 flex-1 flex-nowrap items-center gap-2', className)}
    >
      {prefixNodes.length > 0 ? (
        <div ref={prefixRef} className="flex shrink-0 flex-nowrap items-center gap-2">
          {prefixNodes}
        </div>
      ) : null}
      {visible.map((chip, i) => (
        <div key={chip.key ?? `chip-${i}`} className="shrink-0">
          {chip}
        </div>
      ))}
      {overflow.length > 0 ? (
        <FilterChipOverflowMenu chips={overflow} activeCount={overflowActiveCount} />
      ) : null}

      {/* Bản đo: rộng bằng hàng, cắt phần thừa để không làm cuộn ngang trang. */}
      <div aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
        <div ref={measureRef} inert className="flex w-max flex-nowrap items-center gap-2">
          {ordered.map((chip, i) => (
            <div key={chip.key ?? `measure-${i}`} className="shrink-0">
              {chip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface FilterChipOverflowMenuProps {
  chips: React.ReactElement[];
  activeCount: number;
}

const FilterChipOverflowMenu: React.FC<FilterChipOverflowMenuProps> = ({ chips, activeCount }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelRect, setPanelRect] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const updatePanelRect = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !open) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const pad = 8;
    let left = rect.left;
    if (left + width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - width);
    }
    setPanelRect({ top: rect.bottom + 4, left, width });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null);
      return;
    }
    updatePanelRect();
    window.addEventListener('scroll', updatePanelRect, true);
    window.addEventListener('resize', updatePanelRect);
    return () => {
      window.removeEventListener('scroll', updatePanelRect, true);
      window.removeEventListener('resize', updatePanelRect);
    };
  }, [open, updatePanelRect]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <Tooltip content={txt('common.moreFilters')} placement="bottom" disabled={open}>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'relative shrink-0 inline-flex h-7 w-8 items-center justify-center rounded-lg border transition-all',
            open || activeCount > 0
              ? 'border-primary/40 bg-primary/[0.03] text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          <MoreHorizontal size={16} strokeWidth={2.25} />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-white tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open &&
        panelRect &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[200] rounded-xl border border-border bg-card shadow-lg"
            style={{
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
            }}
          >
            <div className="flex max-h-[min(420px,70vh)] flex-col gap-2 overflow-y-auto p-2">
              {chips.map((chip, index) => (
                <div key={chip.key ?? `overflow-chip-${index}`} className="min-w-0 w-full [&>*]:w-full">
                  {chip}
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default FilterChipOverflowRow;
