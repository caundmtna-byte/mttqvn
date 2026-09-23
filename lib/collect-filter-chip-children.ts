import React, { isValidElement } from 'react';

export const FILTER_CHIP_DISPLAY_NAMES = new Set([
  'FilterChipMultiSelect',
  'FilterChipSingleSelect',
]);

export function isFilterChipElement(element: React.ReactElement): boolean {
  const type = element.type;
  if (typeof type === 'string') return false;
  const named = type as { displayName?: string; name?: string };
  const name = named.displayName ?? named.name ?? '';
  return FILTER_CHIP_DISPLAY_NAMES.has(name);
}

export function isFilterChipActive(element: React.ReactElement): boolean {
  const { value } = element.props as { value?: string[] | string | null };
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.length > 0;
}

export interface CollectedFilterChipChildren {
  /** Non-chip nodes kept in document order (DateRange, divider, …). */
  prefixNodes: React.ReactNode[];
  /** Filter chip elements in document order. */
  chips: React.ReactElement[];
}

function toChildArray(node: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(node);
}

/**
 * Walk `children` and split filter chips from other toolbar nodes.
 * Pure chip wrappers (motion.div, div, Fragment) are flattened; nodes like DateRangePicker stay in prefix.
 */
export function collectFilterChipChildren(node: React.ReactNode): CollectedFilterChipChildren {
  const prefixNodes: React.ReactNode[] = [];
  const chips: React.ReactElement[] = [];

  const walk = (current: React.ReactNode) => {
    toChildArray(current).forEach((child) => {
      if (!isValidElement(child)) {
        if (child != null && child !== false) {
          prefixNodes.push(child);
        }
        return;
      }

      if (isFilterChipElement(child)) {
        chips.push(child);
        return;
      }

      if (child.type === React.Fragment) {
        walk((child.props as { children?: React.ReactNode }).children);
        return;
      }

      const nested = collectFilterChipChildren(
        (child.props as { children?: React.ReactNode }).children,
      );

      if (nested.chips.length > 0 && nested.prefixNodes.length === 0) {
        chips.push(...nested.chips);
        return;
      }

      if (nested.chips.length === 0) {
        prefixNodes.push(child);
        return;
      }

      // Wrapper trộn chip với phần tử khác (DateRange + chip…): tách hẳn ra.
      // Giữ nguyên cục thì các chip bên trong không thu vào "…" được và cả cục
      // rộng cố định — đúng thứ làm hàng toolbar rớt dòng trên tablet.
      prefixNodes.push(...nested.prefixNodes);
      chips.push(...nested.chips);
    });
  };

  walk(node);
  return { prefixNodes, chips };
}

/**
 * Thứ tự ưu tiên hiện chip: chip ĐANG CÓ giá trị lọc trước (người dùng phải
 * thấy bộ lọc nào đang bật), rồi tới chip còn lại — mỗi nhóm giữ thứ tự gốc.
 */
export function orderChipsByPriority<T>(items: readonly T[], isActive: (item: T) => boolean): T[] {
  return [...items.filter(isActive), ...items.filter((item) => !isActive(item))];
}

export function partitionFilterChips(
  chips: React.ReactElement[],
  maxVisible: number,
): { visible: React.ReactElement[]; overflow: React.ReactElement[] } {
  if (chips.length <= maxVisible) {
    return { visible: chips, overflow: [] };
  }

  const visible = orderChipsByPriority(chips, isFilterChipActive).slice(0, Math.max(0, maxVisible));
  const visibleSet = new Set(visible);
  const overflow = chips.filter((chip) => !visibleSet.has(chip));

  return { visible, overflow };
}

export interface VisibleChipCountInput {
  /** Bề rộng từng chip (px), ĐÃ xếp theo thứ tự ưu tiên hiện. */
  chipWidths: readonly number[];
  /** Bề rộng còn lại cho chip (px) — đã trừ phần tử cố định khác trong hàng. */
  available: number;
  /** Khoảng cách giữa hai phần tử liền nhau (px). */
  gap: number;
  /** Bề rộng nút "…" (px) — chỉ tính khi còn chip bị thu vào. */
  overflowWidth: number;
  /** Trần số chip hiện; không truyền ⇒ không trần. */
  cap?: number;
}

/**
 * Số chip hiện được trên MỘT hàng mà không tràn.
 *
 * Còn chip bị thu ⇒ phải chừa chỗ cho nút "…"; hiện hết ⇒ không cần nút. Vì
 * vậy thử từ nhiều xuống ít: số lớn nhất vừa khít là đáp án. Luôn ≥ 0 — hẹp
 * tới mức không chip nào vừa thì mọi chip nằm trong "…".
 */
export function computeVisibleChipCount({
  chipWidths,
  available,
  gap,
  overflowWidth,
  cap,
}: VisibleChipCountInput): number {
  const n = chipWidths.length;
  const max = Math.min(n, cap == null ? n : Math.max(0, Math.floor(cap)));
  if (!(available > 0)) return 0;

  let used = 0;
  const prefix: number[] = [0];
  for (let i = 0; i < n; i += 1) {
    used += chipWidths[i] + (i > 0 ? gap : 0);
    prefix.push(used);
  }

  for (let k = max; k >= 0; k -= 1) {
    const chips = prefix[k];
    const needsOverflow = k < n;
    const total = chips + (needsOverflow ? overflowWidth + (k > 0 ? gap : 0) : 0);
    if (total <= available) return k;
  }
  return 0;
}
