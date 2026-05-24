import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { txt } from '../../lib/text';
import { cn } from '../../lib/utils';
import Tooltip from '../ui/Tooltip';
import {
  collectFilterChipChildren,
  isFilterChipActive,
  partitionFilterChips,
} from '../../lib/collect-filter-chip-children';

export const DEFAULT_MAX_VISIBLE_FILTER_CHIPS = 5;

export interface FilterChipOverflowRowProps {
  children: React.ReactNode;
  maxVisible?: number;
  className?: string;
}

const FilterChipOverflowRow: React.FC<FilterChipOverflowRowProps> = ({
  children,
  maxVisible = DEFAULT_MAX_VISIBLE_FILTER_CHIPS,
  className,
}) => {
  const { prefixNodes, chips } = collectFilterChipChildren(children);

  if (chips.length <= maxVisible) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 min-w-0', className)}>
        {children}
      </motion.div>
    );
  }

  const { visible, overflow } = partitionFilterChips(chips, maxVisible);
  const overflowActiveCount = overflow.filter(isFilterChipActive).length;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 min-w-0', className)}>
      {prefixNodes}
      {visible}
      <FilterChipOverflowMenu chips={overflow} activeCount={overflowActiveCount} />
    </motion.div>
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
          <motion.div
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
                </motion.div>
              ))}
            </motion.div>
          </motion.div>,
          document.body,
        )}
    </>
  );
};

export default FilterChipOverflowRow;
